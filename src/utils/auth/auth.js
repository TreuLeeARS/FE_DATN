const getRoles = () => {
  const token = localStorage.getItem('accessToken')
  if (!token) return []

  try {
    const parts = token.split('.')
    if (parts.length !== 3) return []

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')))
    const roles = payload.roles || payload.authorities || payload.role || []
    return (Array.isArray(roles) ? roles : [roles])
      .map((role) => typeof role === 'string' ? role : role?.authority || role?.name || '')
      .filter(Boolean)
  } catch {
    return []
  }
}

export const isAdmin = () => getRoles().some((role) => {
  const normalizedRole = role.toUpperCase()
  return normalizedRole.includes('ADMIN') || normalizedRole.includes('STAFF')
})

// Quyền dành riêng cho ADMIN, không bao gồm STAFF.
export const isAdminOnly = () => getRoles().some((role) =>
  role.toUpperCase().includes('ADMIN')
)

export const isStaffOnly = () => {
  const roles = getRoles().map((role) => role.toUpperCase())
  return roles.some((role) => role.includes('STAFF')) &&
    !roles.some((role) => role.includes('ADMIN'))
}

/**
 * Kiểm tra trạng thái đăng nhập dựa trên sự tồn tại của accessToken.
 * Dùng hàm này thay vì gán const để tránh stale closure.
 */
export const getIsLoggedIn = () => !!localStorage.getItem('accessToken')
