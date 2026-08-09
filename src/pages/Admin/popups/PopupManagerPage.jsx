import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import popupApi from '@/api/popups/popupApi.js'
import { ConfirmModal } from '@/components/common/ConfirmModal.jsx'

// Số ký tự tối đa cho nhãn phụ popup.
const MAX_POPUP_HEADER_LENGTH = 100
// Số ký tự tối đa cho tiêu đề popup.
const MAX_POPUP_TITLE_LENGTH = 150
// Số ký tự tối đa cho nội dung popup.
const MAX_POPUP_DESCRIPTION_LENGTH = 500
// Số ký tự tối đa cho mã khuyến mãi popup.
const MAX_POPUP_PROMOTION_CODE_LENGTH = 50

export const PopupManager = () => {
  const [popups, setPopups] = useState([])
  const [loading, setLoading] = useState(true)

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

  // Modal Create/Edit State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPopup, setEditingPopup] = useState(null) // null if creating
  const [formData, setFormData] = useState({
    header: '',
    title: '',
    description: '',
    promotionCode: ''
  })

  // Fetch Popups
  const fetchPopups = async () => {
    try {
      setLoading(true)
      const res = await popupApi.getPopups()
      if (res && res.data) {
        const responsePayload = res.data?.data ?? res.data
        const popupList = Array.isArray(responsePayload)
          ? responsePayload
          : responsePayload?.content || []
        setPopups(popupList)
      }
    } catch (err) {
      console.error('Error fetching popups:', err)
      toast.error('Không thể tải danh sách thông báo popup từ máy chủ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPopups()
  }, [])

  // Input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target
    const normalizedValue = name === 'header' || name === 'promotionCode'
      ? value.toLocaleUpperCase('vi-VN')
      : value
    setFormData(prev => ({ ...prev, [name]: normalizedValue }))
  }

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPopup(null)
    setFormData({
      header: '',
      title: '',
      description: '',
      promotionCode: ''
    })
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (popup) => {
    setEditingPopup(popup)
    setFormData({
      header: (popup.header || '').toLocaleUpperCase('vi-VN'),
      title: popup.title || '',
      description: popup.description || '',
      promotionCode: (popup.promotionCode || '').toLocaleUpperCase('vi-VN')
    })
    setIsModalOpen(true)
  }

  // Submit Handler (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.header.trim() || !formData.title.trim() || !formData.description.trim() || !formData.promotionCode.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin và mã giảm giá.')
      return
    }

    const payload = {
      header: formData.header.trim().toLocaleUpperCase('vi-VN'),
      title: formData.title.trim(),
      description: formData.description.trim(),
      promotionCode: formData.promotionCode.trim().toLocaleUpperCase('vi-VN')
    }

    try {
      if (editingPopup) {
        // Update popup
        await popupApi.updatePopup(editingPopup.id, payload)
        toast.success('Cập nhật thông tin popup thành công!')
      } else {
        // Create popup
        await popupApi.createPopup(payload)
        toast.success('Tạo popup gợi ý mới thành công!')
      }
      setIsModalOpen(false)
      fetchPopups()
    } catch (err) {
      console.error('Error saving popup:', err)
      toast.error(editingPopup ? 'Không thể cập nhật popup.' : 'Không thể tạo mới popup.')
    }
  }

  // Delete Handler
  const handleDelete = (id, title) => {
    openConfirm(
      'Xóa thông báo popup',
      `Bạn có chắc chắn muốn xóa thông báo popup "${title}"? Thao tác này không thể hoàn tác.`,
      async () => {
        try {
          await popupApi.deletePopup(id)
          toast.success('Xóa thông báo popup thành công!')
          fetchPopups()
        } catch (err) {
          console.error('Error deleting popup:', err)
          toast.error('Không thể xóa thông báo popup.')
        }
      },
      true
    )
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-brand-blush bg-brand-blush/10 px-3 py-1 rounded-full">
            Kênh Marketing / Tương tác
          </span>
          <h2 className="font-display text-2xl font-bold text-brand-charcoal mt-2">
            Quản lý Thông báo Popup Coupon
          </h2>
          <p className="text-xs text-brand-muted mt-1">
            Thiết lập và quản lý các thông báo popup gợi ý mã giảm giá hiển thị trên trang chủ để thúc đẩy hành vi mua sắm.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-brand-charcoal text-white text-xs font-semibold px-5 py-3 rounded-xl hover:bg-brand-dark transition-colors flex items-center gap-2 cursor-pointer shadow-sm tracking-wider uppercase active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tạo Popup Gợi Ý
        </button>
      </div>

      {/* Grid of Popup Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-brand-charcoal/10"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-charcoal animate-spin"></div>
          </div>
          <p className="text-xs text-brand-muted font-medium">Đang tải danh sách thông báo popup...</p>
        </div>
      ) : popups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 flex flex-col items-center justify-center text-center px-6">
          <div className="w-14 h-14 bg-brand-cream/40 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.02 6.02 0 00-4.902-5.903m0 0V4a2 2 0 00-4 0v.597C7.49 5.217 6.107 7.107 6.107 9.382V14c0 .417-.16.82-.442 1.105L4.242 16.5h15" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-brand-charcoal">Không có popup gợi ý nào</h3>
          <p className="text-xs text-brand-muted max-w-sm mt-1">
            Hiện tại hệ thống chưa có popup gợi ý mã giảm giá nào được tạo. Hãy tạo mới một popup để bắt đầu thu hút khách hàng.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 bg-brand-cream text-brand-charcoal hover:bg-brand-blush/25 border border-brand-charcoal/10 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            Tạo popup đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popups.map((popup) => (
            <div
              key={popup.id}
              className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow relative group"
            >
              {/* Preview UI of the popup to make it visual */}
              <div className="p-5 bg-brand-cream/15 border-b border-gray-100 relative">
                {/* Visual mock of a popup */}
                <div className="bg-white rounded-xl shadow-md border border-brand-charcoal/5 p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-brand-charcoal"></div>
                  <span className="text-[8px] font-bold text-brand-blush uppercase tracking-widest block mb-1">
                    {popup.header}
                  </span>
                  <h4 className="font-display text-xs font-bold text-brand-charcoal line-clamp-1">
                    {popup.title}
                  </h4>
                  <p className="text-[10px] text-brand-muted mt-1 line-clamp-2 leading-relaxed">
                    {popup.description}
                  </p>
                  {popup.promotionCode && (
                    <div className="mt-2 text-[8px] bg-brand-cream border border-brand-charcoal/10 font-mono font-bold px-2 py-0.5 inline-block text-brand-charcoal uppercase rounded">
                      Code: {popup.promotionCode}
                    </div>
                  )}
                </div>
                <div className="absolute top-2 right-2 text-[8px] bg-brand-charcoal/5 px-2 py-0.5 rounded font-mono text-brand-muted">
                  ID: {popup.id}
                </div>
              </div>

              {/* Contents Info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-semibold text-brand-muted uppercase block">Header Badge</span>
                    <p className="text-xs text-brand-charcoal font-medium mt-0.5">{popup.header}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-brand-muted uppercase block">Tiêu đề chính</span>
                    <p className="text-xs text-brand-charcoal font-medium mt-0.5 line-clamp-1">{popup.title}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-brand-muted uppercase block">Nội dung chi tiết</span>
                    <p className="text-xs text-brand-muted mt-0.5 line-clamp-3 leading-relaxed">{popup.description}</p>
                  </div>
                  {popup.promotionCode && (
                    <div>
                      <span className="text-[10px] font-semibold text-brand-muted uppercase block">Mã giảm giá đi kèm</span>
                      <p className="text-xs text-brand-charcoal font-mono font-bold mt-0.5 text-blue-600 bg-blue-50/50 px-2 py-1 inline-block border border-blue-100 rounded">{popup.promotionCode}</p>
                    </div>
                  )}

                  <div className="text-[9.5px] text-gray-500 font-normal space-y-0.5 select-none pt-2 border-t border-gray-100">
                    <p>Tạo: {popup.createdBy || 'Hệ thống'} ({popup.createdAt ? new Date(popup.createdAt).toLocaleString('vi-VN') : 'Mặc định hệ thống'})</p>
                    <p>Sửa: {popup.lastModifiedBy || 'Hệ thống'} ({popup.updatedAt ? new Date(popup.updatedAt).toLocaleString('vi-VN') : 'Vừa cập nhật'})</p>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex gap-2.5 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenEdit(popup)}
                    className="flex-1 bg-gray-50 hover:bg-brand-cream/30 text-brand-charcoal border border-gray-200 text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(popup.id, popup.title)}
                    className="flex-1 bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/10 text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CREATE / EDIT POPUP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-charcoal/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-brand-charcoal hover:opacity-75 p-2 bg-brand-cream rounded-full z-10 w-9 h-9 flex items-center justify-center font-bold cursor-pointer"
            >
              ✕
            </button>

            {/* Modal Title */}
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-display text-lg font-bold text-brand-charcoal">
                {editingPopup ? 'Cập nhật thông tin Popup' : 'Tạo mới Popup thông báo'}
              </h3>
              <p className="text-xs text-brand-muted mt-1">
                {editingPopup ? 'Chỉnh sửa nội dung hiển thị của popup.' : 'Tạo thông báo, chương trình hoặc ưu đãi để hiển thị trên website.'}
              </p>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Header Badge */}
              <div className="space-y-1.5">
                <label className="block font-semibold uppercase text-brand-muted text-[10px]">
                  Nhãn phụ phía trên *
                </label>
                <input
                  type="text"
                  name="header"
                  value={formData.header}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: ƯU ĐÃI ĐỘC QUYỀN, NEW YEAR SALE"
                  maxLength={MAX_POPUP_HEADER_LENGTH}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-charcoal"
                  required
                />
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="block font-semibold uppercase text-brand-muted text-[10px]">
                  Tiêu đề chính *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Tặng bạn mã giảm giá 15%"
                  maxLength={MAX_POPUP_TITLE_LENGTH}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-charcoal"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block font-semibold uppercase text-brand-muted text-[10px]">
                  Nội dung chi tiết *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Nhập mã OUTTA15 ở bước thanh toán để được giảm 15% cho toàn bộ sản phẩm áo sơ mi."
                  maxLength={MAX_POPUP_DESCRIPTION_LENGTH}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-charcoal resize-none"
                  required
                />
              </div>

              {/* Promotion Code */}
              <div className="space-y-1.5">
                <label className="block font-semibold uppercase text-brand-muted text-[10px]">
                  Mã giảm giá áp dụng *
                </label>
                <input
                  type="text"
                  name="promotionCode"
                  value={formData.promotionCode}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: OUTTA15, COLDWINTER"
                  maxLength={MAX_POPUP_PROMOTION_CODE_LENGTH}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:border-brand-charcoal uppercase"
                  required
                />
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 border border-brand-charcoal/20 text-brand-charcoal py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-charcoal text-white py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-brand-dark transition-colors cursor-pointer shadow-sm"
                >
                  {editingPopup ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  )
}
