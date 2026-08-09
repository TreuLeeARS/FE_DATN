import { Link } from 'react-router-dom'
import { useCartContext } from '@/contexts/cart/CartContext.jsx'
import { showAuthToast } from '@/utils/auth/authToast.jsx'

export const CartIcon = () => {
  const { count } = useCartContext()

  const handleCartClick = (e) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      e.preventDefault()
      sessionStorage.setItem('authRedirectUrl', '/cart')
      showAuthToast('Đăng nhập để xem giỏ hàng và thanh toán.')
    }
  }

  return (
    <Link
      to="/cart"
      onClick={handleCartClick}
      className="relative p-2 hover:opacity-60 transition-opacity block"
      aria-label="Shopping cart"
    >
      <svg
        className="w-[22px] h-[22px] text-brand-charcoal"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      {count > 0 && (
        <span className="absolute top-1 right-1 bg-black text-white
                        text-[8px] font-semibold min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center border border-white">
          {count}
        </span>
      )}
    </Link>
  )
}
