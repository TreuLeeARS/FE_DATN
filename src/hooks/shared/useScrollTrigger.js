import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { duration, ease } from '@/utils/animation/gsapDefaults.js'

// Reusable hook factory for common scroll trigger animations
export const useScrollTrigger = (ref, options = {}) => {
  const {
    from = { opacity: 0, y: 50 },
    to = { opacity: 1, y: 0 },
    dur = duration.base,
    easeType = ease.out,
    trigger = ref,
    start = 'top 85%',
    once = true,
    staggerChildren = false,
    staggerAmount = 0.1,
  } = options

  useLayoutEffect(() => {
    if (!ref.current) return

    const ctx = gsap.context(() => {
      const targets = staggerChildren
        ? ref.current.querySelectorAll('[data-scroll-item]')
        : ref.current

      gsap.from(targets, {
        ...from,
        duration: dur,
        ease: easeType,
        stagger: staggerChildren ? staggerAmount : 0,
        scrollTrigger: {
          trigger: trigger.current || trigger,
          start,
          once,
        },
      })
    }, ref)

    return () => ctx.revert()
  }, [ref, trigger, from, to, dur, easeType, once, staggerChildren, staggerAmount, start])
}
