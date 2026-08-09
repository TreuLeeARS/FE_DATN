import { useState } from 'react'
import toast from 'react-hot-toast'
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

export const LoginForm = ({ onSwitchTab, onForgotPassword }) => {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendStatus, setResendStatus] = useState('') // 'idle' | 'success' | 'error'

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    setApiError('')
    setUnverifiedEmail('')
    setResendStatus('')
  }

  const validate = () => {
    const newErrors = {}
    if (!form.username) {
      newErrors.username = 'Vui lòng nhập tên đăng nhập'
    } else if (form.username.length < 6 || form.username.length > 30) {
      newErrors.username = 'Tên đăng nhập phải từ 6 đến 30 ký tự'
    }
    if (!form.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu'
    } else if (form.password.length < 6) {
      newErrors.password = 'Mật khẩu tối thiểu 6 ký tự'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleResendActivation = async () => {
    if (!unverifiedEmail) return
    setIsResending(true)
    setResendStatus('')
    try {
      await authApi.resendActivation(unverifiedEmail)
      setResendStatus('success')
      toast.success('Gửi lại email kích hoạt thành công! Vui lòng kiểm tra hộp thư của bạn.')
    } catch (err) {
      console.error('Lỗi gửi lại email kích hoạt:', err)
      setResendStatus('error')
      toast.error(err.response?.data?.message || 'Gửi lại email kích hoạt thất bại. Vui lòng thử lại!')
    } finally {
      setIsResending(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setApiError('')
    setUnverifiedEmail('')
    setResendStatus('')

    try {
      const response = await authApi.login({
        username: form.username,
        password: form.password,
      })

      // Backend trả về HTTP 200 với success=false và errorCode=ACCOUNT_NOT_ACTIVATED nếu chưa kích hoạt
      if (response && response.success === false) {
        if (response.errorCode === 'ACCOUNT_NOT_ACTIVATED') {
          setUnverifiedEmail(response.meta?.email || '')
          setApiError('Tài khoản của bạn chưa được kích hoạt. Vui lòng kiểm tra email.')
          return
        }
        throw new Error(response.message || 'Sai tên đăng nhập hoặc mật khẩu!')
      }

      if (!response || !response.data || !response.data.accessToken) {
        throw new Error('Sai tên đăng nhập hoặc mật khẩu!')
      }

      // Backend trả về BaseResponse<AuthResponse> -> data: { accessToken, refreshToken }
      const token = response.data.accessToken
      localStorage.setItem('accessToken', token)
      localStorage.setItem('username', form.username)

      const refreshToken = response.data.refreshToken
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken)
      }

      const authRedirectUrl = sessionStorage.getItem('authRedirectUrl')
      sessionStorage.removeItem('authRedirectUrl')
      if (authRedirectUrl && authRedirectUrl !== '/auth' && authRedirectUrl !== '/reset-password') {
        window.location.href = authRedirectUrl
      } else {
        window.location.href = '/shop'
      }
      
    } catch (error) {
      console.error('Lỗi đăng nhập:', error)
      let message = 'Đăng nhập thất bại. Vui lòng thử lại!'
      if (error.response?.data) {
        const errorData = error.response.data
        if (errorData.errorCode === 'ACCOUNT_NOT_ACTIVATED') {
          setUnverifiedEmail(errorData.meta?.email || '')
          setApiError('Tài khoản của bạn chưa được kích hoạt. Vui lòng kiểm tra email.')
          return
        }
        message = errorData.message || message
      } else if (error.message === 'Network Error') {
        message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc máy chủ BE!'
      } else if (error.message && error.message.includes('timeout')) {
        message = 'Kết nối quá hạn. Vui lòng kiểm tra lại đường truyền!'
      } else if (error.message) {
        message = error.message
      }
      setApiError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Thông báo lỗi từ API */}
      {apiError && (
        unverifiedEmail ? (
          <div className="mb-6 text-sm p-4 rounded-xl border border-amber-200/80 bg-amber-50/50 animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-amber-100 border border-amber-200 rounded-lg text-amber-700 mt-0.5 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 text-sm leading-snug">
                  {apiError}
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleResendActivation}
                    disabled={isResending}
                    className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-brand-charcoal hover:bg-brand-blush hover:text-brand-charcoal transition-all duration-300 rounded-lg shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isResending ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Đang gửi lại...
                      </span>
                    ) : (
                      'Gửi lại email kích hoạt'
                    )}
                  </button>
                  {resendStatus === 'success' && (
                    <p className="text-green-600 text-xs mt-2 font-medium">
                      ✓ Đã gửi lại email kích hoạt thành công!
                    </p>
                  )}
                  {resendStatus === 'error' && (
                    <p className="text-red-500 text-xs mt-2 font-medium">
                      ✗ Gửi lại email kích hoạt thất bại. Thử lại sau!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 text-sm text-red-500 font-medium p-3 bg-red-50 rounded-lg border border-red-200 animate-slide-up">
            {apiError}
          </div>
        )
      )}
      {/* ─── Username ─── */}
      <div className="auth-form-field relative mb-8">
        <input
          type="text"
          name="username"
          id="login-username"
          value={form.username}
          onChange={handleChange}
          className="floating-input w-full bg-transparent border-b-2 border-gray-200 px-0 py-3
                     text-brand-charcoal focus:outline-none transition-colors duration-300 font-sans"
          placeholder=" "
          autoComplete="username"
        />
        <label htmlFor="login-username" className="floating-label">
          Tên đăng nhập
        </label>
        <span className="floating-line" />
        {errors.username && (
          <p className="text-red-400 text-xs mt-2 animate-slide-up">{errors.username}</p>
        )}
      </div>

      {/* ─── Password ─── */}
      <div className="auth-form-field relative mb-5">
        <input
          type={showPassword ? 'text' : 'password'}
          name="password"
          id="login-password"
          value={form.password}
          onChange={handleChange}
          className="floating-input w-full bg-transparent border-b-2 border-gray-200 px-0 py-3 pr-10
                     text-brand-charcoal focus:outline-none transition-colors duration-300 font-sans"
          placeholder=" "
          autoComplete="current-password"
        />
        <label htmlFor="login-password" className="floating-label">
          Mật khẩu
        </label>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-0 top-3 text-brand-muted hover:text-brand-charcoal transition-colors duration-200"
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
        <span className="floating-line" />
        {errors.password && (
          <p className="text-red-400 text-xs mt-2 animate-slide-up">{errors.password}</p>
        )}
      </div>

      {/* ─── Forgot Password ─── */}
      <div className="auth-form-field text-right mb-8">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-brand-muted hover:text-brand-charcoal transition-colors duration-200
                     border-b border-transparent hover:border-brand-charcoal cursor-pointer"
        >
          Quên mật khẩu?
        </button>
      </div>

      {/* ─── Submit Button ─── */}
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
            'Đăng Nhập'
          )}
        </button>
      </div>

      {/* ─── Switch to Register ─── */}
      <p className="auth-form-field text-center mt-8 text-sm text-brand-muted">
        Chưa có tài khoản?{' '}
        <button
          type="button"
          onClick={onSwitchTab}
          className="text-brand-charcoal font-semibold hover:text-brand-blush transition-colors duration-200"
        >
          Đăng ký ngay
        </button>
      </p>
    </form>
  )
}
