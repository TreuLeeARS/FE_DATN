import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatVND } from '@/utils/currency/price.js'
import toast from 'react-hot-toast'
import orderApi from '@/api/orders/orderApi.js'
import paymentApi from '@/api/payments/paymentApi.js'
import { ConfirmModal } from '@/components/common/ConfirmModal.jsx'
import { useSearchParams } from 'react-router-dom'

// Số đơn hàng hiển thị mỗi trang ở admin.
const ADMIN_ORDERS_PER_PAGE = 15
// Số đơn tối đa tải về để lọc ở FE (chỉ dùng cho luồng hiện tại).
const ADMIN_ORDERS_FETCH_SIZE = 1_000

const unwrapApiData = (response) => response?.data?.data ?? response?.data ?? response

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '')

const getShippingInfo = (order = {}) => {
  const rawShippingAddress = String(order.shippingAddress || '')
  const parts = rawShippingAddress.includes(' | ') ? rawShippingAddress.split(' | ') : []
  const legacyName = parts[0] || ''
  const legacyPhone = parts.find((part) => part.startsWith('SĐT: '))?.replace('SĐT: ', '')
  const legacyAddress = parts.find((part) => part.startsWith('Địa chỉ: '))?.replace('Địa chỉ: ', '')
  const user = order.user || order.customer || order.userInfo || order.customerInfo || order.userResponse || {}
  const nestedFullName = firstValue(
    user.fullName,
    user.customerName,
    user.name,
    [user.lastName, user.firstName].filter(Boolean).join(' '),
    [user.firstName, user.lastName].filter(Boolean).join(' '),
  )

  return {
    fullName: firstValue(
      order.fullName,
      order.userFullName,
      order.customerFullName,
      order.recipientFullName,
      order.receiverFullName,
      order.shippingFullName,
      order.recipientName,
      order.receiverName,
      order.customerName,
      order.userName,
      order.username,
      order.name,
      nestedFullName,
      legacyName,
      user.username,
      'Chưa có',
    ),
    phone: firstValue(
      order.phone,
      order.phoneNumber,
      order.userPhone,
      order.recipientPhone,
      order.receiverPhone,
      order.customerPhone,
      user.phone,
      user.phoneNumber,
      legacyPhone,
      'Chưa có',
    ),
    address: firstValue(
      order.address,
      order.deliveryAddress,
      order.recipientAddress,
      order.receiverAddress,
      legacyAddress,
      parts.length === 0 ? rawShippingAddress : '',
      [order.ward, order.district, order.province].filter(Boolean).join(', '),
      'Chưa có',
    ),
  }
}

const getPaymentDetails = (payment = {}, order = {}) => ({
  id: firstValue(payment.paymentId, payment.id, payment.transactionId),
  method: firstValue(payment.paymentMethod, payment.paymentMethodType, payment.method, order.paymentMethodType, order.paymentMethod, 'COD'),
  amount: firstValue(payment.amount, payment.totalAmount, order.totalAmount, 0),
  status: String(firstValue(payment.status, payment.paymentStatus, order.paymentStatus, 'UNPAID')).toUpperCase(),
})

const getPaymentDisplay = (paymentStatus, orderStatus) => {
  const status = String(paymentStatus || 'UNPAID').toUpperCase()
  const isDelivered = String(orderStatus || '').toUpperCase() === 'DELIVERED'

  // BE trả SUCCESS khi MoMo/VNPay/COD thanh toán xong. Đơn đã giao cũng
  // được xem là đã thu tiền theo nghiệp vụ hiện tại.
  if (isDelivered || ['SUCCESS', 'PAID', 'COMPLETED'].includes(status)) {
    return { label: 'ĐÃ THANH TOÁN', tone: 'success', isPaid: true }
  }
  if (['CANCELLED', 'CANCELED'].includes(status)) {
    return { label: 'ĐÃ HỦY THANH TOÁN', tone: 'danger', isPaid: false }
  }
  if (status === 'EXPIRED') {
    return { label: 'THANH TOÁN HẾT HẠN', tone: 'warning', isPaid: false }
  }
  if (['FAILED', 'FAIL'].includes(status)) {
    return { label: 'THANH TOÁN THẤT BẠI', tone: 'danger', isPaid: false }
  }
  return { label: 'CHƯA THANH TOÁN', tone: 'warning', isPaid: false }
}

const paymentToneClass = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
}

const normalizeSearchText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()

const getOrderActionErrorMessage = (error, fallbackMessage) => (
  error.response?.data?.message?.trim()
  || (error.request
    ? 'Không thể kết nối đến máy chủ. Vui lòng thử lại.'
    : fallbackMessage)
)
  .trim()

export const OrderManager = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [allOrders, setAllOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'CREATED' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELED'
  const [searchQuery, setSearchQuery] = useState('')

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false
  })
  const openConfirm = (title, message, onConfirm, isDestructive = false) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm()
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      },
      isDestructive
    })
  }

  // Detail Modal state
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false)

  const filteredOrders = allOrders.filter(o => {
    const matchesStatus = statusFilter === 'ALL'
      || (statusFilter === 'CREATED' && (o.status === 'CREATED' || o.status === 'PENDING'))
      || (statusFilter === 'CANCELED' && (o.status === 'CANCELED' || o.status === 'CANCELLED'))
      || o.status === statusFilter

    if (!matchesStatus) return false

    const keyword = normalizeSearchText(searchQuery)
    if (!keyword) return true

    const shippingInfo = getShippingInfo(o)
    const searchableText = [
      o.orderId ?? o.id,
      shippingInfo.fullName,
      shippingInfo.phone,
    ].map(normalizeSearchText).join(' ')

    return searchableText.includes(keyword)
  })

  const pageSize = ADMIN_ORDERS_PER_PAGE
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1
  const activePage = Math.min(page, totalPages - 1)
  const displayedOrders = filteredOrders.slice(activePage * pageSize, (activePage + 1) * pageSize)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const res = await orderApi.getAllOrders({
        page: 0,
        size: ADMIN_ORDERS_FETCH_SIZE,
        sort: 'orderId,desc'
      })
      const data = unwrapApiData(res)
      setAllOrders(Array.isArray(data) ? data : data?.content || [])
    } catch (err) {
      console.error('Error fetching orders:', err)
      toast.error('Không thể tải danh sách đơn hàng.')
    } finally {
      setLoading(false)
    }
  }

  // --- FETCH ORDER PAYMENT METHOD INFO ---
  const fetchPaymentInfo = async (orderId) => {
    try {
      setLoadingPayment(true)
      setPaymentInfo(null)
      const res = await paymentApi.getPaymentByOrderId(orderId)
      setPaymentInfo(unwrapApiData(res) || null)
    } catch (err) {
      console.error('Error loading payment info:', err)
    } finally {
      setLoadingPayment(false)
    }
  }

  const handleOpenDetailModal = async (order) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
    fetchPaymentInfo(order.orderId)

    try {
      setLoadingOrderDetail(true)
      const response = await orderApi.getAdminOrderDetails(order.orderId)
      const detail = unwrapApiData(response)
      if (detail) {
        setSelectedOrder(current => current?.orderId === order.orderId
          ? { ...current, ...detail }
          : current
        )
      }
    } catch (error) {
      console.error('Error loading order details:', error)
      toast.error('Không thể tải danh sách sản phẩm của đơn hàng.')
    } finally {
      setLoadingOrderDetail(false)
    }
  }

  useEffect(() => {
    const requestedOrderId = searchParams.get('orderId')
    if (!requestedOrderId || loading || allOrders.length === 0) return
    const order = allOrders.find((item) => String(item.orderId ?? item.id) === requestedOrderId)
    if (order) {
      handleOpenDetailModal(order)
      setSearchParams({}, { replace: true })
    }
  }, [allOrders, loading, searchParams, setSearchParams])

  // --- UPDATE ORDER STATUS ACTIONS ---

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await orderApi.updateOrderStatus(orderId, newStatus)
      toast.success(`Cập nhật trạng thái đơn hàng thành công!`)
      fetchOrders()
      // Refresh modal view if open
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }))
      }
    } catch (err) {
      console.error('Error updating status:', err)
      toast.error(getOrderActionErrorMessage(err, 'Cập nhật trạng thái thất bại. Vui lòng thử lại.'))
    }
  }

  const handleShipOrder = async (orderId) => {
    try {
      await orderApi.setStatusIsShipping(orderId)
      toast.success('Bắt đầu giao hàng! Đơn hàng đã chuyển sang trạng thái SHIPPING.')
      fetchOrders()
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: 'SHIPPING' }))
      }
    } catch (err) {
      console.error('Error setting shipping:', err)
      toast.error(getOrderActionErrorMessage(err, 'Không thể chuyển đơn hàng sang trạng thái giao hàng.'))
    }
  }

  const handleDeliverOrder = async (orderId) => {
    try {
      await orderApi.setStatusIsDelivered(orderId)
      toast.success('Đơn hàng đã được giao thành công! Trạng thái đổi thành DELIVERED.')
      fetchOrders()
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: 'DELIVERED' }))
      }
    } catch (err) {
      console.error('Error setting delivered:', err)
      toast.error(getOrderActionErrorMessage(err, 'Không thể cập nhật đơn hàng đã giao.'))
    }
  }

  const handleCancelOrder = (orderId) => {
    openConfirm(
      'Hủy đơn hàng',
      'Bạn có chắc chắn muốn HỦY đơn hàng này?',
      async () => {
        try {
          await orderApi.cancelOrder(orderId)
          toast.success('Đơn hàng đã được hủy thành công!')
          fetchOrders()
          if (selectedOrder && selectedOrder.orderId === orderId) {
            setSelectedOrder(prev => ({ ...prev, status: 'CANCELLED' }))
          }
        } catch (err) {
          console.error('Error cancelling order:', err)
          toast.error(getOrderActionErrorMessage(err, 'Không thể hủy đơn hàng.'))
        }
      },
      true
    )
  }

  // --- CONFIRM COD PAYMENT ---
  const handleConfirmCodPayment = async (paymentId, orderId) => {
    try {
      await paymentApi.confirmCodPayment(paymentId)
      toast.success('Xác nhận thanh toán COD thành công! Tiền mặt đã thu.')
      fetchPaymentInfo(orderId) // reload payment info
    } catch (err) {
      console.error('Error confirming payment:', err)
      toast.error(getOrderActionErrorMessage(err, 'Không thể xác nhận thanh toán.'))
    }
  }

  // Helper colors for status badges
  const getStatusBadgeClass = (status) => {
    switch (String(status).toUpperCase()) {
      case 'CREATED':
        return 'bg-sky-100 text-sky-800 border-sky-300'
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'CONFIRMED':
        return 'bg-violet-100 text-violet-800 border-violet-300'
      case 'SHIPPING':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'CANCELED':
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-300'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusTranslation = (status) => {
    switch (String(status).toUpperCase()) {
      case 'CREATED':
        return 'Đã tạo'
      case 'PENDING':
        return 'Chờ xử lý'
      case 'CONFIRMED':
        return 'Đã xác nhận'
      case 'SHIPPING':
        return 'Đang giao hàng'
      case 'DELIVERED':
        return 'Đã nhận hàng'
      case 'CANCELED':
      case 'CANCELLED':
        return 'Đã hủy đơn'
      default:
        return status
    }
  }

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-16">

      {/* ─── TITLE BAR ─── */}
      <div className="bg-white p-6 border border-black/10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-wider text-brand-charcoal">Quản lý đơn hàng</h2>
          <p className="text-xs text-brand-muted mt-1">Quản lý danh sách đặt hàng, trạng thái vận chuyển và thông tin thanh toán hóa đơn</p>
        </div>

        {/* Status Tabs/Filters */}
        <div className="flex flex-wrap gap-1.5 bg-brand-cream/50 p-1 border border-gray-200">
          {['ALL', 'CREATED', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELED'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setStatusFilter(tab); setPage(0) }}
              className={`px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase transition-colors cursor-pointer rounded-none ${
                statusFilter === tab
                  ? 'bg-brand-charcoal text-white'
                  : 'text-brand-charcoal hover:bg-black/[0.03]'
              }`}
            >
              {tab === 'ALL' ? 'Tất cả' : getStatusTranslation(tab)}
            </button>
          ))}
        </div>
      </div>

      {/* ─── SEARCH ─── */}
      <div className="border border-black/10 bg-white p-4 shadow-sm">
        <div className="relative max-w-xl">
          <svg aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setPage(0)
            }}
            placeholder="Tìm theo mã đơn, tên khách hàng hoặc số điện thoại..."
            aria-label="Tìm kiếm đơn hàng"
            className="w-full border border-black/15 bg-white py-3 pl-11 pr-4 text-xs text-brand-charcoal outline-none transition-colors placeholder:text-brand-muted focus:border-brand-charcoal"
          />
        </div>
        {searchQuery.trim() && (
          <p className="mt-2 text-[10px] text-brand-muted">Tìm thấy {filteredOrders.length} đơn hàng.</p>
        )}
      </div>

      {/* ─── ORDERS TABLE ─── */}
      <div className="bg-white border border-black/10 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-charcoal text-white text-[10px] tracking-wider uppercase border-b border-black/10">
                <th className="py-4 px-4 font-semibold w-28 min-w-28">Mã đơn</th>
                <th className="py-4 px-4 font-semibold w-48">Khách hàng</th>
                <th className="py-4 px-4 font-semibold w-32">Số điện thoại</th>
                <th className="py-4 px-4 font-semibold w-32">Ngày đặt</th>
                <th className="py-4 px-4 font-semibold w-28">Tổng tiền</th>
                <th className="py-4 px-4 font-semibold w-32 text-center">Trạng thái</th>
                <th className="py-4 px-4 font-semibold w-36 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-brand-muted">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin text-brand-charcoal" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang tải danh sách đơn hàng...
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-brand-muted font-medium">
                    Không tìm thấy đơn đặt hàng nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                displayedOrders.map((o) => {
                  const shipInfo = getShippingInfo(o)
                  const orderId = o.orderId ?? o.id
                  const orderDateValue = o.orderDate || o.createdAt
                  const orderDate = orderDateValue
                    ? new Date(orderDateValue).toLocaleString('vi-VN')
                    : 'N/A'
                  return (
                    <tr key={orderId} className="hover:bg-black/[0.01] transition-colors">
                      <td className="py-4 px-4 align-top">
                        <p className="font-bold text-brand-charcoal whitespace-nowrap">#{orderId}</p>
                      </td>
                      <td className="py-4 px-4 font-medium text-brand-charcoal">{shipInfo.fullName}</td>
                      <td className="py-4 px-4 text-brand-muted">{shipInfo.phone}</td>
                      <td className="py-4 px-4 text-brand-muted">{orderDate}</td>
                      <td className="py-4 px-4 font-semibold text-brand-charcoal">
                        {formatVND(o.totalAmount)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-semibold border uppercase tracking-wider ${getStatusBadgeClass(o.status)}`}>
                          {getStatusTranslation(o.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center space-x-2">
                        <button
                           onClick={() => handleOpenDetailModal(o)}
                          className="text-[10px] uppercase tracking-wider font-semibold text-brand-charcoal hover:underline"
                        >
                          Chi tiết / Duyệt
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50 text-xs">
            <button
              disabled={activePage === 0}
              onClick={() => setPage(prev => Math.max(0, prev - 1))}
              className="px-3 py-1.5 border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
            >
              Trước
            </button>
            <span className="font-semibold text-brand-muted">
              Trang {activePage + 1} / {totalPages}
            </span>
            <button
              disabled={activePage >= totalPages - 1}
              onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
              className="px-3 py-1.5 border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
            >
              Sau
            </button>
          </div>
        )}
      </div>

      {/* ─── MODAL: ORDER DETAILS & ACTION BUTTONS ─── */}
      {isModalOpen && selectedOrder && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-charcoal/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white border border-black/10 shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto rounded-none">

            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal">
                  Chi tiết đơn hàng #{selectedOrder.orderId}
                </h3>
                <p className="text-[10px] text-brand-muted mt-0.5">Đặt ngày: {selectedOrder.createdAt || selectedOrder.orderDate ? new Date(selectedOrder.createdAt || selectedOrder.orderDate).toLocaleString('vi-VN') : 'N/A'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-brand-charcoal text-sm hover:opacity-70 font-semibold">✕</button>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs border-b border-gray-100 pb-6">
              {/* Customer delivery info */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-brand-muted border-b border-gray-100 pb-1">Thông tin nhận hàng</h4>
                {(() => {
                  const info = getShippingInfo(selectedOrder)
                  return (
                    <div className="space-y-1.5 text-brand-charcoal">
                      <p><span className="font-semibold text-brand-muted">Người nhận:</span> {info.fullName}</p>
                      <p><span className="font-semibold text-brand-muted">Số điện thoại:</span> {info.phone}</p>
                      <p><span className="font-semibold text-brand-muted">Địa chỉ nhận:</span> {info.address}</p>
                    </div>
                  )
                })()}
              </div>

              {/* Payment info */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-brand-muted border-b border-gray-100 pb-1">Trạng thái thanh toán</h4>
                <div className="space-y-1.5 text-brand-charcoal">
                  {loadingPayment ? (
                    <p className="text-brand-muted">Đang tải thông tin thanh toán...</p>
                  ) : paymentInfo ? (
                    (() => {
                      const payment = getPaymentDetails(paymentInfo, selectedOrder)
                      return <>
                      <p><span className="font-semibold text-brand-muted">Phương thức:</span> {payment.method}</p>
                      {payment.id && <p><span className="font-semibold text-brand-muted">Mã thanh toán:</span> ID_{payment.id}</p>}
                      <p><span className="font-semibold text-brand-muted">Tổng thanh toán:</span> {formatVND(payment.amount)}</p>
                      <p className="flex items-center gap-1.5">
                        <span className="font-semibold text-brand-muted">Trạng thái:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${paymentToneClass[getPaymentDisplay(payment.status, selectedOrder.status).tone]}`}>
                          {getPaymentDisplay(payment.status, selectedOrder.status).label}
                        </span>
                      </p>

                      {/* Confirm COD Payment Trigger for Admin */}
                      {payment.method === 'COD' && !getPaymentDisplay(payment.status, selectedOrder.status).isPaid && payment.id && selectedOrder.status === 'SHIPPING' && (
                        <button
                          type="button"
                          onClick={() => handleConfirmCodPayment(payment.id, selectedOrder.orderId)}
                          className="mt-2 bg-green-700 hover:bg-green-800 text-white text-[9px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-none cursor-pointer"
                        >
                          Xác nhận thu tiền mặt
                        </button>
                      )}
                    </>
                    })()
                  ) : (
                    <p className="text-brand-muted">Không tìm thấy thông tin giao dịch thanh toán.</p>
                  )}
                </div>
              </div>
            </div>

            {/* List of items purchased */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-brand-muted">Danh sách sản phẩm mua</h4>
              <div className="border border-gray-150 divide-y divide-gray-150 text-xs">
                {loadingOrderDetail ? (
                  <div className="p-4 text-center text-brand-muted text-xs">Đang tải chi tiết sản phẩm...</div>
                ) : (selectedOrder.items || selectedOrder.orderDetails || []).length > 0 ? (
                  (selectedOrder.items || selectedOrder.orderDetails).map((item, index) => (
                    <div key={item.orderItemId || item.id || index} className="flex justify-between items-center p-3 hover:bg-gray-50/50">
                      <div>
                        <p className="font-semibold text-brand-charcoal">{item.productName}</p>
                        <p className="text-[10px] text-brand-muted mt-0.5">Phân loại: {item.color || 'N/A'} / Size {item.size || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-brand-charcoal">{formatVND(item.unitPrice ?? item.price)} x {item.quantity}</p>
                        <p className="text-[10px] text-brand-muted font-bold mt-0.5">Tổng: {formatVND(item.lineTotal ?? item.subtotal ?? (Number(item.unitPrice ?? item.price) * item.quantity))}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-brand-muted text-xs">Không có dữ liệu chi tiết sản phẩm.</div>
                )}
              </div>
            </div>

            {/* Order totals */}
            <div className="flex justify-end text-xs font-semibold text-brand-charcoal pt-3 border-t border-gray-100">
              <div className="w-52 space-y-1.5 text-right">
                <p className="flex justify-between">
                  <span className="text-brand-muted">Thành tiền:</span>
                  <span>{formatVND(selectedOrder.totalAmount)}</span>
                </p>
                {selectedOrder.couponCode && (
                  <p className="flex justify-between text-brand-blush">
                    <span className="text-brand-muted">Mã giảm giá ({selectedOrder.couponCode}):</span>
                    <span>Đã áp dụng</span>
                  </p>
                )}
                <p className="flex justify-between text-sm font-bold text-brand-charcoal border-t border-gray-100 pt-1.5">
                  <span className="text-brand-muted">Tổng thu:</span>
                  <span>{formatVND(selectedOrder.totalAmount)}</span>
                </p>
              </div>
            </div>

            {/* ─── ADMINISTRATIVE ACTIONS CONTROLLERS ─── */}
            <div className="flex flex-wrap gap-2.5 pt-4 border-t border-gray-100 justify-between items-center text-xs">
              <div>
                <span className="font-semibold text-brand-muted uppercase text-[9px] tracking-wider">Trạng thái:</span>
                <span className={`ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(selectedOrder.status)}`}>
                  {getStatusTranslation(selectedOrder.status)}
                </span>
              </div>

              <div className="flex gap-2">
                {/* 1. Confirm / Prepare shipment */}
                {(selectedOrder.status === 'CREATED' || selectedOrder.status === 'PENDING') && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.orderId, 'CONFIRMED')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold tracking-wider uppercase px-4 py-2.5 rounded-none cursor-pointer"
                  >
                    Xác nhận đơn
                  </button>
                )}

                {/* 2. Dispatch / Start shipping */}
                {(selectedOrder.status === 'CREATED' || selectedOrder.status === 'PENDING' || selectedOrder.status === 'CONFIRMED') && (
                  <button
                    onClick={() => handleShipOrder(selectedOrder.orderId)}
                    className="bg-brand-charcoal hover:bg-brand-dark text-white text-[10px] font-bold tracking-wider uppercase px-4 py-2.5 rounded-none cursor-pointer"
                  >
                    Giao hàng
                  </button>
                )}

                {/* 3. Confirm Delivery */}
                {selectedOrder.status === 'SHIPPING' && (
                  <button
                    onClick={() => handleDeliverOrder(selectedOrder.orderId)}
                    className="bg-green-700 hover:bg-green-800 text-white text-[10px] font-bold tracking-wider uppercase px-4 py-2.5 rounded-none cursor-pointer"
                  >
                    Đã nhận hàng
                  </button>
                )}

                {/* 4. Cancel Order */}
                {selectedOrder.status !== 'DELIVERED' && selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'CANCELED' && (
                  <button
                    onClick={() => handleCancelOrder(selectedOrder.orderId)}
                    className="border border-red-600 text-red-600 hover:bg-red-50 text-[10px] font-bold tracking-wider uppercase px-4 py-2.5 rounded-none cursor-pointer"
                  >
                    Hủy đơn
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />

    </div>
  )
}
