import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import dashboardApi from '@/api/dashboard/dashboardApi.js'

const toDateValue = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getMonthValue = (date = new Date()) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
)

const MONTHLY_SOLD_PRODUCTS_FETCH_SIZE = 100
const SOLD_PRODUCTS_PAGE_SIZE = 5

const REPORT_MONTH_OPTIONS = [
  { value: '01', label: 'Tháng 1' },
  { value: '02', label: 'Tháng 2' },
  { value: '03', label: 'Tháng 3' },
  { value: '04', label: 'Tháng 4' },
  { value: '05', label: 'Tháng 5' },
  { value: '06', label: 'Tháng 6' },
  { value: '07', label: 'Tháng 7' },
  { value: '08', label: 'Tháng 8' },
  { value: '09', label: 'Tháng 9' },
  { value: '10', label: 'Tháng 10' },
  { value: '11', label: 'Tháng 11' },
  { value: '12', label: 'Tháng 12' },
]

const getMonthRange = (monthValue) => {
  const [year, month] = monthValue.split('-').map(Number)
  return {
    from: toDateValue(new Date(year, month - 1, 1)),
    to: toDateValue(new Date(year, month, 0)),
  }
}

const formatMonthLabel = (monthValue) => {
  const [year, month] = monthValue.split('-').map(Number)
  return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
}

export const AdminDashboard = () => {
  const currentMonthValue = getMonthValue()
  const currentYear = Number(currentMonthValue.slice(0, 4))
  const currentMonth = currentMonthValue.slice(5, 7)
  const reportYearOptions = Array.from({ length: currentYear - 2020 + 1 }, (_, index) => currentYear - index)
  const [summary, setSummary] = useState({
    totalOrders: 0,
    deliveredOrders: 0,
    totalRevenue: 0
  })
  const [monthlySoldProducts, setMonthlySoldProducts] = useState([])
  const [soldProductsPage, setSoldProductsPage] = useState(1)
  const [bestSellerMonth, setBestSellerMonth] = useState(() => getMonthValue())
  const [isLoadingBestSellers, setIsLoadingBestSellers] = useState(true)
  const [revenueDaily, setRevenueDaily] = useState([])
  const [revenueMonthly, setRevenueMonthly] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const selectedReportYear = bestSellerMonth.slice(0, 4)
  const selectedReportMonth = bestSellerMonth.slice(5, 7)
  const selectableMonths = Number(selectedReportYear) === currentYear
    ? REPORT_MONTH_OPTIONS.filter(month => month.value <= currentMonth)
    : REPORT_MONTH_OPTIONS

  const handleReportYearChange = (year) => {
    const month = Number(year) === currentYear && selectedReportMonth > currentMonth
      ? currentMonth
      : selectedReportMonth
    setBestSellerMonth(`${year}-${month}`)
    setSoldProductsPage(1)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Tính toán khoảng thời gian
        const today = new Date()
        const toStr = toDateValue(today)

        const firstDayOfYear = new Date(today.getFullYear(), 0, 1)
        const fromStrYear = toDateValue(firstDayOfYear)

        // Gọi đồng thời các API Dashboard
        const [summaryRes, monthlyRevenueRes] = await Promise.all([
          dashboardApi.getSummary(),
          dashboardApi.getRevenueMonthly(fromStrYear, toStr)
        ])

        if (summaryRes && summaryRes.data) {
          setSummary(summaryRes.data)
        }
        if (monthlyRevenueRes && monthlyRevenueRes.data) {
          setRevenueMonthly(monthlyRevenueRes.data)
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Không thể kết nối đến API thống kê của máy chủ Backend.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    let isCurrent = true

    const fetchBestSellersByMonth = async () => {
      try {
        setIsLoadingBestSellers(true)
        const { from, to } = getMonthRange(bestSellerMonth)
        const [bestSellerResponse, revenueResponse] = await Promise.all([
          dashboardApi.getBestSellers(from, to, MONTHLY_SOLD_PRODUCTS_FETCH_SIZE),
          dashboardApi.getRevenueDaily(from, to),
        ])
        const soldProducts = [...(bestSellerResponse?.data || [])]
          .sort((first, second) => Number(second.quantitySold || 0) - Number(first.quantitySold || 0))

        if (isCurrent) {
          setMonthlySoldProducts(soldProducts)
          setSoldProductsPage(1)
          setRevenueDaily(revenueResponse?.data || [])
        }
      } catch (err) {
        console.error('Error fetching monthly best sellers:', err)
        if (isCurrent) {
          setMonthlySoldProducts([])
          setRevenueDaily([])
        }
      } finally {
        if (isCurrent) setIsLoadingBestSellers(false)
      }
    }

    fetchBestSellersByMonth()
    return () => { isCurrent = false }
  }, [bestSellerMonth])

  const formatPrice = (value) => {
    if (value === null || value === undefined) return '0 đ'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
  }

  const soldProductsDescending = [...monthlySoldProducts]
    .sort((first, second) => Number(second.quantitySold || 0) - Number(first.quantitySold || 0))
  const leastSellers = [...monthlySoldProducts]
    .sort((first, second) => Number(first.quantitySold || 0) - Number(second.quantitySold || 0))
    .slice(0, 5)
  const featuredBestSeller = soldProductsDescending[0] || null
  const featuredLeastSeller = leastSellers[0] || null
  const topFiveSoldProducts = soldProductsDescending.slice(0, 5)
  const soldProductsPageCount = Math.max(1, Math.ceil(soldProductsDescending.length / SOLD_PRODUCTS_PAGE_SIZE))
  const currentSoldProductsPage = Math.min(soldProductsPage, soldProductsPageCount)
  const pagedSoldProducts = soldProductsDescending.slice(
    (currentSoldProductsPage - 1) * SOLD_PRODUCTS_PAGE_SIZE,
    currentSoldProductsPage * SOLD_PRODUCTS_PAGE_SIZE,
  )
  const totalSoldQuantity = monthlySoldProducts.reduce(
    (total, product) => total + (Number(product.quantitySold) || 0),
    0,
  )
  const totalSoldRevenue = monthlySoldProducts.reduce(
    (total, product) => total + (Number(product.revenue) || 0),
    0,
  )
  const soldProductCount = new Set(monthlySoldProducts.map(product => product.productName).filter(Boolean)).size
  const highestSoldQuantity = Math.max(...monthlySoldProducts.map(product => Number(product.quantitySold) || 0), 0)
  const lowestSoldQuantity = monthlySoldProducts.length > 0
    ? Math.min(...monthlySoldProducts.map(product => Number(product.quantitySold) || 0))
    : 0
  const allSoldProductsHaveSameQuantity = monthlySoldProducts.length > 1
    && highestSoldQuantity === lowestSoldQuantity
  const getRevenueShare = (revenue) => totalSoldRevenue > 0
    ? ((Number(revenue) || 0) / totalSoldRevenue) * 100
    : 0
  const chartMaxRevenue = Math.max(...revenueDaily.map(item => Number(item.revenue) || 0), 1)
  const peakRevenueDay = revenueDaily.reduce(
    (peak, item) => (!peak || Number(item.revenue) > Number(peak.revenue) ? item : peak),
    null,
  )
  const averageDailyRevenue = revenueDaily.length > 0
    ? revenueDaily.reduce((total, item) => total + (Number(item.revenue) || 0), 0) / revenueDaily.length
    : 0

  // Tính tỷ lệ hoàn thành đơn hàng
  const completionRate = summary.totalOrders > 0 
    ? ((summary.deliveredOrders / summary.totalOrders) * 100).toFixed(1)
    : '0.0'

  // Tính toán vẽ SVG chart cho doanh thu tháng đang chọn
  const getChartPoints = () => {
    if (revenueDaily.length === 0) return ''
    const maxVal = chartMaxRevenue
    const width = 600
    const height = 150
    const padding = 20
    const usableWidth = width - padding * 2
    const usableHeight = height - padding * 2

    return revenueDaily.map((d, index) => {
      const x = padding + (index / Math.max(revenueDaily.length - 1, 1)) * usableWidth
      const y = height - padding - (d.revenue / maxVal) * usableHeight
      return `${x},${y}`
    }).join(' ')
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-charcoal to-[#1a1a1a] text-white p-8 rounded-none border border-black/5 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-5 flex items-center justify-center">
          <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        </div>
        <div className="relative z-10 space-y-2">
          <h2 className="text-xl sm:text-2xl font-display font-semibold uppercase tracking-[0.15em]">
            Hệ thống Quản trị OUTTA
          </h2>
          <p className="text-xs text-gray-400 max-w-xl tracking-wider leading-relaxed">
            Dữ liệu thống kê doanh số bán hàng, hiệu suất giỏ hàng, thông tin thanh toán được đồng bộ trực tiếp từ cơ sở dữ liệu thời gian thực.
          </p>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-white p-6 rounded-none border border-black/5 animate-pulse h-32 flex flex-col justify-between">
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50/50 border border-red-200 text-red-800 px-4 py-3 rounded-none flex items-center space-x-2">
          <svg className="w-5 h-5 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-xs tracking-wider font-medium">{error}</span>
        </div>
      ) : (
        /* Statistical Metric Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Revenue */}
          <div className="bg-white p-6 rounded-none border border-black/5 hover:border-black/20 transition-all duration-300 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-brand-muted font-semibold uppercase tracking-wider block">Doanh thu tích lũy</span>
              <h3 className="text-xl font-bold text-brand-charcoal font-sans">{formatPrice(summary.totalRevenue)}</h3>
            </div>
            <div className="p-3 bg-black/5 text-brand-charcoal">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Card 2: Total Orders */}
          <div className="bg-white p-6 rounded-none border border-black/5 hover:border-black/20 transition-all duration-300 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-brand-muted font-semibold uppercase tracking-wider block">Tổng số đơn hàng</span>
              <h3 className="text-xl font-bold text-brand-charcoal font-sans">{summary.totalOrders} đơn</h3>
            </div>
            <div className="p-3 bg-black/5 text-brand-charcoal">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>

          {/* Card 3: Delivered Orders */}
          <div className="bg-white p-6 rounded-none border border-black/5 hover:border-black/20 transition-all duration-300 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-brand-muted font-semibold uppercase tracking-wider block">Đơn giao thành công</span>
              <h3 className="text-xl font-bold text-green-700 font-sans">{summary.deliveredOrders} đơn</h3>
            </div>
            <div className="p-3 bg-green-50 text-green-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Card 4: Completion Rate */}
          <div className="bg-white p-6 rounded-none border border-black/5 hover:border-black/20 transition-all duration-300 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-brand-muted font-semibold uppercase tracking-wider block">Tỷ lệ hoàn thành</span>
              <h3 className="text-xl font-bold text-blue-700 font-sans">{completionRate}%</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Charts & Table */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Revenue SVG Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-none border border-black/5 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-xs font-bold text-brand-charcoal uppercase tracking-[0.15em]">Doanh thu {formatMonthLabel(bestSellerMonth)}</h3>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5">Biểu diễn doanh thu từng ngày trong tháng đã chọn</p>
            </div>
            {revenueDaily.length > 0 ? (
              <div className="relative pt-2">
                <svg viewBox="0 0 600 150" className="w-full h-auto overflow-visible">
                  <defs>
                    <linearGradient id="monthly-revenue-area" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="20" y1="20" x2="580" y2="20" stroke="#f3f4f6" strokeWidth="1" />
                  <line x1="20" y1="75" x2="580" y2="75" stroke="#f3f4f6" strokeWidth="1" />
                  <line x1="20" y1="130" x2="580" y2="130" stroke="#e5e7eb" strokeWidth="1" />
                  <text x="20" y="14" fill="#8c8c8c" fontSize="8">{formatPrice(chartMaxRevenue)}</text>
                  <text x="20" y="70" fill="#8c8c8c" fontSize="8">{formatPrice(chartMaxRevenue / 2)}</text>
                  <text x="20" y="145" fill="#8c8c8c" fontSize="8">0 đ</text>
                  
                  {/* Revenue Line */}
                  <polygon
                    fill="url(#monthly-revenue-area)"
                    points={`20,130 ${getChartPoints()} 580,130`}
                  />
                  <polyline
                    fill="none"
                    stroke="#1a1a1a"
                    strokeWidth="1.5"
                    points={getChartPoints()}
                  />
                  
                  {/* Dots on line */}
                  {revenueDaily.map((d, index) => {
                    const maxVal = chartMaxRevenue
                    const x = 20 + (index / Math.max(revenueDaily.length - 1, 1)) * 560
                    const y = 150 - 20 - (d.revenue / maxVal) * 110
                    return (
                      <g key={d.period} className="group/dot cursor-pointer">
                        <circle
                          cx={x}
                          cy={y}
                          r="3"
                          fill="#1a1a1a"
                          className="hover:r-5 transition-all"
                        />
                        <title>{`${d.period}: ${formatPrice(d.revenue)}`}</title>
                      </g>
                    )
                  })}
                </svg>
                {/* Labels */}
                <div className="flex justify-between text-[8px] tracking-widest text-brand-muted uppercase mt-2 px-3">
                  {revenueDaily.map(d => (
                    <span key={d.period}>{d.period.split('-').slice(1).reverse().join('/')}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center border border-dashed border-gray-200">
                <span className="text-xs text-brand-muted uppercase tracking-wider">Chưa có dữ liệu doanh thu</span>
              </div>
            )}
          </div>

          {/* Top Selling Products List */}
          <div className="bg-white p-6 rounded-none border border-black/5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-brand-charcoal uppercase tracking-[0.15em] mb-4">Top sản phẩm bán chạy</h3>
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-brand-muted">
                  {formatMonthLabel(bestSellerMonth)}
                </p>
                <div className="flex gap-2">
                  <select
                    value={selectedReportYear}
                    onChange={(event) => handleReportYearChange(event.target.value)}
                    aria-label="Chọn năm thống kê"
                    className="border border-gray-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-brand-charcoal outline-none focus:border-brand-charcoal"
                  >
                    {reportYearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <select
                    value={selectedReportMonth}
                    onChange={(event) => {
                      setBestSellerMonth(`${selectedReportYear}-${event.target.value}`)
                      setSoldProductsPage(1)
                    }}
                    aria-label="Chọn tháng thống kê"
                    className="border border-gray-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-brand-charcoal outline-none focus:border-brand-charcoal"
                  >
                    {selectableMonths.map((month) => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-brand-muted">Ngày doanh thu cao nhất</p>
                    <p className="mt-1 text-xs font-bold text-brand-charcoal">{peakRevenueDay ? formatPrice(peakRevenueDay.revenue) : '—'}</p>
                    <p className="mt-0.5 text-[10px] text-brand-muted">{peakRevenueDay?.period || 'Chưa có dữ liệu'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-brand-muted">Doanh thu trung bình/ngày</p>
                    <p className="mt-1 text-xs font-bold text-brand-charcoal">{formatPrice(averageDailyRevenue)}</p>
                    <p className="mt-0.5 text-[10px] text-brand-muted">Theo ngày có phát sinh doanh thu</p>
                  </div>
                </div>
              </div>
              {!isLoadingBestSellers && monthlySoldProducts.length > 0 && (
                <div className="mb-5 grid grid-cols-3 gap-2">
                  <div className="border border-gray-100 bg-brand-cream/30 p-2.5">
                    <p className="text-[8px] font-semibold uppercase tracking-wider text-brand-muted">Đã bán</p>
                    <p className="mt-1 text-sm font-bold text-brand-charcoal">{totalSoldQuantity}</p>
                  </div>
                  <div className="border border-gray-100 bg-brand-cream/30 p-2.5">
                    <p className="text-[8px] font-semibold uppercase tracking-wider text-brand-muted">Sản phẩm</p>
                    <p className="mt-1 text-sm font-bold text-brand-charcoal">{soldProductCount}</p>
                  </div>
                  <div className="border border-gray-100 bg-brand-cream/30 p-2.5">
                    <p className="text-[8px] font-semibold uppercase tracking-wider text-brand-muted">Doanh thu</p>
                    <p className="mt-1 truncate text-sm font-bold text-brand-charcoal" title={formatPrice(totalSoldRevenue)}>{formatPrice(totalSoldRevenue)}</p>
                  </div>
                </div>
              )}
              {isLoadingBestSellers ? (
                <div className="flex h-32 items-center justify-center border border-dashed border-gray-200">
                  <span className="text-xs text-brand-muted uppercase tracking-wider">Đang tải thống kê tháng...</span>
                </div>
              ) : monthlySoldProducts.length > 0 ? (
                <>
                  {allSoldProductsHaveSameQuantity && (
                    <p className="mb-3 border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-medium leading-relaxed text-amber-800">
                      Các sản phẩm đang đồng hạng 1, cùng bán {highestSoldQuantity} cái trong {formatMonthLabel(bestSellerMonth)}.
                    </p>
                  )}
                  <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="border border-emerald-200 bg-emerald-50/70 p-3">
                      <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-emerald-700">Bán chạy nhất</p>
                      <p className="mt-1 truncate text-xs font-bold text-brand-charcoal" title={featuredBestSeller?.productName}>{featuredBestSeller?.productName}</p>
                      <p className="mt-1 text-[10px] text-emerald-800">{featuredBestSeller?.quantitySold || 0} cái · {formatPrice(featuredBestSeller?.revenue)} · {getRevenueShare(featuredBestSeller?.revenue).toFixed(1)}%</p>
                    </div>
                    <div className="border border-amber-200 bg-amber-50/70 p-3">
                      <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-amber-700">Ít bán nhất</p>
                      <p className="mt-1 truncate text-xs font-bold text-brand-charcoal" title={featuredLeastSeller?.productName}>{featuredLeastSeller?.productName}</p>
                      <p className="mt-1 text-[10px] text-amber-800">{featuredLeastSeller?.quantitySold || 0} cái · {formatPrice(featuredLeastSeller?.revenue)} · {getRevenueShare(featuredLeastSeller?.revenue).toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="mb-4 border-y border-gray-100 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-[9px] font-bold uppercase tracking-[0.15em] text-brand-charcoal">Top 5 theo số lượng bán</h4>
                      <span className="text-[9px] text-brand-muted">Thanh dài hơn = bán nhiều hơn</span>
                    </div>
                    <div className="space-y-2.5">
                      {topFiveSoldProducts.map((item, index) => {
                        const width = highestSoldQuantity > 0
                          ? Math.max(8, (Number(item.quantitySold || 0) / highestSoldQuantity) * 100)
                          : 0
                        return (
                          <div key={item.productVariantId || `${item.productName}-${index}`}>
                            <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
                              <span className="truncate font-medium text-brand-charcoal">#{index + 1} {item.productName}</span>
                              <span className="shrink-0 font-bold text-brand-charcoal">{item.quantitySold} cái</span>
                            </div>
                            <div className="h-1.5 overflow-hidden bg-gray-100">
                              <div className="h-full bg-brand-charcoal transition-all" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="space-y-4">
                  {pagedSoldProducts.map((item, index) => (
                    <div key={item.productVariantId || index} className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="flex min-w-0 items-start pr-2">
                        <span className="mr-2 inline-flex h-6 shrink-0 items-center rounded-full bg-brand-charcoal px-1.5 text-[9px] font-bold text-white">
                          {Number(item.quantitySold) === highestSoldQuantity ? 'TOP' : `#${(currentSoldProductsPage - 1) * SOLD_PRODUCTS_PAGE_SIZE + index + 1}`}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-brand-charcoal truncate">{item.productName}</p>
                          <p className="mt-0.5 text-[10px] text-brand-muted">Size {item.size || '—'} · Màu {item.color || '—'}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-brand-charcoal">{item.quantitySold} cái</p>
                        <p className="text-[9px] text-brand-muted uppercase mt-0.5">{formatPrice(item.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {soldProductsPageCount > 1 && (
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[10px] text-brand-muted">
                    <span>Trang {currentSoldProductsPage}/{soldProductsPageCount}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSoldProductsPage((page) => Math.max(1, page - 1))}
                        disabled={currentSoldProductsPage === 1}
                        className="border border-gray-200 px-2.5 py-1 font-semibold text-brand-charcoal disabled:cursor-not-allowed disabled:opacity-40"
                      >Trước</button>
                      <button
                        type="button"
                        onClick={() => setSoldProductsPage((page) => Math.min(soldProductsPageCount, page + 1))}
                        disabled={currentSoldProductsPage === soldProductsPageCount}
                        className="border border-gray-200 px-2.5 py-1 font-semibold text-brand-charcoal disabled:cursor-not-allowed disabled:opacity-40"
                      >Sau</button>
                    </div>
                  </div>
                )}
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-charcoal">Sản phẩm bán ít nhất</h4>
                  {allSoldProductsHaveSameQuantity ? (
                    <p className="text-[10px] leading-relaxed text-brand-muted">
                      Không có sản phẩm bán ít riêng vì mọi sản phẩm có phát sinh đơn trong tháng đều bán {highestSoldQuantity} cái.
                    </p>
                  ) : (
                    <div className="space-y-3">
                    {leastSellers.map((item, index) => (
                      <div key={item.productVariantId || index} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-brand-charcoal">{item.productName}</p>
                          <p className="mt-0.5 text-[10px] text-brand-muted">Size {item.size || '—'} · Màu {item.color || '—'}</p>
                        </div>
                        <p className="shrink-0 text-xs font-bold text-brand-charcoal">{item.quantitySold} cái</p>
                      </div>
                    ))}
                    </div>
                  )}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center py-10 border border-dashed border-gray-200">
                  <span className="text-xs text-brand-muted uppercase tracking-wider">Chưa có thông tin bán chạy</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && monthlySoldProducts.length > 0 && (
        <section className="bg-white border border-black/5">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-brand-charcoal">Hiệu suất sản phẩm</h3>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-brand-muted">Danh sách sản phẩm có doanh số trong {formatMonthLabel(bestSellerMonth)}</p>
            </div>
            <span className="text-xs font-semibold text-brand-muted">{monthlySoldProducts.length} sản phẩm</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left">
              <thead className="bg-gray-50 text-[9px] font-bold uppercase tracking-wider text-brand-muted">
                <tr>
                  <th className="px-6 py-3">Hạng</th>
                  <th className="px-6 py-3">Sản phẩm</th>
                  <th className="px-6 py-3 text-right">Đã bán</th>
                  <th className="px-6 py-3 text-right">Doanh thu</th>
                  <th className="px-6 py-3">Tỷ trọng doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedSoldProducts.map((item, index) => {
                  const share = getRevenueShare(item.revenue)
                  const rank = (currentSoldProductsPage - 1) * SOLD_PRODUCTS_PAGE_SIZE + index + 1
                  return (
                    <tr key={item.productVariantId || `${item.productName}-${rank}`} className="hover:bg-brand-cream/20">
                      <td className="px-6 py-4 text-xs font-bold text-brand-charcoal">#{rank}</td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-semibold text-brand-charcoal">{item.productName}</p>
                        <p className="mt-1 text-[10px] text-brand-muted">Size {item.size || '—'} · Màu {item.color || '—'}</p>
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-brand-charcoal">{item.quantitySold} cái</td>
                      <td className="px-6 py-4 text-right text-xs font-semibold text-brand-charcoal">{formatPrice(item.revenue)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 min-w-24 flex-1 overflow-hidden bg-gray-100">
                            <div className="h-full bg-brand-charcoal" style={{ width: `${Math.max(share > 0 ? 4 : 0, share)}%` }} />
                          </div>
                          <span className="w-10 text-right text-[10px] font-bold text-brand-charcoal">{share.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {soldProductsPageCount > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <p className="text-xs text-brand-muted">Hiển thị {(currentSoldProductsPage - 1) * SOLD_PRODUCTS_PAGE_SIZE + 1}–{Math.min(currentSoldProductsPage * SOLD_PRODUCTS_PAGE_SIZE, monthlySoldProducts.length)} / {monthlySoldProducts.length} sản phẩm</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSoldProductsPage((page) => Math.max(1, page - 1))} disabled={currentSoldProductsPage === 1} className="border border-gray-200 px-3 py-1.5 text-xs font-semibold text-brand-charcoal disabled:cursor-not-allowed disabled:opacity-40">Trước</button>
                <button type="button" onClick={() => setSoldProductsPage((page) => Math.min(soldProductsPageCount, page + 1))} disabled={currentSoldProductsPage === soldProductsPageCount} className="border border-gray-200 px-3 py-1.5 text-xs font-semibold text-brand-charcoal disabled:cursor-not-allowed disabled:opacity-40">Sau</button>
              </div>
            </div>
          )}
        </section>
      )}

      {!loading && !error && (
        <div className="bg-white p-6 rounded-none border border-black/5">
          <div className="mb-5">
            <h3 className="text-xs font-bold text-brand-charcoal uppercase tracking-[0.15em]">
              Doanh thu theo tháng năm {new Date().getFullYear()}
            </h3>
            <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5">
              Dữ liệu từ API thống kê doanh thu hàng tháng
            </p>
          </div>
          {revenueMonthly.length > 0 ? (
            <div className="space-y-3">
              {revenueMonthly.map((item) => {
                const maxRevenue = Math.max(...revenueMonthly.map(month => Number(month.revenue) || 0), 1)
                const percentage = Math.max(2, ((Number(item.revenue) || 0) / maxRevenue) * 100)
                return (
                  <div key={item.period} className="grid grid-cols-[72px_1fr_auto] items-center gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                      {item.period}
                    </span>
                    <div className="h-2 bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-brand-charcoal transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="min-w-28 text-right text-xs font-semibold text-brand-charcoal">
                      {formatPrice(item.revenue)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center border border-dashed border-gray-200">
              <span className="text-xs text-brand-muted uppercase tracking-wider">
                Chưa có dữ liệu doanh thu theo tháng
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick Action Shortcuts */}
      <div className="bg-white p-8 rounded-none border border-black/5 space-y-6">
        <h3 className="text-xs font-bold text-brand-charcoal uppercase tracking-[0.15em]">Lối tắt quản trị nhanh</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/admin/categories"
            className="p-5 border border-gray-100 rounded-none hover:border-black/35 hover:bg-brand-cream/10 transition-all flex items-center space-x-4 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-none bg-black/5 flex items-center justify-center text-brand-charcoal group-hover:bg-black group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider group-hover:text-black transition-colors">Danh mục sản phẩm</p>
              <p className="text-[10px] text-brand-muted mt-0.5">Thêm, sửa, xóa danh mục</p>
            </div>
          </Link>

          <Link
            to="/"
            className="p-5 border border-gray-100 rounded-none hover:border-black/35 hover:bg-brand-cream/10 transition-all flex items-center space-x-4 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-none bg-black/5 flex items-center justify-center text-brand-charcoal group-hover:bg-black group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider group-hover:text-black transition-colors">Xem Cửa hàng</p>
              <p className="text-[10px] text-brand-muted mt-0.5">Quay lại trang khách hàng</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
