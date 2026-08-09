import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Header } from '@/components/layout/Header/index.js'
import { Footer } from '@/components/layout/Footer/index.js'

const pageContent = {
  contact: {
    eyebrow: 'OUTTA luôn sẵn sàng lắng nghe',
    title: 'Liên Hệ Với Chúng Tôi',
    intro: 'Bạn cần tư vấn sản phẩm, kiểm tra đơn hàng hoặc gửi góp ý? Đội ngũ OUTTA sẽ hỗ trợ bạn nhanh nhất có thể.',
    sections: [
      { title: 'Kênh hỗ trợ', text: 'Hotline: 039 812 3456\nEmail: outtastudio.vn@gmail.com\nFacebook: OUTTA Studio' },
      { title: 'Thời gian làm việc', text: 'Thứ Hai – Chủ Nhật: 9:00 – 22:00. Tin nhắn ngoài giờ sẽ được phản hồi vào ca làm việc tiếp theo.' },
      { title: 'Showroom', text: '123 Hùng Vương, Biên Hòa, Đồng Nai. Bạn có thể đến xem, thử sản phẩm và nhận tư vấn trực tiếp.' },
    ],
  },
  shipping: {
    eyebrow: 'Giao hàng toàn quốc',
    title: 'Thông Tin Vận Chuyển',
    intro: 'OUTTA đóng gói cẩn thận và cập nhật trạng thái để bạn dễ dàng theo dõi hành trình đơn hàng.',
    sections: [
      { title: 'Thời gian xử lý', text: 'Đơn hàng được xác nhận và bàn giao cho đơn vị vận chuyển trong 1–2 ngày làm việc.' },
      { title: 'Thời gian giao dự kiến', text: 'Nội thành: 1–3 ngày. Các tỉnh thành khác: 3–7 ngày. Thời gian có thể thay đổi trong dịp lễ hoặc do thời tiết.' },
      { title: 'Phí vận chuyển', text: 'Phí giao hàng được hiển thị rõ tại bước thanh toán, tùy khu vực và giá trị đơn hàng.' },
      { title: 'Kiểm tra khi nhận', text: 'Vui lòng kiểm tra tình trạng gói hàng trước khi nhận. Nếu kiện hàng móp, rách hoặc sai thông tin, hãy chụp ảnh và liên hệ OUTTA.' },
    ],
  },
  returns: {
    eyebrow: 'Mua sắm an tâm',
    title: 'Chính Sách Đổi Trả',
    intro: 'Chúng tôi hỗ trợ đổi sản phẩm phù hợp để trải nghiệm mua sắm của bạn luôn trọn vẹn.',
    sections: [
      { title: 'Thời hạn đổi', text: 'Yêu cầu đổi hàng trong vòng 7 ngày kể từ ngày nhận sản phẩm.' },
      { title: 'Điều kiện áp dụng', text: 'Sản phẩm còn nguyên tem, nhãn, chưa qua sử dụng hoặc giặt ủi và có hóa đơn/mã đơn hàng. Sản phẩm giảm giá sâu, đồ lót và phụ kiện cá nhân không áp dụng.' },
      { title: 'Sản phẩm lỗi hoặc giao sai', text: 'OUTTA chịu toàn bộ chi phí đổi hàng nếu sản phẩm có lỗi từ nhà sản xuất hoặc không đúng với đơn đặt hàng.' },
      { title: 'Cách gửi yêu cầu', text: 'Liên hệ hotline hoặc email, cung cấp mã đơn hàng cùng hình ảnh sản phẩm. Đội ngũ hỗ trợ sẽ hướng dẫn các bước tiếp theo.' },
    ],
  },
  faq: {
    eyebrow: 'Hỗ trợ nhanh',
    title: 'Câu Hỏi Thường Gặp',
    intro: 'Một số thông tin hữu ích giúp bạn mua sắm tại OUTTA thuận tiện hơn.',
    sections: [
      { title: 'Làm sao chọn đúng kích cỡ?', text: 'Tham khảo bảng kích thước trên trang sản phẩm hoặc gửi số đo chiều cao, cân nặng, vòng ngực và vòng eo để được tư vấn.' },
      { title: 'Tôi có thể thay đổi đơn hàng không?', text: 'Có, nếu đơn chưa được bàn giao cho đơn vị vận chuyển. Hãy liên hệ OUTTA sớm nhất và cung cấp mã đơn.' },
      { title: 'OUTTA hỗ trợ phương thức thanh toán nào?', text: 'Bạn có thể thanh toán theo các phương thức hiển thị tại trang thanh toán, bao gồm thanh toán trực tuyến và các lựa chọn khả dụng theo khu vực.' },
      { title: 'Làm sao theo dõi đơn?', text: 'Đăng nhập và mở mục Đơn hàng của tôi. Bạn cũng có thể liên hệ hotline kèm mã đơn để được kiểm tra.' },
    ],
  },
  sustainability: {
    eyebrow: 'Thời trang có trách nhiệm',
    title: 'Phát Triển Bền Vững',
    intro: 'OUTTA hướng đến những lựa chọn tốt hơn cho sản phẩm, con người và môi trường trong từng bước phát triển.',
    sections: [
      { title: 'Thiết kế bền lâu', text: 'Ưu tiên phom dáng vượt thời gian, dễ phối và có thể đồng hành cùng khách hàng qua nhiều mùa.' },
      { title: 'Chất liệu có chọn lọc', text: 'Từng bước tăng tỷ lệ vật liệu thân thiện, tối ưu định mức vải và lựa chọn nhà cung cấp minh bạch.' },
      { title: 'Bao bì tối giản', text: 'Giảm lớp đóng gói không cần thiết, ưu tiên vật liệu có thể tái sử dụng hoặc tái chế.' },
      { title: 'Sản xuất có trách nhiệm', text: 'Hợp tác với đối tác tôn trọng điều kiện lao động, kiểm soát chất lượng để hạn chế sản phẩm lỗi và lãng phí.' },
    ],
  },
  blog: {
    eyebrow: 'Cảm hứng mặc đẹp',
    title: 'OUTTA Journal',
    intro: 'Khám phá câu chuyện thiết kế, bí quyết phối đồ và những xu hướng được OUTTA chọn lọc.',
    sections: [
      { title: '5 món đồ nền tảng cho tủ quần áo', text: 'Bắt đầu với áo sơ mi, blazer, quần suông, đầm tối giản và một chiếc túi có cấu trúc để tạo nhiều bản phối linh hoạt.' },
      { title: 'Cách chăm sóc trang phục bền đẹp', text: 'Đọc kỹ nhãn hướng dẫn, phân loại màu, giặt ở nhiệt độ phù hợp và cất giữ đúng cách để kéo dài tuổi thọ sản phẩm.' },
      { title: 'Phối đồ thanh lịch từ sáng đến tối', text: 'Chỉ cần thay phụ kiện, giày và lớp áo khoác, một thiết kế tối giản có thể phù hợp cả công sở lẫn buổi hẹn tối.' },
    ],
  },
  careers: {
    eyebrow: 'Cùng tạo nên OUTTA',
    title: 'Cơ Hội Nghề Nghiệp',
    intro: 'Chúng tôi tìm kiếm những người yêu thời trang, chủ động và muốn cùng xây dựng trải nghiệm khách hàng khác biệt.',
    sections: [
      { title: 'Vị trí đang quan tâm', text: 'Nhân viên bán hàng, chăm sóc khách hàng, sáng tạo nội dung và vận hành thương mại điện tử.' },
      { title: 'Môi trường làm việc', text: 'Cởi mở, tôn trọng ý tưởng, đề cao tinh thần học hỏi và phối hợp giữa các nhóm.' },
      { title: 'Cách ứng tuyển', text: 'Gửi CV và phần giới thiệu ngắn về outtastudio.vn@gmail.com với tiêu đề: [Ứng tuyển] – Vị trí – Họ tên.' },
    ],
  },
}

export const InfoPage = () => {
  const { page } = useParams()
  const content = pageContent[page]

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  if (!content) return null

  return (
    <>
      <Header />
      <main className="min-h-screen bg-brand-cream pt-24 pb-20">
        <section className="bg-brand-charcoal py-16 md:py-24 text-center px-4">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-blush mb-4">{content.eyebrow}</p>
          <h1 className="font-display text-3xl md:text-5xl font-bold uppercase tracking-wide text-white">{content.title}</h1>
          <p className="mt-5 max-w-2xl mx-auto text-sm md:text-base leading-7 text-gray-300">{content.intro}</p>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="grid gap-5 md:grid-cols-2">
            {content.sections.map(section => (
              <article key={section.title} className="bg-white border border-black/5 p-7 md:p-8 shadow-sm">
                <h2 className="font-display text-xl font-bold uppercase text-brand-charcoal mb-4">{section.title}</h2>
                <p className="whitespace-pre-line text-sm leading-7 text-brand-muted">{section.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/shop" className="inline-flex bg-brand-charcoal text-white px-7 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-brand-dark transition-colors">
              Tiếp tục mua sắm
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
