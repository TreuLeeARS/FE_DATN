// Centralized GSAP animation constants for consistency across the app

export const ease = {
  out: 'power3.out',
  inOut: 'power2.inOut',
  spring: 'elastic.out(1, 0.5)',
  back: 'back.out(1.7)',
}

export const duration = {
  fast: 0.4,
  base: 0.7,
  slow: 1.2,
}

export const stagger = {
  cards: 0.1,
  text: 0.06,
}

export const scrollTriggerDefaults = {
  start: 'top 85%',
  end: 'bottom 15%',
  once: true,
}
