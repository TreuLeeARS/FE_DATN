import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import couponApi from '@/api/coupons/couponApi.js'
import { ConfirmModal } from '@/components/common/ConfirmModal.jsx'
import { DISCOUNT_TYPES } from '@/types/coupon.js'
import { isAdminOnly } from '@/utils/auth/auth.js'

// Số mã giảm giá hiển thị mỗi trang.
const COUPONS_PER_PAGE = 10
// Giá trị giảm cố định tối thiểu (VND).
const MIN_FIXED_DISCOUNT_AMOUNT = 1_000
// Phần trăm giảm tối đa.
const MAX_PERCENTAGE_DISCOUNT = 100
// Mức giảm tối đa tối thiểu (VND).
const MIN_MAX_DISCOUNT_AMOUNT = 1_000
// Số lượt dùng tối thiểu.
const MIN_COUPON_USAGE = 1

const INITIAL_FORM_DATA = {
  couponCode: '',
  discountType: DISCOUNT_TYPES.FIXED,
  discountValue: '',
  maxDiscountAmount: '',
  endDate: '',
  minimumOrderAmount: '0',
  maxUsage: '100',
  maxUsagePerUser: '1'
}

const getTodayDateInputValue = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getBackendErrorMessage = (err, fallback) => (
  err.response?.data?.message
  || err.response?.data?.data?.message
  || err.response?.data?.error
  || fallback
)

export const CouponManager = () => {
  const canCreateCoupon = isAdminOnly()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)

  // Fetch Coupons
  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const res = await couponApi.getCouponsForAdmin({
        page: page,
        size: COUPONS_PER_PAGE,
        sort: 'coupon_id,desc'
      })
      if (res && res.data) {
        setCoupons(res.data.content || [])
        setTotalPages(res.data.totalPages || 1)
      }
    } catch (err) {
      console.error('Error fetching coupons:', err)
      toast.error('Không thể tải danh sách mã giảm giá từ máy chủ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [page])

  // Input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'couponCode' ? value.toUpperCase() : value,
      ...(name === 'discountType' && value === DISCOUNT_TYPES.FIXED
        ? { maxDiscountAmount: '' }
        : {})
    }))
  }

  const handleOpenCreateModal = () => {
    if (!canCreateCoupon) return
    setFormData(INITIAL_FORM_DATA)
    setIsModalOpen(true)
  }

  // Create Coupon submit handler
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!canCreateCoupon) {
      toast.error('Chỉ quản trị viên mới có quyền tạo coupon.')
      return
    }
    
    if (!formData.couponCode.trim()) {
      toast.error('Vui lòng nhập mã coupon.')
      return
    }
    const discountValue = Number(formData.discountValue)
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      toast.error('Giá trị giảm phải lớn hơn 0.')
      return
    }
    if (formData.discountType === DISCOUNT_TYPES.PERCENTAGE && discountValue > 100) {
      toast.error('Phần trăm giảm không được vượt quá 100%.')
      return
    }
    const maxDiscountAmount = formData.maxDiscountAmount === ''
      ? null
      : Number(formData.maxDiscountAmount)
    if (formData.discountType === DISCOUNT_TYPES.PERCENTAGE
        && maxDiscountAmount !== null
        && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0)) {
      toast.error('Mức giảm tối đa phải lớn hơn 0 nếu được nhập.')
      return
    }
    if (!formData.endDate) {
      toast.error('Vui lòng chọn ngày hết hạn.')
      return
    }
    if (formData.endDate < getTodayDateInputValue()) {
      toast.error('Ngày hết hạn không được nhỏ hơn ngày hiện tại.')
      return
    }
    const minimumOrderAmount = Number(formData.minimumOrderAmount)
    if (!Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0) {
      toast.error('Giá trị đơn hàng tối thiểu không được âm.')
      return
    }
    const maxUsage = Number(formData.maxUsage)
    if (!Number.isInteger(maxUsage) || maxUsage <= 0) {
      toast.error('Tổng lượt sử dụng tối đa phải là số nguyên lớn hơn 0.')
      return
    }
    const maxUsagePerUser = Number(formData.maxUsagePerUser)
    if (!Number.isInteger(maxUsagePerUser) || maxUsagePerUser <= 0) {
      toast.error('Lượt sử dụng tối đa mỗi khách hàng phải là số nguyên lớn hơn 0.')
      return
    }
    if (maxUsagePerUser > maxUsage) {
      toast.error('Lượt sử dụng mỗi khách hàng không được vượt quá tổng lượt sử dụng.')
      return
    }

    /** @type {import('@/types/coupon.js').CreateCouponRequest} */
    const payload = {
      couponCode: formData.couponCode.trim().toUpperCase(),
      discountType: formData.discountType,
      discountValue,
      maxDiscountAmount: formData.discountType === DISCOUNT_TYPES.PERCENTAGE
        ? maxDiscountAmount
        : null,
      endDate: formData.endDate,
      minimumOrderAmount,
      maxUsage,
      maxUsagePerUser
    }

    try {
      await couponApi.createCoupon(payload)
      toast.success('Tạo mã giảm giá mới thành công!')
      setIsModalOpen(false)
      setFormData(INITIAL_FORM_DATA)
      setPage(0)
      fetchCoupons()
    } catch (err) {
      console.error('Error creating coupon:', err)
      toast.error(getBackendErrorMessage(err, 'Có lỗi xảy ra khi tạo mã giảm giá.'))
    }
  }

  // Delete Coupon handler
  const handleDeleteCoupon = (id, code) => {
    if (!canCreateCoupon) return
    openConfirm(
      'Xóa mã giảm giá',
      `Bạn có chắc chắn muốn xóa mã giảm giá "${code}"? Hành động này sẽ gỡ liên kết khỏi các đơn hàng liên quan.`,
      async () => {
        try {
          await couponApi.deleteCoupon(id)
          toast.success(`Đã xóa thành công mã giảm giá "${code}"!`)
          fetchCoupons()
        } catch (err) {
          console.error('Error deleting coupon:', err)
          toast.error(getBackendErrorMessage(err, 'Lỗi xảy ra khi xóa mã giảm giá.'))
        }
      },
      true
    )
  }

  // Restore Coupon handler
  const handleRestoreCoupon = (id, code) => {
    if (!canCreateCoupon) return
    openConfirm(
      'Phục hồi mã giảm giá',
      `Bạn có chắc chắn muốn phục hồi mã giảm giá "${code}"?`,
      async () => {
        try {
          await couponApi.restoreCoupon(id)
          toast.success(`Đã phục hồi mã giảm giá "${code}" thành công!`)
          fetchCoupons()
        } catch (err) {
          console.error('Error restoring coupon:', err)
          toast.error(getBackendErrorMessage(err, 'Lỗi xảy ra khi phục hồi mã giảm giá.'))
        }
      }
    )
  }

  // Helper formats
  const formatPrice = (value) => {
    if (value === null || value === undefined) return '0 đ'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
  }

  const isExpired = (endDateStr) => {
    if (!endDateStr) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expDate = new Date(endDateStr)
    expDate.setHours(0, 0, 0, 0)
    return expDate < today
  }

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-16">
      
      {/* ─── TITLE BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-none border border-black/10 shadow-sm">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-wider text-brand-charcoal">Danh sách Mã giảm giá (Coupons)</h2>
          <p className="text-xs text-brand-muted mt-1">Thiết lập các chương trình khuyến mãi, chiết khấu hóa đơn và quản lý điều kiện áp dụng</p>
        </div>
        {canCreateCoupon && (
          <button
            onClick={handleOpenCreateModal}
            className="bg-brand-charcoal text-white text-xs font-semibold tracking-widest uppercase px-6 py-3 hover:bg-brand-dark transition-colors duration-200 active:scale-95 rounded-none cursor-pointer"
          >
            Tạo mã giảm giá mới
          </button>
        )}
      </div>

      {/* ─── COUPONS TABLE ─── */}
      <div className="bg-white border border-black/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-charcoal text-white text-[9.5px] tracking-widest uppercase border-b border-black/10">
                <th className="py-4 px-4 font-semibold w-32">Mã giảm giá (Code)</th>
                <th className="py-4 px-4 font-semibold w-36 text-center">Giá trị giảm</th>
                <th className="py-4 px-4 font-semibold text-center">Giá trị đơn tối thiểu</th>
                <th className="py-4 px-4 font-semibold text-center w-36">Ngày bắt đầu</th>
                <th className="py-4 px-4 font-semibold text-center w-36">Ngày hết hạn</th>
                <th className="py-4 px-4 font-semibold text-center w-36">Lượt sử dụng</th>
                <th className="py-4 px-4 font-semibold text-center w-28">Trạng thái</th>
                {canCreateCoupon && (
                  <th className="py-4 px-4 font-semibold text-center w-24">Thao tác</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={canCreateCoupon ? 8 : 7} className="py-16 text-center text-brand-muted">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin text-brand-charcoal" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang tải danh sách chương trình khuyến mãi...
                    </div>
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={canCreateCoupon ? 8 : 7} className="py-16 text-center text-brand-muted font-medium">
                    Không tìm thấy mã giảm giá nào trong cơ sở dữ liệu.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => {
                  const expired = isExpired(c.endDate)
                  const fullyUsed = c.currentUsage >= c.maxUsage
                  return (
                    <tr key={c.couponId} className="hover:bg-black/[0.01] transition-colors">
                      <td className="py-4 px-4 font-bold text-brand-charcoal uppercase tracking-wider">
                        {c.couponCode}
                        <p className="text-[9px] text-brand-muted mt-0.5 font-normal">ID: {c.couponId}</p>
                        {(c.createdAt || c.createdBy || c.updatedAt || c.lastModifiedBy) && (
                          <div className="text-[9px] text-brand-muted/70 mt-1 font-normal normal-case space-y-0.5 select-none">
                            {c.createdAt && (
                              <p>Tạo: {c.createdBy || 'Hệ thống'} ({new Date(c.createdAt).toLocaleString('vi-VN')})</p>
                            )}
                            {c.updatedAt && (c.lastModifiedBy || c.updatedAt !== c.createdAt) && (
                              <p>Sửa: {c.lastModifiedBy || 'Hệ thống'} ({new Date(c.updatedAt).toLocaleString('vi-VN')})</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-brand-charcoal">
                        {(c.discountType || DISCOUNT_TYPES.FIXED) === DISCOUNT_TYPES.PERCENTAGE ? (
                          <div>
                            <span>{Number(c.discountValue)}%</span>
                            {c.maxDiscountAmount != null && Number(c.maxDiscountAmount) > 0 && (
                              <p className="mt-0.5 text-[9.5px] font-normal text-brand-muted">
                                Tối đa {formatPrice(c.maxDiscountAmount)}
                              </p>
                            )}
                          </div>
                        ) : (
                          formatPrice(c.discountValue)
                        )}
                        <p className="mt-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-brand-muted">
                          {(c.discountType || DISCOUNT_TYPES.FIXED) === DISCOUNT_TYPES.PERCENTAGE
                            ? 'Theo phần trăm'
                            : 'Số tiền cố định'}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-center text-brand-muted">
                        {formatPrice(c.minimumOrderAmount)}
                      </td>
                      <td className="py-4 px-4 text-center text-brand-muted">
                        {c.startDate ? new Date(c.startDate).toLocaleDateString('vi-VN') : 'Mặc định'}
                      </td>
                      <td className="py-4 px-4 text-center text-brand-muted">
                        {c.endDate ? new Date(c.endDate).toLocaleDateString('vi-VN') : 'Không hạn'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-semibold text-brand-charcoal">{c.currentUsage || 0}</span>
                        <span className="text-gray-300"> / </span>
                        <span className="text-brand-muted">{c.maxUsage || '∞'}</span>
                        <p className="text-[9.5px] text-brand-muted mt-0.5">Tối đa/user: {c.maxUsagePerUser || 1}</p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {c.isdeleted || c.deleted ? (
                          <span className="inline-block px-2 py-0.5 text-[8.5px] font-bold bg-red-50 text-red-600 border border-red-200 uppercase tracking-widest">Đã xóa</span>
                        ) : expired ? (
                          <span className="inline-block px-2 py-0.5 text-[8.5px] font-bold bg-red-50 text-red-600 border border-red-200 uppercase tracking-widest">Hết hạn</span>
                        ) : fullyUsed ? (
                          <span className="inline-block px-2 py-0.5 text-[8.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-widest">Hết lượt</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-[8.5px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-widest">Kích hoạt</span>
                        )}
                      </td>
                      {canCreateCoupon && (
                        <td className="py-4 px-4 text-center">
                          {c.isdeleted || c.deleted ? (
                            <button
                              onClick={() => handleRestoreCoupon(c.couponId, c.couponCode)}
                              className="text-[9.5px] uppercase tracking-wider font-semibold text-green-700 hover:text-green-900 hover:underline cursor-pointer"
                            >
                              Phục hồi
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteCoupon(c.couponId, c.couponCode)}
                              className="text-[9.5px] uppercase tracking-wider font-semibold text-red-700 hover:text-red-900 hover:underline cursor-pointer"
                            >
                              Xóa
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50 text-xs">
            <button
              disabled={page === 0}
              onClick={() => setPage(prev => Math.max(0, prev - 1))}
              className="px-3.5 py-1.5 border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors uppercase tracking-wider text-[10px] font-semibold"
            >
              Trước
            </button>
            <span className="font-semibold text-brand-muted tracking-wider uppercase text-[10px]">
              Trang {page + 1} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
              className="px-3.5 py-1.5 border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors uppercase tracking-wider text-[10px] font-semibold"
            >
              Sau
            </button>
          </div>
        )}
      </div>

      {/* ─── MODAL: CREATE COUPON ─── */}
      {canCreateCoupon && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-charcoal/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white border border-black/10 shadow-2xl p-6 md:p-8 space-y-6 rounded-none">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-brand-charcoal">
                Tạo mã giảm giá mới
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-brand-charcoal text-sm hover:opacity-70 font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold uppercase text-brand-muted text-[9.5px] tracking-wider">Mã coupon (Code) *</label>
                <input
                  type="text"
                  name="couponCode"
                  value={formData.couponCode}
                  onChange={handleInputChange}
                  required
                  placeholder="Ví dụ: OUTTA100"
                  className="w-full p-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal rounded-none font-sans uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold uppercase text-brand-muted text-[9.5px] tracking-wider">Loại giảm giá *</label>
                <select
                  name="discountType"
                  value={formData.discountType}
                  onChange={handleInputChange}
                  className="w-full p-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal rounded-none font-sans bg-white"
                >
                  <option value={DISCOUNT_TYPES.FIXED}>Giảm số tiền cố định</option>
                  <option value={DISCOUNT_TYPES.PERCENTAGE}>Giảm theo phần trăm</option>
                </select>
              </div>

              <div className={`grid gap-4 ${formData.discountType === DISCOUNT_TYPES.PERCENTAGE ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div className="space-y-1">
                  <label className="block font-semibold uppercase text-brand-muted text-[9.5px] tracking-wider">
                    {formData.discountType === DISCOUNT_TYPES.PERCENTAGE
                      ? 'Phần trăm giảm (%) *'
                      : 'Số tiền giảm (VND) *'}
                  </label>
                  <input
                    type="number"
                    name="discountValue"
                    value={formData.discountValue}
                    onChange={handleInputChange}
                    required
                    min={formData.discountType === DISCOUNT_TYPES.PERCENTAGE ? '0.01' : MIN_FIXED_DISCOUNT_AMOUNT}
                    max={formData.discountType === DISCOUNT_TYPES.PERCENTAGE ? MAX_PERCENTAGE_DISCOUNT : undefined}
                    step={formData.discountType === DISCOUNT_TYPES.PERCENTAGE ? '0.01' : MIN_FIXED_DISCOUNT_AMOUNT}
                    placeholder={formData.discountType === DISCOUNT_TYPES.PERCENTAGE ? 'Ví dụ: 20' : 'Ví dụ: 50000'}
                    className="w-full p-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal rounded-none font-sans"
                  />
                </div>

                {formData.discountType === DISCOUNT_TYPES.PERCENTAGE && (
                  <div className="space-y-1">
                    <label className="block font-semibold uppercase text-brand-muted text-[9.5px] tracking-wider">Mức giảm tối đa (VND)</label>
                    <input
                      type="number"
                      name="maxDiscountAmount"
                      value={formData.maxDiscountAmount}
                      onChange={handleInputChange}
                      min={MIN_MAX_DISCOUNT_AMOUNT}
                      step={MIN_MAX_DISCOUNT_AMOUNT}
                      placeholder="Ví dụ: 50000"
                      className="w-full p-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal rounded-none font-sans"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                  <label className="block font-semibold uppercase text-brand-muted text-[9.5px] tracking-wider">Đơn hàng tối thiểu (VND) *</label>
                  <input
                    type="number"
                    name="minimumOrderAmount"
                    value={formData.minimumOrderAmount}
                    onChange={handleInputChange}
                    min="0"
                    step="1000"
                    required
                    placeholder="Ví dụ: 500000"
                    className="w-full p-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal rounded-none font-sans"
                  />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold uppercase text-brand-muted text-[9.5px] tracking-wider">Ngày hết hạn *</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  min={getTodayDateInputValue()}
                  required
                  className="w-full p-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal rounded-none font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-semibold uppercase text-brand-muted text-[9.5px] tracking-wider">Tổng lượt dùng tối đa *</label>
                  <input
                    type="number"
                    name="maxUsage"
                    value={formData.maxUsage}
                    onChange={handleInputChange}
                    min={MIN_COUPON_USAGE}
                    step="1"
                    required
                    placeholder="100"
                    className="w-full p-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal rounded-none font-sans"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold uppercase text-brand-muted text-[9.5px] tracking-wider">Lượt dùng / khách *</label>
                  <input
                    type="number"
                    name="maxUsagePerUser"
                    value={formData.maxUsagePerUser}
                    onChange={handleInputChange}
                    min={MIN_COUPON_USAGE}
                    step="1"
                    required
                    placeholder="1"
                    className="w-full p-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal rounded-none font-sans"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 font-semibold hover:bg-gray-50 text-[10px] tracking-widest uppercase rounded-none transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-charcoal hover:bg-brand-dark text-white font-semibold text-[10px] tracking-widest uppercase rounded-none transition-colors cursor-pointer"
                >
                  Tạo coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />

    </div>
  )
}
