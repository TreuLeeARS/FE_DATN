import { formatValue, getChangedFields, maskSensitiveData } from '../actionLogUtils.js'

const Value = ({ value, changed }) => <pre className={`max-w-md whitespace-pre-wrap break-all rounded-lg p-3 text-xs font-mono ${changed ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200' : 'bg-gray-50 text-gray-700'}`}>{formatValue(value)}</pre>

export const DataDiffViewer = ({ oldData, newData, action }) => {
  const changes = getChangedFields(oldData, newData)
  if (action === 'UPDATE' || changes.length) return <div className="space-y-3"><div className="flex items-center justify-between"><h4 className="font-bold text-sm">Các trường thay đổi</h4><span className="text-xs text-brand-muted">{changes.length} trường</span></div>{changes.length ? <div className="overflow-x-auto border border-gray-200 rounded-xl"><table className="w-full text-left"><thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-brand-muted"><tr><th className="p-3">Trường</th><th className="p-3">Giá trị cũ</th><th className="p-3">Giá trị mới</th></tr></thead><tbody className="divide-y divide-gray-100">{changes.map((change) => <tr key={change.field} className="align-top"><td className="p-3 font-semibold text-xs">{change.field}</td><td className="p-3"><Value value={change.oldValue} changed /></td><td className="p-3"><Value value={change.newValue} changed /></td></tr>)}</tbody></table></div> : <p className="text-sm text-brand-muted bg-gray-50 p-4 rounded-xl">Không phát hiện trường dữ liệu nào thay đổi.</p>}</div>
  return <div className="grid md:grid-cols-2 gap-4"><div><h4 className="font-bold text-sm mb-2">Dữ liệu trước</h4><Value value={maskSensitiveData(oldData)} /></div><div><h4 className="font-bold text-sm mb-2">Dữ liệu sau</h4><Value value={maskSensitiveData(newData)} /></div></div>
}
