import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import toast from 'react-hot-toast'
import popupApi from '@/api/popups/popupApi.js'

const AUTO_OPEN_DELAY = 1400
const AUTO_OPEN_BLOCKED_PATHS = ['/cart', '/auth', '/reset-password']

const fallbackPopup = {
  id: 'welcome-offer',
  header: 'Ưu đãi dành cho bạn',
  title: 'Một món quà nhỏ từ OUTTA',
  description: 'Khám phá những thông tin và chương trình mới nhất từ OUTTA.',
  promotionCode: '',
}

const normalizePopup = (popup, index) => ({
  id: popup.id ?? popup.popupId ?? `popup-${index}`,
  header: popup.header || 'Thông báo từ OUTTA',
  title: popup.title || 'Ưu đãi mới dành cho bạn',
  description: popup.description || 'Khám phá thông tin và ưu đãi mới nhất từ OUTTA.',
  promotionCode: popup.promotionCode || popup.couponCode || '',
})

export const ShopPromptModal = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const modalRef = useRef(null)
  const overlayRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [popups, setPopups] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)

  const currentPopup = useMemo(
    () => popups[activeIndex] || fallbackPopup,
    [activeIndex, popups],
  )

  const openNotificationHub = useCallback(() => {
    setActiveIndex(0)
    setIsOpen(true)
  }, [])

  useEffect(() => {
    let isMounted = true

    const fetchNotifications = async () => {
      try {
        const popupResponse = await popupApi.getPopups()
        const responseBody = popupResponse?.data
        const responsePayload = responseBody?.data ?? responseBody
        const popupList = Array.isArray(responsePayload)
          ? responsePayload
          : responsePayload?.content || []

        if (isMounted) {
          setPopups(popupList.map(normalizePopup))
        }
      } catch (error) {
        console.warn('Không thể tải danh sách popup:', error)
        if (isMounted) setPopups([])
      }
    }

    fetchNotifications().finally(() => {
      if (isMounted) setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (isLoading || popups.length === 0 || AUTO_OPEN_BLOCKED_PATHS.includes(location.pathname)) return

    const dismissedUntil = localStorage.getItem('shopPromptDismissedUntil')
    const hasActiveDismissal = dismissedUntil === 'forever'
      || (dismissedUntil && Date.now() < Number(dismissedUntil))

    if (hasActiveDismissal || sessionStorage.getItem('appliedPromoCode')) return

    const timer = window.setTimeout(openNotificationHub, AUTO_OPEN_DELAY)
    return () => window.clearTimeout(timer)
  }, [isLoading, location.pathname, openNotificationHub, popups.length])

  useEffect(() => {
    if (!isOpen) return

    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 })
    gsap.fromTo(
      modalRef.current,
      { y: 24, scale: 0.98, opacity: 0 },
      { y: 0, scale: 1, opacity: 1, duration: 0.4, ease: 'power3.out' },
    )
  }, [isOpen])

  const closeNotifications = useCallback(() => {
    localStorage.setItem('shopPromptDismissedUntil', String(Date.now() + 24 * 60 * 60 * 1000))

    if (!modalRef.current || !overlayRef.current) {
      setIsOpen(false)
      return
    }

    gsap.to(modalRef.current, { y: 16, opacity: 0, duration: 0.2 })
    gsap.to(overlayRef.current, {
      opacity: 0,
      duration: 0.2,
      onComplete: () => setIsOpen(false),
    })
  }, [])

  const goToPopup = (index) => {
    const nextIndex = (index + popups.length) % popups.length
    setActiveIndex(nextIndex)
  }

  const copyPromotionCode = async () => {
    if (!currentPopup.promotionCode) return

    try {
      await navigator.clipboard.writeText(currentPopup.promotionCode)
      toast.success(`Đã sao chép mã: ${currentPopup.promotionCode}`)
    } catch {
      toast.error('Không thể sao chép mã. Vui lòng thử lại.')
    }
  }

  const viewOffer = () => {
    if (currentPopup.promotionCode) {
      sessionStorage.setItem('appliedPromoCode', currentPopup.promotionCode)
    }
    localStorage.setItem('shopPromptDismissedUntil', 'forever')
    setIsOpen(false)
    navigate('/shop')
  }

  if (!isLoading && popups.length === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={openNotificationHub}
        className="group fixed bottom-5 right-5 z-[45] flex h-14 w-14 items-center justify-center rounded-full border border-brand-charcoal/10 bg-white text-brand-charcoal shadow-[0_10px_30px_rgba(30,25,20,0.16)] transition-all hover:-translate-y-1 hover:border-brand-blush hover:shadow-[0_14px_34px_rgba(30,25,20,0.2)] sm:bottom-7 sm:right-7"
        aria-label="Mở thông báo và ưu đãi"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blush px-1 text-[8px] font-bold text-brand-charcoal ring-2 ring-white">
          {isLoading ? '…' : popups.length}
        </span>
        <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-md bg-brand-charcoal px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white opacity-0 translate-x-1 transition-all group-hover:translate-x-0 group-hover:opacity-100">
          Thông báo & ưu đãi
        </span>
      </button>

      {isOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeNotifications()
          }}
        >
          <section
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Thông báo và ưu đãi từ OUTTA"
            className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-6 py-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-brand-muted">OUTTA Studio</p>
                <h2 className="mt-1 text-sm font-semibold text-brand-charcoal">Thông báo & ưu đãi</h2>
              </div>
              <button
                type="button"
                onClick={closeNotifications}
                className="flex h-9 w-9 items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-brand-cream hover:text-brand-charcoal"
                aria-label="Đóng thông báo"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div key={currentPopup.id} className="relative min-h-0 overflow-y-auto px-6 py-8 sm:px-9 sm:py-10">
              <div className="mb-6 flex items-center justify-between">
                <span className="rounded-full bg-brand-blush/25 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-brand-charcoal">
                  {currentPopup.header}
                </span>
                <span className="text-[10px] font-medium tabular-nums text-brand-muted">
                  {String(activeIndex + 1).padStart(2, '0')} / {String(popups.length).padStart(2, '0')}
                </span>
              </div>

              <h3 className="max-w-md [overflow-wrap:anywhere] font-display text-3xl font-semibold leading-tight text-brand-charcoal sm:text-4xl">
                {currentPopup.title}
              </h3>
              <p className="mt-4 max-h-36 max-w-lg overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere] pr-2 text-sm leading-7 text-brand-muted [scrollbar-width:thin]">
                {currentPopup.description}
              </p>

              {currentPopup.promotionCode && (
                <button
                  type="button"
                  onClick={copyPromotionCode}
                  className="mt-6 flex w-full items-center justify-between rounded-xl border border-dashed border-brand-charcoal/20 bg-brand-cream/50 px-4 py-3.5 text-left transition-colors hover:border-brand-charcoal/40 hover:bg-brand-cream"
                >
                  <span>
                    <span className="block text-[8px] font-semibold uppercase tracking-[0.16em] text-brand-muted">Mã ưu đãi</span>
                    <span className="mt-1 block [overflow-wrap:anywhere] font-mono text-base font-bold tracking-[0.12em] text-brand-charcoal">{currentPopup.promotionCode}</span>
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-brand-charcoal">Sao chép</span>
                </button>
              )}

              <div className="mt-7 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2" aria-label="Vị trí thông báo hiện tại">
                  {popups.map((popup, index) => (
                    <button
                      key={popup.id}
                      type="button"
                      onClick={() => goToPopup(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        index === activeIndex ? 'w-6 bg-brand-charcoal' : 'w-1.5 bg-brand-charcoal/20 hover:bg-brand-charcoal/40'
                      }`}
                      aria-label={`Xem thông báo ${index + 1}`}
                    />
                  ))}
                </div>

                {popups.length > 1 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => goToPopup(activeIndex - 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-brand-charcoal transition-colors hover:border-brand-charcoal hover:bg-brand-cream"
                      aria-label="Thông báo trước"
                    >
                      <span aria-hidden="true">←</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => goToPopup(activeIndex + 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-charcoal text-white transition-all hover:bg-black"
                      aria-label="Thông báo tiếp theo"
                    >
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-black/[0.06] bg-brand-cream/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] leading-5 text-brand-muted">Thông tin mới nhất được cập nhật trực tiếp từ OUTTA.</p>
              <button
                type="button"
                onClick={viewOffer}
                className="inline-flex items-center justify-center bg-brand-charcoal px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-black"
              >
                Khám phá ngay
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
