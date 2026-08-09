import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import invoiceApi from '@/api/invoices/invoiceApi.js'
import { formatVND } from '@/utils/currency/price.js'

// Số hóa đơn hiển thị mỗi trang.
const INVOICES_PER_PAGE = 10
const SEARCH_INVOICES_FETCH_SIZE = 100
const SEARCH_FETCH_CONCURRENCY = 4

const unwrapApiData = (response) => response?.data?.data ?? response?.data ?? response
const getInvoiceId = (invoice) => invoice?.invoiceId ?? invoice?.id
const getInvoiceNumber = (invoice) => invoice?.invoiceNumber || invoice?.code || `HĐ-${getInvoiceId(invoice)}`
const getInvoiceDate = (invoice) => invoice?.invoiceDate || invoice?.issuedAt || invoice?.createdAt || invoice?.createdDate
const getInvoiceAmount = (invoice) => invoice?.totalAmount ?? invoice?.amount ?? invoice?.orderTotal
const getInvoiceOrder = (invoice) => invoice?.order || invoice?.orderDTO || invoice?.orderResponse || null
const getInvoiceOrderId = (invoice) => (
  invoice?.orderId
  ?? invoice?.order?.orderId
  ?? invoice?.order?.id
  ?? invoice?.orderDTO?.orderId
  ?? invoice?.orderResponse?.orderId
)
const parseReceiverName = (shippingAddress) => String(shippingAddress || '').split(' | ')[0].trim()
const getInvoiceCustomerName = (invoice) => {
  const order = getInvoiceOrder(invoice)
  const accountName = [order?.user?.lastName, order?.user?.firstName].filter(Boolean).join(' ').trim()
  return invoice?.customerName
    || invoice?.username
    || invoice?.userName
    || order?.customerName
    || order?.fullName
    || accountName
    || order?.username
    || order?.user?.username
    || parseReceiverName(order?.shippingAddress || invoice?.shippingAddress)
    || 'Chưa ghi nhận'
}
const getBuyerInfo = (invoice) => {
  const order = getInvoiceOrder(invoice)
  const user = order?.user || {}
  return {
    name: invoice?.buyerName || order?.fullName || [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.username || 'Chưa ghi nhận',
    phone: invoice?.buyerPhone || order?.phone || user.phone || 'Chưa ghi nhận',
    email: invoice?.buyerEmail || user.email || 'Chưa ghi nhận',
    address: invoice?.buyerAddress || invoice?.shippingAddress || order?.address || [invoice?.ward || order?.ward, invoice?.district || order?.district, invoice?.province || order?.province].filter(Boolean).join(', ') || 'Chưa ghi nhận',
  }
}

const normalizeSearchText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .trim()

export const InvoiceManager = () => {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [allInvoicesForSearch, setAllInvoicesForSearch] = useState(null)
  const [isLoadingAllInvoices, setIsLoadingAllInvoices] = useState(false)
  const [searchAllError, setSearchAllError] = useState(null)

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true)
        const data = unwrapApiData(await invoiceApi.getAllInvoices({ page, size: INVOICES_PER_PAGE, sort: 'invoiceId,desc' }))
        setInvoices(Array.isArray(data) ? data : data?.content || [])
        setTotalPages(data?.totalPages || 1)
      } catch (error) {
        console.error('Error loading invoices:', error)
        toast.error(error?.response?.data?.message || 'Không thể tải danh sách hóa đơn.')
      } finally {
        setLoading(false)
      }
    }
    loadInvoices()
  }, [page])

  const loadAllInvoicesForSearch = async (forceRefresh = false) => {
    if (isLoadingAllInvoices || (!forceRefresh && allInvoicesForSearch)) return

    try {
      setIsLoadingAllInvoices(true)
      setSearchAllError(null)

      const firstPage = unwrapApiData(await invoiceApi.getAllInvoices({
        page: 0,
        size: SEARCH_INVOICES_FETCH_SIZE,
        sort: 'invoiceId,desc',
      }))
      const firstInvoices = Array.isArray(firstPage) ? firstPage : firstPage?.content || []
      const totalPageCount = Array.isArray(firstPage) ? 1 : Math.max(1, Number(firstPage?.totalPages) || 1)
      const remainingPages = Array.from({ length: Math.max(totalPageCount - 1, 0) }, (_, index) => index + 1)
      const remainingInvoices = []

      for (let index = 0; index < remainingPages.length; index += SEARCH_FETCH_CONCURRENCY) {
        const pageBatch = remainingPages.slice(index, index + SEARCH_FETCH_CONCURRENCY)
        const responses = await Promise.all(pageBatch.map(async (pageIndex) => {
          const data = unwrapApiData(await invoiceApi.getAllInvoices({
            page: pageIndex,
            size: SEARCH_INVOICES_FETCH_SIZE,
            sort: 'invoiceId,desc',
          }))
          return Array.isArray(data) ? data : data?.content || []
        }))
        remainingInvoices.push(...responses.flat())
      }

      const uniqueInvoices = [...new Map(
        [...firstInvoices, ...remainingInvoices].map((invoice, index) => [getInvoiceId(invoice) ?? index, invoice]),
      ).values()]
      setAllInvoicesForSearch(uniqueInvoices)
      toast.success(`Đã tải ${uniqueInvoices.length} hóa đơn để tìm kiếm.`)
    } catch (error) {
      console.error('Error loading all invoices for search:', error)
      setSearchAllError(error?.response?.data?.message || 'Không thể tải toàn bộ hóa đơn để tìm kiếm.')
    } finally {
      setIsLoadingAllInvoices(false)
    }
  }

  const openInvoiceDetail = async (invoice) => {
    const invoiceId = getInvoiceId(invoice)
    setSelectedInvoice(invoice)
    if (invoiceId == null) return

    try {
      setDetailLoading(true)
      const detail = unwrapApiData(await invoiceApi.getInvoiceById(invoiceId))
      if (detail) setSelectedInvoice(current => ({ ...current, ...detail }))
    } catch (error) {
      console.error('Error loading invoice detail:', error)
      toast.error(error?.response?.data?.message || 'Không thể tải chi tiết hóa đơn.')
    } finally {
      setDetailLoading(false)
    }
  }

  const isSearchingEntireSystem = Boolean(searchQuery.trim() && allInvoicesForSearch)
  const invoiceSearchSource = isSearchingEntireSystem ? allInvoicesForSearch : invoices

  const filteredInvoices = useMemo(() => {
    const keyword = normalizeSearchText(searchQuery)
    if (!keyword) return invoices

    return invoiceSearchSource.filter((invoice) => {
      const searchableText = [
        getInvoiceNumber(invoice),
        getInvoiceId(invoice),
        getInvoiceOrderId(invoice),
        getInvoiceCustomerName(invoice),
      ].map(normalizeSearchText).join(' ')

      return searchableText.includes(keyword)
    })
  }, [invoiceSearchSource, invoices, searchQuery])

  const selectedOrder = getInvoiceOrder(selectedInvoice)
  const items = selectedInvoice?.items
    || selectedInvoice?.invoiceItems
    || selectedInvoice?.orderItems
    || selectedOrder?.items
    || selectedOrder?.orderDetails
    || []
  const selectedBuyer = getBuyerInfo(selectedInvoice)
  const subtotalAmount = selectedInvoice?.subtotalAmount ?? selectedOrder?.subtotalAmount ?? 0
  const discountAmount = selectedInvoice?.discountAmount ?? selectedOrder?.discountAmount ?? 0
  const shippingFee = selectedInvoice?.shippingFee ?? selectedOrder?.shippingFee ?? 0

  return (
    <div className="space-y-6 pb-16 font-sans animate-fade-in">
      <div className="flex flex-col gap-4 border border-black/10 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-brand-muted">Tài chính & chứng từ</p>
          <h2 className="mt-1 text-xl font-bold uppercase tracking-wider text-brand-charcoal">Quản lý hóa đơn</h2>
          <p className="mt-1 text-xs text-brand-muted">Tra cứu hóa đơn đã phát hành và đối chiếu thông tin đơn hàng.</p>
        </div>
        <div className="flex h-11 items-center gap-3 border border-black/10 bg-brand-cream/50 px-4">
          <span className="text-[9px] uppercase tracking-wider text-brand-muted">Trang hiện tại</span>
          <strong className="text-sm text-brand-charcoal">{page + 1}/{totalPages}</strong>
        </div>
      </div>

      <div className="border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex max-w-3xl flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <svg aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm theo mã hóa đơn, mã đơn hàng hoặc khách hàng..."
              aria-label="Tìm kiếm hóa đơn"
              className="w-full border border-black/15 bg-white py-3 pl-11 pr-4 text-xs text-brand-charcoal outline-none transition-colors placeholder:text-brand-muted focus:border-brand-charcoal"
            />
          </div>
          <button
            type="button"
            onClick={() => loadAllInvoicesForSearch(Boolean(allInvoicesForSearch))}
            disabled={isLoadingAllInvoices}
            className="border border-brand-charcoal bg-brand-charcoal px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingAllInvoices ? 'Đang tải...' : allInvoicesForSearch ? 'Làm mới dữ liệu' : 'Tìm toàn bộ'}
          </button>
        </div>
        {searchQuery.trim() && (
          <p className="mt-2 text-[10px] text-brand-muted">
            {isLoadingAllInvoices
              ? 'Đang tải toàn bộ hóa đơn để tìm kiếm...'
              : allInvoicesForSearch
                ? `Tìm thấy ${filteredInvoices.length} / ${allInvoicesForSearch.length} hóa đơn trên toàn hệ thống.`
                : `Tìm thấy ${filteredInvoices.length} hóa đơn trên trang hiện tại. Bấm “Tìm toàn bộ” để tra cứu tất cả hóa đơn.`}
          </p>
        )}
        {searchAllError && <p className="mt-2 text-[10px] text-red-600">{searchAllError}</p>}
      </div>

      <div className="overflow-hidden border border-black/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-brand-charcoal text-[10px] uppercase tracking-wider text-white">
              <tr>
                <th className="px-5 py-4 font-semibold">Mã hóa đơn</th>
                <th className="px-5 py-4 font-semibold">Đơn hàng</th>
                <th className="px-5 py-4 font-semibold">Khách hàng</th>
                <th className="px-5 py-4 font-semibold">Ngày phát hành</th>
                <th className="px-5 py-4 text-right font-semibold">Tổng tiền</th>
                <th className="px-5 py-4 text-center font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr><td colSpan="6" className="px-5 py-16 text-center uppercase tracking-widest text-brand-muted">Đang tải hóa đơn...</td></tr>
              ) : invoiceSearchSource.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-16 text-center text-brand-muted">Chưa có hóa đơn nào được phát hành.</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-16 text-center text-brand-muted">Không tìm thấy hóa đơn phù hợp.</td></tr>
              ) : filteredInvoices.map((invoice, index) => {
                const id = getInvoiceId(invoice)
                const orderId = getInvoiceOrderId(invoice)
                const date = getInvoiceDate(invoice)
                const amount = getInvoiceAmount(invoice)
                return (
                  <tr key={id ?? index} className="transition-colors hover:bg-brand-cream/30">
                    <td className="px-5 py-4 font-semibold text-brand-charcoal">{getInvoiceNumber(invoice)}</td>
                    <td className="px-5 py-4 text-brand-muted">{orderId != null ? `#${orderId}` : 'N/A'}</td>
                    <td className="px-5 py-4 text-brand-charcoal">{getInvoiceCustomerName(invoice)}</td>
                    <td className="px-5 py-4 text-brand-muted">{date ? new Date(date).toLocaleString('vi-VN') : 'N/A'}</td>
                    <td className="px-5 py-4 text-right font-bold text-brand-charcoal">{amount != null ? formatVND(amount) : 'N/A'}</td>
                    <td className="px-5 py-4 text-center">
                      <button type="button" onClick={() => openInvoiceDetail(invoice)} className="border border-brand-charcoal px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-brand-charcoal transition-colors hover:bg-brand-charcoal hover:text-white">
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button disabled={page === 0} onClick={() => setPage(value => Math.max(0, value - 1))} className="border border-black/10 bg-white px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">Trang trước</button>
          <span className="text-xs font-semibold text-brand-muted">Trang {page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(value => value + 1)} className="border border-black/10 bg-white px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">Trang sau</button>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setSelectedInvoice(null)}>
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white px-6 py-5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-brand-muted">Chi tiết hóa đơn</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-brand-charcoal">{getInvoiceNumber(selectedInvoice)}</h3>
              </div>
              <button type="button" onClick={() => setSelectedInvoice(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-cream text-lg">×</button>
            </header>

            <div className="space-y-6 p-6">
              {detailLoading ? <p className="py-12 text-center text-xs uppercase tracking-widest text-brand-muted">Đang tải chi tiết...</p> : (
                <>
                  <div className="grid grid-cols-1 gap-4 border-b border-black/10 pb-6 sm:grid-cols-4">
                    <div><p className="text-[9px] uppercase text-brand-muted">Đơn hàng</p><p className="mt-1 font-semibold">{getInvoiceOrderId(selectedInvoice) != null ? `#${getInvoiceOrderId(selectedInvoice)}` : 'N/A'}</p></div>
                    <div><p className="text-[9px] uppercase text-brand-muted">Ngày đặt hàng</p><p className="mt-1 font-semibold">{selectedOrder?.orderDate ? new Date(selectedOrder.orderDate).toLocaleString('vi-VN') : 'N/A'}</p></div>
                    <div><p className="text-[9px] uppercase text-brand-muted">Ngày phát hành</p><p className="mt-1 font-semibold">{getInvoiceDate(selectedInvoice) ? new Date(getInvoiceDate(selectedInvoice)).toLocaleString('vi-VN') : 'N/A'}</p></div>
                    <div><p className="text-[9px] uppercase text-brand-muted">Tổng hóa đơn</p><p className="mt-1 font-bold">{getInvoiceAmount(selectedInvoice) != null ? formatVND(getInvoiceAmount(selectedInvoice)) : 'N/A'}</p></div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 border-b border-black/10 pb-6 text-xs sm:grid-cols-2">
                    <div><span className="font-semibold text-brand-muted">Người mua:</span> {selectedBuyer.name}</div>
                    <div><span className="font-semibold text-brand-muted">Số điện thoại:</span> {selectedBuyer.phone}</div>
                    <div><span className="font-semibold text-brand-muted">Email:</span> {selectedBuyer.email}</div>
                    <div><span className="font-semibold text-brand-muted">Trạng thái đơn:</span> {selectedOrder?.status || 'Chưa ghi nhận'}</div>
                    <div className="sm:col-span-2"><span className="font-semibold text-brand-muted">Địa chỉ giao hàng:</span> {selectedBuyer.address}</div>
                  </div>

                  <div>
                    <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-brand-muted">Danh sách sản phẩm</h4>
                    {items.length > 0 ? (
                      <div className="divide-y divide-gray-100 border border-black/10">
                        {items.map((item, index) => (
                          <div key={item.invoiceItemId || item.orderItemId || item.id || index} className="flex items-center justify-between gap-4 px-4 py-3 text-xs">
                            <div>
                              <p className="font-semibold text-brand-charcoal">{item.productName || item.product?.name || item.variant?.productName || item.name || 'Sản phẩm'}</p>
                              <p className="mt-1 text-[10px] text-brand-muted">{item.color || item.variant?.color || ''}{(item.size || item.variant?.size) ? ` · Size ${item.size || item.variant?.size}` : ''} · SL: {item.quantity || 1}</p>
                              <p className="mt-1 text-[10px] text-brand-muted">Đơn giá: {formatVND(item.unitPrice ?? item.price ?? 0)}{Number(item.discountAmount || 0) > 0 ? ` · Giảm: ${formatVND(item.discountAmount)}` : ''}</p>
                            </div>
                            <p className="font-bold text-brand-charcoal">{formatVND(item.lineTotal ?? item.totalAmount ?? (Number(item.unitPrice ?? item.price ?? 0) * (item.quantity || 1) - Number(item.discountAmount || 0)))}</p>
                          </div>
                        ))}
                      </div>
                    ) : <p className="border border-dashed border-black/15 p-6 text-center text-xs text-brand-muted">Backend chưa trả danh sách sản phẩm trong InvoiceDTO.</p>}
                  </div>

                  <div className="ml-auto w-full max-w-xs space-y-2 border-t border-black/10 pt-4 text-xs">
                    <p className="flex justify-between"><span className="text-brand-muted">Tiền hàng:</span><strong>{formatVND(subtotalAmount)}</strong></p>
                    <p className="flex justify-between"><span className="text-brand-muted">Giảm giá:</span><strong>-{formatVND(discountAmount)}</strong></p>
                    <p className="flex justify-between"><span className="text-brand-muted">Phí vận chuyển:</span><strong>{formatVND(shippingFee)}</strong></p>
                    <p className="flex justify-between border-t border-black/10 pt-2 text-sm"><span className="font-semibold">Tổng thanh toán:</span><strong>{formatVND(getInvoiceAmount(selectedInvoice) ?? 0)}</strong></p>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
