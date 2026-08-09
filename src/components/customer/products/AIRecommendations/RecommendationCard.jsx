import { useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { ProductBadge } from '../ProductGrid/ProductBadge.jsx'
import { duration, ease } from '@/utils/animation/gsapDefaults.js'
import { replaceBrokenProductImage } from '@/utils/products/imageUrl.js'

export const RecommendationCard = ({ product, reason, onAddToCart, onBuyNow }) => {
  const cardRef = useRef(null)
  const imageRef = useRef(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [showWarning, setShowWarning] = useState(false)
  const [brokenImages, setBrokenImages] = useState({})
  const timelineRef = useRef(null)

  useLayoutEffect(() => {
    if (isModalOpen) {
      setBrokenImages({})
    }
  }, [isModalOpen])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      timelineRef.current = gsap.timeline({ paused: true })

      timelineRef.current
        .to(imageRef.current, {
          scale: 1.08,
          duration: duration.base,
          ease: ease.out,
        }, 0)
    }, cardRef)

    return () => ctx.revert()
  }, [])

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
            onError={replaceBrokenProductImage}
          />

          <ProductBadge type={product.badge} />

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
          {/* Recommendation Reason */}
          <p className="mb-2 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold uppercase text-brand-blush">
            ✨ {reason}
          </p>

          <h3 className="mb-2 max-w-full min-w-0 break-words font-display text-lg text-brand-charcoal [overflow-wrap:anywhere] line-clamp-2">
            {product.name}
          </h3>

          {/* Price */}
          <div className="mt-auto flex min-w-0 flex-wrap items-baseline gap-2">
            <span className="min-w-0 max-w-full break-words font-semibold text-brand-charcoal [overflow-wrap:anywhere]">
              {(product.price / 1000).toFixed(0)}k
            </span>
            {product.originalPrice && (
              <span className="min-w-0 break-words text-xs text-brand-muted line-through [overflow-wrap:anywhere]">
                {(product.originalPrice / 1000).toFixed(0)}k
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {isModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 bg-brand-charcoal/60 backdrop-blur-sm sm:items-center"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative my-auto flex w-full max-w-4xl flex-col rounded-2xl border border-gray-100 bg-white shadow-2xl md:max-h-[85vh] md:min-h-0 md:overflow-hidden md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-brand-charcoal hover:opacity-75 transition-opacity p-2 bg-brand-cream rounded-full z-10 w-9 h-9 flex items-center justify-center font-bold"
              aria-label="Đóng chi tiết sản phẩm"
            >
              ✕
            </button>

            {/* Left Column: Image Gallery */}
            <div className="flex h-[38dvh] min-h-[220px] w-full shrink-0 flex-col justify-center bg-brand-cream/20 p-4 md:h-auto md:min-h-0 md:w-1/2 md:p-6">
              <div className="w-full aspect-square md:aspect-[4/5] rounded-xl overflow-hidden bg-gray-50 relative">
                <img
                  src={
                    (product.images[activeImageIndex] && !brokenImages[activeImageIndex])
                      ? product.images[activeImageIndex]
                      : (product.images.find((img, idx) => img && img.trim() !== '' && !brokenImages[idx]) || 'https://placehold.co/600x600/faf8f6/a3a3c2?text=No+Image')
                  }
                  alt={`${product.name} - Chi tiết`}
                  className="w-full h-full object-cover transition-all duration-300"
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
                <div className="flex flex-wrap gap-2 mt-4 py-1 justify-start">
                  {product.images.map((img, idx) => {
                    if (!img || img.trim() === '' || brokenImages[idx]) return null;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
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
            <div className="flex w-full min-w-0 flex-col p-5 md:min-h-0 md:w-1/2 md:overflow-hidden md:p-8">
              <div className="flex-1 pr-3 md:min-h-0 md:overflow-y-auto [scrollbar-width:thin]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-brand-muted">
                  ✨ Đề xuất cho bạn
                </span>
                <h2 className="mt-1 mb-4 max-w-full break-words font-display text-2xl font-bold leading-tight text-brand-charcoal [overflow-wrap:anywhere] md:pr-10 md:text-3xl">
                  {product.name}
                </h2>

                {/* Price Section */}
                <div className="mb-6 flex min-w-0 flex-wrap items-center gap-4 border-b border-gray-100 pb-4">
                  <span className="max-w-full break-words font-bold text-brand-charcoal text-2xl [overflow-wrap:anywhere]">
                    {(product.price / 1000).toFixed(0)}k
                  </span>
                  {product.originalPrice && (
                    <>
                      <span className="max-w-full break-words text-sm text-brand-muted line-through [overflow-wrap:anywhere]">
                        {(product.originalPrice / 1000).toFixed(0)}k
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
                        className={`h-7 w-7 shrink-0 rounded-full shadow-sm cursor-pointer transition-all duration-200 ${
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
                  className="flex-1 border border-brand-charcoal text-brand-charcoal py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-brand-cream transition-colors active:scale-[0.98] cursor-pointer"
                >
                  Thêm vào giỏ
                </button>
                <button
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
                  className="flex-1 bg-brand-charcoal text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-brand-dark transition-colors active:scale-[0.98] cursor-pointer"
                >
                  Mua Ngay
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
