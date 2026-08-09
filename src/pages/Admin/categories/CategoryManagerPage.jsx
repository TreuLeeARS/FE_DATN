import { useState, useEffect } from 'react'
import categoryApi from '@/api/categories/categoryApi.js'
import toast from 'react-hot-toast'
import { isStaffOnly } from '@/utils/auth/auth.js'

export const CategoryManager = () => {
  const canManageCatalog = !isStaffOnly()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'inactive'
  const [expandedIds, setExpandedIds] = useState(new Set())

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit'
  const [editingCategory, setEditingCategory] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: ''
  })

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'delete', // 'delete' | 'restore'
    categoryId: null,
    categoryName: ''
  })

  // Load categories on component mount
  const loadCategories = async () => {
    try {
      setLoading(true)
      const response = await categoryApi.getAllCategoriesForAdmin()
      if (response && response.data) {
        setCategories(response.data)
      }
    } catch (err) {
      console.error('Error fetching categories for admin:', err)
      toast.error('Không thể tải danh sách danh mục từ máy chủ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  // Helper: Get depth of a category
  const getCategoryDepth = (cat, list) => {
    let depth = 0
    let parentId = cat.parentId
    const visited = new Set() // avoid infinite loops if cyclic data exists
    
    while (parentId) {
      if (visited.has(parentId)) break
      visited.add(parentId)
      const parent = list.find(c => c.id === parentId)
      if (!parent) break
      depth++
      parentId = parent.parentId
    }
    return depth
  }

  // Helper: Get hierarchy path string (e.g., "Quần áo > Quần > Quần jeans")
  const getCategoryPath = (cat, list) => {
    const path = [cat.name]
    let parentId = cat.parentId
    const visited = new Set()
    
    while (parentId) {
      if (visited.has(parentId)) break
      visited.add(parentId)
      const parent = list.find(c => c.id === parentId)
      if (!parent) break
      path.unshift(parent.name)
      parentId = parent.parentId
    }
    return path.join(' › ')
  }

  // Helper: check if a candidate id is a descendant of targetId
  const isDescendant = (candidateId, targetId, list) => {
    if (!candidateId || !targetId) return false
    if (candidateId === targetId) return true
    
    let current = list.find(c => c.id === candidateId)
    const visited = new Set()
    
    while (current && current.parentId) {
      if (visited.has(current.parentId)) break
      visited.add(current.parentId)
      if (current.parentId === targetId) return true
      current = list.find(c => c.id === current.parentId)
    }
    return false
  }

  // Process & Sort Categories for list view
  const processedCategories = categories.map(cat => ({
    ...cat,
    depth: getCategoryDepth(cat, categories),
    path: getCategoryPath(cat, categories)
  }))

  // Custom tree sorting function (Depth-First Search) to push inactive roots to the bottom
  const buildSortedTree = (list) => {
    const result = [];
    
    // Sort helper: active first, then alphabetical by name
    const sortCategories = (cats) => {
      return [...cats].sort((a, b) => {
        // Active first, inactive last
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        
        // Secondary: alphabetical name
        return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' });
      });
    };

    const roots = list.filter(c => !c.parentId);
    const sortedRoots = sortCategories(roots);

    const traverse = (node) => {
      result.push(node);
      const children = list.filter(c => c.parentId === node.id);
      const sortedChildren = sortCategories(children);
      sortedChildren.forEach(child => {
        traverse(child);
      });
    };

    sortedRoots.forEach(root => {
      traverse(root);
    });

    // Orphaned nodes fallback safety
    const addedIds = new Set(result.map(r => r.id));
    const orphans = list.filter(c => !addedIds.has(c.id));
    if (orphans.length > 0) {
      result.push(...sortCategories(orphans));
    }

    return result;
  };

  const sortedCategories = buildSortedTree(processedCategories)

  // Filter categories by search term and status
  const filteredCategories = sortedCategories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && cat.isActive) ||
      (statusFilter === 'inactive' && !cat.isActive)

    return matchesSearch && matchesStatus
  })

  const hasChildren = (catId) => {
    return categories.some(c => c.parentId === catId)
  }

  const isCategoryVisible = (cat) => {
    let parentId = cat.parentId
    while (parentId) {
      if (!expandedIds.has(parentId)) {
        return false
      }
      const parent = categories.find(c => c.id === parentId)
      if (!parent) break
      parentId = parent.parentId
    }
    return true
  }

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => {
    const parentIds = categories
      .filter(c => categories.some(child => child.parentId === c.id))
      .map(c => c.id)
    setExpandedIds(new Set(parentIds))
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  // Final categories to render in tree table
  const visibleCategories = filteredCategories.filter(cat => {
    // If user is searching, bypass collapsing to show search results directly
    if (searchTerm.trim() !== '') return true
    return isCategoryVisible(cat)
  })

  // Open modal for Creating new category
  const handleOpenCreateModal = () => {
    setModalMode('create')
    setEditingCategory(null)
    setFormData({
      name: '',
      description: '',
      parentId: ''
    })
    setIsModalOpen(true)
  }

  // Open modal for Editing category
  const handleOpenEditModal = (cat) => {
    setModalMode('edit')
    setEditingCategory(cat)
    setFormData({
      name: cat.name,
      description: cat.description || '',
      parentId: cat.parentId ? cat.parentId.toString() : ''
    })
    setIsModalOpen(true)
  }

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle submit create/edit form
  const handleSubmitForm = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên danh mục')
      return
    }

    try {
      if (modalMode === 'create') {
        const payloadCreate = {
          name: formData.name.trim().replace(/\s+/g, ' ').toLocaleUpperCase('vi-VN'),
          description: formData.description.trim(),
          parent: formData.parentId ? parseInt(formData.parentId) : null
        }
        await categoryApi.createCategory(payloadCreate)
        toast.success(`Tạo danh mục "${payloadCreate.name}" thành công!`)
      } else {
        // Edit mode
        const categoryId = editingCategory.id
        const parentIdParsed = formData.parentId ? parseInt(formData.parentId) : null
        
        // Extra protection: double check cyclic parent setup
        if (parentIdParsed === categoryId) {
          toast.error('Danh mục không thể làm cha của chính nó!')
          return
        }
        if (parentIdParsed && isDescendant(parentIdParsed, categoryId, categories)) {
          toast.error('Không thể chọn danh mục con làm danh mục cha!')
          return
        }

        const payloadUpdate = {
          name: formData.name.trim().replace(/\s+/g, ' ').toLocaleUpperCase('vi-VN'),
          description: formData.description.trim(),
          parentId: parentIdParsed
        }
        await categoryApi.updateCategory(categoryId, payloadUpdate)
        toast.success(`Cập nhật danh mục "${payloadUpdate.name}" thành công!`)
      }
      setIsModalOpen(false)
      loadCategories()
    } catch (err) {
      console.error('Error saving category:', err)
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra trong quá trình lưu danh mục.'
      toast.error(errorMsg)
    }
  }

  // Open confirm dialog for delete/restore
  const triggerConfirmDialog = (type, cat) => {
    setConfirmDialog({
      isOpen: true,
      type,
      categoryId: cat.id,
      categoryName: cat.name
    })
  }

  // Execute delete or restore from confirmation
  const handleConfirmAction = async () => {
    const { type, categoryId, categoryName } = confirmDialog
    setConfirmDialog(prev => ({ ...prev, isOpen: false }))

    try {
      if (type === 'delete') {
        await categoryApi.deleteCategory(categoryId)
        toast.success(`Đã ẩn (xóa mềm) danh mục "${categoryName}" thành công!`)
      } else {
        await categoryApi.restoreCategory(categoryId)
        toast.success(`Đã khôi phục danh mục "${categoryName}" thành công!`)
      }
      loadCategories()
    } catch (err) {
      console.error(`Error performing ${type} action:`, err)
      const errorMsg = err.response?.data?.message || `Có lỗi xảy ra khi thực hiện thao tác.`
      toast.error(errorMsg)
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Control Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-muted">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm danh mục..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-charcoal focus:ring-2 focus:ring-brand-blush/20 transition-all"
            />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none w-full sm:w-48 pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-charcoal focus:ring-2 focus:ring-brand-blush/20 transition-all cursor-pointer font-medium text-brand-charcoal"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Đã ẩn (Xóa mềm)</option>
            </select>
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-brand-muted">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </div>

        {/* Actions Button Group */}
        <div className="flex items-center gap-2 shrink-0">
          {searchTerm.trim() === '' && (
            <>
              <button
                onClick={expandAll}
                className="flex items-center justify-center space-x-1.5 border border-gray-200 hover:bg-gray-50 text-brand-charcoal font-semibold text-xs py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
                title="Mở rộng tất cả danh mục"
              >
                <span>Mở rộng tất cả</span>
              </button>
              <button
                onClick={collapseAll}
                className="flex items-center justify-center space-x-1.5 border border-gray-200 hover:bg-gray-50 text-brand-charcoal font-semibold text-xs py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
                title="Thu gọn tất cả danh mục"
              >
                <span>Thu gọn tất cả</span>
              </button>
            </>
          )}
          {canManageCatalog && <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center space-x-2 bg-brand-charcoal hover:bg-brand-blush hover:text-brand-charcoal text-white font-semibold text-sm py-3 px-6 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer active:scale-95 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Thêm danh mục</span>
          </button>}
        </div>
      </div>

      {/* Main Categories Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-brand-blush border-t-brand-charcoal rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-brand-muted">Đang tải danh sách danh mục...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v2m16 4h-2a2 2 0 00-2 2v3a2 2 0 01-2 2H8a2 2 0 01-2-2v-3a2 2 0 00-2-2H2" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-brand-charcoal">Không tìm thấy danh mục nào</p>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">Thử thay đổi bộ lọc hoặc tạo một danh mục mới để bắt đầu hiển thị dữ liệu.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-brand-cream/50 text-brand-charcoal font-semibold border-b border-gray-100 uppercase tracking-wider text-xs">
                  <th className="py-4 px-6">Tên Danh Mục</th>
                  <th className="py-4 px-6 hidden lg:table-cell">Đường dẫn phân cấp</th>
                  <th className="py-4 px-6 hidden md:table-cell">Mô tả</th>
                  <th className="py-4 px-6 text-center">Trạng Thái</th>
                  {canManageCatalog && <th className="py-4 px-6 text-right">Thao Tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleCategories.map((cat) => {
                  const isRoot = cat.depth === 0
                  return (
                    <tr
                      key={cat.id}
                      className={`hover:bg-brand-cream/15 transition-colors ${
                        !cat.isActive ? 'bg-gray-50/40 text-brand-muted' : ''
                      }`}
                    >
                      {/* Name with indentation nested indicator */}
                      <td className="py-4.5 px-6 font-medium">
                        <div className="flex items-center">
                          {/* Visual Indent Indicators */}
                          {cat.depth > 0 && (
                            <span className="text-gray-300 font-mono tracking-widest mr-1 select-none">
                              {'　'.repeat(cat.depth - 1)}└─
                            </span>
                          )}

                          {/* Collapse/Expand Toggle Arrow for Parent Categories */}
                          {hasChildren(cat.id) && searchTerm.trim() === '' ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(cat.id)}
                              className="mr-1.5 p-1 text-gray-500 hover:text-brand-charcoal hover:bg-gray-100 rounded transition-all cursor-pointer select-none"
                            >
                              <svg
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                  expandedIds.has(cat.id) ? 'rotate-90' : ''
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          ) : (
                            // Placeholder indent if it's a leaf node to align text beautifully
                            searchTerm.trim() === '' && <span className="w-6 h-6 inline-block" />
                          )}

                          <div className="flex flex-col">
                            <span
                              onClick={() => hasChildren(cat.id) && searchTerm.trim() === '' && toggleExpand(cat.id)}
                              className={`${
                                isRoot
                                  ? 'text-brand-charcoal font-bold text-sm'
                                  : 'text-gray-700 text-sm font-normal'
                              } ${!cat.isActive ? 'line-through text-brand-muted' : ''} ${
                                hasChildren(cat.id) && searchTerm.trim() === '' ? 'cursor-pointer hover:underline' : ''
                              }`}
                            >
                              {cat.name}
                            </span>
                            {(cat.createdAt || cat.updatedAt) && (
                              <div className="text-[9.5px] text-brand-muted/70 mt-1.5 font-normal space-y-0.5 select-none normal-case">
                                {cat.createdAt && (
                                  <p>Tạo lúc: {new Date(cat.createdAt).toLocaleString('vi-VN')}</p>
                                )}
                                {cat.updatedAt && cat.updatedAt !== cat.createdAt && (
                                  <p>Sửa lúc: {new Date(cat.updatedAt).toLocaleString('vi-VN')}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Full path */}
                      <td className="py-4.5 px-6 hidden lg:table-cell text-xs text-brand-muted">
                        {cat.path}
                      </td>

                      {/* Description */}
                      <td className="py-4.5 px-6 hidden md:table-cell max-w-xs truncate text-xs">
                        {cat.description || <span className="italic text-gray-300">Không có mô tả</span>}
                      </td>

                      {/* Status */}
                      <td className="py-4.5 px-6 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${
                            cat.isActive
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${cat.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          {cat.isActive ? 'Hoạt động' : 'Đã ẩn'}
                        </span>
                      </td>

                      {/* Action buttons */}
                      {canManageCatalog && <td className="py-4.5 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Edit button */}
                          <button
                            onClick={() => handleOpenEditModal(cat)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Sửa danh mục"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          {/* Delete/Restore logic */}
                          {cat.isActive ? (
                            <button
                              onClick={() => triggerConfirmDialog('delete', cat)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Ẩn (Xóa mềm)"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => triggerConfirmDialog('restore', cat)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                              title="Khôi phục hoạt động"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {canManageCatalog && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Modal Backdrop */}
          <div
            className="fixed inset-0 bg-brand-charcoal/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Content container */}
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative z-10 animate-fade-in border border-gray-100">
            {/* Modal Header */}
            <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between bg-brand-cream/30">
              <h3 className="font-semibold text-brand-charcoal tracking-wide">
                {modalMode === 'create' ? 'Tạo danh mục mới' : 'Chỉnh sửa danh mục'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-brand-muted hover:text-brand-charcoal p-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-left">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nhập tên danh mục (ví dụ: Áo thun nam)"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-charcoal focus:ring-2 focus:ring-brand-blush/20 transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-charcoal uppercase tracking-wider">Mô tả</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Nhập mô tả ngắn cho danh mục..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-charcoal focus:ring-2 focus:ring-brand-blush/20 transition-all resize-none"
                />
              </div>

              {/* Parent Category Dropdown Selection */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                  Danh mục cha
                </label>
                <div className="relative">
                  <select
                    name="parentId"
                    value={formData.parentId}
                    onChange={handleInputChange}
                    className="appearance-none w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-charcoal focus:ring-2 focus:ring-brand-blush/20 transition-all cursor-pointer text-brand-charcoal"
                  >
                    <option value="">Không có (Danh mục gốc)</option>
                    {sortedCategories
                      .filter(cat => {
                        // Must be active
                        if (!cat.isActive) return false
                        
                        // If editing, cannot choose itself or its descendants
                        if (modalMode === 'edit' && editingCategory) {
                          const catId = editingCategory.id
                          if (cat.id === catId) return false
                          if (isDescendant(cat.id, catId, categories)) return false
                        }
                        return true
                      })
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.path}
                        </option>
                      ))}
                  </select>
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-brand-muted">
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
                <p className="text-xxs text-brand-muted italic mt-1 leading-relaxed">
                  * Hệ thống tự động ẩn danh mục con và chính nó để ngăn chặn lỗi liên kết vòng (Circular reference).
                </p>
              </div>

              {/* Modal Footer actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-brand-muted hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-charcoal hover:bg-brand-blush hover:text-brand-charcoal text-white font-semibold text-sm rounded-xl transition-all duration-300 cursor-pointer active:scale-95"
                >
                  {modalMode === 'create' ? 'Tạo mới' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTION CONFIRM DIALOG */}
      {canManageCatalog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-brand-charcoal/60 backdrop-blur-sm transition-opacity"
            onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
          />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative z-10 p-6 animate-fade-in border border-gray-100 space-y-4">
            <div className="flex items-center space-x-3 text-brand-charcoal">
              {confirmDialog.type === 'delete' ? (
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
                  </svg>
                </div>
              )}
              <h3 className="font-semibold tracking-wide text-base">
                {confirmDialog.type === 'delete' ? 'Xác nhận xóa mềm' : 'Xác nhận khôi phục'}
              </h3>
            </div>

            <p className="text-sm text-brand-muted leading-relaxed text-left">
              {confirmDialog.type === 'delete' ? (
                <span>
                  Bạn có chắc chắn muốn ẩn danh mục <strong className="text-brand-charcoal font-semibold">"{confirmDialog.categoryName}"</strong>? Danh mục này và toàn bộ danh mục con sẽ không hiển thị trên giao diện người mua (Cửa hàng), nhưng dữ liệu sản phẩm liên quan vẫn được giữ nguyên.
                </span>
              ) : (
                <span>
                  Bạn có chắc chắn muốn khôi phục danh mục <strong className="text-brand-charcoal font-semibold">"{confirmDialog.categoryName}"</strong>? Danh mục này và các danh mục con liên quan của nó sẽ hiển thị trở lại bình thường.
                </span>
              )}
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-brand-muted hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-5 py-2 text-xs font-semibold rounded-lg text-white transition-all duration-300 cursor-pointer ${
                  confirmDialog.type === 'delete'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {confirmDialog.type === 'delete' ? 'Ẩn danh mục' : 'Khôi phục'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
