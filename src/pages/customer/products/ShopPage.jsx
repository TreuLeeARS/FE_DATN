import { useState, useLayoutEffect, useRef, useMemo, useEffect } from 'react'
import { formatVND } from '@/utils/currency/price.js'
import { useNavigate, useSearchParams } from 'react-router-dom'
import gsap from 'gsap'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header/index.js'
import { Footer } from '@/components/layout/Footer/index.js'
import { ProductCard } from '@/components/customer/products/ProductGrid/ProductCard.jsx'
import { useCartContext } from '@/contexts/cart/CartContext.jsx'
import { showAuthToast } from '@/utils/auth/authToast.jsx'
import categoryApi from '@/api/categories/categoryApi.js'
import productApi from '@/api/products/productApi.js'
import { mapDbProduct } from '@/utils/products/productMapper.js'
import { replaceBrokenProductImage } from '@/utils/products/imageUrl.js'

// Số sản phẩm hiển thị mỗi trang.
const PRODUCTS_PER_PAGE = 9
// Ngưỡng chuyển sang phân trang rút gọn (có dấu "…").
const PAGINATION_SHOW_ALL_PAGES_THRESHOLD = 7

// Nhãn danh mục tiếng Việt
const categoryLabels = {
  all: 'Tất Cả',
  tops: 'Áo',
  bottoms: 'Quần',
  dresses: 'Váy & Đầm',
  sets: 'Set đồ',
  outerwear: 'Áo khoác',
  shoes: 'Giày',
  bags: 'Túi xách',
  accessories: 'Phụ kiện',
}

export const ShopPage = () => {
  const { addItem } = useCartContext()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // State bộ lọc và sắp xếp
  const [searchVal, setSearchVal] = useState('') // Local input value for debouncing
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [maxPrice, setMaxPrice] = useState(null)
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [currentPage, setCurrentPage] = useState(1)

  // BIZ-06 Debounce Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchQuery(searchVal)
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchVal])

  // Bộ lọc mở rộng

  const [dbProducts, setDbProducts] = useState([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  const { priceCeiling, priceStep } = useMemo(() => {
    const highestProductPrice = dbProducts.reduce(
      (highest, product) => Math.max(highest, Number(product.price) || 0),
      0,
    )
    const fallbackCeiling = 2000000
    const rawCeiling = highestProductPrice || fallbackCeiling
    const dynamicStep = rawCeiling <= 5000000
      ? 50000
      : rawCeiling <= 20000000
        ? 250000
        : 500000

    return {
      priceStep: dynamicStep,
      priceCeiling: Math.ceil(rawCeiling / dynamicStep) * dynamicStep,
    }
  }, [dbProducts])

  const effectiveMaxPrice = maxPrice ?? priceCeiling

  // Lấy danh sách sản phẩm từ cơ sở dữ liệu
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoadingProducts(true)
        const categoryId = typeof selectedCategory === 'object' && selectedCategory !== null
          ? selectedCategory.id
          : undefined
        const sort = {
          newest: 'productId,desc',
          'price-asc': 'baseprice,asc',
          'price-desc': 'baseprice,desc',
          'name-asc': 'name,asc',
        }[sortBy] || 'productId,desc'
        const params = {
          page: currentPage - 1,
          size: PRODUCTS_PER_PAGE,
          sort,
        }
        const hasFilter = Boolean(searchQuery.trim() || categoryId || maxPrice !== null)
        const response = hasFilter
          ? await productApi.searchProducts({
            ...params,
            name: searchQuery.trim() || undefined,
            categoryId,
            maxPrice: maxPrice ?? undefined,
          })
          : await productApi.getAllProducts(params)
        const pageData = response?.data
        if (pageData) {
          const mapped = (pageData.content || []).map(p => mapDbProduct(p)).filter(Boolean)
          setDbProducts(mapped)
          setTotalPages(Math.max(1, pageData.totalPages || 1))
          setTotalElements(pageData.totalElements || 0)
        }
      } catch (err) {
        console.error('Error fetching database products:', err)
        setDbProducts([])
        setTotalPages(1)
        setTotalElements(0)
      } finally {
        setIsLoadingProducts(false)
      }
    }
    fetchProducts()
  }, [currentPage, searchQuery, selectedCategory, maxPrice, sortBy])

  const [dbCategories, setDbCategories] = useState([])

  // Lấy danh mục từ BE khi component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryApi.getRootCategories()
        if (response && response.data) {
          const rootCates = response.data
          // Lấy tiếp các danh mục con cho mỗi danh mục gốc
          const fullCates = await Promise.all(
            rootCates.map(async (cat) => {
              try {
                const subResponse = await categoryApi.getCategoriesByParent(cat.id)
                const subs = subResponse && subResponse.data ? subResponse.data : []
                const subcategoriesWithParent = subs.map(sub => ({
                  ...sub,
                  parentCategory: cat
                }))
                return {
                  ...cat,
                  subcategories: subcategoriesWithParent
                }
              } catch {
                return { ...cat, subcategories: [] }
              }
            })
          )
          setDbCategories(fullCates)
        }
      } catch (err) {
        console.error('Lỗi khi tải danh mục từ BE:', err)
      }
    }
    fetchCategories()
  }, [])

  // Đồng bộ từ URL query params
  useEffect(() => {
    let categoryParam = searchParams.get('category')
    const filterParam = searchParams.get('filter')

    if (categoryParam) {
      // Chuẩn hóa dấu cộng thành khoảng trắng
      categoryParam = categoryParam.replace(/\+/g, ' ')
      
      if (dbCategories.length > 0) {
        // Tìm ở cấp root
        let found = dbCategories.find(cat => cat.name.toLowerCase().normalize('NFC') === categoryParam.toLowerCase().normalize('NFC'))
        if (!found) {
          // Tìm ở cấp sub
          for (const root of dbCategories) {
            const sub = root.subcategories?.find(s => s.name.toLowerCase().normalize('NFC') === categoryParam.toLowerCase().normalize('NFC'))
            if (sub) {
              found = sub
              break
            }
          }
        }
        if (found) {
          setSelectedCategory(found)
        } else {
          setSelectedCategory(categoryParam)
        }
      } else {
        setSelectedCategory(categoryParam)
      }
    } else {
      setSelectedCategory('all')
    }

    if (filterParam === 'new') {
      setSortBy('newest')
    }
  }, [searchParams, dbCategories])

  const gridRef = useRef(null)

  // Xử lý filter và sort sản phẩm
  /* Legacy client-side filtering retained here temporarily for reference.
  const legacyFilteredProducts = useMemo(() => {
    let result = [...dbProducts]

    // 1. Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q))
    }

    // 1.5. URL Filter (new / sale)
    const filterParam = searchParams.get('filter')
    if (filterParam === 'new') {
      // Không lọc bớt sản phẩm, chỉ dựa vào cơ chế sắp xếp 'newest' (ID giảm dần) để hiển thị hàng mới lên đầu
    } else if (filterParam === 'sale') {
      result = result.filter(p => p.badge === 'sale' || (p.originalPrice && p.originalPrice > p.price))
    }

    // 2. Category
    if (selectedCategory !== 'all') {
      if (typeof selectedCategory === 'object' && selectedCategory !== null) {
        // Collect target category ID and all its direct subcategory IDs
        const allowedCategoryIds = [selectedCategory.id];
        if (selectedCategory.subcategories && Array.isArray(selectedCategory.subcategories)) {
          selectedCategory.subcategories.forEach(sub => {
            allowedCategoryIds.push(sub.id);
          });
        }

        result = result.filter(p => allowedCategoryIds.includes(p.categoryId));
      } else {
        // Fallback: Selected category is a string (e.g. from URL fallback)
        const targetCategoryStr = String(selectedCategory)
          .replace(/\+/g, ' ')
          .toLowerCase()
          .normalize('NFC');
          
        result = result.filter(p => {
          const productCategoryNameLower = (p.categoryName || '').toLowerCase().normalize('NFC');
          const productCategoryLower = (p.category || '').toLowerCase().normalize('NFC');
          const productNameLower = p.name.toLowerCase().normalize('NFC');

          // Check if product belongs directly to a category matching this name
          if (productCategoryNameLower === targetCategoryStr || productCategoryLower === targetCategoryStr) {
            return true;
          }

          // Or if the target category string matches our mapping structure or keywords
          const categoryMapping = {
            'quần áo': ['tops', 'bottoms', 'dresses', 'sets', 'outerwear'],
            'giày & túi': ['shoes', 'bags'],
            'phụ kiện': ['accessories'],
            'áo': ['tops'],
            'quần': ['bottoms'],
            'váy & đầm': ['dresses'],
            'set đồ': ['sets'],
            'áo khoác': ['outerwear'],
            'giày': ['shoes'],
            'túi xách': ['bags']
          };

          const mappedTarget = categoryMapping[targetCategoryStr];
          if (mappedTarget && mappedTarget.includes(productCategoryLower)) {
            return true;
          }

          // Fallback keyword search
          const keywords = extractKeywords(targetCategoryStr);
          return keywords.some(k => 
            productNameLower.includes(k) || 
            productCategoryNameLower.includes(k) ||
            p.tags.some(t => t.toLowerCase().normalize('NFC').includes(k))
          );
        });
      }
    }

    // 3. Color
    if (selectedColor) {
      result = result.filter(p => p.colors.some(c => c.hex === selectedColor))
    }

    // 4. Size
    if (selectedSize) {
      result = result.filter(p => p.sizes.includes(selectedSize))
    }

    // 5. Price
    result = result.filter(p => p.price <= effectiveMaxPrice)

    // 6. Brand
    if (selectedBrands.length > 0) {
      result = result.filter(p => p.brand && selectedBrands.includes(p.brand))
    }

    // 7. Material
    if (selectedMaterials.length > 0) {
      result = result.filter(p => p.material && selectedMaterials.includes(p.material))
    }

    // 8. Occasion
    if (selectedOccasions.length > 0) {
      result = result.filter(p => p.occasion && selectedOccasions.includes(p.occasion))
    }

    // 9. Sorting
    if (sortBy === 'newest') {
      result.sort((a, b) => b.id.localeCompare(a.id))
    } else if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price)
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price)
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    }

    return result
  }, [dbProducts, searchQuery, selectedCategory, effectiveMaxPrice, sortBy, searchParams])
  */

  const filteredProducts = dbProducts
  const paginatedProducts = dbProducts

  const visiblePageNumbers = useMemo(() => {
    if (totalPages <= PAGINATION_SHOW_ALL_PAGES_THRESHOLD) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    const pages = new Set([1, totalPages])
    for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page += 1) {
      pages.add(page)
    }

    const sortedPages = [...pages].sort((a, b) => a - b)
    return sortedPages.flatMap((page, index) => {
      if (index > 0 && page - sortedPages[index - 1] > 1) {
        return [`ellipsis-${page}`, page]
      }
      return [page]
    })
  }, [currentPage, totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory, maxPrice, sortBy, searchParams])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  // GSAP animation khi danh sách sản phẩm thay đổi
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.shop-product-item', {
        opacity: 0,
        y: 40,
        duration: 0.5,
        stagger: 0.05,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }, gridRef)

    return () => ctx.revert()
  }, [paginatedProducts, viewMode])

  const handlePageChange = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages)
    if (nextPage === currentPage) return
    setCurrentPage(nextPage)
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

  const handleClearFilters = () => {
    setSearchVal('')
    setSearchQuery('')
    setSelectedCategory('all')
    setMaxPrice(null)
    setSortBy('newest')
    setSearchParams({})
  }

  return (
    <>
      <Header />
      
      <main className="pt-28 min-h-screen bg-brand-cream pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header Section */}
          <div className="mb-10 text-center md:text-left">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-brand-charcoal mb-4">
              Cửa Hàng Mua Sắm
            </h1>
            <p className="text-brand-muted text-base max-w-xl">
              Khám phá tủ đồ lý tưởng với những thiết kế tinh tế, phù hợp cho mọi phong cách sống của bạn.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* ═══════════ LEFT COLUMN: FILTERS (SIDEBAR) ═══════════ */}
            <aside className="w-full lg:w-1/4 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6">
              
              {/* Clear filters trigger */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="font-semibold text-brand-charcoal text-lg">Bộ lọc tìm kiếm</h3>
                <button
                  onClick={handleClearFilters}
                  id="btn-clear-filters"
                  className="text-xs font-semibold text-brand-muted hover:text-brand-charcoal transition-colors border-b border-transparent hover:border-brand-charcoal"
                >
                  Xóa tất cả
                </button>
              </div>

              {/* 1. Search filter */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">
                  Tìm kiếm sản phẩm
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="search-product-input"
                    placeholder="Tên sản phẩm..."
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    className="w-full bg-brand-cream/50 border border-gray-200 px-4 py-2.5 rounded-lg text-sm text-brand-charcoal focus:outline-none focus:border-brand-charcoal focus:ring-1 focus:ring-brand-blush/30 transition-all font-sans"
                  />
                  {searchVal && (
                    <button
                      onClick={() => {
                        setSearchVal('')
                        setSearchQuery('')
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-charcoal text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Category list */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-muted mb-3">
                  Danh mục quần áo
                </label>
                <div className="flex flex-col gap-1">
                  {/* Option: Tất cả */}
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchParams({});
                    }}
                    className={`text-left text-sm py-2 px-3 rounded-lg transition-all font-semibold ${
                      selectedCategory === 'all'
                        ? 'bg-brand-charcoal text-white shadow-sm'
                        : 'text-brand-charcoal hover:bg-brand-cream'
                    }`}
                  >
                    Tất Cả
                  </button>

                  {dbCategories.length > 0 ? (
                    // Hiển thị danh mục động từ BE theo kiểu đa cấp (Zara/Uniqlo style)
                    dbCategories.map((cat) => {
                      const isRootSelected = selectedCategory !== 'all' && (
                        selectedCategory.id === cat.id || 
                        selectedCategory.name === cat.name ||
                        selectedCategory.parent === cat.id ||
                        selectedCategory.parentId === cat.id
                      );
                      return (
                        <div key={cat.id} className="flex flex-col mt-1">
                          {/* Root category */}
                          <button
                            onClick={() => {
                              setSelectedCategory(cat);
                              setSearchParams({ category: cat.name });
                            }}
                            className={`text-left text-sm py-1.5 px-3 rounded-lg transition-all font-semibold flex items-center justify-between group ${
                              isRootSelected
                                ? 'bg-brand-charcoal text-white'
                                : 'text-brand-charcoal hover:bg-brand-cream'
                            }`}
                          >
                            <span>{cat.name}</span>
                            {cat.subcategories && cat.subcategories.length > 0 && (
                              <svg className={`w-3.5 h-3.5 transition-transform duration-205 ${isRootSelected ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </button>

                          {/* Subcategories */}
                          {cat.subcategories && cat.subcategories.length > 0 && (
                            <div className="flex flex-col pl-4 gap-1.5 mt-1 mb-2 border-l border-gray-100 ml-3.5">
                              {cat.subcategories.map((sub) => {
                                const isSubSelected = selectedCategory !== 'all' && (selectedCategory.id === sub.id || selectedCategory.name === sub.name);
                                return (
                                  <button
                                    key={sub.id}
                                    onClick={() => {
                                      setSelectedCategory(sub);
                                      setSearchParams({ category: sub.name });
                                    }}
                                    className={`text-left text-xs py-1 px-2 rounded transition-all font-medium ${
                                      isSubSelected
                                        ? 'text-brand-blush font-bold border-l-2 border-brand-blush pl-1.5'
                                        : 'text-brand-muted hover:text-brand-charcoal'
                                    }`}
                                  >
                                    {sub.name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    // Fallback sang danh mục tĩnh nếu BE chưa có dữ liệu
                    Object.keys(categoryLabels).filter(key => key !== 'all').map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-left text-sm py-1.5 px-3 rounded-lg transition-all font-medium ${
                          selectedCategory === cat
                            ? 'bg-brand-charcoal text-white font-semibold'
                            : 'text-brand-charcoal hover:bg-brand-cream'
                        }`}
                      >
                        {categoryLabels[cat]}
                      </button>
                    ))
                  )}
                </div>
              </div>



              {/* Thương hiệu, Chất liệu, Dịp sử dụng bộ lọc đã bỏ theo yêu cầu */}

              {/* 8. Max Price slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-brand-muted mb-3">
                  <span>Giá tối đa</span>
                  <span className="text-brand-charcoal font-semibold normal-case">
                    {formatVND(effectiveMaxPrice)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={priceCeiling}
                  step={priceStep}
                  value={effectiveMaxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-brand-charcoal cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-brand-muted mt-1 font-semibold">
                  <span>0</span>
                  <span>{formatVND(priceCeiling)}</span>
                </div>
              </div>

            </aside>

            {/* ═══════════ RIGHT COLUMN: PRODUCTS LIST ═══════════ */}
            <section className="w-full lg:w-3/4 flex flex-col gap-6">
              
              {/* Filter controls toolbar */}
              <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                {/* Result count */}
                <p className="text-sm font-medium text-brand-charcoal">
                  Hiển thị <span className="font-semibold text-brand-charcoal">{totalElements}</span> sản phẩm
                </p>

                {/* Grid/List and Sort */}
                <div className="flex items-center gap-4 self-end sm:self-auto">
                  
                  {/* Grid / List view toggle */}
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-brand-cream text-brand-charcoal'
                          : 'bg-white text-brand-muted hover:text-brand-charcoal'
                      }`}
                      title="Hiển thị dạng lưới"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 transition-colors ${
                        viewMode === 'list'
                          ? 'bg-brand-cream text-brand-charcoal'
                          : 'bg-white text-brand-muted hover:text-brand-charcoal'
                      }`}
                      title="Hiển thị dạng danh sách"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Sorter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand-muted uppercase whitespace-nowrap">
                      Sắp xếp:
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-brand-cream/50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-charcoal focus:outline-none focus:border-brand-charcoal transition-colors font-sans"
                    >
                      <option value="newest">Hàng mới nhất</option>
                      <option value="price-asc">Giá: Thấp đến Cao</option>
                      <option value="price-desc">Giá: Cao đến Thấp</option>
                      <option value="name-asc">Tên: A-Z</option>
                    </select>
                  </div>

                </div>

              </div>

              {/* Products Container */}
              {isLoadingProducts ? (
                <div className="bg-white rounded-xl border border-gray-100 p-20 text-center flex flex-col items-center justify-center">
                  <svg className="w-8 h-8 animate-spin text-brand-charcoal mb-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-sm font-medium text-brand-muted">Đang tải sản phẩm từ cửa hàng...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                  <div className="w-16 h-16 bg-brand-cream rounded-full flex items-center justify-center mx-auto mb-4 text-brand-muted">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-brand-charcoal mb-2">
                    Không tìm thấy sản phẩm
                  </h3>
                  <p className="text-brand-muted text-sm max-w-sm mx-auto mb-6">
                    Chúng tôi không tìm thấy kết quả nào phù hợp với bộ lọc hiện tại. Thử xóa bộ lọc để tìm lại nhé!
                  </p>
                  <button onClick={handleClearFilters} className="btn-primary py-2.5 px-6 rounded-lg text-xs">
                    Reset bộ lọc
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                /* Grid view display */
                <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                  {paginatedProducts.map((product) => (
                    <div key={product.id} className="shop-product-item min-w-0">
                      <ProductCard
                        product={product}
                        onAddToCart={handleAddToCart}
                        onBuyNow={handleBuyNow}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                /* List view display */
                <div ref={gridRef} className="flex flex-col gap-4">
                  {paginatedProducts.map((product) => {
                    const discount = product.originalPrice
                      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                      : 0

                    return (
                      <div
                        key={product.id}
                        className="shop-product-item flex min-w-0 flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-md sm:flex-row sm:gap-6"
                      >
                        {/* Image wrapper */}
                        <div className="w-full sm:w-44 aspect-square rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={replaceBrokenProductImage}
                          />
                          {product.badge && (
                            <span className="absolute top-2.5 left-2.5 text-[9px] font-bold uppercase tracking-wider bg-brand-blush text-brand-charcoal px-2 py-0.5 rounded-full">
                              {product.badge}
                            </span>
                          )}
                        </div>

                        {/* Description wrapper */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-muted">
                              {categoryLabels[product.category] || product.category}
                            </span>
                            <h3 className="mb-2 mt-1 max-w-full min-w-0 break-words font-display text-xl font-bold text-brand-charcoal [overflow-wrap:anywhere] line-clamp-2">
                              {product.name}
                            </h3>
                            <p className="mb-4 max-w-full break-words text-xs leading-relaxed text-brand-muted [overflow-wrap:anywhere] line-clamp-2">
                              {product.description || 'Chất liệu vải cao cấp mang lại cảm giác thoải mái tối ưu.'}
                            </p>

                              {/* Colors */}
                            <div className="mb-4 flex flex-wrap gap-2">
                              {product.colors.map((color, i) => (
                                <div
                                  key={i}
                                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-gray-300"
                                  style={{ backgroundColor: color.hex }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Price & actions */}
                          <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-gray-100">
                            
                            {/* Price */}
                            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                              <span className="min-w-0 max-w-full break-words font-bold text-lg text-brand-charcoal [overflow-wrap:anywhere]">
                                {formatVND(product.price)}
                              </span>
                              {product.originalPrice && (
                                <>
                                  <span className="min-w-0 break-words text-xs text-brand-muted line-through [overflow-wrap:anywhere]">
                                    {formatVND(product.originalPrice)}
                                  </span>
                                  <span className="shrink-0 rounded bg-brand-blush px-1.5 py-0.5 text-[10px] font-bold text-brand-charcoal">
                                    -{discount}%
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAddToCart(product)}
                                className="border border-brand-charcoal text-brand-charcoal px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-brand-cream transition-colors cursor-pointer"
                              >
                                Thêm Giỏ
                              </button>
                              <button
                                onClick={() => handleBuyNow(product)}
                                className="bg-brand-charcoal text-white px-5 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-brand-dark transition-colors cursor-pointer"
                              >
                                Mua Ngay
                              </button>
                            </div>

                          </div>
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}

              {!isLoadingProducts && totalPages > 1 && (
                <nav className="flex items-center justify-center gap-2 pt-4" aria-label="Phân trang sản phẩm">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-brand-charcoal transition-colors hover:border-brand-charcoal disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trước
                  </button>

                  {visiblePageNumbers.map((item) => (
                    typeof item === 'number' ? (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handlePageChange(item)}
                        aria-current={currentPage === item ? 'page' : undefined}
                        className={`h-10 min-w-10 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                          currentPage === item
                            ? 'border-brand-charcoal bg-brand-charcoal text-white'
                            : 'border-gray-200 bg-white text-brand-charcoal hover:border-brand-charcoal'
                        }`}
                      >
                        {item}
                      </button>
                    ) : (
                      <span key={item} className="px-1 text-brand-muted" aria-hidden="true">…</span>
                    )
                  ))}

                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-brand-charcoal transition-colors hover:border-brand-charcoal disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau
                  </button>
                </nav>
              )}

            </section>

          </div>

        </div>
      </main>

      <Footer />
    </>
  )
}
