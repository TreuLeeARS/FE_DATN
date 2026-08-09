import { useLayoutEffect, useRef, useState, useEffect } from 'react'
import { formatVND } from '@/utils/currency/price.js'
import { DEFAULT_PRODUCT_POLICIES, PRODUCT_POLICIES_ENABLED } from '@/data/products/productPolicies.js'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { ProductBadge } from './ProductBadge.jsx'
import { duration, ease } from '@/utils/animation/gsapDefaults.js'
import productApi from '@/api/products/productApi.js'
import { mapDbProduct } from '@/utils/products/productMapper.js'
import { replaceBrokenProductImage } from '@/utils/products/imageUrl.js'

// Nhãn danh mục tiếng Việt
const categoryLabels = {
  tops: 'Áo',
  bottoms: 'Quần',
  dresses: 'Váy & Đầm',
  sets: 'Set đồ',
  outerwear: 'Áo khoác',
  shoes: 'Giày',
  bags: 'Túi xách',
  accessories: 'Phụ kiện',
}

// Số màu tối đa hiển thị trên mỗi thẻ sản phẩm; xem đủ màu trong modal chi tiết.
const MAX_VISIBLE_PRODUCT_COLORS = 3

export const ProductCard = ({ product: initialProduct, onAddToCart, onBuyNow }) => {
  const cardRef = useRef(null)
  const imageRef = useRef(null)
  const overlayRef = useRef(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [showWarning, setShowWarning] = useState(false)
  const timelineRef = useRef(null)

  const [detailedProduct, setDetailedProduct] = useState(null)
  const [, setLoadingDetail] = useState(false)
  const [brokenImages, setBrokenImages] = useState({})

  useEffect(() => {
    if (isModalOpen) {
      setBrokenImages({})
    }
  }, [isModalOpen])

  useEffect(() => {
    let isMounted = true
    const fetchDetail = async () => {
      if (initialProduct.variants && initialProduct.variants.length > 0) {
        setDetailedProduct(initialProduct)
        return
      }
      
      const productId = initialProduct.productId || initialProduct.id
      if (!productId || isNaN(productId)) return

      try {
        setLoadingDetail(true)
        const res = await productApi.getProductDetail(Number(productId))
        if (res && res.data && isMounted) {
          const mapped = mapDbProduct(res.data)
          setDetailedProduct(mapped)
        }
      } catch (err) {
        console.error('Error loading product details in card:', err)
      } finally {
        if (isMounted) setLoadingDetail(false)
      }
    }
    fetchDetail()
    return () => { isMounted = false }
  }, [initialProduct])

  const product = detailedProduct || initialProduct


  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Create hover timeline once
      timelineRef.current = gsap.timeline({ paused: true })

      timelineRef.current
        .to(imageRef.current, {
          scale: 1.08,
          duration: duration.base,
          ease: ease.out,
        }, 0)
        .to(overlayRef.current, {
          opacity: 0.4,
          duration: duration.base,
          ease: ease.out,
        }, 0)
    }, cardRef)

    return () => ctx.revert()
  }, [])

  // Play/reverse timeline on hover state change
  useLayoutEffect(() => {
    if (timelineRef.current) {
      if (isHovered) {
        timelineRef.current.play()
      } else {
        timelineRef.current.reverse()
      }
    }
  }, [isHovered])

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  const isOutOfStock = (() => {
    if (selectedColor === null || !selectedSize) return false;
    const selColorName = product.colors[selectedColor]?.name;
    const variant = product.variants?.find(
      v => v.color?.toLowerCase() === selColorName?.toLowerCase() && v.size === selectedSize
    );
    return !variant || (variant.quantityInStock || 0) <= 0;
  })();

  return (
    <>
      <div
        ref={cardRef}
        className="product-card group flex h-full min-w-0 cursor-pointer flex-col overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          setActiveImageIndex(0)
          setSelectedColor(null)
          setSelectedSize(null)
          setShowWarning(false)
          setIsModalOpen(true)
        }}
        data-scroll-item
      >
        {/* Product Image */}
        <div className="relative aspect-square shrink-0 overflow-hidden bg-gray-100">
          <img
            ref={imageRef}
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300"
            loading="lazy"
            onError={replaceBrokenProductImage}
          />

          {/* Overlay */}
          <div
            ref={overlayRef}
            className="absolute inset-0 bg-brand-charcoal opacity-0 transition-opacity duration-300"
          />

          {/* Badge */}
          <ProductBadge type={product.badge} />
          {product.bestSellerStats && (
            <span className="absolute right-3 top-3 z-10 rounded-full bg-brand-charcoal/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur">
              Đã bán {product.bestSellerStats.quantitySold}
            </span>
          )}

          {/* Action Buttons Container */}
          <div
            className="absolute bottom-0 left-0 right-0 flex z-10
                       transform translate-y-full group-hover:translate-y-0
                       transition-transform duration-300 opacity-0 group-hover:opacity-100"
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setActiveImageIndex(0)
                setSelectedColor(null)
                setSelectedSize(null)
                setShowWarning(true)
                setIsModalOpen(true)
              }}
              className="flex-1 bg-white text-brand-charcoal py-3 font-semibold uppercase tracking-wider text-xs border-r border-gray-100 hover:bg-gray-50 transition-colors"
            >
              Thêm Giỏ
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setActiveImageIndex(0)
                setSelectedColor(null)
                setSelectedSize(null)
                setShowWarning(true)
                setIsModalOpen(true)
              }}
              className="flex-1 bg-brand-charcoal text-white py-3 font-semibold uppercase tracking-wider text-xs hover:bg-brand-dark transition-colors"
            >
              Mua Ngay
            </button>
          </div>
        </div>

        {/* Product Info */}
        <div className="flex min-w-0 flex-1 flex-col p-4">
          <p className="mb-2 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs uppercase text-brand-muted">{categoryLabels[product.category] || product.category}</p>
          <h3 className="mb-2 max-w-full min-w-0 break-words font-display text-lg text-brand-charcoal [overflow-wrap:anywhere] line-clamp-2">
            {product.name}
          </h3>

          {/* Price */}
          <div className="mt-auto flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="min-w-0 max-w-full break-words font-semibold text-brand-charcoal [overflow-wrap:anywhere]">
              {formatVND(product.price)}
            </span>
            {product.originalPrice && (
              <>
                <span className="min-w-0 break-words text-xs text-brand-muted line-through [overflow-wrap:anywhere]">
                  {formatVND(product.originalPrice)}
                </span>
                <span className="shrink-0 rounded bg-brand-blush px-2 py-1 text-xs text-brand-charcoal">
                  -{discount}%
                </span>
              </>
            )}
          </div>

          {/* Color swatches */}
          <div className="mt-3 flex flex-wrap gap-2">
            {product.colors.slice(0, MAX_VISIBLE_PRODUCT_COLORS).map((color, i) => (
              <div
                key={i}
                className="h-4 w-4 shrink-0 rounded-full border border-gray-300"
                style={{ backgroundColor: color.hex }}
                aria-label={`Color option ${color.name}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {isModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-charcoal/70 p-4 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative my-auto flex w-full max-w-7xl flex-col rounded-xl bg-white shadow-2xl sm:w-[calc(100vw-3rem)] md:h-[90dvh] md:min-h-0 md:max-h-[900px] md:overflow-hidden md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/90 p-2 font-bold text-brand-charcoal shadow-md backdrop-blur transition-all hover:rotate-90 hover:bg-brand-cream sm:right-4 sm:top-4"
              aria-label="Đóng chi tiết sản phẩm"
            >
              ✕
            </button>

            {/* Left Column: Image Gallery */}
            <div className="flex h-[38dvh] min-h-[220px] w-full shrink-0 flex-col gap-3 bg-brand-cream/30 p-3 md:h-full md:min-h-0 md:w-1/2 md:flex-row-reverse md:gap-4 md:p-5 lg:p-6">
              <div className="group/detail-image relative min-h-0 w-full flex-1 overflow-hidden bg-white">
                <img
                  src={
                    (product.images[activeImageIndex] && !brokenImages[activeImageIndex])
                      ? product.images[activeImageIndex]
                      : (product.images.find((img, idx) => img && img.trim() !== '' && !brokenImages[idx]) || 'https://placehold.co/600x600/faf8f6/a3a3c2?text=No+Image')
                  }
                  alt={`${product.name} - Chi tiết`}
                  className="h-full w-full cursor-zoom-in object-contain transition-transform duration-700 ease-out group-hover/detail-image:scale-105"
                  onError={() => {
                    setBrokenImages((previous) => ({ ...previous, [activeImageIndex]: true }))
                  }}
                />
                {product.badge && (
                  <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider bg-brand-blush text-brand-charcoal px-2.5 py-1 rounded-full shadow-sm">
                    {product.badge}
                  </span>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {product.images.filter((img, idx) => img && img.trim() !== '' && !brokenImages[idx]).length > 1 && (
                <div className="flex shrink-0 gap-2 overflow-x-auto py-1 md:mt-0 md:w-16 md:flex-col md:overflow-x-hidden md:overflow-y-auto lg:w-[72px]">
                  {product.images.map((img, idx) => {
                    if (!img || img.trim() === '' || brokenImages[idx]) return null;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`h-16 w-14 flex-shrink-0 overflow-hidden border-2 transition-all md:h-20 md:w-full ${
                          activeImageIndex === idx 
                            ? 'border-brand-charcoal scale-105 shadow-sm' 
                            : 'border-gray-200 hover:border-brand-charcoal/50'
                        }`}
                      >
                        <img 
                          src={img} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          onError={() => {
                            setBrokenImages(prev => ({ ...prev, [idx]: true }))
                          }}
                        />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Details & Purchases */}
            <div className="flex w-full flex-col p-5 md:h-full md:min-h-0 md:w-1/2 md:flex-none md:overflow-hidden md:px-7 md:py-7 lg:px-9">
              <div className="flex-1 pr-3 md:min-h-0 md:overflow-y-auto [scrollbar-width:thin]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-brand-muted">
                  {categoryLabels[product.category] || product.category}
                </span>
                <h2 className="mt-2 mb-5 max-w-2xl break-words [overflow-wrap:anywhere] font-display text-3xl font-bold leading-[1.25] text-brand-charcoal md:pr-12 lg:text-4xl lg:leading-[1.22] xl:text-[40px]">
                  {product.name}
                </h2>

                {/* Price Section */}
                <div className="flex min-w-0 flex-wrap items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                  <span className="max-w-full break-words font-bold text-brand-charcoal text-2xl [overflow-wrap:anywhere]">
                    {(() => {
                      if (selectedColor !== null && selectedSize) {
                        const selColorName = product.colors[selectedColor]?.name;
                        const variant = product.variants?.find(
                          v => v.color?.toLowerCase() === selColorName?.toLowerCase() && v.size === selectedSize
                        );
                        if (variant && variant.price) {
                          return formatVND(Number(variant.price));
                        }
                      }
                      return formatVND(product.price);
                    })()}
                  </span>
                  {product.originalPrice && (
                    <>
                      <span className="max-w-full break-words text-sm text-brand-muted line-through [overflow-wrap:anywhere]">
                        {formatVND(product.originalPrice)}
                      </span>
                      <span className="shrink-0 text-xs font-bold bg-brand-blush text-brand-charcoal px-2 py-0.5 rounded shadow-sm">
                        -{discount}%
                      </span>
                    </>
                  )}
                </div>

                {/* Description */}
                <p className="mb-6 max-w-full whitespace-pre-wrap break-words text-sm leading-relaxed text-brand-muted [overflow-wrap:anywhere]">
                  {product.description || 'Sản phẩm chất lượng cao mang phong cách tối giản thanh lịch, đường may tỉ mỉ, phom dáng tôn vẻ đẹp tự nhiên của người mặc.'}
                </p>

                {PRODUCT_POLICIES_ENABLED && (
                  <div className="mb-7 space-y-3 border-y border-black/[0.06] py-5">
                    {DEFAULT_PRODUCT_POLICIES.map((policy) => (
                      <div key={policy.id} className="flex items-start gap-3 text-sm text-brand-muted">
                        <span className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true">
                          {policy.id === 'shipping' && (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h11v10H3V6zm11 3h3l4 4v3h-7V9zM7 19a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z" />
                            </svg>
                          )}
                          {policy.id === 'returns' && (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M5.5 15a8 8 0 101.2-8.8L4 10" />
                            </svg>
                          )}
                          {policy.id === 'secure-payment' && (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3z" />
                            </svg>
                          )}
                        </span>
                        <span className="leading-5">{policy.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Color swatches */}
                <div className="mb-6">
                  <span className="block text-xs uppercase font-bold tracking-wider text-brand-muted mb-3">
                    Màu sắc {selectedColor !== null ? <span className="text-brand-charcoal">• {product.colors[selectedColor].name}</span> : <span className="text-brand-blush">• Chọn một màu</span>}
                  </span>
                  <div className="flex flex-wrap gap-3 p-2">
                    {product.colors.map((color, i) => (
                      <button
                        key={i}
                        onClick={() => { setSelectedColor(i); setShowWarning(false) }}
                        className={`w-7 h-7 rounded-full shadow-sm cursor-pointer transition-all duration-200 ${
                          selectedColor === i
                            ? 'ring-2 ring-offset-2 ring-brand-charcoal scale-110'
                            : 'border border-gray-300 hover:scale-110'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                        aria-label={`Chọn màu ${color.name}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Size options */}
                <div className="mb-8">
                  <span className="block text-xs uppercase font-bold tracking-wider text-brand-muted mb-3">
                    Kích cỡ {selectedSize ? <span className="text-brand-charcoal">• {selectedSize}</span> : <span className="text-brand-blush">• Chọn size</span>}
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => { setSelectedSize(size); setShowWarning(false) }}
                        className={`py-1.5 px-3 text-xs font-semibold rounded-md cursor-pointer transition-all duration-200 ${
                          selectedSize === size
                            ? 'bg-brand-charcoal text-white border-2 border-brand-charcoal shadow-sm scale-105'
                            : 'border border-gray-200 text-brand-charcoal bg-gray-50 hover:border-brand-charcoal hover:bg-brand-cream'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stock Level Display */}
                {selectedColor !== null && selectedSize && (
                  <div className="mb-6 bg-brand-cream/35 p-3.5 border border-brand-charcoal/5 flex justify-between items-center text-xs">
                    <span className="font-semibold text-brand-charcoal uppercase tracking-wider">Tình trạng kho</span>
                    {(() => {
                      const selColorName = product.colors[selectedColor]?.name;
                      const variant = product.variants?.find(
                        v => v.color?.toLowerCase() === selColorName?.toLowerCase() && v.size === selectedSize
                      );
                      
                      if (!variant) {
                        return <span className="font-bold uppercase tracking-wider text-amber-700">Không có sẵn</span>;
                      }
                      
                      const stock = variant.quantityInStock || 0;
                      if (stock <= 0) {
                        return <span className="text-red-600 font-bold uppercase tracking-wider">Tạm hết hàng</span>;
                      }
                      return (
                        <span className="text-brand-charcoal font-medium">
                          Còn lại <strong className="font-bold text-sm text-brand-charcoal">{stock}</strong> sản phẩm
                        </span>
                      );
                    })()}
                  </div>
                )}

                {/* Warning */}
                {showWarning && (
                  <p className="text-xs text-red-500 font-semibold mb-2 animate-pulse">
                    ⚠ Vui lòng chọn màu sắc và kích cỡ trước khi tiếp tục.
                  </p>
                )}
              </div>

              {/* Purchase Buttons */}
              <div className="z-10 mt-4 flex shrink-0 gap-3 border-t border-gray-100 bg-white pt-4 shadow-[0_-8px_16px_rgba(255,255,255,0.95)]">
                <button
                  disabled={isOutOfStock}
                  onClick={() => {
                    if (selectedColor === null || !selectedSize) { setShowWarning(true); return }
                    onAddToCart({
                      ...product,
                      selectedColor: product.colors[selectedColor].name,
                      selectedColorHex: product.colors[selectedColor].hex,
                      selectedSize
                    })
                    setIsModalOpen(false)
                  }}
                  className={`flex-1 border border-brand-charcoal text-brand-charcoal py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-brand-cream transition-colors active:scale-[0.98] cursor-pointer ${
                    isOutOfStock ? 'opacity-35 cursor-not-allowed hover:bg-transparent' : ''
                  }`}
                >
                  {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
                </button>
                <button
                  disabled={isOutOfStock}
                  onClick={() => {
                    if (selectedColor === null || !selectedSize) { setShowWarning(true); return }
                    onBuyNow({
                      ...product,
                      selectedColor: product.colors[selectedColor].name,
                      selectedColorHex: product.colors[selectedColor].hex,
                      selectedSize
                    })
                    setIsModalOpen(false)
                  }}
                  className={`flex-1 bg-brand-charcoal text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-brand-dark transition-colors active:scale-[0.98] cursor-pointer ${
                    isOutOfStock ? 'opacity-35 cursor-not-allowed hover:bg-brand-charcoal' : ''
                  }`}
                >
                  {isOutOfStock ? 'Hết hàng' : 'Mua Ngay'}
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
