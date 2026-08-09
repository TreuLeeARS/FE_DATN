import { createPortal } from 'react-dom'
import { ActionBadge } from './ActionBadge.jsx'
import { formatValue, getActionLabel, getChangedFields, getFieldLabel, getStatusLabel, getTargetDisplayName, getTargetLabel, maskSensitiveData } from '../actionLogUtils.js'

const Detail = ({ label, children }) => <div><dt className="mb-1 text-[10px] font-bold uppercase tracking-wider text-brand-muted">{label}</dt><dd className="text-sm break-words text-brand-charcoal">{children ?? '—'}</dd></div>

const Snapshot = ({ title, data }) => {
  const safeData = maskSensitiveData(data)
  const entries = safeData && typeof safeData === 'object' && !Array.isArray(safeData) ? Object.entries(safeData) : []
  if (!entries.length) return null
  return <section><h4 className="mb-3 text-sm font-bold text-brand-charcoal">{title}</h4><dl className="grid gap-x-5 gap-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:grid-cols-2">{entries.map(([field, value]) => <div key={field}><dt className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">{getFieldLabel(field)}</dt><dd className="mt-1 break-words text-xs text-brand-charcoal">{formatValue(value)}</dd></div>)}</dl></section>
}

export const ActionLogDetail = ({ log, loading, error, onClose, onRetry }) => createPortal(
  <div className="fixed inset-0 z-[100] flex justify-end bg-brand-charcoal/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Chi tiết nhật ký thao tác" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 p-5 backdrop-blur md:p-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-muted">Nhật ký thao tác</p><h3 className="mt-1 text-xl font-display font-semibold">Chi tiết thao tác</h3></div><button onClick={onClose} className="h-10 w-10 rounded-full text-xl hover:bg-gray-100" aria-label="Đóng">×</button></header>
      <div className="space-y-7 p-5 md:p-7">
        {loading ? <div className="space-y-3 animate-pulse">{[1, 2, 3, 4].map((item) => <div key={item} className="h-16 rounded-xl bg-gray-100" />)}</div> : error ? <div className="py-16 text-center"><p className="font-semibold text-red-600">Không thể tải chi tiết nhật ký.</p><button onClick={onRetry} className="mt-4 rounded-lg bg-brand-charcoal px-4 py-2 text-xs text-white">Thử lại</button></div> : log ? (() => {
          const changedFields = getChangedFields(log.beforeData, log.afterData)
          const isCreateAction = String(log.action).startsWith('CREATE_') || log.action === 'REGISTER_USER'
          const isDeleteAction = String(log.action).startsWith('DELETE_') || String(log.action).startsWith('DEACTIVATE_')
          const hasTechnicalInfo = log.endpoint || log.httpMethod || log.ipAddress || log.requestId || log.userAgent || log.module

          return <>
            <section className={`rounded-2xl border p-5 ${log.status === 'FAILED' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="min-w-0"><p className="text-sm font-bold text-brand-charcoal">{log.username || 'Người dùng không xác định'} đã {getActionLabel(log.action).toLocaleLowerCase('vi-VN')}</p><p className="mt-1 text-xs text-brand-muted">{getTargetDisplayName(log)}</p></div><span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold ${log.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{getStatusLabel(log.status)}</span></div>
              {log.status === 'FAILED' && log.errorMessage && <p className="mt-3 border-t border-red-200 pt-3 text-xs text-red-700">Lý do: {log.errorMessage}</p>}
            </section>

            <section><h4 className="mb-3 text-sm font-bold text-brand-charcoal">Thông tin thao tác</h4><dl className="grid gap-5 rounded-2xl bg-gray-50 p-5 sm:grid-cols-2"><Detail label="Người thực hiện">{log.username || 'Không xác định'}</Detail><Detail label="Thời gian">{log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : null}</Detail><Detail label="Việc đã làm"><ActionBadge action={log.action} /></Detail><Detail label="Thời gian xử lý">{log.durationMs != null ? `${log.durationMs} mili giây` : 'Không có dữ liệu'}</Detail></dl></section>

            <section><h4 className="mb-3 text-sm font-bold text-brand-charcoal">Đối tượng tác động</h4><dl className="grid gap-5 rounded-2xl border border-gray-100 p-5 sm:grid-cols-2"><Detail label="Loại đối tượng">{getTargetLabel(log.targetType)}</Detail><Detail label="Tên đối tượng">{getTargetDisplayName(log)}</Detail>{log.targetDescription && <div className="sm:col-span-2"><Detail label="Thông tin nhận diện">{log.targetDescription}</Detail></div>}{log.targetId && <div className="sm:col-span-2"><Detail label="Mã nội bộ">#{log.targetId}</Detail></div>}</dl></section>

            {changedFields.length > 0 && <section><h4 className="mb-3 text-sm font-bold text-brand-charcoal">Nội dung thay đổi</h4><div className="overflow-hidden rounded-xl border border-gray-100"><div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-brand-muted"><p className="p-3">Thông tin</p><p className="border-l border-gray-100 p-3">Trước đó</p><p className="border-l border-gray-100 p-3">Sau khi thay đổi</p></div>{changedFields.map((change) => <div key={change.field} className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] text-xs"><p className="break-words p-3 font-semibold text-brand-charcoal">{getFieldLabel(change.field)}</p><p className="break-words border-l border-t border-gray-100 p-3 text-brand-muted">{formatValue(change.oldValue)}</p><p className="break-words border-l border-t border-gray-100 p-3 text-brand-charcoal">{formatValue(change.newValue)}</p></div>)}</div></section>}
            {!changedFields.length && isCreateAction && <Snapshot title="Thông tin đã thêm" data={log.afterData || log.beforeData} />}
            {!changedFields.length && isDeleteAction && <Snapshot title="Thông tin trước khi xóa" data={log.beforeData || log.afterData} />}
            {!changedFields.length && !isCreateAction && !isDeleteAction && <section className="rounded-xl border border-dashed border-gray-200 p-4 text-xs text-brand-muted">Hệ thống chưa lưu dữ liệu trước và sau cho thao tác này.</section>}

            {hasTechnicalInfo && <details className="rounded-xl border border-gray-100 p-4"><summary className="cursor-pointer text-xs font-semibold text-brand-muted">Thông tin kỹ thuật</summary><dl className="mt-4 grid gap-4 text-xs sm:grid-cols-2"><Detail label="Khu vực hệ thống">{log.module}</Detail><Detail label="Yêu cầu">{[log.httpMethod, log.endpoint].filter(Boolean).join(' ')}</Detail><Detail label="Địa chỉ IP">{log.ipAddress}</Detail><Detail label="Mã yêu cầu">{log.requestId}</Detail>{log.userAgent && <div className="sm:col-span-2"><Detail label="Thiết bị/trình duyệt">{log.userAgent}</Detail></div>}</dl></details>}
          </>
        })() : null}
      </div>
    </aside>
  </div>, document.body,
)
