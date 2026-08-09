import { useState } from 'react'
import toast from 'react-hot-toast'
import authApi from '@/api/auth/authApi.js'

export const ForgotPasswordForm = ({ onSwitchTab }) => {
  const [form, setForm] = useState({ username: '', email: '' })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [apiSuccess, setApiSuccess] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    setApiError('')
    setApiSuccess('')
  }

  const validate = () => {
    const newErrors = {}
    if (!form.username.trim()) {
      newErrors.username = 'Vui lòng nhập tên đăng nhập'
    } else if (form.username.length < 6 || form.username.length > 30) {
      newErrors.username = 'Tên đăng nhập phải từ 6 đến 30 ký tự'
    }

    if (!form.email.trim()) {
      newErrors.email = 'Vui lòng nhập email'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Email không đúng định dạng'
    } else if (form.email.length < 6 || form.email.length > 30) {
      newErrors.email = 'Email phải từ 6 đến 30 ký tự'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setApiError('')
    setApiSuccess('')

    try {
      const response = await authApi.sendEmailResetPassword({
        username: form.username,
        email: form.email,
      })

      if (response && response.success === false) {
        throw new Error(response.message || 'Gửi email khôi phục thất bại!')
      }

      setApiSuccess(response?.message || 'Đã gửi email khôi phục mật khẩu. Vui lòng kiểm tra hộp thư của bạn!')
      toast.success('Gửi email khôi phục thành công!')
    } catch (error) {
      console.error('Lỗi gửi email reset password:', error)
      let message = 'Gửi email khôi phục thất bại. Vui lòng thử lại!'
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

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Thông báo lỗi từ API */}
      {apiError && (
        <div className="mb-6 text-sm text-red-500 font-medium p-3 bg-red-50 rounded-lg border border-red-200 animate-slide-up">
          {apiError}
        </div>
      )}

      {/* Thông báo thành công từ API */}
      {apiSuccess && (
        <div className="mb-6 text-sm text-green-600 font-medium p-4 bg-green-50 rounded-xl border border-green-200 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-green-100 border border-green-200 rounded-lg text-green-700 mt-0.5 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-green-900 text-sm leading-snug">Gửi thành công!</p>
              <p className="text-green-700 text-xs mt-1 leading-relaxed">{apiSuccess}</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Username ─── */}
      <div className="auth-form-field relative mb-8">
        <input
          type="text"
          name="username"
          id="forgot-username"
          value={form.username}
          onChange={handleChange}
          className="floating-input w-full bg-transparent border-b-2 border-gray-200 px-0 py-3
                     text-brand-charcoal focus:outline-none transition-colors duration-300 font-sans"
          placeholder=" "
          autoComplete="username"
          disabled={isSubmitting || !!apiSuccess}
        />
        <label htmlFor="forgot-username" className="floating-label">
          Tên đăng nhập
        </label>
        <span className="floating-line" />
        {errors.username && (
          <p className="text-red-400 text-xs mt-2 animate-slide-up">{errors.username}</p>
        )}
      </div>

      {/* ─── Email ─── */}
      <div className="auth-form-field relative mb-8">
        <input
          type="email"
          name="email"
          id="forgot-email"
          value={form.email}
          onChange={handleChange}
          className="floating-input w-full bg-transparent border-b-2 border-gray-200 px-0 py-3
                     text-brand-charcoal focus:outline-none transition-colors duration-300 font-sans"
          placeholder=" "
          autoComplete="email"
          disabled={isSubmitting || !!apiSuccess}
        />
        <label htmlFor="forgot-email" className="floating-label">
          Email đăng ký
        </label>
        <span className="floating-line" />
        {errors.email && (
          <p className="text-red-400 text-xs mt-2 animate-slide-up">{errors.email}</p>
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
              'Gửi yêu cầu'
            )}
          </button>
        </div>
      )}

      {/* ─── Switch back to Login ─── */}
      <p className="auth-form-field text-center mt-10 text-sm text-brand-muted">
        <button
          type="button"
          onClick={onSwitchTab}
          className="text-brand-charcoal font-semibold hover:text-brand-blush transition-colors duration-200 flex items-center justify-center gap-2 mx-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Quay lại Đăng nhập
        </button>
      </p>
    </form>
  )
}
