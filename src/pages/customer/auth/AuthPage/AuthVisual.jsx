import { useLayoutEffect, useRef, useEffect } from 'react'
import gsap from 'gsap'
import { Link } from 'react-router-dom'

export const AuthVisual = () => {
  const visualRef = useRef(null)
  const shapesRef = useRef([])

  // ─── GSAP Entrance + Continuous Animations ───
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      // 1. Background fade in
      tl.from(visualRef.current, {
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
      })

      // 2. Decorative shapes scale + rotate in with stagger
      tl.from('.visual-shape', {
        scale: 0,
        opacity: 0,
        rotation: -90,
        duration: 1.2,
        stagger: 0.12,
        ease: 'back.out(1.7)',
      }, 0.2)

      // 3. Logo slides up
      tl.from('.visual-logo', {
        y: 60,
        opacity: 0,
        scale: 0.8,
        duration: 0.9,
      }, 0.5)

      // 4. Tagline words stagger reveal
      tl.from('.visual-tagline-word', {
        y: 50,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
      }, 0.7)

      // 5. Subtitle and back link fade in
      tl.from('.visual-subtitle', {
        y: 20,
        opacity: 0,
        duration: 0.6,
      }, 1.0)

      tl.from('.visual-back-link', {
        x: -30,
        opacity: 0,
        duration: 0.5,
      }, 1.1)

      // 6. Bottom dots stagger
      tl.from('.visual-dot', {
        scale: 0,
        opacity: 0,
        duration: 0.4,
        stagger: 0.08,
        ease: 'back.out(2)',
      }, 1.2)

      // ─── Continuous floating animations ───
      gsap.to('.shape-float-1', {
        y: -30,
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      gsap.to('.shape-float-2', {
        y: 25,
        x: -15,
        duration: 4.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.5,
      })

      gsap.to('.shape-float-3', {
        y: -20,
        x: 12,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1,
      })

      gsap.to('.shape-rotate', {
        rotation: 360,
        duration: 25,
        repeat: -1,
        ease: 'none',
      })

      gsap.to('.shape-pulse', {
        scale: 1.15,
        opacity: 0.15,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
    }, visualRef)

    return () => ctx.revert()
  }, [])

  // ─── Mouse Parallax on Shapes ───
  useEffect(() => {
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e
      const centerX = window.innerWidth / 4 // center of left panel
      const centerY = window.innerHeight / 2
      const moveX = (clientX - centerX) / centerX
      const moveY = (clientY - centerY) / centerY

      shapesRef.current.forEach((shape, i) => {
        if (!shape) return
        const depth = (i + 1) * 6
        gsap.to(shape, {
          x: moveX * depth,
          y: moveY * depth,
          duration: 1,
          ease: 'power2.out',
          overwrite: 'auto',
        })
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div
      ref={visualRef}
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #1A1A1A 0%, #2C2C2C 40%, #333333 100%)',
      }}
    >
      {/* Dot grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #F2C4CE 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ─── Back to Home ─── */}
      <Link
        to="/"
        className="visual-back-link absolute top-8 left-8 text-sm text-gray-500 hover:text-white
                   transition-colors duration-300 flex items-center gap-2 z-10"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Quay lại trang chủ
      </Link>

      {/* ─── Decorative Shapes ─── */}

      {/* Shape 1: Large blush gradient orb - top right */}
      <div
        ref={el => shapesRef.current[0] = el}
        className="visual-shape shape-float-1 shape-pulse absolute -top-16 -right-16 w-72 h-72 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(242,196,206,0.25), transparent 70%)' }}
      />

      {/* Shape 2: Medium ring - center left */}
      <div
        ref={el => shapesRef.current[1] = el}
        className="visual-shape shape-float-2 shape-rotate absolute top-[22%] -left-12 w-44 h-44
                   rounded-full border-[1.5px] border-brand-blush/20"
      />

      {/* Shape 3: Small filled circle - bottom left */}
      <div
        ref={el => shapesRef.current[2] = el}
        className="visual-shape shape-float-3 absolute bottom-[28%] left-[18%] w-24 h-24
                   rounded-full bg-brand-blush/8"
      />

      {/* Shape 4: Horizontal gradient line - upper area */}
      <div
        ref={el => shapesRef.current[3] = el}
        className="visual-shape absolute top-[35%] right-[15%] w-40 h-px
                   bg-gradient-to-r from-transparent via-brand-blush/30 to-transparent"
      />

      {/* Shape 5: Small diamond - bottom right */}
      <div
        ref={el => shapesRef.current[4] = el}
        className="visual-shape shape-float-1 absolute bottom-[35%] right-[22%] w-6 h-6
                   bg-brand-blush/15 rotate-45 rounded-sm"
      />

      {/* Shape 6: Tiny ring - top left */}
      <div
        ref={el => shapesRef.current[5] = el}
        className="visual-shape shape-float-3 absolute top-[15%] left-[30%] w-14 h-14
                   rounded-full border border-white/10"
      />

      {/* Shape 7: Vertical gradient line - left area */}
      <div
        className="visual-shape absolute left-[12%] top-[40%] w-px h-32
                   bg-gradient-to-b from-transparent via-brand-blush/20 to-transparent"
      />

      {/* Shape 8: Glow behind logo */}
      <div
        className="visual-shape absolute w-96 h-96 rounded-full opacity-[0.08]"
        style={{ background: 'radial-gradient(circle, #F2C4CE, transparent 60%)' }}
      />

      {/* ─── Content ─── */}
      <div className="relative z-10 text-center px-12">
        {/* Logo */}
        <h1 className="visual-logo font-display text-6xl font-bold text-white mb-10 tracking-tight">
          OUTTA <span className="text-brand-blush">Studio</span>
        </h1>

        {/* Tagline */}
        <div className="mb-8 leading-relaxed">
          <span className="visual-tagline-word inline-block font-display text-3xl text-white/90 mr-2">Khám</span>
          <span className="visual-tagline-word inline-block font-display text-3xl text-white/90 mr-2">Phá</span>
          <span className="visual-tagline-word inline-block font-display text-3xl text-brand-blush mr-2">Phong</span>
          <span className="visual-tagline-word inline-block font-display text-3xl text-brand-blush">Cách</span>
          <br />
          <span className="visual-tagline-word inline-block font-display text-3xl text-white/90 mr-2 mt-3">Của</span>
          <span className="visual-tagline-word inline-block font-display text-3xl text-white/90 mt-3">Bạn</span>
        </div>

        {/* Subtitle */}
        <p className="visual-subtitle text-gray-500 text-base max-w-xs mx-auto leading-relaxed">
          Đăng nhập để trải nghiệm thế giới thời trang được cá nhân hóa riêng cho bạn.
        </p>
      </div>

      {/* ─── Bottom Decorative Dots ─── */}
      <div className="absolute bottom-10 flex items-center gap-3">
        <div className="visual-dot w-1.5 h-1.5 rounded-full bg-brand-blush/30" />
        <div className="visual-dot w-2 h-2 rounded-full bg-brand-blush/50" />
        <div className="visual-dot w-3 h-3 rounded-full bg-brand-blush/30 border border-brand-blush/20" />
        <div className="visual-dot w-2 h-2 rounded-full bg-brand-blush/50" />
        <div className="visual-dot w-1.5 h-1.5 rounded-full bg-brand-blush/30" />
      </div>
    </div>
  )
}
