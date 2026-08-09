import { useState, useLayoutEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import toast from 'react-hot-toast'
import { AuthVisual } from './AuthVisual.jsx'
import authApi from '@/api/auth/authApi.js'

// ─── SVG Icons ───
const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
)

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [apiSuccess, setApiSuccess] = useState('')

  const containerRef = useRef(null)
  const formWrapperRef = useRef(null)
  const greetingRef = useRef(null)

  // ─── GSAP Entrance Animation ───
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.from('.auth-mobile-header', {
        y: -30,
        opacity: 0,
        duration: 0.5,
      }, 0)

      tl.from('.auth-greeting', {
        y: 40,
        opacity: 0,
        duration: 0.7,
      }, 0.2)

      tl.from('.auth-form-field', {
        y: 30,
        opacity: 0,
        duration: 0.45,
        stagger: 0.07,
      }, 0.4)
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    setApiError('')
  }

  const validate = () => {
    const newErrors = {}
    const pass = form.newPassword

    if (!pass) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới'
    } else {
      if (pass.length < 6 || pass.length > 20) {
        newErrors.newPassword = 'Mật khẩu phải từ 6 đến 20 ký tự'
      }
      if (!/[A-Z]/.test(pass)) {
        newErrors.newPassword = newErrors.newPassword || 'Mật khẩu phải chứa ít nhất 1 chữ in hoa'
      }
      if (!/[a-z]/.test(pass)) {
        newErrors.newPassword = newErrors.newPassword || 'Mật khẩu phải chứa ít nhất 1 chữ thường'
      }
      if (!/\d/.test(pass)) {
        newErrors.newPassword = newErrors.newPassword || 'Mật khẩu phải chứa ít nhất 1 chữ số'
      }
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu'
    } else if (pass !== form.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      setApiError('Token khôi phục không tồn tại hoặc không hợp lệ.')
      return
    }
    if (!validate()) return

    setIsSubmitting(true)
    setApiError('')
    setApiSuccess('')

    try {
      const response = await authApi.resetPassword({
        token,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      })

      if (response && response.success === false) {
        throw new Error(response.message || 'Đặt lại mật khẩu thất bại!')
      }

      setApiSuccess(response?.message || 'Đặt lại mật khẩu thành công!')
      toast.success('Đặt lại mật khẩu thành công! Đang chuyển hướng về trang đăng nhập...')
      
      setTimeout(() => {
        navigate('/auth')
      }, 3000)

    } catch (error) {
      console.error('Lỗi đặt lại mật khẩu:', error)
      let message = 'Đặt lại mật khẩu thất bại. Vui lòng thử lại!'
      if (error.response?.data) {
        message = error.response.data.message || message
      } else if (error.message) {
        message = error.message
      }
      setApiError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Pass checks for real-time visualization helper
  const pass = form.newPassword
  const hasMinLen = pass.length >= 6 && pass.length <= 20
  const hasUpper = /[A-Z]/.test(pass)
  const hasLower = /[a-z]/.test(pass)
  const hasDigit = /\d/.test(pass)

  return (
    <div ref={containerRef} className="min-h-screen flex bg-white">
      {/* Left Panel */}
      <AuthVisual />

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="auth-mobile-header lg:hidden flex items-center justify-between p-5 sm:p-6">
          <Link
            to="/auth"
            className="p-2 -ml-2 text-brand-muted hover:text-brand-charcoal transition-colors"
            aria-label="Quay lại trang đăng nhập"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <Link to="/" className="font-display text-2xl font-bold text-brand-charcoal">
            OUTTA <span className="text-brand-blush">Studio</span>
          </Link>
          <div className="w-9" />
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-8 overflow-y-auto">
          <div className="w-full max-w-md">
            {/* Greetings */}
            <div ref={greetingRef} className="auth-greeting mb-8">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-charcoal mb-2">
                Đặt Lại Mật Khẩu
              </h2>
              <p className="text-brand-muted text-base">
                Nhập mật khẩu mới của bạn bên dưới để khôi phục tài khoản
              </p>
            </div>

            {!token ? (
              <div className="text-sm text-red-500 font-medium p-4 bg-red-50 rounded-lg border border-red-200 animate-slide-up">
                Token reset mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng thực hiện lại yêu cầu quên mật khẩu.
                <div className="mt-4">
                  <Link
                    to="/auth"
                    className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-brand-charcoal hover:bg-brand-blush hover:text-brand-charcoal transition-all duration-300 rounded-lg shadow-sm"
                  >
                    Quay về Đăng nhập
                  </Link>
                </div>
              </div>
            ) : (
              <div ref={formWrapperRef}>
                <form onSubmit={handleSubmit} noValidate>
                  {/* API Alert */}
                  {apiError && (
                    <div className="mb-6 text-sm text-red-500 font-medium p-3 bg-red-50 rounded-lg border border-red-200 animate-slide-up">
                      {apiError}
                    </div>
                  )}

                  {apiSuccess && (
                    <div className="mb-6 text-sm text-green-600 font-medium p-4 bg-green-50 rounded-xl border border-green-200 animate-slide-up">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-green-100 border border-green-200 rounded-lg text-green-700 mt-0.5 flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-green-900 text-sm leading-snug">Thành công!</p>
                          <p className="text-green-700 text-xs mt-1 leading-relaxed">{apiSuccess} Đang chuyển về trang Đăng nhập...</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── New Password ─── */}
                  <div className="auth-form-field relative mb-6">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      name="newPassword"
                      id="reset-newPassword"
                      value={form.newPassword}
                      onChange={handleChange}
                      className="floating-input w-full bg-transparent border-b-2 border-gray-200 px-0 py-3 pr-10
                                 text-brand-charcoal focus:outline-none transition-colors duration-300 font-sans"
                      placeholder=" "
                      autoComplete="new-password"
                      disabled={isSubmitting || !!apiSuccess}
                    />
                    <label htmlFor="reset-newPassword" className="floating-label">
                      Mật khẩu mới
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-0 top-3 text-brand-muted hover:text-brand-charcoal transition-colors duration-200"
                      disabled={isSubmitting || !!apiSuccess}
                    >
                      {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                    <span className="floating-line" />
                    {errors.newPassword && (
                      <p className="text-red-400 text-xs mt-2 animate-slide-up">{errors.newPassword}</p>
                    )}
                  </div>

                  {/* Password requirements visual indicator */}
                  {pass && (
                    <div className="auth-form-field mb-6 p-3 bg-gray-50 rounded-lg text-xs text-brand-muted flex flex-col gap-1.5 animate-slide-up">
                      <p className="font-semibold text-gray-700 mb-0.5">Yêu cầu mật khẩu:</p>
                      <div className="flex items-center gap-1.5">
                        <span className={hasMinLen ? 'text-green-600' : 'text-gray-400'}>
                          {hasMinLen ? '✓' : '○'} Từ 6 đến 20 ký tự
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={hasUpper ? 'text-green-600' : 'text-gray-400'}>
                          {hasUpper ? '✓' : '○'} Ít nhất 1 chữ in hoa (A-Z)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={hasLower ? 'text-green-600' : 'text-gray-400'}>
                          {hasLower ? '✓' : '○'} Ít nhất 1 chữ thường (a-z)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={hasDigit ? 'text-green-600' : 'text-gray-400'}>
                          {hasDigit ? '✓' : '○'} Ít nhất 1 chữ số (0-9)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ─── Confirm Password ─── */}
                  <div className="auth-form-field relative mb-8">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      id="reset-confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      className="floating-input w-full bg-transparent border-b-2 border-gray-200 px-0 py-3 pr-10
                                 text-brand-charcoal focus:outline-none transition-colors duration-300 font-sans"
                      placeholder=" "
                      autoComplete="new-password"
                      disabled={isSubmitting || !!apiSuccess}
                    />
                    <label htmlFor="reset-confirmPassword" className="floating-label">
                      Xác nhận mật khẩu mới
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-0 top-3 text-brand-muted hover:text-brand-charcoal transition-colors duration-200"
                      disabled={isSubmitting || !!apiSuccess}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                    <span className="floating-line" />
                    {errors.confirmPassword && (
                      <p className="text-red-400 text-xs mt-2 animate-slide-up">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {/* ─── Submit Button ─── */}
                  {!apiSuccess && (
                    <div className="auth-form-field">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="auth-submit-btn w-full bg-brand-charcoal text-white py-4 rounded-lg
                                   font-medium uppercase tracking-widest text-sm
                                   transition-all duration-300
                                   hover:bg-brand-dark hover:shadow-xl hover:shadow-brand-charcoal/20
                                   active:scale-[0.98]
                                   disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center justify-center gap-3">
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Đang xử lý...
                          </span>
                        ) : (
                          'Đặt lại mật khẩu'
                        )}
                      </button>
                    </div>
                  )}

                  {/* ─── Switch back to Login ─── */}
                  <p className="auth-form-field text-center mt-10 text-sm text-brand-muted">
                    <Link
                      to="/auth"
                      className="text-brand-charcoal font-semibold hover:text-brand-blush transition-colors duration-200 flex items-center justify-center gap-2 mx-auto"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Quay lại Đăng nhập
                    </Link>
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
