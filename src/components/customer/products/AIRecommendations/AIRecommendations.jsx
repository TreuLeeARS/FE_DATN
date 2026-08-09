import { useLayoutEffect, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import toast from 'react-hot-toast'
import { showAuthToast } from '@/utils/auth/authToast.jsx'
import { ProductCard } from '../ProductGrid/ProductCard.jsx'
import { useCartContext } from '@/contexts/cart/CartContext.jsx'
import { duration, ease } from '@/utils/animation/gsapDefaults.js'
import productApi from '@/api/products/productApi.js'
import { mapDbProduct } from '@/utils/products/productMapper.js'

// Số sản phẩm hiển thị trong bộ sưu tập trang chủ.
const SHOP_COLLECTION_PRODUCTS_LIMIT = 4

gsap.registerPlugin(ScrollTrigger)

export const AIRecommendations = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const { addItem } = useCartContext()
  const containerRef = useRef(null)
  const titleRef = useRef(null)

  useEffect(() => {
    let isMounted = true
    const fetchProducts = async () => {
      try {
        setIsLoading(true)
        const res = await productApi.getAllProducts({ page: 0, size: SHOP_COLLECTION_PRODUCTS_LIMIT })
        if (res && res.data && res.data.content && isMounted) {
          const mapped = res.data.content.map(p => mapDbProduct(p)).filter(Boolean)
          setProducts(mapped)
        }
      } catch (err) {
        console.error('Error fetching shop collection products:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchProducts()
    return () => { isMounted = false }
  }, [])

  useLayoutEffect(() => {
    if (isLoading || products.length === 0) return

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

      // Stagger animation for product cards
      ScrollTrigger.batch('.product-card', {
        onEnter: elements =>
          gsap.from(elements, {
            opacity: 0,
            y: 40,
            duration: duration.base,
            stagger: 0.08,
            ease: ease.out,
          }),
        once: true,
        start: 'top 85%',
      })
    }, containerRef)

    return () => ctx.revert()
  }, [isLoading, products])

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
      ref={containerRef}
      className="py-16 md:py-24 bg-brand-cream"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div
          ref={titleRef}
          className="mb-12 md:mb-16 text-center"
        >
          <h2 className="section-heading mb-4">
            Bộ Sưu Tập Của Shop
          </h2>
          <p className="text-brand-muted text-lg max-w-2xl mx-auto">
            Khám phá những thiết kế nổi bật được tuyển chọn từ cửa hàng.
          </p>
        </div>

        {/* Products Grid or Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-brand-blush border-t-brand-charcoal
                            rounded-full animate-spin" />
              <p className="text-brand-muted">Đang tải bộ sưu tập...</p>
            </div>
          </div>
        ) : products.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-brand-muted">Chưa có sản phẩm nào.</p>
        )}
      </div>
    </section>
  )
}
