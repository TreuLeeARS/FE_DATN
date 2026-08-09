import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatVND } from '@/utils/currency/price.js'
import toast from 'react-hot-toast'
import productApi from '@/api/products/productApi.js'
import {
  isValidProductImageUrl,
  replaceBrokenProductImage,
  resolveProductImageUrl,
} from '@/utils/products/imageUrl.js'
import categoryApi from '@/api/categories/categoryApi.js'
import { ConfirmModal } from '@/components/common/ConfirmModal.jsx'
import { isStaffOnly } from '@/utils/auth/auth.js'

// Số ký tự tối đa cho tên sản phẩm.
const MAX_PRODUCT_NAME_LENGTH = 120
// Số ký tự tối đa cho mô tả sản phẩm.
const MAX_PRODUCT_DESCRIPTION_LENGTH = 10_000
// Giá niêm yết/giá biến thể tối đa (đơn vị: VND).
const MAX_PRODUCT_PRICE = 999_999_999
// Số sản phẩm mặc định hiển thị mỗi trang.
const DEFAULT_ADMIN_PRODUCTS_PER_PAGE = 9
// Các lựa chọn số sản phẩm/trang trong bảng quản lý.
const ADMIN_PRODUCTS_PAGE_SIZE_OPTIONS = [5, 9, 15, 30]
// Số sản phẩm tối đa tải về khi lọc danh mục ở FE.
const ADMIN_CATEGORY_SEARCH_FETCH_SIZE = 1_000
// Số nút số trang tối đa hiển thị trong bảng quản lý.
const MAX_VISIBLE_ADMIN_PAGE_BUTTONS = 5

const translateColor = (color) => {
  if (!color) return ''
  const mapping = {
    'white': 'Trắng',
    'black': 'Đen',
    'pink': 'Hồng',
    'beige': 'Be',
    'brown': 'Nâu',
    'grey': 'Xám',
    'red': 'Đỏ',
    'blue': 'Xanh dương',
    'yellow': 'Vàng',
    'charcoal': 'Charcoal'
  }
  return mapping[color.toLowerCase()] || color
}

const getColorDot = (color) => {
  const c = (color || '').toLowerCase()
  if (c.includes('trắng') || c.includes('white')) return 'bg-white border border-gray-300'
  if (c.includes('đen') || c.includes('black') || c.includes('charcoal')) return 'bg-gray-900'
  if (c.includes('hồng') || c.includes('pink')) return 'bg-pink-400'
  if (c.includes('be') || c.includes('beige')) return 'bg-amber-100 border border-amber-200'
  if (c.includes('nâu') || c.includes('brown')) return 'bg-amber-800'
  if (c.includes('xám') || c.includes('grey')) return 'bg-gray-400'
  if (c.includes('đỏ') || c.includes('red')) return 'bg-red-500'
  if (c.includes('xanh') || c.includes('blue')) return 'bg-blue-500'
  if (c.includes('vàng') || c.includes('yellow')) return 'bg-yellow-400'
  return 'bg-gray-300'
}

export const ProductManager = () => {
  const canManageCatalog = !isStaffOnly()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_ADMIN_PRODUCTS_PER_PAGE)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('')

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editingVariant, setEditingVariant] = useState(null)
  const [selectedProductForVariants, setSelectedProductForVariants] = useState(null)


  // Selected colors and sizes state for product creation
  const [selectedColors, setSelectedColors] = useState([])
  const [selectedSizes, setSelectedSizes] = useState([])

  // Search query state for products
  const [searchQuery, setSearchQuery] = useState('')

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false
  })

  const openConfirm = (title, message, onConfirm, isDestructive = false) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm()
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      },
      isDestructive
    })
  }

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    baseprice: '',
    categoryId: '',
    imageUrls: ['']
  })

  const [variantForm, setVariantForm] = useState({
    size: 'S',
    color: 'Trắng',
    price: '',
    quantityInStock: 10,
    sku: ''
  })

  // Fetch categories & products on mount
  useEffect(() => {
    fetchCategories()
  }, [])

  // Fetch products with debounce to prevent excessive API calls
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts()
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [page, pageSize, selectedCategoryFilter, searchQuery])

  // Reset page to 0 when query or category changes
  useEffect(() => {
    setPage(0)
  }, [selectedCategoryFilter, searchQuery])

  const fetchCategories = async () => {
    try {
      const res = await categoryApi.getAllCategoriesForAdmin()
      if (res && res.data) {
        setCategories(res.data)
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      let res

      if (selectedCategoryFilter !== '') {
        // If both category and name filters are active, fetch category products and filter client-side
        if (searchQuery.trim() !== '') {
          res = await productApi.getProductsByCategory(Number(selectedCategoryFilter), {
            page: 0,
            size: ADMIN_CATEGORY_SEARCH_FETCH_SIZE
          })
          if (res && res.data) {
            const filteredContent = (res.data.content || []).filter(p =>
              p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
            )
            const startIndex = page * pageSize
            const paginatedContent = filteredContent.slice(startIndex, startIndex + pageSize)

            setProducts(paginatedContent)
            setTotalPages(Math.ceil(filteredContent.length / pageSize) || 1)
            setTotalElements(filteredContent.length)
            return
          }
        } else {
          // If only category is chosen, use getProductsByCategory API
          res = await productApi.getProductsByCategory(Number(selectedCategoryFilter), {
            page: page,
            size: pageSize
          })
        }
      } else if (searchQuery.trim() !== '') {
        // If only search query is present, use searchProducts API
        res = await productApi.searchProducts({
          name: searchQuery.trim(),
          page: page,
          size: pageSize
        })
      } else {
        // Default: get all products for admin
        res = await productApi.getAllProductsForAdmin({
          page: page,
          size: pageSize,
          sort: 'productId,desc'
        })
      }

      if (res && res.data) {
        setProducts(res.data.content || [])
        setTotalPages(res.data.totalPages || 1)
        setTotalElements(res.data.totalElements || (res.data.content ? res.data.content.length : 0))
      }
    } catch (err) {
      console.error('Error fetching products:', err)
      toast.error('Không thể tải danh sách sản phẩm.')
    } finally {
      setLoading(false)
    }
  }

  // --- PRODUCT CRUD ACTIONS ---

  const handleOpenProductModal = (prod = null) => {
    if (prod) {
      setEditingProduct(prod)
      let matchedCatId = prod.categoryId
      if (!matchedCatId && prod.categoryName) {
        const found = categories.find(c => c.name?.trim().toLowerCase() === prod.categoryName?.trim().toLowerCase())
        if (found) matchedCatId = found.id !== undefined ? found.id : found.categoryId
      }
      const firstCatId = categories.length > 0 ? (categories[0].id !== undefined ? categories[0].id : categories[0].categoryId) : ''
      setProductForm({
        name: prod.name || '',
        description: prod.description || '',
        baseprice: prod.baseprice || '',
        categoryId: matchedCatId || firstCatId,
        imageUrls: prod.imageUrls && prod.imageUrls.length > 0
          ? prod.imageUrls.map((url) => String(url ?? ''))
          : ['']
      })
      setSelectedColors([])
      setSelectedSizes([])
    } else {
      setEditingProduct(null)
      const firstCatId = categories.length > 0 ? (categories[0].id !== undefined ? categories[0].id : categories[0].categoryId) : ''
      setProductForm({
        name: '',
        description: '',
        baseprice: '',
        categoryId: firstCatId,
        imageUrls: ['']
      })
      setSelectedColors(['Trắng', 'Đen'])
      setSelectedSizes(['S', 'M', 'L'])
    }
    setIsProductModalOpen(true)
  }

  const handleProductInputChange = (e) => {
    const { name, value } = e.target
    const nextValue = name === 'baseprice'
      ? value.replace(/\D/g, '').slice(0, String(MAX_PRODUCT_PRICE).length)
      : value
    setProductForm(prev => ({ ...prev, [name]: nextValue }))
  }

  const handleImageUrlChange = (index, value) => {
    setProductForm(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.map((url, currentIndex) => (
        currentIndex === index ? value : url
      ))
    }))
  }

  const handleAddImageUrl = () => {
    setProductForm(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ''] }))
  }

  const handleRemoveImageUrl = (index) => {
    setProductForm(prev => {
      const remainingImageUrls = prev.imageUrls.filter((_, currentIndex) => currentIndex !== index)

      return {
        ...prev,
        // Giữ một ô trống khi xóa hết để admin vẫn có thể thêm URL mới.
        // Khi submit, ô trống sẽ được lọc và BE nhận đúng imageUrls: [].
        imageUrls: remainingImageUrls.length > 0 ? remainingImageUrls : ['']
      }
    })
  }


  const handleProductSubmit = async (e) => {
    e.preventDefault()
    const name = productForm.name.trim().replace(/\s+/g, ' ')
    const description = productForm.description.trim()
    const baseprice = Number(productForm.baseprice)

    if (!name) {
      toast.error('Vui lòng nhập tên sản phẩm')
      return
    }
    if (name.length > MAX_PRODUCT_NAME_LENGTH) {
      toast.error(`Tên sản phẩm không được vượt quá ${MAX_PRODUCT_NAME_LENGTH.toLocaleString('vi-VN')} ký tự`)
      return
    }
    if (description.length > MAX_PRODUCT_DESCRIPTION_LENGTH) {
      toast.error(`Mô tả sản phẩm không được vượt quá ${MAX_PRODUCT_DESCRIPTION_LENGTH.toLocaleString('vi-VN')} ký tự`)
      return
    }
    if (!Number.isSafeInteger(baseprice) || baseprice <= 0 || baseprice > MAX_PRODUCT_PRICE) {
      toast.error(`Giá phải là số nguyên từ 1 đến ${MAX_PRODUCT_PRICE.toLocaleString('vi-VN')} VND`)
      return
    }
    if (!productForm.categoryId) {
      toast.error('Vui lòng chọn danh mục')
      return
    }

    const enteredImageUrls = productForm.imageUrls
      .map((url) => url.trim())
      .filter(Boolean)

    const invalidImageUrlIndex = enteredImageUrls.findIndex((url) => !isValidProductImageUrl(url))
    if (invalidImageUrlIndex !== -1) {
      toast.error(`Đường dẫn ảnh thứ ${invalidImageUrlIndex + 1} không hợp lệ. Chỉ nhập URL http/https hoặc đường dẫn ảnh nội bộ bắt đầu bằng /.`)
      return
    }

    const cleanImageUrls = [...new Set(
      enteredImageUrls
    )]

    const productPayload = {
      name: name.toLocaleUpperCase('vi-VN'),
      description,
      baseprice,
      categoryId: Number(productForm.categoryId),
      imageUrls: cleanImageUrls,
    }

    try {
      if (editingProduct) {
        await productApi.updateProduct(editingProduct.productId, productPayload)
        toast.success('Cập nhật sản phẩm thành công!')
      } else {
        const variants = selectedColors.flatMap((color) =>
          selectedSizes.map((size) => ({
            color,
            size,
            price: baseprice,
            quantityInStock: 10,
            sku: `SKU-${Date.now()}-${color}-${size}`,
          })),
        )
        await productApi.createProduct({ ...productPayload, variants })
        toast.success('Tạo sản phẩm mới và tự động tạo biến thể thành công!')
      }
      setIsProductModalOpen(false)
      fetchProducts()
    } catch (err) {
      console.error('Error saving product:', err)
      toast.error(err.response?.data?.message || 'Lỗi khi lưu sản phẩm.')
    }
  }

  const handleDeleteProduct = (productId) => {
    openConfirm(
      'Xóa sản phẩm',
      'Bạn có chắc chắn muốn xóa sản phẩm này? Các biến thể liên quan cũng sẽ bị ẩn.',
      async () => {
        try {
          await productApi.deleteProduct(productId)
          toast.success('Đã xóa sản phẩm thành công!')
          fetchProducts()
          if (selectedProductForVariants?.productId === productId) {
            setSelectedProductForVariants(null)
          }
        } catch (err) {
          console.error('Error deleting product:', err)
          let rawMsg = err.response?.data?.message || err.response?.data?.error || ''
          if (rawMsg.includes('còn tồn kho')) {
            const match = rawMsg.match(/còn tồn kho:\s*(\d+)/i)
            const stockCount = match ? match[1] : ''
            rawMsg = `Sản phẩm hiện vẫn còn hàng trong kho${stockCount ? ` (${stockCount} sản phẩm)` : ''}. Vui lòng cập nhật số lượng tồn kho về 0 trước khi xóa!`
          } else if (!rawMsg) {
            rawMsg = 'Sản phẩm vẫn còn hàng trong kho. Vui lòng kiểm tra lại trước khi xóa!'
          }
          toast.error(rawMsg)
        }
      },
      true
    )
  }

  const handleRestoreProduct = async (productId) => {
    try {
      await productApi.restoreProduct(productId)
      toast.success('Phục hồi sản phẩm thành công!')
      fetchProducts()
    } catch (err) {
      console.error('Error restoring product:', err)
      toast.error('Lỗi khi phục hồi sản phẩm.')
    }
  }

  // --- VARIANT ACTIONS ---

  const handleSelectProductVariants = async (product) => {
    try {
      const res = await productApi.getProductDetail(product.productId)
      if (res && res.data) {
        setSelectedProductForVariants(res.data)
      }
    } catch (err) {
      console.error('Error fetching variants:', err)
      toast.error('Không thể tải danh sách biến thể.')
    }
  }

  const handleOpenVariantModal = (variant = null) => {
    if (!selectedProductForVariants) return

    if (variant) {
      setEditingVariant(variant)
      setVariantForm({
        size: variant.size || 'S',
        color: variant.color || 'Trắng',
        price: variant.price || selectedProductForVariants.baseprice || '',
        quantityInStock: variant.quantityInStock !== undefined ? variant.quantityInStock : 10,
        sku: variant.sku || ''
      })
    } else {
      setEditingVariant(null)
      const randomSku = `SKU-${selectedProductForVariants.productId}-${Math.floor(1000 + Math.random() * 9000)}`
      setVariantForm({
        size: 'S',
        color: 'Trắng',
        price: selectedProductForVariants.baseprice || '',
        quantityInStock: 10,
        sku: randomSku
      })
    }
    setIsVariantModalOpen(true)
  }

  const handleVariantInputChange = (e) => {
    const { name, value } = e.target
    const nextValue = name === 'price'
      ? value.replace(/\D/g, '').slice(0, String(MAX_PRODUCT_PRICE).length)
      : value
    setVariantForm(prev => ({ ...prev, [name]: nextValue }))
  }

  const handleVariantSubmit = async (e) => {
    e.preventDefault()
    const price = Number(variantForm.price)
    if (!Number.isSafeInteger(price) || price <= 0 || price > MAX_PRODUCT_PRICE) {
      toast.error(`Giá bán phải là số nguyên từ 1 đến ${MAX_PRODUCT_PRICE.toLocaleString('vi-VN')} VND`)
      return
    }

    const payload = {
      size: variantForm.size,
      color: variantForm.color,
      price,
      quantityInStock: Number(variantForm.quantityInStock),
      sku: variantForm.sku
    }

    try {
      const prodId = selectedProductForVariants.productId
      if (editingVariant) {
        await productApi.updateVariant(prodId, editingVariant.productVariantId, payload)
        toast.success('Cập nhật biến thể thành công!')
      } else {
        await productApi.addVariant(prodId, payload)
        toast.success('Thêm biến thể thành công!')
      }
      setIsVariantModalOpen(false)
      handleSelectProductVariants({ productId: prodId })
    } catch (err) {
      console.error('Error saving variant:', err)
      toast.error(err.response?.data?.message || 'Lỗi khi lưu biến thể.')
    }
  }

  const handleDeleteVariant = (variantId) => {
    openConfirm(
      'Xóa biến thể',
      'Bạn có chắc chắn muốn xóa biến thể này?',
      async () => {
        try {
          const prodId = selectedProductForVariants.productId
          await productApi.deleteVariant(prodId, variantId)
          toast.success('Đã xóa biến thể thành công!')
          handleSelectProductVariants({ productId: prodId })
        } catch (err) {
          console.error('Error deleting variant:', err)
          let msg = err.response?.data?.message || ''
          if (!msg || msg.includes('Lỗi hệ thống') || msg.includes('chưa được xử lý riêng')) {
            msg = 'Không thể xóa biến thể này vì đã nằm trong lịch sử đơn hàng của hệ thống!'
          }
          toast.error(msg)
        }
      },
      true
    )
  }

  const formatDateShort = (dateStr) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <div className="space-y-4 animate-fade-in font-sans pb-12">

      {/* ─── TOP CONTROL TOOLBAR ─── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Live Search */}
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Tìm tên sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-charcoal focus:ring-2 focus:ring-brand-charcoal/10 text-xs font-sans placeholder-gray-400 bg-white"
            />
            <span className="absolute left-3 top-2.5 text-xs text-gray-400">🔍</span>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => {
              setSelectedCategoryFilter(e.target.value)
              setPage(0)
            }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-white focus:outline-none focus:border-brand-charcoal shrink-0"
          >
            <option value="">Tất cả danh mục ({categories.length})</option>
            {categories.map((c) => {
              const val = c.id !== undefined ? c.id : c.categoryId
              return (
                <option key={val} value={val}>
                  {c.name}
                </option>
              )
            })}
          </select>

          {searchQuery.trim() !== '' && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-gray-500 hover:text-brand-charcoal font-medium px-2 py-1 underline shrink-0"
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>

        {/* Create Product Button */}
        {canManageCatalog && <button
          onClick={() => handleOpenProductModal()}
          className="bg-brand-charcoal text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-black transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-center"
        >
          <span>✨</span> Thêm sản phẩm mới
        </button>}
      </div>

      {/* ─── MAIN BALANCED 2-COLUMN GRID (7:5 PROPORTION) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ─── LEFT: PRODUCTS TABLE (7 COLS) ─── */}
        <div className="lg:col-span-7 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[580px]">
          {/* Products Table Area */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full min-w-[700px] table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-gray-500 text-[10px] font-semibold tracking-wider uppercase border-b border-gray-100">
                  <th className="w-14 px-3.5 py-2.5">Ảnh</th>
                  <th className="px-3.5 py-2.5">Sản phẩm</th>
                  <th className="w-36 px-3.5 py-2.5">Giá bán</th>
                  <th className="w-28 px-3.5 py-2.5">Danh mục</th>
                  <th className="w-24 px-3.5 py-2.5 text-center">Trạng thái</th>
                  {canManageCatalog && <th className="sticky right-0 z-20 w-28 bg-gray-50/95 px-3.5 py-2.5 text-right shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.35)]">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-brand-muted">
                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-block animate-spin text-base">⏳</span>
                        Đang tải...
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-brand-muted font-medium">
                      Chưa có sản phẩm nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isSelected = selectedProductForVariants?.productId === p.productId
                    const auditTooltip = `Tạo bởi: ${p.createdBy || 'Hệ thống'} (${formatDateShort(p.createdAt)})\nSửa bởi: ${p.lastModifiedBy || 'Hệ thống'} (${formatDateShort(p.updatedAt)})`

                    return (
                      <tr
                        key={p.productId}
                        onClick={() => handleSelectProductVariants(p)}
                        className={`hover:bg-amber-50/40 transition-colors cursor-pointer ${
                          isSelected ? 'bg-amber-50/90 font-medium border-l-4 border-l-brand-charcoal' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3.5" onClick={(e) => e.stopPropagation()}>
                          <img
                            src={
                              p.imageUrls && p.imageUrls[0]
                                ? resolveProductImageUrl(p.imageUrls[0])
                                : 'https://placehold.co/200x200/faf8f6/a3a3c2?text=No+Image'
                            }
                            alt=""
                            onError={replaceBrokenProductImage}
                            className="w-9 h-9 object-cover rounded-lg border border-gray-100 shadow-2xs"
                          />
                        </td>
                        <td className="min-w-0 px-3.5 py-2.5" title={auditTooltip}>
                          <p className="font-semibold text-brand-charcoal leading-tight line-clamp-1">{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-brand-muted">
                            <span className="font-mono">#{p.productId}</span>
                            <span>•</span>
                            <span className="hover:underline cursor-help" title={auditTooltip}>
                              📅 {formatDateShort(p.createdAt) || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-brand-charcoal">
                          <span className="block truncate" title={formatVND(p.baseprice)}>{formatVND(p.baseprice)}</span>
                        </td>
                        <td className="py-2.5 px-3.5 text-brand-muted font-medium">
                          <span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-[10px] text-gray-700 max-w-[90px] truncate">
                            {p.categoryName || 'Không có'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          {p.deleted ? (
                            <span className="inline-block px-2 py-0.5 text-[9px] font-semibold bg-red-50 text-red-600 rounded-full border border-red-200">
                              Đã ẩn
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                              Đang bán
                            </span>
                          )}
                        </td>
                        {canManageCatalog && <td className={`sticky right-0 z-10 px-3.5 py-2.5 text-right shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.35)] ${isSelected ? 'bg-amber-50/90' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenProductModal(p)}
                              className="text-[11px] font-semibold text-brand-charcoal hover:underline"
                            >
                              Sửa
                            </button>
                            <span className="text-gray-300">|</span>
                            {p.deleted ? (
                              <button
                                onClick={() => handleRestoreProduct(p.productId)}
                                className="text-[11px] font-semibold text-emerald-700 hover:underline"
                              >
                                Hiện
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteProduct(p.productId)}
                                className="text-[11px] font-semibold text-red-600 hover:underline"
                              >
                                Xóa
                              </button>
                            )}
                          </div>
                        </td>}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Compact Balanced Pagination Controls */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-gray-100 bg-gray-50/50 text-xs mt-auto">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-[11px]">Hiển thị</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(0)
                }}
                className="px-1.5 py-0.5 border border-gray-200 rounded text-[11px] font-semibold bg-white focus:outline-none"
              >
                {ADMIN_PRODUCTS_PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}/trang{size === DEFAULT_ADMIN_PRODUCTS_PER_PAGE ? ' (Mặc định)' : ''}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-gray-400">({totalElements} sp)</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors text-[11px] font-medium"
              >
                ← Trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i).slice(0, MAX_VISIBLE_ADMIN_PAGE_BUTTONS).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-6 h-6 rounded text-[11px] font-semibold transition-all ${
                    page === pageNum
                      ? 'bg-brand-charcoal text-white'
                      : 'border border-gray-200 hover:bg-white text-gray-700'
                  }`}
                >
                  {pageNum + 1}
                </button>
              ))}

              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors text-[11px] font-medium"
              >
                Sau →
              </button>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: VARIANTS LIST (5 COLS) ─── */}
        <div className="lg:col-span-5 bg-white border border-gray-100 rounded-2xl shadow-sm p-4 min-h-[580px] flex flex-col">
          {selectedProductForVariants ? (
            <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
              {/* Variant Section Header */}
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 shrink-0">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-brand-muted block">
                    Danh sách biến thể
                  </span>
                  <h3 className="text-xs font-bold text-brand-charcoal mt-0.5 line-clamp-1 max-w-[180px]">
                    {selectedProductForVariants.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Giá niêm yết: <strong className="text-brand-charcoal">{formatVND(selectedProductForVariants.baseprice)}</strong>
                  </p>
                </div>
                {canManageCatalog && <button
                  onClick={() => handleOpenVariantModal()}
                  className="bg-brand-charcoal hover:bg-black text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl cursor-pointer transition-all shadow-xs active:scale-95 flex items-center gap-1 shrink-0"
                >
                  <span>+</span> Thêm biến thể
                </button>}
              </div>

              {/* Variants Table */}
              {!selectedProductForVariants.variants || selectedProductForVariants.variants.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                  <span className="text-xl mb-1">🏷️</span>
                  <p className="text-xs font-medium text-gray-600 mb-1">Chưa có biến thể nào</p>
                  <p className="text-[10px] text-gray-400 max-w-[200px]">
                    Bấm &quot;Thêm biến thể&quot; để thiết lập kích cỡ, màu sắc và số lượng tồn kho.
                  </p>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-[9px] tracking-wider uppercase font-semibold text-gray-500 sticky top-0 bg-white">
                        <th className="py-2 px-2.5">Size</th>
                        <th className="py-2 px-2.5">Màu</th>
                        <th className="py-2 px-2.5">Giá bán</th>
                        <th className="py-2 px-2.5 text-center">Tồn kho</th>
                        {canManageCatalog && <th className="py-2 px-2.5 text-right">Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedProductForVariants.variants.map((v) => (
                        <tr key={v.productVariantId} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2.5 px-2.5 font-bold text-brand-charcoal">{v.size}</td>
                          <td className="py-2.5 px-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-full ${getColorDot(v.color)}`} />
                              <span className="text-gray-700 font-medium text-[11px]">{translateColor(v.color)}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 font-semibold text-brand-charcoal text-[11px]">
                            {formatVND(v.price)}
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                                v.quantityInStock <= 5
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : v.quantityInStock <= 15
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {v.quantityInStock}
                            </span>
                          </td>
                          {canManageCatalog && <td className="py-2.5 px-2.5 text-right space-x-1.5">
                            <button
                              onClick={() => handleOpenVariantModal(v)}
                              className="text-[10px] font-semibold text-brand-charcoal hover:underline"
                            >
                              Sửa
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleDeleteVariant(v.productVariantId)}
                              className="text-[10px] font-semibold text-red-600 hover:underline"
                            >
                              Xóa
                            </button>
                          </td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
              <span className="text-2xl mb-1.5">👈</span>
              <h4 className="text-xs font-semibold text-brand-charcoal mb-0.5">
                Chọn sản phẩm để xem biến thể
              </h4>
              <p className="text-[10px] text-gray-400 max-w-[200px]">
                Bấm vào một hàng sản phẩm ở bảng bên trái để kiểm tra và chỉnh sửa tồn kho, kích thước hoặc màu sắc.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL: PRODUCT CREATE / UPDATE ─── */}
      {canManageCatalog && isProductModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal">
                  {editingProduct ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}
                </h3>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold uppercase text-brand-muted text-[9px]">Tên sản phẩm *</label>
                <input
                  type="text"
                  name="name"
                  value={productForm.name}
                  onChange={handleProductInputChange}
                  maxLength={MAX_PRODUCT_NAME_LENGTH}
                  placeholder="Ví dụ: Đầm Lụa Midi Outta"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-charcoal text-xs font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold uppercase text-brand-muted text-[9px]">Giá niêm yết (VND) *</label>
                  <input
                    type="text"
                    name="baseprice"
                    value={productForm.baseprice}
                    onChange={handleProductInputChange}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={String(MAX_PRODUCT_PRICE).length}
                    placeholder="Ví dụ: 890000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-charcoal text-xs font-sans"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold uppercase text-brand-muted text-[9px]">Danh mục *</label>
                  <select
                    name="categoryId"
                    value={productForm.categoryId}
                    onChange={handleProductInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-charcoal text-xs font-sans bg-white"
                    required
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => {
                      const catVal = c.id !== undefined ? c.id : c.categoryId
                      return (
                        <option key={catVal} value={catVal}>
                          {c.name}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold uppercase text-brand-muted text-[9px]">Mô tả sản phẩm</label>
                <textarea
                  name="description"
                  rows="4"
                  value={productForm.description}
                  onChange={handleProductInputChange}
                  maxLength={MAX_PRODUCT_DESCRIPTION_LENGTH}
                  wrap="soft"
                  placeholder="Nhập mô tả chất liệu, kiểu dáng..."
                  className="max-h-48 w-full overflow-y-auto break-all whitespace-pre-wrap rounded-xl border border-gray-200 px-3 py-2 font-sans text-xs [overflow-wrap:anywhere] focus:border-brand-charcoal focus:outline-none resize-none"
                />
                <p className="text-right text-[10px] text-brand-muted">
                  {productForm.description.length.toLocaleString('vi-VN')} / {MAX_PRODUCT_DESCRIPTION_LENGTH.toLocaleString('vi-VN')} ký tự
                </p>
              </div>

              {/* Dynamic Image URLs */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <label className="block font-semibold uppercase text-brand-muted text-[9px]">
                    Đường dẫn ảnh sản phẩm
                  </label>
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="text-[10px] font-semibold text-brand-charcoal hover:underline"
                  >
                    + Thêm ảnh
                  </button>
                </div>
                {productForm.imageUrls.map((url, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      inputMode="url"
                      value={url}
                      onChange={(e) => handleImageUrlChange(index, e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-xl focus:outline-none text-[11px] font-sans"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveImageUrl(index)}
                      className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                      aria-label={`Xóa ảnh ${index + 1}`}
                      title="Xóa ảnh"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-charcoal text-white text-xs font-semibold hover:bg-black transition-all shadow-xs active:scale-95"
                >
                  Lưu sản phẩm
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL: VARIANT CREATE / UPDATE ─── */}
      {canManageCatalog && isVariantModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 space-y-4 my-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal">
                  {editingVariant ? 'Cập nhật biến thể' : 'Thêm biến thể mới'}
                </h3>
              </div>
              <button
                onClick={() => setIsVariantModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVariantSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold uppercase text-brand-muted text-[9px]">Kích cỡ (Size) *</label>
                  <select
                    name="size"
                    value={variantForm.size}
                    onChange={handleVariantInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-charcoal text-xs font-sans bg-white"
                    required
                  >
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', '35', '36', '37', '38', '39', '40', 'OS'].map((sz) => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold uppercase text-brand-muted text-[9px]">Màu sắc *</label>
                  <select
                    name="color"
                    value={variantForm.color}
                    onChange={handleVariantInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-charcoal text-xs font-sans bg-white"
                    required
                  >
                    {[
                      { value: 'Trắng', label: 'Trắng' },
                      { value: 'Đen', label: 'Đen' },
                      { value: 'Hồng', label: 'Hồng' },
                      { value: 'Be', label: 'Be' },
                      { value: 'Nâu', label: 'Nâu' },
                      { value: 'Xám', label: 'Xám' },
                      { value: 'Đỏ', label: 'Đỏ' },
                      { value: 'Xanh', label: 'Xanh' },
                      { value: 'Xanh dương', label: 'Xanh dương' },
                      { value: 'Vàng', label: 'Vàng' },
                      { value: 'Charcoal', label: 'Charcoal' }
                    ].map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold uppercase text-brand-muted text-[9px]">Giá bán (VND) *</label>
                  <input
                    type="text"
                    name="price"
                    value={variantForm.price}
                    onChange={handleVariantInputChange}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={String(MAX_PRODUCT_PRICE).length}
                    placeholder="Nhập giá bán"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-charcoal text-xs font-sans"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold uppercase text-brand-muted text-[9px]">Số lượng tồn kho *</label>
                  <input
                    type="number"
                    name="quantityInStock"
                    value={variantForm.quantityInStock}
                    onChange={handleVariantInputChange}
                    placeholder="Ví dụ: 100"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-charcoal text-xs font-sans"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsVariantModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-charcoal text-white text-xs font-semibold hover:bg-black transition-all shadow-xs active:scale-95"
                >
                  Lưu biến thể
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal */}
      {canManageCatalog && <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />}
    </div>
  )
}
