import { useState, useEffect } from 'react'
import { formatVND } from '@/utils/currency/price.js'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header/index.js'
import { Footer } from '@/components/layout/Footer/index.js'
import orderApi from '@/api/orders/orderApi.js'
import paymentApi from '@/api/payments/paymentApi.js'
import { ConfirmModal } from '@/components/common/ConfirmModal.jsx'
import { useCartContext } from '@/contexts/cart/CartContext.jsx'

// Số đơn hàng hiển thị mỗi trang.
const MY_ORDERS_PER_PAGE = 10

const unwrapApiData = (response) => response?.data?.data ?? response?.data ?? response
const orderProgressSteps = [
  { status: 'CREATED', label: 'Đã tạo' },
  { status: 'CONFIRMED', label: 'Đã xác nhận' },
  { status: 'SHIPPING', label: 'Đang giao' },
  { status: 'DELIVERED', label: 'Đã nhận' },
]

const normalizeOrderStatus = (status) => {
  const value = String(status || '').toUpperCase()
  if (value === 'PENDING') return 'CREATED'
  if (value === 'CANCELED') return 'CANCELLED'
  if (value === 'COMPLETED') return 'DELIVERED'
  return value
}

export const MyOrders = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedOrderId = searchParams.get('orderId')
  const { addItem } = useCartContext()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [paymentStatuses, setPaymentStatuses] = useState({}) // orderId -> status text
  const [repayingOrderId, setRepayingOrderId] = useState(null)
  const [cancellingOrderId, setCancellingOrderId] = useState(null)
  const [reorderingOrderId, setReorderingOrderId] = useState(null)
  const [loadingDetailOrderId, setLoadingDetailOrderId] = useState(null)

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

  // 1. Kiểm tra trạng thái đăng nhập
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      toast.error('Vui lòng đăng nhập để xem lịch sử mua hàng.')
      sessionStorage.setItem('authRedirectUrl', '/my-orders')
      navigate('/auth', { replace: true })
    }
  }, [navigate])

  // 2. Fetch danh sách đơn hàng của tôi
  useEffect(() => {
    const fetchMyOrders = async () => {
      try {
        setLoading(true)
        const res = await orderApi.getMyOrders({
          page: page,
          size: MY_ORDERS_PER_PAGE,
          sort: 'orderId,desc'
        })
        if (res && res.data) {
          const responseData = unwrapApiData(res)
          const list = responseData?.content || []
          setOrders(list)
          setTotalPages(responseData?.totalPages || 1)

          // Tải thêm thông tin thanh toán cho từng đơn hàng
          list.forEach(o => {
            fetchOrderPaymentStatus(o.orderId)
          })
        }
      } catch (err) {
        console.error('Error fetching my orders:', err)
        toast.error('Không thể tải lịch sử đơn hàng của bạn.')
      } finally {
        setLoading(false)
      }
    }
    fetchMyOrders()
  }, [page])

  const fetchOrderPaymentStatus = async (orderId) => {
    try {
      const res = await paymentApi.getPaymentStatusByOrderId(orderId)
      if (res && res.data) {
        const paymentData = unwrapApiData(res)
        const status = paymentData?.paymentStatus || paymentData?.status || 'UNPAID'
        setPaymentStatuses(prev => ({
          ...prev,
          [orderId]: String(status).toUpperCase()
        }))
      }
    } catch (e) {
      console.error(`Error loading payment status for order #${orderId}:`, e)
    }
  }

  const getPaymentUrl = (data) => (
    data?.payUrl
    || data?.paymentUrl
    || data?.deeplink
    || data?.payment?.payUrl
    || data?.payment?.paymentUrl
    || data?.payment?.deeplink
  )

  const handleRepayOrder = async (order) => {
    try {
      setRepayingOrderId(order.orderId)

      // Một số response danh sách đơn hàng đã chứa sẵn URL thanh toán.
      let paymentUrl = getPaymentUrl(order)

      // Nếu chưa có, lấy giao dịch thanh toán mới nhất của đơn hàng.
      if (!paymentUrl) {
        const response = await paymentApi.getPaymentByOrderId(order.orderId)
        paymentUrl = getPaymentUrl(unwrapApiData(response))
      }

      if (!paymentUrl) {
        toast.error('Đơn hàng chưa có liên kết thanh toán. Vui lòng liên hệ OUTTA để được hỗ trợ tạo lại giao dịch.')
        return
      }

      sessionStorage.setItem('momoOrderId', String(order.orderId))
      localStorage.setItem('momoPayUrl', paymentUrl)
      window.location.assign(paymentUrl)
    } catch (error) {
      console.error(`Error retrying payment for order #${order.orderId}:`, error)
      toast.error('Không thể mở lại giao dịch thanh toán. Vui lòng thử lại sau.')
    } finally {
      setRepayingOrderId(null)
    }
  }

  const handleCancelMyOrder = (orderId) => {
    openConfirm(
      'Hủy đơn hàng',
      'Bạn có chắc chắn muốn hủy đơn hàng này?',
      async () => {
        try {
          setCancellingOrderId(orderId)
          const response = await orderApi.cancelOrder(orderId)
          const cancelledOrder = unwrapApiData(response)
          toast.success('Hủy đơn hàng thành công!')
          setOrders(prev => prev.map(o => o.orderId === orderId
            ? { ...o, ...cancelledOrder, status: cancelledOrder?.status || 'CANCELLED' }
            : o
          ))
          setPaymentStatuses(prev => ({ ...prev, [orderId]: prev[orderId] || 'UNPAID' }))
        } catch (err) {
          console.error('Error cancelling order:', err)
          const message = err?.response?.data?.message
          toast.error(message || 'Không thể hủy đơn hàng này. Vui lòng liên hệ hỗ trợ!')
        } finally {
          setCancellingOrderId(null)
        }
      },
      true
    )
  }

  const handleReorder = async (order) => {
    try {
      setReorderingOrderId(order.orderId)

      let orderItems = order.items || order.orderDetails || []
      if (orderItems.length === 0) {
        const detail = unwrapApiData(await orderApi.getOrderById(order.orderId))
        orderItems = detail?.items || detail?.orderDetails || []
      }

      if (orderItems.length === 0) {
        toast.error('Không tìm thấy sản phẩm trong đơn hàng để mua lại.')
        return
      }

      for (const item of orderItems) {
        await addItem({
          id: item.productId,
          productVariantId: item.productVariantId || item.variantId,
          name: item.productName || item.name,
          selectedColor: item.color,
          selectedSize: item.size,
          price: item.unitPrice ?? item.price,
        }, Math.max(1, Number(item.quantity) || 1))
      }

      toast.success('Đã thêm lại sản phẩm vào giỏ hàng!')
      navigate('/cart')
    } catch (error) {
      console.error(`Error reordering order #${order.orderId}:`, error)
      toast.error('Không thể mua lại đơn hàng này. Vui lòng thử lại.')
    } finally {
      setReorderingOrderId(null)
    }
  }

  const toggleExpandOrder = async (order) => {
    const orderId = order.orderId
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null)
      return
    }

    setExpandedOrderId(orderId)
    if ((order.items || order.orderDetails || []).length > 0) return

    try {
      setLoadingDetailOrderId(orderId)
      const detail = unwrapApiData(await orderApi.getOrderById(orderId))
      if (detail) {
        setOrders(previous => previous.map(item => item.orderId === orderId
          ? { ...item, ...detail }
          : item
        ))
      }
    } catch (error) {
      console.error(`Error loading order details #${orderId}:`, error)
      toast.error('Không thể tải chi tiết đơn hàng. Vui lòng thử lại.')
    } finally {
      setLoadingDetailOrderId(null)
    }
  }

  useEffect(() => {
    if (loading || !requestedOrderId || expandedOrderId !== null) return

    const requestedOrder = orders.find(
      (order) => String(order.orderId) === String(requestedOrderId),
    )
    if (requestedOrder) toggleExpandOrder(requestedOrder)
  }, [loading, requestedOrderId, orders, expandedOrderId])

  const getShippingInfo = (order) => {
    const rawAddress = String(order?.shippingAddress || order?.address || '').trim()
    let legacyFullName = ''
    let legacyPhone = ''
    let legacyAddress = ''

    // Tương thích các đơn cũ từng lưu chung theo dạng:
    // "Tên người nhận | SĐT: ... | Địa chỉ: ...".
    if (rawAddress.includes(' | ')) {
      const parts = rawAddress.split(' | ').map(part => part.trim())
      legacyFullName = parts.find(part => (
        !part.startsWith('SĐT:') && !part.startsWith('Địa chỉ:')
      )) || ''
      legacyPhone = (parts.find(part => part.startsWith('SĐT:')) || '')
        .replace(/^SĐT:\s*/, '')
      legacyAddress = (parts.find(part => part.startsWith('Địa chỉ:')) || '')
        .replace(/^Địa chỉ:\s*/, '')
    }

    return {
      fullName: order?.fullName || order?.receiverName || legacyFullName || 'N/A',
      phone: order?.phone || order?.receiverPhone || legacyPhone || 'N/A',
      address: legacyAddress || rawAddress || 'N/A',
    }
  }

  const getStatusLabel = (status) => {
    switch (String(status).toUpperCase()) {
      case 'PENDING': return 'Chờ duyệt'
      case 'CREATED': return 'Đã tạo'
      case 'CONFIRMED': return 'Đã xác nhận'
      case 'SHIPPING': return 'Đang giao hàng'
      case 'DELIVERED': return 'Đã nhận hàng'
      case 'CANCELLED': return 'Đã hủy'
      case 'CANCELED': return 'Đã hủy'
      default: return status
    }
  }

  const getStatusColorClass = (status) => {
    switch (String(status).toUpperCase()) {
      case 'CREATED': return 'bg-sky-100 text-sky-800 border-sky-300'
      case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'CONFIRMED': return 'bg-violet-100 text-violet-800 border-violet-300'
      case 'SHIPPING': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'DELIVERED': return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'CANCELED':
      case 'CANCELLED': return 'bg-rose-100 text-rose-800 border-rose-300'
      default: return 'text-gray-500 bg-gray-50 border-gray-200'
    }
  }

  return (
    <>
      <Header />

      <main className="pt-28 min-h-screen bg-brand-cream pb-16 font-sans">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">

          {/* Header Title */}
          <div className="mb-10 text-center sm:text-left border-b border-black/10 pb-6">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-brand-charcoal uppercase tracking-widest">
              Lịch sử mua hàng
            </h1>
            <p className="text-brand-muted text-xs mt-1 uppercase tracking-wider">
              Xem lại các đơn hàng bạn đã đặt và theo dõi trạng thái giao hàng
            </p>
          </div>

          {/* Orders list container */}
          {loading ? (
            <div className="bg-white border border-black/10 p-20 text-center flex flex-col items-center justify-center">
              <svg className="w-8 h-8 animate-spin text-brand-charcoal mb-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted">Đang tải lịch sử đơn hàng...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white border border-black/10 p-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-brand-cream flex items-center justify-center mx-auto text-brand-muted">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-bold text-brand-charcoal">Bạn chưa đặt đơn hàng nào</h3>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">Hãy ghé qua cửa hàng của chúng tôi để chọn lựa những thiết kế thời trang cao cấp nhất.</p>
              <button
                onClick={() => navigate('/shop')}
                className="btn-primary py-2.5 px-6 text-[10px] tracking-widest font-bold uppercase rounded-none cursor-pointer"
              >
                Ghé thăm cửa hàng
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => {
                const shipInfo = getShippingInfo(o)
                const isExpanded = expandedOrderId === o.orderId
                const payStatus = paymentStatuses[o.orderId] || 'UNPAID'
                const paymentMethod = o.paymentMethodType || o.paymentMethod || 'Chưa ghi nhận'
                const paymentMethodCode = String(
                  o.paymentMethodType
                  || o.paymentMethodCode
                  || o.paymentMethod?.paymentMethodType
                  || o.paymentMethod?.code
                  || o.paymentMethod?.name
                  || o.paymentMethod
                  || ''
                ).toUpperCase()
                const isCodPayment = paymentMethodCode === 'COD'
                  || paymentMethodCode.includes('CASH_ON_DELIVERY')
                  || paymentMethodCode.includes('THANH TOÁN KHI NHẬN HÀNG')
                const orderItems = o.items || o.orderDetails || []
                const normalizedStatus = normalizeOrderStatus(o.status)
                const canCancelOrder = ['CREATED', 'CONFIRMED'].includes(normalizedStatus)
                const currentStepIndex = orderProgressSteps.findIndex(step => step.status === normalizedStatus)
                const isCancelled = normalizedStatus === 'CANCELLED'
                const canReorder = isCancelled || normalizedStatus === 'DELIVERED'

                return (
                  <div key={o.orderId} className="bg-white border border-black/10 shadow-sm overflow-hidden transition-all duration-300">

                    {/* Header of Order Card */}
                    <div
                      onClick={() => toggleExpandOrder(o)}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-black/[0.01] transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-brand-charcoal">Đơn hàng #{o.orderId}</span>
                          <span className={`px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${getStatusColorClass(o.status)}`}>
                            {getStatusLabel(o.status)}
                          </span>
                        </div>
                        <p className="text-[10px] text-brand-muted uppercase">
                          Ngày đặt: {o.orderDate || o.createdAt
                            ? new Date(o.orderDate || o.createdAt).toLocaleString('vi-VN')
                            : 'Chưa ghi nhận'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <div className="text-right">
                          <p className="text-xs text-brand-muted uppercase">Tổng thanh toán</p>
                          <p className="font-bold text-base text-brand-charcoal">{formatVND(o.totalAmount)}</p>
                        </div>

                        {/* Dropdown toggle indicator */}
                        <svg
                          className={`w-4 h-4 text-brand-muted transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Expandable Order Detail Content */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-6 text-xs animate-slide-down">

                        {/* Order tracking timeline */}
                        <div className="border border-black/[0.08] bg-white px-4 py-5 sm:px-6">
                          <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                              <h4 className="text-[9px] font-bold uppercase tracking-[0.16em] text-brand-muted">Theo dõi đơn hàng</h4>
                              <p className="mt-1 text-xs font-semibold text-brand-charcoal">
                                {isCancelled ? 'Đơn hàng đã được hủy' : getStatusLabel(normalizedStatus)}
                              </p>
                            </div>
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isCancelled ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                          </div>

                          {isCancelled ? (
                            <div className="flex items-center gap-3 rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">×</span>
                              <div>
                                <p className="font-semibold">Đã hủy đơn hàng</p>
                                <p className="mt-0.5 text-[10px] text-rose-700">Đơn hàng này không còn trong quá trình xử lý và giao nhận.</p>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-4">
                              {orderProgressSteps.map((step, index) => {
                                const completed = currentStepIndex >= index
                                const active = currentStepIndex === index
                                return (
                                  <div key={step.status} className="relative flex flex-col items-center text-center">
                                    {index > 0 && (
                                      <span className={`absolute right-1/2 top-3 h-0.5 w-full ${currentStepIndex >= index ? 'bg-emerald-500' : 'bg-black/10'}`} />
                                    )}
                                    <span className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-bold transition-colors ${
                                      completed
                                        ? 'border-emerald-500 bg-emerald-500 text-white'
                                        : 'border-black/15 bg-white text-brand-muted'
                                    }`}>
                                      {completed ? '✓' : index + 1}
                                    </span>
                                    <span className={`mt-2 text-[8px] font-semibold uppercase tracking-[0.08em] sm:text-[9px] ${active ? 'text-emerald-700' : completed ? 'text-brand-charcoal' : 'text-brand-muted'}`}>
                                      {step.label}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* Summary details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-4 border-b border-gray-200">
                          <div className="space-y-1.5 text-brand-charcoal">
                            <h4 className="text-[9px] uppercase font-bold text-brand-muted tracking-wider">Địa chỉ giao nhận</h4>
                            <p><span className="font-semibold text-brand-muted">Người nhận:</span> {shipInfo.fullName}</p>
                            <p><span className="font-semibold text-brand-muted">Số điện thoại:</span> {shipInfo.phone}</p>
                            <p><span className="font-semibold text-brand-muted">Địa chỉ:</span> {shipInfo.address}</p>
                          </div>

                          <div className="space-y-1.5 text-brand-charcoal">
                            <h4 className="text-[9px] uppercase font-bold text-brand-muted tracking-wider">Thông tin thanh toán</h4>
                          <p><span className="font-semibold text-brand-muted">Phương thức:</span> {paymentMethod}</p>
                            <p className="flex items-center gap-1.5">
                              <span className="font-semibold text-brand-muted">Giao dịch:</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                                payStatus === 'PAID'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {payStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                              </span>
                            </p>
                            {o.note && <p><span className="font-semibold text-brand-muted">Ghi chú:</span> {o.note}</p>}
                          </div>
                        </div>

                        {/* Order items list */}
                        <div className="space-y-2">
                          <h4 className="text-[9px] uppercase font-bold text-brand-muted tracking-wider">Danh sách món hàng</h4>
                          <div className="bg-white border border-gray-150 divide-y divide-gray-100">
                            {loadingDetailOrderId === o.orderId ? (
                              <p className="p-4 text-center text-[10px] uppercase tracking-wider text-brand-muted">
                                Đang tải chi tiết đơn hàng...
                              </p>
                            ) : orderItems.map((item, idx) => (
                              <div key={item.orderItemId || item.id || idx} className="flex justify-between items-center p-3">
                                <div>
                                  <p className="font-semibold text-brand-charcoal">{item.productName}</p>
                                  <p className="text-[10px] text-brand-muted mt-0.5">
                                    Phân loại: {item.color || 'N/A'} / Size {item.size || 'N/A'}
                                    {item.sku && <span> · SKU: {item.sku}</span>}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-brand-charcoal">
                                    {formatVND(item.unitPrice ?? item.price)} × {item.quantity}
                                  </p>
                                  <p className="mt-0.5 text-[10px] text-brand-muted">
                                    {formatVND(item.lineTotal ?? (Number(item.unitPrice ?? item.price) * item.quantity))}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {loadingDetailOrderId !== o.orderId && orderItems.length === 0 && (
                              <p className="p-4 text-center text-[10px] text-brand-muted">
                                Đơn hàng chưa có thông tin sản phẩm.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Order footer actions */}
                        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            {canCancelOrder && (
                              <button
                                type="button"
                                onClick={() => handleCancelMyOrder(o.orderId)}
                                disabled={cancellingOrderId === o.orderId}
                                className="border border-red-500 text-red-500 text-[10px] font-semibold tracking-wider uppercase px-4 py-2 hover:bg-red-50 transition-colors rounded-none cursor-pointer disabled:cursor-wait disabled:opacity-60"
                              >
                                {cancellingOrderId === o.orderId ? 'Đang hủy...' : 'Hủy đơn hàng'}
                              </button>
                            )}
                            {canReorder && (
                              <button
                                type="button"
                                onClick={() => handleReorder(o)}
                                disabled={reorderingOrderId === o.orderId}
                                className="bg-brand-charcoal text-white text-[10px] font-bold tracking-wider uppercase px-5 py-2.5 hover:bg-black transition-colors disabled:cursor-wait disabled:opacity-60 cursor-pointer"
                              >
                                {reorderingOrderId === o.orderId ? 'Đang thêm vào giỏ...' : 'Mua lại'}
                              </button>
                            )}
                            {payStatus !== 'PAID' && !isCancelled && !isCodPayment && (
                              <button
                                type="button"
                                onClick={() => handleRepayOrder(o)}
                                disabled={repayingOrderId === o.orderId}
                                className="bg-brand-charcoal text-white text-[10px] font-bold tracking-wider uppercase px-5 py-2.5 hover:bg-black transition-colors disabled:cursor-wait disabled:opacity-60 cursor-pointer"
                              >
                                {repayingOrderId === o.orderId ? 'Đang mở thanh toán...' : 'Thanh toán lại'}
                              </button>
                            )}
                          </div>
                          <p className="text-brand-muted text-[10px] italic sm:text-right">
                            * Vui lòng liên hệ hotline của Outta nếu bạn muốn đổi trả hàng sau khi đã giao.
                          </p>
                        </div>

                      </div>
                    )}

                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-8 text-xs">
              <button
                disabled={page === 0}
                onClick={() => setPage(prev => Math.max(0, prev - 1))}
                className="px-4 py-2 border border-black/10 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/[0.02]"
              >
                Trang trước
              </button>
              <span className="font-semibold text-brand-muted">
                Trang {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
                className="px-4 py-2 border border-black/10 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/[0.02]"
              >
                Trang sau
              </button>
            </div>
          )}

        </div>
      </main>

      <Footer />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />
    </>
  )
}
