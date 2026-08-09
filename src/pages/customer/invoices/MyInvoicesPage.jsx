import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header/index.js'
import { Footer } from '@/components/layout/Footer/index.js'
import invoiceApi from '@/api/invoices/invoiceApi.js'
import { formatVND } from '@/utils/currency/price.js'

const unwrapApiData = (response) => response?.data?.data ?? response?.data ?? response
const getOrder = (invoice) => invoice?.order || invoice?.orderDTO || invoice?.orderResponse || null
const getOrderId = (invoice) => invoice?.orderId ?? getOrder(invoice)?.orderId ?? getOrder(invoice)?.id
const getInvoiceItems = (invoice) => invoice?.items
  || invoice?.invoiceItems
  || invoice?.orderItems
  || getOrder(invoice)?.items
  || getOrder(invoice)?.orderDetails
  || []
const getBuyerInfo = (invoice) => {
  const order = getOrder(invoice)
  const user = order?.user || {}
  const accountName = [user.lastName, user.firstName].filter(Boolean).join(' ').trim()
  return {
    name: invoice?.buyerName || order?.fullName || accountName || user.username || 'Chưa ghi nhận',
    phone: invoice?.buyerPhone || order?.phone || user.phone || 'Chưa ghi nhận',
    email: invoice?.buyerEmail || user.email || 'Chưa ghi nhận',
  }
}
const getShippingAddress = (invoice) => {
  const order = getOrder(invoice)
  return invoice?.buyerAddress
    || invoice?.shippingAddress
    || order?.address
    || [
      invoice?.ward || order?.ward,
      invoice?.district || order?.district,
      invoice?.province || order?.province,
    ].filter(Boolean).join(', ')
    || 'Chưa ghi nhận'
}

export const MyInvoices = () => {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      sessionStorage.setItem('authRedirectUrl', '/my-invoices')
      navigate('/auth', { replace: true })
      return
    }

    const loadInvoices = async () => {
      try {
        const data = unwrapApiData(await invoiceApi.getMyInvoices())
        setInvoices(Array.isArray(data) ? data : data?.content || [])
      } catch (error) {
        console.error('Error loading invoices:', error)
        toast.error(error?.response?.data?.message || 'Không thể tải danh sách hóa đơn.')
      } finally {
        setLoading(false)
      }
    }

    loadInvoices()
  }, [navigate])

  const openInvoiceDetail = async (invoice) => {
    const invoiceId = invoice.invoiceId ?? invoice.id
    setSelectedInvoice(invoice)
    if (invoiceId == null) return

    try {
      setDetailLoading(true)
      const detail = unwrapApiData(await invoiceApi.getInvoiceById(invoiceId))
      if (detail) {
        setSelectedInvoice(current => ({ ...current, ...detail }))
      }
    } catch (error) {
      console.error(`Error loading invoice detail #${invoiceId}:`, error)
      toast.error(error?.response?.data?.message || 'Không thể tải chi tiết hóa đơn.')
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-brand-cream px-4 pb-16 pt-28 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 border-b border-black/10 pb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-muted">Tài khoản của bạn</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-brand-charcoal sm:text-4xl">Tra cứu hóa đơn</h1>
            <p className="mt-2 text-xs text-brand-muted">Theo dõi và kiểm tra các hóa đơn đã phát hành cho đơn hàng của bạn.</p>
          </div>

          {loading ? (
            <div className="border border-black/10 bg-white p-16 text-center text-xs uppercase tracking-widest text-brand-muted">Đang tải hóa đơn...</div>
          ) : invoices.length === 0 ? (
            <div className="border border-black/10 bg-white p-16 text-center">
              <h2 className="font-display text-xl font-semibold text-brand-charcoal">Chưa có hóa đơn</h2>
              <p className="mt-2 text-xs text-brand-muted">Hóa đơn sẽ xuất hiện tại đây sau khi được hệ thống phát hành.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice, index) => {
                const id = invoice.invoiceId ?? invoice.id
                const number = invoice.invoiceNumber || invoice.code || `HĐ-${id ?? index + 1}`
                const date = invoice.invoiceDate || invoice.issuedAt || invoice.createdAt || invoice.createdDate
                const amount = invoice.totalAmount ?? invoice.amount ?? invoice.orderTotal
                const orderId = getOrderId(invoice)
                return (
                  <article key={id ?? number} className="flex flex-col gap-4 border border-black/10 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-brand-charcoal">Hóa đơn {number}</h2>
                        {invoice.status && <span className="border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-800">{invoice.status}</span>}
                      </div>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-brand-muted">
                        {orderId != null ? `Đơn hàng #${orderId} · ` : ''}
                        {date ? new Date(date).toLocaleString('vi-VN') : 'Chưa ghi nhận ngày phát hành'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 sm:text-right">
                      <button
                        type="button"
                        onClick={() => openInvoiceDetail(invoice)}
                        className="border border-brand-charcoal px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-brand-charcoal transition-colors hover:bg-brand-charcoal hover:text-white"
                      >
                        Xem chi tiết
                      </button>
                      <div>
                      <p className="text-[9px] uppercase tracking-wider text-brand-muted">Tổng hóa đơn</p>
                      <p className="mt-1 font-bold text-brand-charcoal">{amount != null ? formatVND(amount) : 'Chưa ghi nhận'}</p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {selectedInvoice && (() => {
        const items = getInvoiceItems(selectedInvoice)
        const invoiceId = selectedInvoice.invoiceId ?? selectedInvoice.id
        const invoiceNumber = selectedInvoice.invoiceNumber || selectedInvoice.code || `HĐ-${invoiceId}`
        const orderId = getOrderId(selectedInvoice)
        const amount = selectedInvoice.totalAmount ?? selectedInvoice.amount ?? selectedInvoice.orderTotal
        const invoiceDate = selectedInvoice.invoiceDate || selectedInvoice.issuedAt || selectedInvoice.createdAt
        const order = getOrder(selectedInvoice)
        const buyer = getBuyerInfo(selectedInvoice)
        const shippingAddress = getShippingAddress(selectedInvoice)
        const subtotalAmount = selectedInvoice.subtotalAmount ?? order?.subtotalAmount
        const discountAmount = selectedInvoice.discountAmount ?? order?.discountAmount ?? 0
        const shippingFee = selectedInvoice.shippingFee ?? order?.shippingFee ?? 0
        return (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setSelectedInvoice(null)}>
            <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
              <header className="flex items-center justify-between border-b border-black/10 px-6 py-5">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-brand-muted">Chi tiết hóa đơn của bạn</p>
                  <h3 className="mt-1 font-display text-2xl font-bold text-brand-charcoal">{invoiceNumber}</h3>
                </div>
                <button type="button" onClick={() => setSelectedInvoice(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-cream text-lg">×</button>
              </header>
              <div className="space-y-6 p-6">
                {detailLoading ? (
                  <p className="py-12 text-center text-xs uppercase tracking-widest text-brand-muted">Đang tải chi tiết hóa đơn...</p>
                ) : (
                  <>
                  <div className="grid grid-cols-1 gap-4 border-b border-black/10 pb-5 text-xs sm:grid-cols-4">
                    <div><p className="text-[9px] uppercase text-brand-muted">Đơn hàng</p><p className="mt-1 font-semibold">{orderId != null ? `#${orderId}` : 'Chưa ghi nhận'}</p></div>
                    <div><p className="text-[9px] uppercase text-brand-muted">Ngày đặt hàng</p><p className="mt-1 font-semibold">{order?.orderDate ? new Date(order.orderDate).toLocaleString('vi-VN') : 'Chưa ghi nhận'}</p></div>
                    <div><p className="text-[9px] uppercase text-brand-muted">Ngày phát hành</p><p className="mt-1 font-semibold">{invoiceDate ? new Date(invoiceDate).toLocaleString('vi-VN') : 'Chưa ghi nhận'}</p></div>
                    <div><p className="text-[9px] uppercase text-brand-muted">Tổng hóa đơn</p><p className="mt-1 font-bold">{amount != null ? formatVND(amount) : 'Chưa ghi nhận'}</p></div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 border-b border-black/10 pb-5 text-xs sm:grid-cols-2">
                    <div><span className="font-semibold text-brand-muted">Người mua:</span> {buyer.name}</div>
                    <div><span className="font-semibold text-brand-muted">Số điện thoại:</span> {buyer.phone}</div>
                    <div><span className="font-semibold text-brand-muted">Email:</span> {buyer.email}</div>
                    <div><span className="font-semibold text-brand-muted">Trạng thái đơn:</span> {order?.status || 'Chưa ghi nhận'}</div>
                    <div className="sm:col-span-2"><span className="font-semibold text-brand-muted">Địa chỉ giao hàng:</span> {shippingAddress}</div>
                  </div>

                  <div>
                  <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-brand-muted">Danh sách sản phẩm</h4>
                  {items.length > 0 ? (
                    <div className="divide-y divide-gray-100 border border-black/10">
                      {items.map((item, index) => (
                        <div key={item.invoiceItemId || item.orderItemId || item.id || index} className="flex items-center justify-between gap-4 px-4 py-3 text-xs">
                          <div>
                            <p className="font-semibold text-brand-charcoal">{item.productName || item.product?.name || item.productVariant?.product?.productName || item.productVariant?.product?.name || item.name || 'Sản phẩm'}</p>
                            <p className="mt-1 text-[10px] text-brand-muted">{item.color || item.productVariant?.color || ''}{(item.size || item.productVariant?.size) ? ` · Size ${item.size || item.productVariant?.size}` : ''} · SL: {item.quantity || 1}</p>
                            <p className="mt-1 text-[10px] text-brand-muted">Đơn giá: {formatVND(item.unitPrice ?? item.price ?? 0)}{Number(item.discountAmount || 0) > 0 ? ` · Giảm: ${formatVND(item.discountAmount)}` : ''}</p>
                          </div>
                          <p className="font-bold text-brand-charcoal">{formatVND(item.lineTotal ?? item.subtotal ?? (Number(item.unitPrice ?? item.price ?? 0) * (item.quantity || 1) - Number(item.discountAmount || 0)))}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="border border-dashed border-black/15 p-6 text-center text-xs text-brand-muted">Hóa đơn chưa có dữ liệu sản phẩm.</p>
                  )}
                  </div>

                  <div className="ml-auto w-full max-w-xs space-y-2 border-t border-black/10 pt-4 text-xs">
                    <p className="flex justify-between"><span className="text-brand-muted">Tiền hàng:</span><strong>{formatVND(subtotalAmount ?? 0)}</strong></p>
                    <p className="flex justify-between"><span className="text-brand-muted">Giảm giá:</span><strong>-{formatVND(discountAmount)}</strong></p>
                    <p className="flex justify-between"><span className="text-brand-muted">Phí vận chuyển:</span><strong>{formatVND(shippingFee)}</strong></p>
                    <p className="flex justify-between border-t border-black/10 pt-2 text-sm"><span className="font-semibold">Tổng thanh toán:</span><strong>{formatVND(amount ?? 0)}</strong></p>
                  </div>
                  </>
                )}
              </div>
            </section>
          </div>
        )
      })()}
      <Footer />
    </>
  )
}
