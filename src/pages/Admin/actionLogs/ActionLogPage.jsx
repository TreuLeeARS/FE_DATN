import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import actionLogApi from '@/api/actionLogs/actionLogApi.js'
import { ActionBadge } from './components/ActionBadge.jsx'
import { ActionLogFilters } from './components/ActionLogFilters.jsx'
import { ActionLogDetail } from './components/ActionLogDetail.jsx'
import { getStatusLabel, getTargetDisplayName, getTargetLabel, unwrapListResponse } from './actionLogUtils.js'

const defaults = { keyword: '', action: '', module: '', status: '', fromDate: '', toDate: '' }
// Các lựa chọn số nhật ký hiển thị mỗi trang.
const ACTION_LOG_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
// Số nhật ký mặc định hiển thị mỗi trang.
const DEFAULT_ACTION_LOGS_PER_PAGE = 20

export const ActionLogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState(() => Object.fromEntries(Object.keys(defaults).map((key) => [key, searchParams.get(key) || ''])))
  const [debouncedKeyword, setDebouncedKeyword] = useState(filters.keyword)
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1))
  const [limit, setLimit] = useState(() => ACTION_LOG_PAGE_SIZE_OPTIONS.includes(Number(searchParams.get('limit'))) ? Number(searchParams.get('limit')) : DEFAULT_ACTION_LOGS_PER_PAGE)
  const [result, setResult] = useState({ items: [], pagination: { page: 1, totalItems: 0, totalPages: 1 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(filters.keyword.trim()), 450)
    return () => clearTimeout(timer)
  }, [filters.keyword])

  const apiFilters = useMemo(() => ({ ...filters, keyword: debouncedKeyword }), [filters, debouncedKeyword])

  const loadLogs = useCallback((signal) => {
    setLoading(true)
    setError(null)
    // UI dùng trang 1-based, còn Spring Pageable của backend dùng trang 0-based.
    const params = {
      page: page - 1,
      size: limit,
      sort: 'createdAt,desc',
      keyword: apiFilters.keyword,
      actionType: apiFilters.action,
      module: apiFilters.module,
      status: apiFilters.status,
      from: apiFilters.fromDate ? `${apiFilters.fromDate}T00:00:00` : '',
      to: apiFilters.toDate ? `${apiFilters.toDate}T23:59:59` : '',
    }
    Object.keys(params).forEach((key) => (params[key] === '' || params[key] == null) && delete params[key])
    return actionLogApi.getActionLogs(params, signal)
      .then((response) => setResult(unwrapListResponse(response, page, limit)))
      .catch((requestError) => {
        if (requestError?.name !== 'CanceledError' && requestError?.code !== 'ERR_CANCELED') setError(requestError)
      })
      .finally(() => { if (!signal?.aborted) setLoading(false) })
  }, [apiFilters, page, limit])

  useEffect(() => {
    const controller = new AbortController()
    loadLogs(controller.signal)
    return () => controller.abort()
  }, [loadLogs])

  useEffect(() => {
    const params = {}
    Object.entries({ ...apiFilters, page, limit }).forEach(([key, value]) => {
      if (value !== '' && value != null && !(key === 'page' && value === 1) && !(key === 'limit' && value === DEFAULT_ACTION_LOGS_PER_PAGE)) params[key] = String(value)
    })
    setSearchParams(params, { replace: true })
  }, [apiFilters, page, limit, setSearchParams])

  const updateFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1) }
  const reset = () => { setFilters(defaults); setDebouncedKeyword(''); setPage(1); setLimit(DEFAULT_ACTION_LOGS_PER_PAGE) }
  const hasFilters = Object.values(apiFilters).some(Boolean)

  return <div className="space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <p className="text-xs text-brand-muted">Theo dõi ai đã làm gì, với đối tượng nào và kết quả thực hiện.</p>
      <div className="text-xs text-brand-muted"><span className="font-bold text-brand-charcoal">{result.pagination.totalItems}</span> bản ghi</div>
    </div>
    <ActionLogFilters filters={filters} onChange={updateFilter} onReset={reset} />
    {error ? <div className="bg-white border border-red-200 rounded-2xl p-10 text-center">
      <p className="font-semibold text-red-600">Không thể tải danh sách Action Log.</p>
      <p className="text-xs text-brand-muted mt-2">Vui lòng kiểm tra endpoint hoặc quyền truy cập API.</p>
      <button onClick={() => loadLogs()} className="mt-4 px-5 py-2.5 bg-brand-charcoal text-white text-xs rounded-xl">Thử lại</button>
    </div> : <div className="bg-white border border-black/5 shadow-sm rounded-2xl overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left">
        <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-brand-muted"><tr><th className="p-4">Thời gian</th><th className="p-4">Người thực hiện</th><th className="p-4">Việc đã làm</th><th className="p-4">Đối tượng tác động</th><th className="p-4">Kết quả</th><th className="p-4 text-right">Chi tiết</th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? Array.from({ length: 6 }, (_, index) => <tr key={index} className="animate-pulse">{Array.from({ length: 6 }, (__, cell) => <td key={cell} className="p-4"><div className="h-4 bg-gray-100 rounded" /></td>)}</tr>) : result.items.length === 0 ? <tr><td colSpan="6" className="p-16 text-center"><div className="text-3xl mb-3">⌕</div><p className="font-semibold">{hasFilters ? 'Không có kết quả phù hợp' : 'Chưa có nhật ký thao tác'}</p><p className="text-xs text-brand-muted mt-1">{hasFilters ? 'Hãy thử thay đổi hoặc đặt lại bộ lọc.' : 'Các thao tác sẽ xuất hiện khi hệ thống có dữ liệu.'}</p></td></tr> : result.items.map((log, index) => <tr key={log.id ?? index} className="hover:bg-gray-50/60 align-middle">
            <td className="p-4 text-xs whitespace-nowrap">{log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—'}</td>
            <td className="p-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-brand-blush/30 flex items-center justify-center font-bold text-xs">{(log.username || '?').charAt(0).toUpperCase()}</div><span className="text-xs font-semibold">{log.username || 'Không xác định'}</span></div></td>
            <td className="p-4 max-w-xs"><ActionBadge action={log.action} />{log.description && <p className="mt-1 line-clamp-2 text-xs text-brand-muted" title={log.description}>{log.description}</p>}</td>
            <td className="p-4 max-w-xs"><p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">{getTargetLabel(log.targetType)}</p><p className="mt-1 truncate text-xs font-semibold text-brand-charcoal" title={getTargetDisplayName(log)}>{getTargetDisplayName(log)}</p>{log.targetDescription && log.entityName && <p className="mt-1 line-clamp-1 text-[10px] text-brand-muted" title={log.targetDescription}>{log.targetDescription}</p>}</td>
            <td className="p-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${log.status === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{getStatusLabel(log.status)}</span>{log.status === 'FAILED' && log.errorMessage && <p className="mt-1 max-w-40 truncate text-[10px] text-red-600" title={log.errorMessage}>{log.errorMessage}</p>}</td>
            <td className="p-4 text-right"><button onClick={() => setSelectedLog(log)} className="text-xs font-semibold text-blue-700 hover:underline">Xem</button></td>
          </tr>)}
        </tbody>
      </table></div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t bg-gray-50/50"><div className="flex items-center gap-2 text-xs text-brand-muted"><span>Hiển thị</span><select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }} className="border rounded-lg px-2 py-1.5 bg-white">{ACTION_LOG_PAGE_SIZE_OPTIONS.map((value) => <option key={value}>{value}</option>)}</select><span>bản ghi/trang</span></div><div className="flex items-center gap-3"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="px-3 py-2 border rounded-lg text-xs disabled:opacity-40">Trước</button><span className="text-xs font-semibold">Trang {page} / {Math.max(1, result.pagination.totalPages)}</span><button disabled={page >= result.pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="px-3 py-2 border rounded-lg text-xs disabled:opacity-40">Sau</button></div></div>
    </div>}
    {selectedLog && <ActionLogDetail log={selectedLog} loading={false} error={null} onClose={() => setSelectedLog(null)} />}
  </div>
}
