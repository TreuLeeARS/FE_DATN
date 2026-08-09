import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { NewsletterForm } from './NewsletterForm.jsx'
import { SocialLinks } from './SocialLinks.jsx'
import { footerLinks, socialLinks } from '@/data/navigation/navLinks.js'
import { duration, ease } from '@/utils/animation/gsapDefaults.js'

gsap.registerPlugin(ScrollTrigger)

export const Footer = () => {
  const footerRef = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(footerRef.current, {
        opacity: 0,
        y: 50,
        duration: duration.base,
        ease: ease.out,
        scrollTrigger: {
          trigger: footerRef.current,
          start: 'top 85%',
          once: true,
        },
      })
    }, footerRef)

    return () => ctx.revert()
  }, [])

  return (
    <footer
      id="contact"
      ref={footerRef}
      className="bg-brand-dark text-gray-300 py-16 md:py-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div id="about" className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand + Newsletter Column */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-display font-bold text-white mb-4">
                OUTTA
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Thời trang nữ cao cấp tôn vinh phong cách và cá tính riêng của bạn.
              </p>
              <div>
                <h4 className="text-sm font-semibold text-white mb-4">Theo Dõi Chúng Tôi</h4>
                <SocialLinks links={socialLinks} />
              </div>
            </div>

            <div className="pt-4">
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                Bản Tin
              </h4>
              <NewsletterForm />
            </div>
          </div>

          {/* Link Columns */}
          {footerLinks.map(column => (
            <div key={column.heading}>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                {column.heading}
              </h4>
              <ul className="space-y-2">
                {column.links.map(link => {
                  const isInternal = link.href.startsWith('/')
                  const linkClass = "text-sm text-gray-400 hover:text-brand-blush transition-colors"
                  return (
                    <li key={link.label}>
                      {isInternal ? (
                        <Link to={link.href} className={linkClass}>
                          {link.label}
                        </Link>
                      ) : (
                        <a href={link.href} className={linkClass}>
                          {link.label}
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Copyright */}
            <p className="text-xs text-gray-400">
              © 2024 OUTTA Clothing. Bảo lưu mọi quyền.
            </p>

            {/* Legal Links */}
            <div className="flex gap-6 text-xs text-gray-400 md:justify-end">
              <a href="#" className="hover:text-brand-blush transition-colors">
                Chính Sách Bảo Mật
              </a>
              <a href="#" className="hover:text-brand-blush transition-colors">
                Điều Khoản Dịch Vụ
              </a>
              <a href="#" className="hover:text-brand-blush transition-colors">
                Vận Chuyển & Đổi Trả
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
