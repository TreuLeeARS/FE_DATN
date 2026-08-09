import { useState, useEffect } from 'react'
import { navLinks } from '@/data/navigation/navLinks.js'
import { NavLinks } from './NavLinks.jsx'
import { CartIcon } from './CartIcon.jsx'
import { AuthButtons } from './AuthButtons.jsx'
import { cn } from '@/utils/common/cn.js'
import categoryApi from '@/api/categories/categoryApi.js'

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [displayLinks, setDisplayLinks] = useState(navLinks)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80)
    }

    window.addEventListener('scroll', handleScroll)
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const fetchHeaderCategories = async () => {
      try {
        const response = await categoryApi.getRootCategories()
        if (response && response.data) {
          const rootCates = response.data

          // Gọi API lấy tiếp các danh mục con cho từng danh mục gốc (Quần áo, Giày & Túi, Phụ kiện, v.v.)
          const dynamicRootLinks = await Promise.all(
            rootCates.map(async (root) => {
              try {
                const subResponse = await categoryApi.getCategoriesByParent(root.id)
                const subs = subResponse && subResponse.data ? subResponse.data : []
                
                // Sắp xếp thứ tự danh mục con (Cấp 2) cho ổn định
                const subOrder = {
                  'áo': 1, 'quần': 2, 'váy & đầm': 3, 'set đồ': 4, 'áo khoác': 5,
                  'giày': 1, 'túi xách': 2
                }
                const sortedSubs = [...subs].sort((a, b) => {
                  const nameA = a.name.toLowerCase().normalize('NFC')
                  const nameB = b.name.toLowerCase().normalize('NFC')
                  const idxA = subOrder[nameA] || 99
                  const idxB = subOrder[nameB] || 99
                  return idxA - idxB
                })

                return {
                  label: root.name,
                  href: root.name.toLowerCase().normalize('NFC') === 'phụ kiện'
                    ? `/shop?category=${encodeURIComponent(root.name)}`
                    : '/shop',
                  sublinks: sortedSubs.map(sub => ({
                    label: sub.name,
                    href: `/shop?category=${encodeURIComponent(sub.name)}`
                  }))
                }
              } catch (err) {
                console.error(`Lỗi khi tải danh mục con của ${root.name}:`, err)
                return {
                  label: root.name,
                  href: '/shop',
                  sublinks: []
                }
              }
            })
          )

          // Sắp xếp thứ tự hiển thị các danh mục gốc chính: Quần áo, Giày & Túi, Phụ kiện
          const rootOrder = ['quần áo', 'giày & túi', 'phụ kiện']
          dynamicRootLinks.sort((a, b) => {
            const nameA = a.label.toLowerCase().normalize('NFC')
            const nameB = b.label.toLowerCase().normalize('NFC')
            const idxA = rootOrder.indexOf(nameA)
            const idxB = rootOrder.indexOf(nameB)
            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
          })

          const dynamicLinks = [
            { label: 'Trang chủ', href: '/' },
            ...dynamicRootLinks,
          ]

          setDisplayLinks(dynamicLinks)
        }
      } catch (err) {
        console.error('Lỗi khi tải danh mục cho header:', err)
        // Falls back to hardcoded links already in state
      }
    }

    fetchHeaderCategories()
  }, [])

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-black/5 py-3.5 shadow-sm'
            : 'bg-transparent py-5'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex-shrink-0">
              <a href="/" className="text-2xl font-display font-semibold uppercase tracking-[0.25em] text-brand-charcoal hover:opacity-85 transition-opacity">
                OUTTA
              </a>
            </div>

            {/* Desktop Navigation */}
            <NavLinks links={displayLinks} mobile={false} />

            {/* Right Section */}
            <div className="flex items-center space-x-3 xl:space-x-5">
              <div className="hidden sm:block">
                <AuthButtons />
              </div>
              <CartIcon />
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 hover:opacity-60 transition-opacity"
                aria-label="Open menu"
              >
                <svg
                  className="w-5.5 h-5.5 text-brand-charcoal"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 z-50 pointer-events-none opacity-0",
          isMobileMenuOpen && "pointer-events-auto opacity-100"
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Menu Drawer (Zara / Louis Vuitton style) */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 p-7 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out transform rounded-none',
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div>
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
            <span className="font-display font-semibold uppercase tracking-[0.2em] text-base text-brand-charcoal">
              OUTTA
            </span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 hover:opacity-60 transition-opacity"
              aria-label="Close menu"
            >
              <svg className="w-5.5 h-5.5 text-brand-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Body - Links */}
          <div className="overflow-y-auto max-h-[calc(100vh-180px)] pr-2">
            <div className="flex flex-col space-y-6">
              <NavLinks links={displayLinks} mobile={true} />
              <AuthButtons inDrawer={true} onCloseDrawer={() => setIsMobileMenuOpen(false)} />
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-[8px] tracking-[0.25em] text-brand-muted uppercase text-center">
            © {new Date().getFullYear()} OUTTA Luxury
          </p>
        </div>
      </div>
    </>
  )
}

