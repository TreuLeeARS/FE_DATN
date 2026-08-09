import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/Header/index.js'
import { Footer } from '@/components/layout/Footer/index.js'

export const NotFoundPage = () => {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-brand-cream flex flex-col justify-center items-center text-center px-6 py-28 font-sans">
        <div className="max-w-md w-full bg-white border border-gray-100 shadow-xl p-8 md:p-12 rounded-2xl">
          <h1 className="font-display text-7xl font-bold text-brand-charcoal mb-4">
            404
          </h1>
          <h2 className="font-display text-xl font-bold text-brand-charcoal mb-3 uppercase tracking-wider">
            Không tìm thấy trang
          </h2>
          <p className="text-brand-muted text-sm leading-relaxed mb-8">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển sang địa chỉ khác.
          </p>
          <Link
            to="/"
            className="inline-block w-full bg-brand-charcoal text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-brand-dark transition-all duration-300 active:scale-[0.98] text-center"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
export default NotFoundPage;
