import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { HeroText } from './HeroText.jsx'
import { duration, ease, stagger } from '@/utils/animation/gsapDefaults.js'

const brandValues = [
  { number: '01', label: 'Thiết kế tuyển chọn', description: 'Cân bằng giữa xu hướng và tính ứng dụng.' },
  { number: '02', label: 'Phong cách linh hoạt', description: 'Dễ dàng đồng hành trong mọi nhịp sống.' },
  { number: '03', label: 'Trải nghiệm chỉn chu', description: 'Từ lựa chọn sản phẩm đến dịch vụ khách hàng.' },
]

export const Hero = () => {
  const containerRef = useRef(null)
  const headlineRef = useRef(null)
  const sublineRef = useRef(null)
  const ctaRef = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: ease.out } })

      timeline
        .from('.hero-headline-line', {
          yPercent: 110,
          opacity: 0,
          duration: duration.slow,
          stagger: stagger.text,
        }, '-=0.15')
        .from(sublineRef.current, { y: 20, opacity: 0, duration: duration.base }, '-=0.4')
        .from(ctaRef.current, { y: 16, opacity: 0, duration: duration.base }, '-=0.45')
        .from('[data-brand-value]', {
          y: 16,
          opacity: 0,
          duration: duration.base,
          stagger: 0.08,
        }, '-=0.25')
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden border-b border-brand-charcoal/[0.08] bg-[#f8f5f0]"
      style={{ paddingTop: 'clamp(7.5rem, 15vh, 9rem)' }}
    >
      <div className="pointer-events-none absolute left-[-8rem] top-24 h-72 w-72 rounded-full border border-brand-charcoal/[0.06]" />
      <div className="pointer-events-none absolute right-[-5rem] top-[-4rem] h-80 w-80 rounded-full bg-brand-blush/15 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-28 h-px w-[70vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-brand-charcoal/10 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="pb-14 sm:pb-16 lg:pb-20">
          <HeroText
            headlineRef={headlineRef}
            sublineRef={sublineRef}
            ctaRef={ctaRef}
          />
        </div>

        <div className="grid border-t border-brand-charcoal/[0.09] md:grid-cols-3">
          {brandValues.map((item, index) => (
            <div
              key={item.number}
              data-brand-value
              className={`flex gap-5 py-7 md:px-8 md:py-8 ${
                index > 0 ? 'border-t border-brand-charcoal/[0.09] md:border-l md:border-t-0' : ''
              }`}
            >
              <span className="pt-0.5 text-[9px] font-semibold tracking-[0.18em] text-brand-muted">
                {item.number}
              </span>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal">
                  {item.label}
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-brand-muted">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
