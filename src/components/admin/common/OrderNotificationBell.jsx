import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrderNotifications } from '@/hooks/shared/useOrderNotifications.js'

const toneClass = {
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
}

export const OrderNotificationBell = () => {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const navigate = useNavigate()
  const { notifications, readIds, unreadCount, loading, error, refresh, markRead, markAllRead } = useOrderNotifications()

  useEffect(() => {
    const close = (event) => panelRef.current && !panelRef.current.contains(event.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const openOrder = (item) => {
    markRead(item.id)
    setOpen(false)
    navigate(`/admin/orders?orderId=${encodeURIComponent(item.orderId)}`)
  }

  return <div className="relative" ref={panelRef}>
    <button type="button" onClick={() => setOpen((value) => !value)} className="relative w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center" aria-label={`Thông báo vận hành, ${unreadCount} chưa đọc`}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0h6z" /></svg>
      {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <div className="absolute right-0 top-12 z-50 w-[min(92vw,390px)] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b"><div><h3 className="text-sm font-bold">Thông báo đơn hàng</h3><p className="text-[10px] text-brand-muted mt-0.5">Đơn mới và đơn bị hủy</p></div><button onClick={markAllRead} disabled={!unreadCount} className="text-[10px] font-semibold text-blue-700 disabled:opacity-40">Đánh dấu đã đọc</button></div>
      <div className="max-h-[420px] overflow-y-auto">
        {loading && notifications.length === 0 ? <div className="p-8 text-center text-xs text-brand-muted">Đang tải thông báo...</div> : error && notifications.length === 0 ? <div className="p-8 text-center"><p className="text-xs text-red-600">Không tải được thông báo.</p><button onClick={refresh} className="text-xs text-blue-700 mt-2">Thử lại</button></div> : notifications.length === 0 ? <div className="p-10 text-center"><p className="text-sm font-semibold">Chưa có thông báo</p><p className="text-xs text-brand-muted mt-1">Thông báo đơn hàng mới sẽ xuất hiện tại đây.</p></div> : notifications.map((item) => {
          const unread = !readIds.includes(item.id)
          return <button key={item.id} onClick={() => openOrder(item)} className={`w-full text-left p-4 border-b last:border-0 hover:bg-gray-50 flex gap-3 ${unread ? 'bg-blue-50/40' : ''}`}><div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${toneClass[item.tone]}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 4h13m-9 4a1 1 0 110-2 1 1 0 010 2zm8 0a1 1 0 110-2 1 1 0 010 2z" /></svg></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-xs font-bold">{item.title}</p>{unread && <span className="w-2 h-2 mt-1 rounded-full bg-blue-600 shrink-0" />}</div><p className="text-[11px] text-brand-muted mt-1 leading-relaxed">{item.message}</p><p className="text-[10px] text-brand-muted/70 mt-1.5">{new Date(item.createdAt).toLocaleString('vi-VN')}</p></div></button>
        })}
      </div>
      <button onClick={() => { setOpen(false); navigate('/admin/orders') }} className="w-full p-3 border-t text-xs font-semibold hover:bg-gray-50">Mở quản lý đơn hàng</button>
    </div>}
  </div>
}
