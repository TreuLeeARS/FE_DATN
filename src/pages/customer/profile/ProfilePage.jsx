import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header/index.js'
import { Footer } from '@/components/layout/Footer/index.js'
import userApi from '@/api/users/userApi.js'

const unwrapApiData = (response) => response?.data?.data ?? response?.data ?? response
const emptyForm = { firstName: '', lastName: '', email: '', phone: '' }

export const ProfilePage = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const username = localStorage.getItem('username')
    if (!localStorage.getItem('accessToken') || !username) {
      sessionStorage.setItem('authRedirectUrl', '/profile')
      navigate('/auth', { replace: true })
      return
    }

    const loadProfile = async () => {
      try {
        const data = unwrapApiData(await userApi.getUserByUsername(username))
        setProfile(data)
        setForm({
          firstName: data?.firstName || '',
          lastName: data?.lastName || '',
          email: data?.email || '',
          phone: data?.phone || '',
        })
      } catch (error) {
        console.error('Error loading profile:', error)
        toast.error(error?.response?.data?.message || 'Không thể tải hồ sơ cá nhân.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [navigate])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const nextErrors = {}
    if (!form.lastName.trim()) nextErrors.lastName = 'Vui lòng nhập họ.'
    if (!form.firstName.trim()) nextErrors.firstName = 'Vui lòng nhập tên.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Email không hợp lệ.'
    if (form.phone && !/^(0|\+84)\d{9}$/.test(form.phone.replace(/\s/g, ''))) nextErrors.phone = 'Số điện thoại không hợp lệ.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    try {
      setSaving(true)
      const payload = {
        firstName: form.firstName.trim().replace(/\s+/g, ' '),
        lastName: form.lastName.trim().replace(/\s+/g, ' '),
        email: form.email.trim(),
        phone: form.phone.replace(/\s/g, ''),
      }
      await userApi.updateMyProfile(payload)
      setProfile(prev => ({ ...prev, ...payload }))
      setForm(payload)
      toast.success('Cập nhật hồ sơ thành công!')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error(error?.response?.data?.message || 'Không thể cập nhật hồ sơ.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-brand-cream px-4 pb-16 pt-28 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 border-b border-black/10 pb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-muted">Tài khoản của bạn</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-brand-charcoal sm:text-4xl">Hồ sơ cá nhân</h1>
            <p className="mt-2 text-xs text-brand-muted">Quản lý thông tin liên hệ và tên hiển thị của bạn.</p>
          </div>

          {loading ? (
            <div className="border border-black/10 bg-white p-16 text-center text-xs uppercase tracking-widest text-brand-muted">Đang tải hồ sơ...</div>
          ) : (
            <form onSubmit={handleSubmit} className="border border-black/10 bg-white p-6 shadow-sm sm:p-9">
              <div className="mb-8 flex items-center gap-4 border-b border-black/10 pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-charcoal font-display text-xl text-white">
                  {(profile?.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-brand-muted">Tên đăng nhập</p>
                  <p className="truncate font-semibold text-brand-charcoal">{profile?.username || localStorage.getItem('username')}</p>
                  <p className="mt-1 text-[10px] text-brand-muted">Tên đăng nhập không thể thay đổi tại đây.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {[
                  ['lastName', 'Họ', 'Nguyễn'],
                  ['firstName', 'Tên', 'An'],
                  ['email', 'Email', 'example@email.com'],
                  ['phone', 'Số điện thoại', '09xxxxxxxx'],
                ].map(([name, label, placeholder]) => (
                  <label key={name} className="block">
                    <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-brand-muted">{label}</span>
                    <input
                      type={name === 'email' ? 'email' : 'text'}
                      name={name}
                      value={form[name]}
                      onChange={handleChange}
                      placeholder={placeholder}
                      className={`w-full border bg-white px-4 py-3 text-sm text-brand-charcoal outline-none transition-colors ${errors[name] ? 'border-red-400' : 'border-black/15 focus:border-brand-charcoal'}`}
                    />
                    {errors[name] && <span className="mt-1.5 block text-[10px] text-red-600">{errors[name]}</span>}
                  </label>
                ))}
              </div>

              <div className="mt-8 flex justify-end border-t border-black/10 pt-6">
                <button type="submit" disabled={saving} className="bg-brand-charcoal px-7 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-black disabled:cursor-wait disabled:opacity-60">
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
