import { useState, useLayoutEffect, useRef, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { AuthVisual } from './AuthVisual.jsx'
import { LoginForm } from './LoginForm.jsx'
import { RegisterForm } from './RegisterForm.jsx'
import { ForgotPasswordForm } from './ForgotPasswordForm.jsx'

// ─── Greeting config per tab ───
const greetings = {
  login: {
    title: 'Chào Mừng Trở Lại',
    subtitle: 'Đăng nhập để tiếp tục hành trình thời trang của bạn',
  },
  register: {
    title: 'Tạo Tài Khoản Mới',
    subtitle: 'Đăng ký để khám phá thế giới thời trang cá nhân hóa',
  },
  forgot: {
    title: 'Khôi Phục Mật Khẩu',
    subtitle: 'Nhập thông tin tài khoản để nhận email đặt lại mật khẩu',
  },
}

export const AuthPage = () => {
  const location = useLocation()
  const initialTab = location.state?.tab || 'login'
  const [activeTab, setActiveTab] = useState(initialTab)

  const containerRef = useRef(null)
  const formWrapperRef = useRef(null)
  const greetingRef = useRef(null)
  const tabIndicatorRef = useRef(null)
  const isAnimating = useRef(false)

  // ─── GSAP: Page Entrance Animation ───
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      // Mobile header
      tl.from('.auth-mobile-header', {
        y: -30,
        opacity: 0,
        duration: 0.5,
      }, 0)

      // Greeting slides up
      tl.from('.auth-greeting', {
        y: 40,
        opacity: 0,
        duration: 0.7,
      }, 0.2)

      // Tab buttons
      tl.from('.auth-tab-btn', {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
      }, 0.4)

      // Tab indicator scales in
      tl.from(tabIndicatorRef.current, {
        scaleX: 0,
        duration: 0.4,
        ease: 'power2.out',
      }, 0.6)

      // Form fields stagger in
      tl.from('.auth-form-field', {
        y: 30,
        opacity: 0,
        duration: 0.45,
        stagger: 0.07,
      }, 0.7)
    }, containerRef)

    return () => ctx.revert()
  }, [])

  // ─── GSAP: Tab Switch Animation ───
  const switchTab = useCallback((tab) => {
    if (tab === activeTab || isAnimating.current) return
    isAnimating.current = true

    const isGoingRight = tab === 'register' || tab === 'forgot'

    // 1. Animate tab indicator with GSAP
    if (tabIndicatorRef.current && tab !== 'forgot' && activeTab !== 'forgot') {
      gsap.to(tabIndicatorRef.current, {
        left: isGoingRight ? '50%' : '0%',
        duration: 0.35,
        ease: 'power2.inOut',
      })
    }

    // 2. Fade out current content
    const tl = gsap.timeline()

    tl.to(greetingRef.current, {
      opacity: 0,
      y: -15,
      duration: 0.2,
      ease: 'power2.in',
    }, 0)

    tl.to(formWrapperRef.current, {
      opacity: 0,
      x: isGoingRight ? -25 : 25,
      duration: 0.25,
      ease: 'power2.in',
    }, 0)

    // 3. Update state, then animate in new content
    tl.call(() => {
      setActiveTab(tab)
    })

    tl.call(() => {
      // Greeting fade in
      gsap.fromTo(greetingRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
      )

      // Form slides in from opposite side
      gsap.fromTo(formWrapperRef.current,
        { opacity: 0, x: isGoingRight ? 25 : -25 },
        { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
      )

      // Stagger form fields
      requestAnimationFrame(() => {
        gsap.from('.auth-form-field', {
          y: 18,
          opacity: 0,
          duration: 0.35,
          stagger: 0.05,
          ease: 'power2.out',
          delay: 0.05,
          onComplete: () => {
            isAnimating.current = false
          },
        })
      })
    }, null, null, '+=0.05')
  }, [activeTab])

  const currentGreeting = greetings[activeTab]

  return (
    <div ref={containerRef} className="min-h-screen flex bg-white">
      {/* ═══════════ Left Visual Panel ═══════════ */}
      <AuthVisual />

      {/* ═══════════ Right Form Panel ═══════════ */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen">

        {/* ─── Mobile Header (lg:hidden) ─── */}
        <div className="auth-mobile-header lg:hidden flex items-center justify-between p-5 sm:p-6">
          <Link
            to="/"
            className="p-2 -ml-2 text-brand-muted hover:text-brand-charcoal transition-colors"
            aria-label="Quay lại trang chủ"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <Link to="/" className="font-display text-2xl font-bold text-brand-charcoal">
            OUTTA <span className="text-brand-blush">Studio</span>
          </Link>
          <div className="w-9" /> {/* spacer for centering */}
        </div>

        {/* ─── Form Area ─── */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-8 overflow-y-auto">
          <div className="w-full max-w-md">

            {/* ─── Greeting ─── */}
            <div ref={greetingRef} className="auth-greeting mb-8">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-charcoal mb-2">
                {currentGreeting.title}
              </h2>
              <p className="text-brand-muted text-base">
                {currentGreeting.subtitle}
              </p>
            </div>

            {/* ─── Tab Switcher ─── */}
            {activeTab !== 'forgot' && (
              <div className="relative flex mb-10">
                <button
                  className={`auth-tab-btn flex-1 pb-4 text-base font-display font-semibold
                             transition-colors duration-200
                             ${activeTab === 'login' ? 'text-brand-charcoal' : 'text-brand-muted hover:text-brand-charcoal/60'}`}
                  onClick={() => switchTab('login')}
                >
                  Đăng Nhập
                </button>
                <button
                  className={`auth-tab-btn flex-1 pb-4 text-base font-display font-semibold
                             transition-colors duration-200
                             ${activeTab === 'register' ? 'text-brand-charcoal' : 'text-brand-muted hover:text-brand-charcoal/60'}`}
                  onClick={() => switchTab('register')}
                >
                  Đăng Ký
                </button>

                {/* Animated tab indicator (GSAP controlled) */}
                <div className="absolute bottom-0 left-0 w-full h-px bg-gray-200" />
                <div
                  ref={tabIndicatorRef}
                  className="absolute bottom-0 h-0.5 bg-brand-charcoal"
                  style={{
                    left: activeTab === 'login' ? '0%' : '50%',
                    width: '50%',
                  }}
                />
              </div>
            )}

            {/* ─── Form Content ─── */}
            <div ref={formWrapperRef}>
              {activeTab === 'login' ? (
                <LoginForm onSwitchTab={() => switchTab('register')} onForgotPassword={() => switchTab('forgot')} />
              ) : activeTab === 'register' ? (
                <RegisterForm onSwitchTab={() => switchTab('login')} />
              ) : (
                <ForgotPasswordForm onSwitchTab={() => switchTab('login')} />
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
