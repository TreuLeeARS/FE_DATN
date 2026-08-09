import { useState, Suspense } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import authApi from '@/api/auth/authApi.js'
import { cn } from '@/utils/common/cn.js'
import { OrderNotificationBell } from '@/components/admin/common/OrderNotificationBell.jsx'
import { isAdmin, isAdminOnly } from '@/utils/auth/auth.js'

export const AdminLayout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const username = localStorage.getItem('username') || 'Admin'
  const canViewStaffNotifications = isAdmin()
  const canViewActionLogs = isAdminOnly()

  const menuItems = [
    {
      label: 'Tổng quan',
      href: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      )
    },
    {
      label: 'Quản lý danh mục',
      href: '/admin/categories',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      )
    },
    {
      label: 'Quản lý sản phẩm',
      href: '/admin/products',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      label: 'Quản lý đơn hàng',
      href: '/admin/orders',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      label: 'Quản lý hóa đơn',
      href: '/admin/invoices',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V2zm3 6h6m-6 4h6m-6 4h4" />
        </svg>
      )
    },
    {
      label: 'Quản lý người dùng',
      href: '/admin/users',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3a1 1 0 01-1-1 7 7 0 0114 0 1 1 0 01-1 1zm0-3a5.982 5.982 0 00-3-4.829 7.006 7.006 0 014.375-7.49A5.998 5.998 0 0115 11v7z" />
        </svg>
      )
    },
    {
      label: 'Quản lý mã giảm giá',
      href: '/admin/coupons',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      )
    },
    {
      label: 'Quản lý popup gợi ý',
      href: '/admin/popups',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.02 6.02 0 00-4.902-5.903m0 0V4a2 2 0 00-4 0v.597C7.49 5.217 6.107 7.107 6.107 9.382V14c0 .417-.16.82-.442 1.105L4.242 16.5h15" />
        </svg>
      )
    },
    {
      label: 'Nhật ký thao tác',
      href: '/admin/action-logs',
      adminOnly: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6M9 8h3m-5 13h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    }
  ].filter((item) => !item.adminOnly || canViewActionLogs)

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('username')
      localStorage.removeItem('pee_cart_items')
      sessionStorage.removeItem('authRedirectUrl')
      navigate('/')
      window.location.reload()
    }
  }

  // Determine page title based on location
  const getPageTitle = () => {
    if (location.pathname === '/admin') return 'Tổng quan hệ thống'
    if (location.pathname === '/admin/categories') return 'Quản lý danh mục sản phẩm'
    if (location.pathname === '/admin/products') return 'Quản lý danh mục sản phẩm và biến thể'
    if (location.pathname === '/admin/orders') return 'Quản lý đơn đặt hàng toàn hệ thống'
    if (location.pathname === '/admin/invoices') return 'Quản lý và tra cứu hóa đơn'
    if (location.pathname === '/admin/users') return 'Quản lý tài khoản người dùng'
    if (location.pathname === '/admin/coupons') return 'Quản lý mã giảm giá (Coupons)'
    if (location.pathname === '/admin/popups') return 'Quản lý thông báo gợi ý Coupon'
    if (location.pathname === '/admin/action-logs') return 'Nhật ký thao tác hệ thống'
    return 'Admin Panel'
  }

  return (
    <div className="min-h-screen bg-brand-cream/40 flex text-brand-charcoal">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-brand-charcoal text-white shrink-0 shadow-xl border-r border-white/5">
        {/* Brand Logo */}
        <div className="h-20 flex items-center px-8 border-b border-white/5">
          <Link to="/" className="text-2xl font-display font-bold tracking-widest text-brand-blush">
            OUTTA <span className="text-xs font-sans font-normal text-white/50 tracking-wider ml-1">ADMIN</span>
          </Link>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item, idx) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={idx}
                to={item.disabled ? '#' : item.href}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-sm font-medium",
                  item.disabled && "opacity-50 cursor-not-allowed",
                  isActive
                    ? "bg-brand-blush text-brand-charcoal font-semibold shadow-md shadow-brand-blush/20"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                )}
                onClick={(e) => item.disabled && e.preventDefault()}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer Area with profile & logout */}
        <div className="p-6 border-t border-white/5 bg-black/10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-brand-blush/30 border border-brand-blush/40 flex items-center justify-center text-brand-blush font-semibold uppercase">
              {username.charAt(0)}
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-white">{username}</p>
              <p className="text-xs text-white/40">Quản trị viên</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Link
              to="/"
              className="flex-1 flex justify-center items-center py-2 px-3 rounded-lg border border-white/10 text-xs font-medium text-white/80 hover:bg-white/5 transition-colors"
            >
              Cửa hàng
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold tracking-wider transition-colors uppercase text-center cursor-pointer"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-brand-charcoal/60 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          <aside className="relative flex flex-col w-72 bg-brand-charcoal text-white h-full shadow-2xl animate-fade-in">
            {/* Close button */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute top-6 right-6 text-white/70 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Brand Logo */}
            <div className="h-20 flex items-center px-8 border-b border-white/5">
              <span className="text-2xl font-display font-bold tracking-widest text-brand-blush">
                OUTTA <span className="text-xs font-sans font-normal text-white/50 tracking-wider ml-1">ADMIN</span>
              </span>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {menuItems.map((item, idx) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={idx}
                    to={item.disabled ? '#' : item.href}
                    className={cn(
                      "flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-sm font-medium",
                      item.disabled && "opacity-50 cursor-not-allowed",
                      isActive
                        ? "bg-brand-blush text-brand-charcoal font-semibold shadow-md"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    )}
                    onClick={(e) => {
                      if (item.disabled) {
                        e.preventDefault()
                      } else {
                        setIsMobileSidebarOpen(false)
                      }
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Footer profiles */}
            <div className="p-6 border-t border-white/5 bg-black/10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-blush/30 border border-brand-blush/40 flex items-center justify-center text-brand-blush font-semibold uppercase">
                  {username.charAt(0)}
                </div>
                <div className="truncate">
                  <p className="text-sm font-semibold text-white">{username}</p>
                  <p className="text-xs text-white/40">Quản trị viên</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Link
                  to="/"
                  className="flex-1 flex justify-center items-center py-2 px-3 rounded-lg border border-white/10 text-xs font-medium text-white/80 hover:bg-white/5 transition-colors"
                >
                  Cửa hàng
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold tracking-wider transition-colors uppercase text-center cursor-pointer"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="h-20 bg-white shadow-sm border-b border-gray-100 flex items-center justify-between px-6 sm:px-10 shrink-0">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Open Trigger */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 text-brand-charcoal hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Breadcrumb / Title */}
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-brand-charcoal tracking-wide">
                {getPageTitle()}
              </h1>
              <div className="hidden sm:flex items-center space-x-2 text-xs text-brand-muted mt-0.5">
                <span>Quản trị</span>
                <span>/</span>
                <span className="text-brand-charcoal font-medium">
                  {location.pathname === '/admin' ? 'Dashboard' :
                    location.pathname === '/admin/categories' ? 'Danh mục' :
                      location.pathname === '/admin/products' ? 'Sản phẩm' :
                        location.pathname === '/admin/orders' ? 'Đơn hàng' :
                          location.pathname === '/admin/users' ? 'Người dùng' :
                            location.pathname === '/admin/coupons' ? 'Mã giảm giá' :
                              location.pathname === '/admin/popups' ? 'Popup gợi ý' : 'Chi tiết'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {canViewStaffNotifications && <OrderNotificationBell />}
            <div className="w-8 h-8 rounded-full bg-brand-charcoal text-white flex items-center justify-center font-semibold text-xs border border-gray-100">
              A
            </div>
          </div>
        </header>

        {/* Dynamic Nested Content */}
        <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="w-8 h-8 border-4 border-brand-charcoal border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
