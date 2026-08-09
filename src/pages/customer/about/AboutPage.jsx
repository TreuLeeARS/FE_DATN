import { useLayoutEffect, useRef } from 'react'
import { Header } from '@/components/layout/Header/index.js'
import { Footer } from '@/components/layout/Footer/index.js'
import gsap from 'gsap'

export const AboutPage = () => {
  const containerRef = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // General entry animations
      gsap.from('.anim-fade-in', {
        opacity: 0,
        y: 35,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  return (
    <>
      <Header />
      
      <main ref={containerRef} className="pt-24 min-h-screen bg-brand-cream pb-16 font-sans">
        
        {/* Banner Section */}
        <section className="relative h-[450px] flex items-center justify-center bg-brand-charcoal overflow-hidden anim-fade-in">
          {/* Background image overlay */}
          <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-center bg-cover" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop')` }} />
          
          <div className="relative z-10 text-center max-w-3xl px-4 space-y-4">
            <span className="text-[10px] text-brand-blush font-bold tracking-[0.3em] uppercase block">Câu Chuyện Của OUTTA</span>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white font-bold tracking-wider leading-tight uppercase">
              Vẻ Đẹp Tối Giản & Cao Cấp
            </h1>
            <p className="text-gray-300 text-sm max-w-xl mx-auto font-light leading-relaxed">
              Tôn vinh sự tự tin, phóng khoáng và cá tính khác biệt của mọi người phụ nữ hiện đại thông qua ngôn ngữ thời trang tối giản nhưng đầy cuốn hút.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-24 space-y-20 md:space-y-28">
          
          {/* Brand Philosophy Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 order-2 lg:order-1 anim-fade-in">
              <span className="text-[10px] text-brand-muted font-bold tracking-[0.2em] uppercase block">Về Thương Hiệu</span>
              <h2 className="font-display text-3xl md:text-4xl text-brand-charcoal font-bold uppercase leading-tight">
                Không Chỉ Là Y Phục,<br />Đó Là Phong Thái Sống
              </h2>
              <div className="text-brand-muted text-sm leading-relaxed space-y-4 font-light">
                <p>
                  Được thành lập với sứ mệnh định nghĩa lại sự thanh lịch cho phái nữ, <strong>OUTTA</strong> tập trung vào các thiết kế phom dáng chuẩn mực, chất liệu chọn lọc cẩn thận (từ vải lanh thiên nhiên thoáng mát cho đến lụa cao cấp) nhằm mang lại sự thoải mái tối đa cho người mặc.
                </p>
                <p>
                  Chúng tôi tin rằng, trang phục đẹp nhất là trang phục thể hiện chân thực nhất cá tính và khí chất bên trong của bạn. Từ công sở thanh lịch đến các buổi tiệc sang trọng, OUTTA đồng hành cùng bạn trên mọi hành trình khẳng định bản thân.
                </p>
              </div>
            </div>
            <div className="order-1 lg:order-2 aspect-[4/3] bg-gray-100 overflow-hidden shadow-md anim-fade-in">
              <img 
                src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000&auto=format&fit=crop" 
                alt="Zara Style Fashion Collection" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out"
              />
            </div>
          </section>

          {/* Store Location & Contact Grid */}
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-12 bg-white p-8 md:p-12 border border-black/5 shadow-sm anim-fade-in">
            {/* Left side details (2 cols) */}
            <div className="lg:col-span-2 space-y-8 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] text-brand-muted font-bold tracking-[0.2em] uppercase block mb-1">Ghé Thăm Cửa Hàng</span>
                  <h3 className="font-display text-2xl font-bold text-brand-charcoal uppercase">OUTTA Showroom</h3>
                </div>

                <div className="space-y-4 text-sm font-light text-brand-muted">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-brand-charcoal shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-brand-charcoal">Địa Chỉ:</p>
                      <p>123 Hùng Vương, Biên Hòa, Vietnam, 60000</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-brand-charcoal shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-brand-charcoal">Hotline tư vấn:</p>
                      <p className="tracking-wide">039 812 3456</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-brand-charcoal shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-brand-charcoal">Email phản hồi:</p>
                      <p>outtastudio.vn@gmail.com</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-brand-charcoal shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-brand-charcoal">Giờ Mở Cửa:</p>
                      <p>9:00 AM - 10:00 PM (Hằng ngày)</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a 
                      href="https://maps.google.com/?q=123+Hùng+Vương,+Biên+Hòa"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-brand-charcoal text-white text-xs font-semibold tracking-widest uppercase px-6 py-3 hover:bg-brand-dark transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Đường đi Google Maps
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side Google Maps iframe (3 cols) */}
            <div className="lg:col-span-3 h-[380px] sm:h-[450px] border border-gray-150 relative bg-gray-50">
              <iframe
                title="Bản đồ chỉ đường đến showroom OUTTA 123 Hùng Vương, Biên Hòa"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3917.3871403215286!2d106.8200!3d10.9570!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3174dcb8e15469cf%3A0x8681e8ee6ec02c81!2zMTIzIEjDuW5nIFbGsMahbmcsIEJpw6puIEjDsmEsIMSQ4buTbmcgTmFp!5e0!3m2!1svi!2s!4v1719830000000!5m2!1svi!2s"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full filter grayscale contrast-125"
              />
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </>
  )
}
