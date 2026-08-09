export const HeroText = ({ headlineRef, sublineRef, ctaRef }) => {
  const headline = ['Phong cách tinh tế.', 'Dấu ấn riêng.']

  return (
    <div className="relative z-10 mx-auto max-w-5xl text-center">
      <h1
        ref={headlineRef}
        className="font-display text-[clamp(2.8rem,5.5vw,5.8rem)] font-semibold leading-[1.18] tracking-[-0.04em] text-brand-charcoal"
      >
        {headline.map((line) => (
          <span key={line} className="block overflow-hidden px-1 pb-3">
            <span className="hero-headline-line block">{line}</span>
          </span>
        ))}
      </h1>

      <p
        ref={sublineRef}
        className="mx-auto mt-6 max-w-2xl text-base leading-7 text-brand-muted sm:text-lg sm:leading-8"
      >
        Thời trang nữ được tuyển chọn cho nhịp sống hiện đại — thanh lịch,
        linh hoạt và đủ khác biệt để thể hiện cá tính riêng của bạn.
      </p>

      <div ref={ctaRef} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href="#collections"
          className="inline-flex min-w-56 items-center justify-center bg-brand-charcoal px-7 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-all hover:-translate-y-0.5 hover:bg-black hover:shadow-lg"
        >
          Khám phá bộ sưu tập
        </a>
        <a
          href="/about"
          className="inline-flex min-w-44 items-center justify-center border border-brand-charcoal/20 bg-white/50 px-7 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-charcoal transition-all hover:border-brand-charcoal hover:bg-white"
        >
          Về OUTTA
        </a>
      </div>
    </div>
  )
}
