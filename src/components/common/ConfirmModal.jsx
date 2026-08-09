import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export const ConfirmModal = ({ 
  isOpen, 
  title = 'Xác nhận hành động', 
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?', 
  confirmText = 'Xác nhận', 
  cancelText = 'Hủy', 
  onConfirm, 
  onCancel,
  isDestructive = false 
}) => {
  
  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-charcoal/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-md bg-white border border-gray-100 shadow-2xl p-6 md:p-8 relative text-left animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon or Decorative Header */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-brand-cream text-brand-charcoal'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="font-display text-base font-bold uppercase tracking-wider text-brand-charcoal">
            {title}
          </h3>
        </div>

        {/* Message */}
        <p className="text-sm text-brand-muted leading-relaxed mb-6">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-200 text-brand-charcoal text-xs font-bold uppercase tracking-wider hover:bg-brand-cream transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
            }}
            className={`px-5 py-2 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-brand-charcoal hover:bg-brand-dark'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
