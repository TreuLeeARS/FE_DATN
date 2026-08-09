import { getActionLabel } from '../actionLogUtils.js'

const colors = { CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200', UPDATE: 'bg-blue-50 text-blue-700 border-blue-200', DELETE: 'bg-red-50 text-red-700 border-red-200', LOGIN: 'bg-violet-50 text-violet-700 border-violet-200', LOGOUT: 'bg-gray-100 text-gray-600 border-gray-200', CHANGE_STATUS: 'bg-amber-50 text-amber-700 border-amber-200', APPROVE: 'bg-emerald-50 text-emerald-700 border-emerald-200', REJECT: 'bg-red-50 text-red-700 border-red-200' }

export const ActionBadge = ({ action }) => {
  const actionCode = action || 'UNKNOWN'
  const family = Object.keys(colors).find((key) => actionCode === key || actionCode.startsWith(`${key}_`) || actionCode.startsWith(`${key.replace('CHANGE_STATUS', 'CHANGE')}_`))
  return <span title={actionCode} className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide ${colors[family] || (actionCode.includes('DELIVERED') ? colors.APPROVE : actionCode.includes('SHIPPING') ? colors.UPDATE : 'bg-gray-100 text-gray-600 border-gray-200')}`}>{getActionLabel(actionCode)}</span>
}
