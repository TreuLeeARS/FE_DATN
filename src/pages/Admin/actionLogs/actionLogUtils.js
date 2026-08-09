const SENSITIVE_PATTERN = /password|passcode|access.?token|refresh.?token|authorization|secret|otp|pin/i

const ACTION_LABELS = {
  CREATE_CATEGORY: 'Tạo danh mục', UPDATE_CATEGORY: 'Cập nhật danh mục', DELETE_CATEGORY: 'Xóa danh mục', RESTORE_CATEGORY: 'Khôi phục danh mục',
  CREATE_PRODUCT: 'Tạo sản phẩm', UPDATE_PRODUCT: 'Cập nhật sản phẩm', DELETE_PRODUCT: 'Xóa sản phẩm', RESTORE_PRODUCT: 'Khôi phục sản phẩm',
  CREATE_PRODUCT_VARIANT: 'Tạo biến thể sản phẩm', UPDATE_PRODUCT_VARIANT: 'Cập nhật biến thể sản phẩm', DELETE_PRODUCT_VARIANT: 'Xóa biến thể sản phẩm',
  ADD_PRODUCT_IMAGE: 'Thêm ảnh sản phẩm', UPDATE_PRODUCT_IMAGE: 'Cập nhật ảnh sản phẩm', DELETE_PRODUCT_IMAGE: 'Xóa ảnh sản phẩm',
  UPDATE_PROFILE: 'Cập nhật hồ sơ cá nhân', UPDATE_USER: 'Cập nhật người dùng', DEACTIVATE_USER: 'Vô hiệu hóa người dùng',
  ASSIGN_ADMIN_ROLE: 'Gán quyền quản trị', ASSIGN_STAFF_ROLE: 'Gán quyền nhân viên', ASSIGN_USER_ROLE: 'Gán quyền khách hàng',
  CREATE_COUPON: 'Tạo mã giảm giá', DELETE_COUPON: 'Xóa mã giảm giá', RESTORE_COUPON: 'Khôi phục mã giảm giá',
  CREATE_PAYMENT: 'Tạo thanh toán', CONFIRM_PAYMENT: 'Xác nhận thanh toán', RETRY_PAYMENT: 'Thử lại thanh toán', PAYMENT_CALLBACK: 'Nhận kết quả thanh toán',
  CREATE_PAYMENT_METHOD: 'Tạo phương thức thanh toán', UPDATE_PAYMENT_METHOD: 'Cập nhật phương thức thanh toán', DELETE_PAYMENT_METHOD: 'Xóa phương thức thanh toán',
  CREATE_COUPON_NOTIFICATION: 'Tạo popup ưu đãi', UPDATE_COUPON_NOTIFICATION: 'Cập nhật popup ưu đãi', DELETE_COUPON_NOTIFICATION: 'Xóa popup ưu đãi',
  REGISTER_USER: 'Đăng ký tài khoản', ACTIVATE_USER: 'Kích hoạt tài khoản', LOGOUT: 'Đăng xuất', RESET_PASSWORD: 'Đặt lại mật khẩu',
  CONFIRM_ORDER: 'Xác nhận đơn hàng', CANCEL_ORDER: 'Hủy đơn hàng', SHIPPING_ORDER: 'Chuyển đơn sang giao hàng',
  CREATE_ORDER: 'Tạo đơn hàng', UPDATE_ORDER: 'Cập nhật đơn hàng', DELETE_ORDER: 'Xóa đơn hàng', DELIVERED_ORDER: 'Xác nhận đã giao hàng',
}

const TARGET_LABELS = {
  PRODUCT: 'Sản phẩm', PRODUCT_VARIANT: 'Biến thể sản phẩm', PRODUCT_IMAGE: 'Ảnh sản phẩm', CATEGORY: 'Danh mục',
  ORDER: 'Đơn hàng', USER: 'Người dùng', COUPON: 'Mã giảm giá', PAYMENT: 'Thanh toán', PAYMENT_METHOD: 'Phương thức thanh toán',
  COUPON_NOTIFICATION: 'Popup ưu đãi', PROFILE: 'Hồ sơ cá nhân',
}

const FIELD_LABELS = {
  name: 'Tên', productName: 'Tên sản phẩm', categoryName: 'Tên danh mục', description: 'Mô tả', basePrice: 'Giá niêm yết', baseprice: 'Giá niêm yết',
  price: 'Giá', unitPrice: 'Đơn giá', totalAmount: 'Tổng tiền', subtotalAmount: 'Tạm tính', discountAmount: 'Giảm giá', shippingFee: 'Phí vận chuyển',
  quantity: 'Số lượng', quantityInStock: 'Tồn kho', stock: 'Tồn kho', color: 'Màu sắc', size: 'Kích cỡ', sku: 'Mã SKU',
  status: 'Trạng thái', email: 'Email', phone: 'Số điện thoại', firstName: 'Tên', lastName: 'Họ', username: 'Tên đăng nhập',
  addressLine: 'Địa chỉ chi tiết', ward: 'Phường/Xã', district: 'Quận/Huyện', province: 'Tỉnh/Thành phố', code: 'Mã', active: 'Trạng thái kích hoạt',
}

const parseData = (value) => {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return value }
}

export const getActionLabel = (action) => ACTION_LABELS[action] || String(action || 'UNKNOWN').replaceAll('_', ' ')
export const getTargetLabel = (targetType) => TARGET_LABELS[targetType] || String(targetType || 'Đối tượng').replaceAll('_', ' ')
export const getFieldLabel = (field) => FIELD_LABELS[field] || String(field || '').replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
export const getStatusLabel = (status) => status === 'FAILED' ? 'Không thành công' : 'Thành công'

const inferTargetType = (action = '') => {
  const actionCode = String(action)
  if (actionCode.includes('PRODUCT_VARIANT')) return 'PRODUCT_VARIANT'
  if (actionCode.includes('PRODUCT_IMAGE')) return 'PRODUCT_IMAGE'
  if (actionCode.includes('PRODUCT')) return 'PRODUCT'
  if (actionCode.includes('CATEGORY')) return 'CATEGORY'
  if (actionCode.includes('COUPON_NOTIFICATION')) return 'COUPON_NOTIFICATION'
  if (actionCode.includes('COUPON')) return 'COUPON'
  if (actionCode.includes('PAYMENT_METHOD')) return 'PAYMENT_METHOD'
  if (actionCode.includes('PAYMENT')) return 'PAYMENT'
  if (actionCode.includes('ORDER')) return 'ORDER'
  if (actionCode.includes('USER') || actionCode.includes('PROFILE') || actionCode === 'LOGOUT' || actionCode === 'RESET_PASSWORD') return 'USER'
  return null
}

const getNameFromSnapshot = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  return data.name ?? data.productName ?? data.categoryName ?? data.title ?? data.code ?? null
}

const isGenericEntityName = (value) => /^(Sản phẩm|Biến thể sản phẩm|Biến thể|Danh mục|Mã giảm giá|Đơn hàng|Người dùng)\s*#\d+$/i.test(String(value || '').trim())

export const getTargetDisplayName = (log = {}) => {
  const snapshotName = getNameFromSnapshot(log.beforeData) || getNameFromSnapshot(log.afterData)
  if (log.entityName && !isGenericEntityName(log.entityName)) return log.entityName
  if (snapshotName) return snapshotName
  if (log.entityName) return log.entityName
  if (log.targetDescription) return log.targetDescription
  if (log.targetId) return `${getTargetLabel(log.targetType)} #${log.targetId}`
  if (log.targetType === 'USER' && log.username) return `Tài khoản ${log.username}`
  return 'Chi tiết đối tượng không được lưu'
}

export const maskSensitiveData = (value, seen = new WeakSet()) => {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return '[Circular]'
  seen.add(value)
  if (Array.isArray(value)) return value.map((item) => maskSensitiveData(item, seen))
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SENSITIVE_PATTERN.test(key) ? '••••••••' : maskSensitiveData(item, seen)]))
}

export const getChangedFields = (oldData, newData) => {
  const before = oldData && typeof oldData === 'object' && !Array.isArray(oldData) ? oldData : {}
  const after = newData && typeof newData === 'object' && !Array.isArray(newData) ? newData : {}
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({ field: key, oldValue: maskSensitiveData({ [key]: before[key] })[key], newValue: maskSensitiveData({ [key]: after[key] })[key] }))
}

export const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const inferModule = (actionType = '') => {
  const entity = String(actionType).split('_').at(-1)
  return TARGET_LABELS[entity] || entity || 'Hệ thống'
}

const inferTargetId = (description = '') => String(description).match(/(?:#|ID\s*[:=]?\s*)(\d+)/i)?.[1] || null

export const normalizeActionLog = (log = {}) => {
  const action = log.action ?? log.actionType ?? log.action_type ?? 'UNKNOWN'
  const username = log.username ?? log.actor?.username ?? log.actor?.name ?? null
  return {
    ...log,
    id: log.id ?? log.actionLogId ?? log.action_log_id,
    action,
    createdAt: log.createdAt ?? log.created_at ?? null,
    description: log.description ?? '',
    username,
    actor: log.actor ?? (username ? { username } : null),
    module: log.module ?? inferModule(action),
    targetType: log.targetType ?? log.entityType ?? log.target_type ?? inferTargetType(action),
    targetId: log.targetId ?? log.entityId ?? log.target_id ?? inferTargetId(log.description),
    entityName: log.entityName ?? log.entity_name ?? null,
    targetDescription: log.targetDescription ?? log.target_description ?? null,
    beforeData: parseData(log.beforeData ?? log.before_data ?? null),
    afterData: parseData(log.afterData ?? log.after_data ?? null),
    status: log.status ?? 'SUCCESS',
    errorMessage: log.errorMessage ?? log.error_message ?? null,
    durationMs: log.durationMs ?? log.duration_ms ?? null,
    httpMethod: log.httpMethod ?? log.http_method ?? null,
    endpoint: log.endpoint ?? null,
    ipAddress: log.ipAddress ?? log.ip_address ?? null,
    userAgent: log.userAgent ?? log.user_agent ?? null,
    requestId: log.requestId ?? log.request_id ?? null,
  }
}

export const unwrapListResponse = (response, fallbackPage, fallbackLimit) => {
  const root = response?.data ?? response ?? {}
  const nested = root?.data && !Array.isArray(root.data) ? root.data : root
  const items = Array.isArray(root) ? root : (root.content ?? root.items ?? nested.content ?? nested.items ?? nested.data ?? (Array.isArray(root.data) ? root.data : []))
  const meta = root.pagination ?? root.page ?? nested.pagination ?? nested.page ?? root
  const pageValue = Number(meta.page ?? meta.number ?? fallbackPage)
  const totalItems = Number(meta.totalItems ?? meta.totalElements ?? nested.totalItems ?? nested.totalElements ?? items.length)
  const totalPages = Number(meta.totalPages ?? nested.totalPages ?? Math.max(1, Math.ceil(totalItems / fallbackLimit)))
  return { items: items.map(normalizeActionLog), pagination: { page: Number.isFinite(pageValue) ? pageValue : fallbackPage, totalItems, totalPages } }
}

export const unwrapDetailResponse = (response) => normalizeActionLog(response?.data?.data ?? response?.data ?? response)
