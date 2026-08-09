import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header/index.js'
import { Footer } from '@/components/layout/Footer/index.js'
import paymentApi from '@/api/payments/paymentApi.js'

// Số lần tối đa FE hỏi lại BE sau khi quay về từ cổng thanh toán.
const MAX_POLL_ATTEMPTS = 5
// Khoảng chờ giữa hai lần hỏi lại, đơn vị mili giây.
const POLL_INTERVAL_MS = 2000
const FINAL_STATUSES = ['SUCCESS', 'CANCELLED', 'EXPIRED', 'FAILED']
const unwrapApiData = (response) => response?.data?.data ?? response?.data ?? response
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const normalizePaymentStatus = (rawStatus) => {
  const status = String(rawStatus || '').trim().toUpperCase()
  if (['SUCCESS', 'PAID', 'COMPLETED'].includes(status)) return 'SUCCESS'
  if (['CANCELLED', 'CANCELED'].includes(status)) return 'CANCELLED'
  if (status === 'EXPIRED') return 'EXPIRED'
  if (['FAILED', 'FAIL', 'REFUNDED'].includes(status)) return 'FAILED'
  return 'PENDING'
}

const getApiErrorMessage = (error, fallback) => (
  error.response?.data?.message
  || error.response?.data?.data?.message
  || error.response?.data?.error
  || fallback
)

const getPaymentUrl = (data) => (
  data?.payUrl
  || data?.paymentUrl
  || data?.payment?.payUrl
  || data?.payment?.paymentUrl
)

const STATUS_CONTENT = {
  SUCCESS: {
    title: 'Thanh toán thành công',
    fallbackMessage: 'MoMo đã xác nhận giao dịch. Đơn hàng của bạn đang được xử lý.',
    badge: 'Đã thanh toán',
    tone: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-100',
  },
  CANCELLED: {
    title: 'Bạn đã hủy thanh toán',
    fallbackMessage: 'Giao dịch MoMo đã được hủy. Bạn có thể tạo lại giao dịch để tiếp tục thanh toán.',
    badge: 'Đã hủy',
    tone: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  EXPIRED: {
    title: 'Phiên thanh toán đã hết hạn',
    fallbackMessage: 'Liên kết thanh toán cũ không còn hiệu lực. Vui lòng tạo giao dịch mới để tiếp tục.',
    badge: 'Hết hạn',
    tone: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  FAILED: {
    title: 'Thanh toán thất bại',
    fallbackMessage: 'Giao dịch chưa được hoàn tất. Vui lòng thử thanh toán lại hoặc kiểm tra đơn hàng.',
    badge: 'Thất bại',
    tone: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
  },
  PENDING: {
    title: 'Đang xác nhận kết quả thanh toán...',
    fallbackMessage: 'Hệ thống đang chờ Backend xác nhận kết quả từ MoMo.',
    badge: 'Đang xử lý',
    tone: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  ERROR: {
    title: 'Không thể kiểm tra thanh toán',
    fallbackMessage: 'Không thể kết nối tới hệ thống thanh toán lúc này.',
    badge: 'Có lỗi',
    tone: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
  },
}

export const PaymentSuccessPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [paymentStatus, setPaymentStatus] = useState('PENDING')
  const [paymentData, setPaymentData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pollAttempt, setPollAttempt] = useState(0)
  const [pollingExhausted, setPollingExhausted] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const retryingRef = useRef(false)
  const [verificationRun, setVerificationRun] = useState(0)

  const queryInfo = useMemo(() => ({
    orderId: searchParams.get('orderId') || sessionStorage.getItem('momoOrderId'),
    resultCode: searchParams.get('resultCode'),
    message: searchParams.get('message'),
    transId: searchParams.get('transId'),
  }), [searchParams])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      sessionStorage.setItem('authRedirectUrl', `/payment-success?${searchParams.toString()}`)
      toast.error('Vui lòng đăng nhập để kiểm tra trạng thái thanh toán.')
      navigate('/auth', { replace: true })
      return undefined
    }

    if (!queryInfo.orderId) {
      setPaymentStatus('ERROR')
      setError('Không tìm thấy orderId trong URL để kiểm tra thanh toán.')
      setLoading(false)
      return undefined
    }

    let cancelled = false

    const verifyWithPolling = async () => {
      setLoading(true)
      setError('')
      setPollingExhausted(false)
      setPollAttempt(0)

      try {
        for (let attempt = 0; attempt <= MAX_POLL_ATTEMPTS; attempt += 1) {
          if (cancelled) return
          if (attempt > 0) {
            await wait(POLL_INTERVAL_MS)
            if (cancelled) return
            setPollAttempt(attempt)
          }

          const response = await paymentApi.getPaymentStatusByOrderId(queryInfo.orderId)
          const data = unwrapApiData(response)
          const verifiedStatus = normalizePaymentStatus(data?.paymentStatus ?? data?.status)

          if (cancelled) return
          setPaymentData(data)
          setPaymentStatus(verifiedStatus)

          if (FINAL_STATUSES.includes(verifiedStatus)) {
            sessionStorage.removeItem('momoOrderId')
            setLoading(false)
            return
          }
        }

        if (!cancelled) {
          setPollingExhausted(true)
          setLoading(false)
        }
      } catch (requestError) {
        if (cancelled) return
        console.error('Không thể xác nhận trạng thái thanh toán MoMo:', requestError)
        setPaymentStatus('ERROR')
        setError(getApiErrorMessage(
          requestError,
          'Không thể kiểm tra trạng thái thanh toán. Vui lòng kiểm tra kết nối mạng và thử lại.',
        ))
        setLoading(false)
      }
    }

    verifyWithPolling()
    return () => {
      cancelled = true
    }
  }, [navigate, queryInfo.orderId, searchParams, verificationRun])

  const handleRetryPayment = async () => {
    if (retryingRef.current) return

    const beeOrderId = paymentData?.orderId
    if (!beeOrderId) {
      toast.error('Không tìm thấy ID đơn hàng để tạo lại giao dịch.')
      return
    }

    try {
      retryingRef.current = true
      setRetrying(true)
      const response = await paymentApi.retryMomoPayment(beeOrderId)
      const data = unwrapApiData(response)
      const paymentUrl = getPaymentUrl(data)

      if (!paymentUrl) {
        throw new Error('Backend không trả về đường dẫn thanh toán MoMo mới.')
      }

      sessionStorage.setItem('momoOrderId', String(beeOrderId))
      localStorage.setItem('momoPayUrl', paymentUrl)
      window.location.assign(paymentUrl)
    } catch (requestError) {
      console.error('Không thể tạo lại giao dịch MoMo:', requestError)
      toast.error(getApiErrorMessage(
        requestError,
        requestError.message || 'Không thể tạo lại giao dịch MoMo. Vui lòng thử lại.',
      ))
      retryingRef.current = false
      setRetrying(false)
    }
  }

  const viewStatus = error ? 'ERROR' : paymentStatus
  const content = STATUS_CONTENT[viewStatus]
  const backendMessage = paymentData?.message
  const displayMessage = error
    || backendMessage
    || queryInfo.message
    || content.fallbackMessage
  const beeOrderId = paymentData?.orderId
  const orderDetailsUrl = beeOrderId ? `/my-orders?orderId=${beeOrderId}` : '/my-orders'
  const canRetryPayment = ['CANCELLED', 'EXPIRED', 'FAILED'].includes(paymentStatus) && beeOrderId

  return (
    <>
      <Header />
      <main className="pt-28 min-h-screen bg-brand-cream pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className={`w-20 h-20 ${content.bg} ${content.border} rounded-full flex items-center justify-center mx-auto mb-6 border`}>
              {loading && viewStatus === 'PENDING' ? (
                <svg className={`w-10 h-10 animate-spin ${content.tone}`} viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : viewStatus === 'SUCCESS' ? (
                <svg className={`w-10 h-10 ${content.tone}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : viewStatus === 'PENDING' ? (
                <svg className={`w-10 h-10 ${content.tone}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className={`w-10 h-10 ${content.tone}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>

            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${content.bg} ${content.tone} border ${content.border} mb-4`}>
              {content.badge}
            </span>
            <h1 className="font-display text-3xl font-bold text-brand-charcoal mb-3">{content.title}</h1>
            <p className="text-brand-muted text-sm leading-relaxed max-w-xl mx-auto mb-8">{displayMessage}</p>

            <div className="bg-brand-cream/50 rounded-xl p-5 text-left border border-gray-200/50 mb-8 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">Mã MoMo trả về</p>
                <p className="text-sm font-semibold text-brand-charcoal mt-1 break-words">{queryInfo.orderId || 'Không có'}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">Mã đơn hàng</p>
                <p className="text-sm font-semibold text-brand-charcoal mt-1">{beeOrderId || 'Đang xác định'}</p>
              </div>
              {queryInfo.transId && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">Mã giao dịch MoMo</p>
                  <p className="text-sm font-semibold text-brand-charcoal mt-1">{queryInfo.transId}</p>
                </div>
              )}
              {queryInfo.resultCode !== null && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">Mã kết quả MoMo</p>
                  <p className="text-sm font-semibold text-brand-charcoal mt-1">{queryInfo.resultCode}</p>
                </div>
              )}
            </div>

            {viewStatus === 'PENDING' && loading && (
              <p className="text-xs text-brand-muted mb-5">
                Đang kiểm tra lần {pollAttempt + 1}/{MAX_POLL_ATTEMPTS + 1}...
              </p>
            )}
            {viewStatus === 'PENDING' && pollingExhausted && (
              <p className="text-xs text-amber-700 mb-5">
                Backend vẫn đang xử lý sau 5 lần kiểm tra. Bạn có thể chờ thêm rồi kiểm tra lại.
              </p>
            )}

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              {(viewStatus === 'ERROR' || (viewStatus === 'PENDING' && pollingExhausted)) && (
                <button
                  type="button"
                  onClick={() => setVerificationRun((run) => run + 1)}
                  disabled={loading || !queryInfo.orderId}
                  className="btn-primary py-3 px-8 rounded-lg text-sm tracking-wider disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Kiểm tra lại
                </button>
              )}
              {canRetryPayment && (
                <button
                  type="button"
                  onClick={handleRetryPayment}
                  disabled={retrying}
                  className="btn-primary py-3 px-8 rounded-lg text-sm tracking-wider disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {retrying
                    ? 'Đang tạo giao dịch...'
                    : paymentStatus === 'EXPIRED' ? 'Tạo lại thanh toán' : 'Thanh toán lại'}
                </button>
              )}
              <Link to={orderDetailsUrl} className="inline-block py-3 px-8 rounded-lg text-sm tracking-wider border border-brand-charcoal text-brand-charcoal hover:bg-brand-charcoal hover:text-white transition-colors">
                {paymentStatus === 'SUCCESS' ? 'Xem chi tiết đơn hàng' : 'Xem đơn hàng'}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
