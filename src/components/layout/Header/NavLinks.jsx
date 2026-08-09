import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/utils/common/cn.js'

// Số danh mục tối đa hiển thị trực tiếp trên thanh menu desktop.
const MAX_VISIBLE_DESKTOP_CATEGORY_LINKS = 5

export const NavLinks = ({ links, mobile = false }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const homeLinks = links.filter(link => link.href === '/')
  const categoryLinks = links.filter(link => link.href !== '/')
  const visibleLinks = mobile || categoryLinks.length <= MAX_VISIBLE_DESKTOP_CATEGORY_LINKS
    ? links
    : [...homeLinks, ...categoryLinks.slice(0, MAX_VISIBLE_DESKTOP_CATEGORY_LINKS)]
  const overflowLinks = mobile || categoryLinks.length <= MAX_VISIBLE_DESKTOP_CATEGORY_LINKS
    ? []
    : categoryLinks.slice(MAX_VISIBLE_DESKTOP_CATEGORY_LINKS)

  const handleNavClick = (e, href) => {
    // Nếu là link chuyển hướng bình thường (như /shop) không có hash
    if (href.startsWith('/') && !href.includes('#')) {
      e.preventDefault()
      navigate(href)
      return
    }

    // Tách phần hash (ví dụ: 'new-arrivals' từ '/#new-arrivals' hoặc '#new-arrivals')
    const hashIndex = href.indexOf('#')
    if (hashIndex !== -1) {
      e.preventDefault()
      const targetHash = href.substring(hashIndex + 1)

      if (location.pathname === '/') {
        // Đang ở trang chủ: cuộn mượt mà đến section tương ứng
        const element = document.getElementById(targetHash)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      } else {
        // Đang ở trang khác: lưu lại vị trí cuộn và điều hướng về trang chủ '/'
        sessionStorage.setItem('scrollTarget', targetHash)
        navigate('/')
      }
    }
  }

  return (
    <nav
      className={cn(
        mobile
          ? 'flex flex-col space-y-2'
          : 'hidden md:flex items-center space-x-4 xl:space-x-7'
      )}
    >
      {visibleLinks.map(link => {
        const hasSublinks = link.sublinks && link.sublinks.length > 0;

        return (
          <div key={link.label} className={cn(hasSublinks && !mobile && 'relative group')}>
            <a
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className={cn(
                'transition-all duration-300 cursor-pointer whitespace-nowrap flex items-center gap-1 py-2',
                link.isSale ? 'text-red-800' : 'text-brand-charcoal',
                mobile
                  ? 'text-sm tracking-[0.15em] font-medium uppercase py-2'
                  : 'text-[10px] xl:text-[11px] uppercase tracking-[0.2em] font-medium hover:text-black hover:opacity-60'
              )}
            >
              <span>{link.label}</span>
              {hasSublinks && !mobile && (
                <svg
                  className="w-2.5 h-2.5 text-brand-muted group-hover:text-black group-hover:rotate-180 transition-all duration-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </a>

            {/* Dropdown Menu for Desktop */}
            {hasSublinks && !mobile && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-white border border-rose-100 shadow-[0_10px_30px_rgba(80,60,60,0.10)] rounded-lg p-2 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 delay-100 group-hover:delay-0 z-50 before:absolute before:content-[''] before:top-[-12px] before:left-0 before:right-0 before:h-3">
                <div className="flex flex-col gap-0.5">
                  {link.sublinks.map(sub => (
                    <a
                      key={sub.label}
                      href={sub.href}
                      onClick={(e) => handleNavClick(e, sub.href)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[10px] font-medium text-brand-charcoal hover:bg-rose-50 transition-colors uppercase tracking-[0.12em]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-blush shrink-0" />
                      <span>{sub.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Sublinks list for Mobile */}
            {hasSublinks && mobile && (
              <div className="flex flex-col pl-4 mt-1 border-l border-gray-200 gap-1.5 mb-2">
                {link.sublinks.map(sub => (
                  <a
                    key={sub.label}
                    href={sub.href}
                    onClick={(e) => handleNavClick(e, sub.href)}
                    className="text-xs font-normal text-brand-muted hover:text-brand-charcoal py-1 block uppercase tracking-wider"
                  >
                    {sub.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {overflowLinks.length > 0 && (
        <div className="relative group">
          <button
            type="button"
            className="flex items-center justify-center p-2 text-brand-charcoal hover:opacity-60 transition-opacity"
            aria-label="Xem thêm danh mục"
            title="Xem thêm danh mục"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="absolute top-full right-0 mt-2 w-56 max-h-[70vh] overflow-y-auto bg-white border border-rose-100 shadow-[0_10px_30px_rgba(80,60,60,0.10)] rounded-lg p-2 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 delay-100 group-hover:delay-0 z-50 before:absolute before:content-[''] before:top-[-12px] before:left-0 before:right-0 before:h-3">
            {overflowLinks.map(link => (
              <div key={link.label} className="py-0.5">
                <a
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[10px] font-semibold text-brand-charcoal hover:bg-rose-50 transition-colors uppercase tracking-[0.12em]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-blush shrink-0" />
                  <span>{link.label}</span>
                </a>

                {link.sublinks?.length > 0 && (
                  <div className="ml-3 pl-3 border-l border-rose-100">
                    {link.sublinks.map(sub => (
                      <a
                        key={sub.label}
                        href={sub.href}
                        onClick={(e) => handleNavClick(e, sub.href)}
                        className="block px-2.5 py-2 rounded-md text-[9px] text-brand-muted hover:text-brand-charcoal hover:bg-rose-50 transition-colors uppercase tracking-[0.1em]"
                      >
                        {sub.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
