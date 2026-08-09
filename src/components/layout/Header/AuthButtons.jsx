import { useState } from 'react'
import { Link } from 'react-router-dom'
import authApi from '@/api/auth/authApi.js'
import { isAdmin } from '@/utils/auth/auth.js'

// Auth buttons: profile icon with hover dropdown (desktop) + vertical layout (drawer mobile)
export const AuthButtons = ({ inDrawer = false, onCloseDrawer }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem('accessToken')
    const storedUsername = localStorage.getItem('username')
    return !!(token && storedUsername)
  })
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('username') || ''
  })

  const handleAuthLinkClick = () => {
    sessionStorage.setItem('authRedirectUrl', window.location.pathname + window.location.search)
    if (onCloseDrawer) onCloseDrawer()
  }

  const handleLogout = async () => {
    try {
      // Gọi API logout lên backend để thu hồi/xóa Refresh Token trong database
      await authApi.logout()
    } catch (error) {
      console.error('Lỗi khi gọi API logout:', error)
    } finally {
      // Xóa sạch thông tin ở Client và tải lại trang
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('username')

      // Reset trạng thái popup ưu đãi để người dùng có thể nhận lại quà tặng khi là khách vãng lai
      localStorage.removeItem('shopPromptDismissedUntil')
      sessionStorage.removeItem('appliedPromoCode')

      // Xóa giỏ hàng của tài khoản cũ khi đăng xuất
      localStorage.removeItem('pee_cart_items')

      // Xóa đường dẫn điều hướng tạm thời để tránh việc đăng nhập lại bằng tài khoản khác bị nhảy vào link cũ
      sessionStorage.removeItem('authRedirectUrl')

      setIsLoggedIn(false)
      setUsername('')
      if (onCloseDrawer) onCloseDrawer()

      // Nếu đăng xuất tại trang riêng tư, chuyển hướng về trang chủ thay vì reload tại chỗ
      const privatePaths = ['/my-orders', '/my-invoices', '/profile', '/cart', '/admin']
      const isAtPrivatePage = privatePaths.some(path => window.location.pathname.startsWith(path))

      if (isAtPrivatePage) {
        window.location.href = '/'
      } else {
        window.location.reload()
      }
    }
  }

  const isUserAdmin = isAdmin()

  // ----------------------------------------------------
  // CASE 1: Render inside Mobile Sidebar Drawer
  // ----------------------------------------------------
  if (inDrawer) {
    if (isLoggedIn) {
      return (
        <div className="flex flex-col space-y-4 pt-6 border-t border-gray-100">
          <div className="px-2">
            <p className="text-[9px] tracking-[0.2em] text-brand-muted uppercase">Tài khoản</p>
            <p className="text-sm font-semibold text-brand-charcoal mt-0.5 truncate">{username}</p>
          </div>
          {isUserAdmin && (
            <Link
              to="/admin"
              onClick={onCloseDrawer}
              className="block px-2 py-1 text-xs tracking-[0.15em] font-semibold text-brand-charcoal uppercase hover:opacity-60 transition-opacity"
            >
              Quản trị
            </Link>
          )}
          <Link
            to="/profile"
            onClick={onCloseDrawer}
            className="block px-2 py-1 text-xs tracking-[0.15em] font-medium text-brand-charcoal uppercase hover:opacity-60 transition-opacity"
          >
            Hồ sơ cá nhân
          </Link>
          {!isUserAdmin && (
            <>
              <Link
                to="/my-orders"
                onClick={onCloseDrawer}
                className="block px-2 py-1 text-xs tracking-[0.15em] font-medium text-brand-charcoal uppercase hover:opacity-60 transition-opacity"
              >
                Lịch sử mua hàng
              </Link>
              <Link
                to="/my-invoices"
                onClick={onCloseDrawer}
                className="block px-2 py-1 text-xs tracking-[0.15em] font-medium text-brand-charcoal uppercase hover:opacity-60 transition-opacity"
              >
                Tra cứu hóa đơn
              </Link>
            </>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left block px-2 py-1 text-xs tracking-[0.15em] font-semibold text-red-800 uppercase border-t border-gray-100 pt-4 mt-2"
          >
            Đăng Xuất
          </button>
        </div>
      )
    }

    return (
      <div className="flex flex-col space-y-3 pt-6 border-t border-gray-100">
        <Link
          to="/auth"
          state={{ tab: 'login' }}
          onClick={handleAuthLinkClick}
          className="block px-2 py-1 text-xs font-semibold tracking-[0.15em] uppercase text-brand-charcoal hover:opacity-60 transition-opacity"
        >
          Đăng Nhập
        </Link>
        <Link
          to="/auth"
          state={{ tab: 'register' }}
          onClick={handleAuthLinkClick}
          className="block px-2 py-1 text-xs font-semibold tracking-[0.15em] uppercase text-brand-charcoal hover:opacity-60 transition-opacity"
        >
          Đăng Ký
        </Link>
      </div>
    )
  }

  // ADMIN/STAFF desktop: gom các chức năng tài khoản vào một menu để header gọn hơn
  if (isLoggedIn && isUserAdmin) {
    return (
      <div className="relative group py-2">
        <button
          type="button"
          className="flex items-center gap-2 text-brand-charcoal transition-opacity hover:opacity-60 focus:outline-none"
          aria-label="Mở menu quản trị và tài khoản"
          title="Quản trị và tài khoản"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM4 15a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm8-2h6a2 2 0 012 2v4a2 2 0 01-2 2h-6a2 2 0 01-2-2v-4a2 2 0 012-2z" />
          </svg>
          <span className="hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.15em] xl:inline">
            Quản trị
          </span>
          <svg className="hidden h-3 w-3 transition-transform group-hover:rotate-180 xl:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div className="pointer-events-none absolute right-0 top-full z-50 mt-1 w-60 translate-y-1 border border-black/10 bg-white py-3 opacity-0 shadow-lg transition-all duration-200 before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
          <div className="mb-2 border-b border-gray-100 px-4 pb-3 pt-1">
            <p className="text-[9px] uppercase tracking-[0.18em] text-brand-muted">Tài khoản quản trị</p>
            <p className="mt-1 truncate text-xs font-semibold text-brand-charcoal">{username}</p>
          </div>

          <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-brand-charcoal transition-colors hover:bg-brand-cream">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-charcoal" />
            Quản trị hệ thống
          </Link>
          <Link to="/profile" className="block px-7 py-2.5 text-[10px] font-medium uppercase tracking-wider text-brand-charcoal transition-colors hover:bg-brand-cream">
            Hồ sơ cá nhân
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 block w-full border-t border-gray-100 px-4 pt-3 text-left text-[10px] font-semibold uppercase tracking-wider text-red-800 transition-colors hover:bg-red-50"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // CASE 2: Render inside Desktop Navbar
  // ----------------------------------------------------
  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-4">
        {isUserAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-1.5 text-brand-charcoal hover:opacity-60 transition-opacity"
            aria-label="Mở trang quản trị"
            title="Quản trị"
          >
            <svg
              className="w-[19px] h-[19px]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM4 15a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm8-2h6a2 2 0 012 2v4a2 2 0 01-2 2h-6a2 2 0 01-2-2v-4a2 2 0 012-2z" />
            </svg>
            <span className="hidden xl:inline text-[10px] font-medium tracking-[0.15em] uppercase whitespace-nowrap">
              Quản trị
            </span>
          </Link>
        )}

        <Link
          to="/my-orders"
          className="flex items-center gap-1.5 text-brand-charcoal hover:opacity-60 transition-opacity"
          aria-label="Lịch sử mua hàng"
          title="Lịch sử mua hàng"
        >
          <svg
            className="w-[19px] h-[19px]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h3.5L12 5l1.5-2H17a2 2 0 012 2v14a2 2 0 01-2 2z" />
          </svg>
          <span className="hidden xl:inline text-[10px] font-medium tracking-[0.15em] uppercase whitespace-nowrap">
            Lịch sử mua hàng
          </span>
        </Link>

        <Link
          to="/my-invoices"
          className="flex items-center gap-1.5 text-brand-charcoal hover:opacity-60 transition-opacity"
          aria-label="Tra cứu hóa đơn"
          title="Tra cứu hóa đơn"
        >
          <svg className="h-[19px] w-[19px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V2zm3 6h6m-6 4h6m-6 4h4" />
          </svg>
          <span className="hidden xl:inline whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.15em]">
            Tra cứu hóa đơn
          </span>
        </Link>

        <div className="relative group py-2">
          <button
            className="flex items-center gap-1.5 focus:outline-none hover:opacity-60 transition-opacity"
            aria-label="Mở tài khoản"
            title="Tài khoản"
          >
          <svg
            className="w-[20px] h-[20px] text-brand-charcoal"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="hidden xl:inline whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.15em] text-brand-charcoal">
            Tài khoản
          </span>
          </button>

          {/* Dropdown User Menu */}
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-black/10 shadow-sm rounded-none py-3.5 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 delay-150 group-hover:delay-0 z-50 before:absolute before:content-[''] before:top-[-10px] before:left-0 before:right-0 before:h-[10px]">
            <div className="px-4 py-2 border-b border-gray-100 mb-2">
              <p className="text-[9px] tracking-wider text-brand-muted uppercase">Tài khoản</p>
              <p className="text-xs font-semibold text-brand-charcoal truncate">{username}</p>
            </div>
            <Link
              to="/profile"
              className="block px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-brand-charcoal transition-colors hover:bg-black/[0.03]"
            >
              Hồ sơ cá nhân
            </Link>

            <button
              onClick={handleLogout}
              className="w-full text-left block px-4 py-2 text-[10px] tracking-wider font-semibold text-red-800 hover:bg-black/[0.03] uppercase transition-colors border-t border-gray-100 mt-2 pt-2"
            >
              Đăng Xuất
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-3 text-sm">
      <Link
        to="/auth"
        state={{ tab: 'login' }}
        onClick={handleAuthLinkClick}
        className="text-[10px] xl:text-[11px] font-semibold tracking-[0.15em] uppercase text-brand-charcoal hover:opacity-60 transition-opacity"
      >
        Đăng Nhập
      </Link>
      <span className="text-gray-200">|</span>
      <Link
        to="/auth"
        state={{ tab: 'register' }}
        onClick={handleAuthLinkClick}
        className="text-[10px] xl:text-[11px] font-semibold tracking-[0.15em] uppercase text-brand-charcoal hover:opacity-60 transition-opacity"
      >
        Đăng Ký
      </Link>
    </div>
  )
}
