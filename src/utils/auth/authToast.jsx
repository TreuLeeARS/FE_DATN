import toast from 'react-hot-toast';

/**
 * Hiển thị Toast thông báo yêu cầu đăng nhập theo phong cách tối giản, sang trọng (Zara/Uniqlo)
 * @param {string} message - Nội dung thông báo hiển thị cho người dùng
 */
export const showAuthToast = (message = 'Đăng nhập để thêm sản phẩm vào giỏ hàng.') => {
  toast.custom((t) => (
    <div
      className={`
        ${t.visible ? 'animate-fade-in' : 'animate-fade-out'} 
        w-[calc(100%-2rem)] mx-4 sm:mx-0 sm:max-w-sm sm:w-full
        bg-white border border-neutral-100/90 shadow-[0_12px_40px_rgba(0,0,0,0.08)] 
        rounded-2xl pointer-events-auto flex items-start p-4 justify-between 
        transition-all duration-300 ring-1 ring-black/5 
        mt-20 md:mt-24 sm:mr-4
      `}
      style={{
        animation: t.visible 
          ? 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards' 
          : 'fadeOut 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <div className="flex gap-3.5 items-start w-full">
        {/* Icon Khóa (🔒) bằng SVG thanh lịch, tối giản */}
        <div className="p-2.5 bg-brand-cream border border-neutral-100 rounded-xl text-brand-charcoal mt-0.5 flex items-center justify-center flex-shrink-0">
          <svg 
            className="w-5 h-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={1.5}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" 
            />
          </svg>
        </div>

        {/* Nội dung thông báo và Nút hành động */}
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-sm font-medium text-brand-charcoal leading-snug">
            {message}
          </p>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              window.location.href = '/auth';
            }}
            className="mt-3 inline-flex items-center justify-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-brand-charcoal hover:bg-brand-blush hover:text-brand-charcoal transition-all duration-300 rounded-lg shadow-sm active:scale-95 cursor-pointer"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>

      {/* Nút đóng (×) ở góc phải */}
      <button
        onClick={() => toast.dismiss(t.id)}
        className="text-neutral-400 hover:text-brand-charcoal transition-colors p-1.5 rounded-full hover:bg-neutral-50 flex items-center justify-center flex-shrink-0"
        aria-label="Đóng"
      >
        <svg 
          className="w-4 h-4" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  ), {
    duration: 4500, // Tự động ẩn sau 4.5 giây
  });
};
