import { useState } from 'react'

export const NewsletterForm = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle, loading, success, error

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')

    // Mock API call
    setTimeout(() => {
      setStatus('success')
      setEmail('')
      // Reset to idle after 3 seconds
      setTimeout(() => setStatus('idle'), 3000)
    }, 1000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-gray-300 mb-4">
        Đăng ký để nhận ưu đãi đặc biệt và hàng mới sớm nhất.
      </p>

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Nhập email của bạn"
          required
          className="input-base flex-1 text-sm"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading' || !email}
          className="px-6 py-3 bg-brand-blush text-brand-charcoal font-semibold
                     hover:bg-white transition-colors disabled:opacity-50"
        >
          {status === 'loading' ? 'Đang đăng ký...' : 'Đăng Ký'}
        </button>
      </div>

      {/* Status Messages */}
      {status === 'success' && (
        <p className="text-xs text-brand-blush">
          ✓ Cảm ơn bạn đã đăng ký!
        </p>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-400">
          Đã có lỗi xảy ra. Vui lòng thử lại.
        </p>
      )}
    </form>
  )
}
