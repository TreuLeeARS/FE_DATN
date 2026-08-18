import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import toast from 'react-hot-toast'
import { showAuthToast } from '@/utils/auth/authToast.jsx'
import { ProductCard } from './ProductCard.jsx'
import { useCartContext } from '@/contexts/cart/CartContext.jsx'
import { duration, ease, stagger } from '@/utils/animation/gsapDefaults.js'
import productApi from '@/api/products/productApi.js'
import dashboardApi from '@/api/dashboard/dashboardApi.js'
import { mapDbProduct } from '@/utils/products/productMapper.js'

// Số sản phẩm bán chạy hiển thị trên trang chủ.
const BEST_SELLERS_DISPLAY_LIMIT = 4
// Số sản phẩm tải để đối chiếu dữ liệu bán chạy. Có thể bỏ khi BE trả productId.
const BEST_SELLER_PRODUCT_LOOKUP_SIZE = 500
// BE yêu cầu khoảng thời gian; mốc này giúp thống kê toàn bộ lịch sử bán hàng.
const ALL_TIME_BEST_SELLER_START_DATE = '2000-01-01'

gsap.registerPlugin(ScrollTrigger)

export const ProductGrid = () => {
  const { addItem } = useCartContext()
  const navigate = useNavigate()
  const gridRef = useRef(null)
  const titleRef = useRef(null)

  const [productsList, setProductsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let isMounted = true
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setLoadError('')
        const today = new Date()
        const toDateValue = (date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }

        const [bestSellerResponse, productResponse] = await Promise.all([
          dashboardApi.getBestSellers(ALL_TIME_BEST_SELLER_START_DATE, toDateValue(today), BEST_SELLERS_DISPLAY_LIMIT),
          productApi.getAllProducts({ page: 0, size: BEST_SELLER_PRODUCT_LOOKUP_SIZE }),
        ])

        if (!isMounted) return

        const bestSellers = Array.isArray(bestSellerResponse?.data)
          ? bestSellerResponse.data
          : []
        const products = productResponse?.data?.content || []
        const normalizeName = (name) => String(name || '').trim().toLocaleUpperCase('vi-VN')

        const rankedProducts = bestSellers
          .map((bestSeller) => {
            const product = products.find(
              (item) => normalizeName(item.name) === normalizeName(bestSeller.productName),
            )
            if (!product) return null
            const mappedProduct = mapDbProduct(product)
            return mappedProduct ? { ...mappedProduct, bestSellerStats: bestSeller } : null
          })
          .filter(Boolean)

        if (bestSellers.length > 0 && rankedProducts.length === 0) {
          setLoadError('Không thể ghép dữ liệu sản phẩm bán chạy với danh sách sản phẩm hiện tại.')
        }
        setProductsList(rankedProducts)
      } catch (err) {
        console.error('Error fetching homepage products:', err)
        if (isMounted) {
          setProductsList([])
          setLoadError(
            err.response?.status === 401 || err.response?.status === 403
              ? 'API sản phẩm bán chạy chưa được cấp quyền truy cập công khai.'
              : 'Không thể tải dữ liệu sản phẩm bán chạy từ Backend.'
          )
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchProducts()
    return () => { isMounted = false }
  }, [])

  useLayoutEffect(() => {
    if (loading || productsList.length === 0) return

    const ctx = gsap.context(() => {
      // Animate section title
      gsap.from(titleRef.current, {
        y: 50,
        opacity: 0,
        duration: duration.base,
        ease: ease.out,
        scrollTrigger: {
          trigger: titleRef.current,
          start: 'top 85%',
          once: true,
        },
      })

      // Stagger animation for product cards on scroll
      ScrollTrigger.batch('.product-card', {
        onEnter: elements =>
          gsap.from(elements, {
            opacity: 0,
            y: 60,
            duration: duration.base,
            stagger: stagger.cards,
            ease: ease.out,
          }),
        once: true,
        start: 'top 85%',
      })
    }, gridRef)

    return () => ctx.revert()
  }, [loading, productsList])

  const handleAddToCart = (product) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      sessionStorage.setItem('pendingPurchase', JSON.stringify({ product, action: 'cart' }))
      sessionStorage.setItem('authRedirectUrl', window.location.pathname + window.location.search)
      showAuthToast('Đăng nhập để thêm sản phẩm vào giỏ hàng.')
      return
    }
    addItem(product, 1)
    toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`)
  }

  const handleBuyNow = async (product) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      sessionStorage.setItem('pendingPurchase', JSON.stringify({ product, action: 'buy' }))
      sessionStorage.setItem('authRedirectUrl', '/cart')
      showAuthToast('Đăng nhập để tiến hành mua sắm ngay.')
      return
    }
    await addItem(product, 1)
    sessionStorage.setItem('checkoutOnlyName', product.name)
    sessionStorage.setItem('checkoutOnlySize', product.selectedSize || 'S')
    sessionStorage.setItem('checkoutOnlyColor', product.selectedColor || '')
    sessionStorage.setItem('checkoutOnlyProductId', product.id)
    navigate('/cart')
  }

  return (
    <section
      ref={gridRef}
      id="products"
      className="py-16 md:py-24 bg-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div
          ref={titleRef}
          className="mb-12 md:mb-16 text-center"
        >
          <h2 className="section-heading mb-4">
            Sản Phẩm Bán Chạy
          </h2>
          <p className="text-brand-muted text-lg max-w-2xl mx-auto">
            Những thiết kế được yêu thích và mua nhiều nhất.
          </p>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 w-full animate-fade-in">
            <svg className="w-8 h-8 animate-spin text-brand-charcoal mb-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-medium text-brand-muted">Đang tải sản phẩm bán chạy...</p>
          </div>
        ) : loadError ? (
          <div className="mx-auto max-w-xl border border-red-200 bg-red-50 px-5 py-4 text-center text-sm text-red-700">
            {loadError}
          </div>
        ) : productsList.length === 0 ? (
          <div className="mx-auto max-w-xl border border-dashed border-gray-300 px-5 py-10 text-center text-sm text-brand-muted">
            Chưa có sản phẩm phát sinh doanh số.
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
            {productsList.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
              />
            ))}
          </div>
        )}

        {/* View All CTA */}
        <div className="text-center mt-12 md:mt-16">
          <button
            onClick={() => navigate('/shop')}
            className="btn-secondary font-semibold"
          >
            Xem Tất Cả Sản Phẩm
          </button>
        </div>
      </div>
    </section>
  )
}
