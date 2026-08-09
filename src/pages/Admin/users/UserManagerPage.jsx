import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import userApi from '@/api/users/userApi.js'
import { ConfirmModal } from '@/components/common/ConfirmModal.jsx'
import { isStaffOnly } from '@/utils/auth/auth.js'

// Số tài khoản hiển thị mỗi trang.
const USERS_PER_PAGE = 6

export const UserManager = () => {
  const canManageUsers = !isStaffOnly()
  const [users, setUsers] = useState([])
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

  // Statistics State
  const [rolesCount, setRolesCount] = useState({
    admin: 0,
    staff: 0,
    customer: 0,
    total: 0
  })

  // Search Filters State
  const [searchUsername, setSearchUsername] = useState('')
  const [searchEmail, setSearchEmail] = useState('')
  const [searchPhone, setSearchPhone] = useState('')

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    isActive: true
  })

  // Load user roles count statistics
  const fetchRolesCount = async () => {
    try {
      const res = await userApi.countByRole()
      if (res && res.data) {
        const data = res.data
        const admin = data.count_admin || 0
        const staff = data.count_staff || 0
        const customer = data.count_user || 0
        const total = admin + staff + customer

        setRolesCount({
          admin,
          staff,
          customer,
          total
        })
      }
    } catch (err) {
      console.error('Error fetching roles statistics:', err)
      // Fallback silently without throwing user-facing toast as statistics are secondary
    }
  }

  // Load / Search Users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      let res
      const hasSearch = searchUsername.trim() || searchEmail.trim() || searchPhone.trim()

      if (hasSearch) {
        res = await userApi.searchUsers({
          username: searchUsername.trim() || undefined,
          email: searchEmail.trim() || undefined,
          phone: searchPhone.trim() || undefined,
          page: page,
          size: USERS_PER_PAGE,
          sort: 'id,desc'
        })
      } else {
        res = await userApi.getUsers({
          page: page,
          size: USERS_PER_PAGE,
          sort: 'id,desc'
        })
      }

      if (res && res.data) {
        setUsers(res.data.content || [])
        setTotalPages(res.data.totalPages || 1)
      }
    } catch (err) {
      console.error('Error loading user list:', err)
      toast.error('Không thể tải danh sách tài khoản người dùng.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page])

  useEffect(() => {
    fetchRolesCount()
  }, [])

  // Trigger search
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(0)
    fetchUsers()
  }

  // Reset filters
  const handleResetFilters = () => {
    setSearchUsername('')
    setSearchEmail('')
    setSearchPhone('')
    setPage(0)
    // Wait for state updates before triggering reload
    setTimeout(() => {
      fetchUsers()
    }, 50)
  }

  // Helper to extract roles safely
  const getUserRoles = (user) => {
    if (!user) return []
    if (Array.isArray(user.roles)) {
      return user.roles.map(r => {
        if (typeof r === 'string') return r
        if (r && typeof r === 'object' && r.name) return r.name
        return JSON.stringify(r)
      })
    }
    if (Array.isArray(user.authorities)) {
      return user.authorities.map(a => {
        if (typeof a === 'string') return a
        if (a && typeof a === 'object' && a.authority) return a.authority
        return JSON.stringify(a)
      })
    }
    if (typeof user.role === 'string') {
      return [user.role]
    }
    return []
  }

  // Check if role is admin or staff helper
  const hasRole = (user, roleKeyword) => {
    const roles = getUserRoles(user)
    return roles.some(r => r.toUpperCase().includes(roleKeyword.toUpperCase()))
  }

  // Render role badges elegantly
  const renderRoleBadges = (user) => {
    const roles = getUserRoles(user)
    if (roles.length === 0) {
      return <span className="px-2 py-0.5 text-[9px] font-semibold bg-gray-50 text-gray-400 border border-gray-200 tracking-wider uppercase">CUSTOMER</span>
    }
    return (
      <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
        {roles.map((role, idx) => {
          const roleUpper = role.toUpperCase()
          if (roleUpper.includes('ADMIN')) {
            return (
              <span key={idx} className="px-2.5 py-0.5 text-[8.5px] font-bold bg-brand-charcoal text-white border border-brand-blush/30 tracking-widest uppercase">
                ADMIN
              </span>
            )
          }
          if (roleUpper.includes('STAFF') || roleUpper.includes('EMPLOYEE')) {
            return (
              <span key={idx} className="px-2.5 py-0.5 text-[8.5px] font-bold bg-brand-charcoal/10 text-brand-charcoal border border-brand-charcoal/20 tracking-wider uppercase">
                STAFF
              </span>
            )
          }
          return (
            <span key={idx} className="px-2.5 py-0.5 text-[8.5px] font-medium bg-brand-cream text-brand-muted border border-gray-200 tracking-wider uppercase">
              CUSTOMER
            </span>
          )
        })}
      </div>
    )
  }

  const handleAssignAdmin = (user) => {
    openConfirm(
      'Cấp quyền Admin',
      `Xác nhận nâng quyền ADMIN cho tài khoản "${user.username}"?`,
      async () => {
        try {
          await userApi.setAdmin({ username: user.username })
          toast.success(`Đã nâng cấp quyền ADMIN cho ${user.username} thành công!`)
          fetchUsers()
          fetchRolesCount()
        } catch (err) {
          console.error('Error assigning admin role:', err)
          toast.error(err.response?.data?.message || 'Lỗi xảy ra khi cấp quyền ADMIN.')
        }
      }
    )
  }

  const handleAssignStaff = (user) => {
    openConfirm(
      'Cấp quyền Staff',
      `Xác nhận gán quyền STAFF cho tài khoản "${user.username}"?`,
      async () => {
        try {
          await userApi.setStaff({ username: user.username })
          toast.success(`Đã cấp quyền nhân viên STAFF cho ${user.username} thành công!`)
          fetchUsers()
          fetchRolesCount()
        } catch (err) {
          console.error('Error assigning staff role:', err)
          toast.error(err.response?.data?.message || 'Lỗi xảy ra khi cấp quyền STAFF.')
        }
      }
    )
  }

  const handleLockUser = (user) => {
    openConfirm(
      'Khóa tài khoản',
      `Bạn có chắc chắn muốn khóa/xóa tài khoản "${user.username}"? Người dùng này sẽ không thể đăng nhập.`,
      async () => {
        try {
          await userApi.deleteUser(user.username)
          toast.success(`Đã khóa tài khoản "${user.username}" thành công!`)
          fetchUsers()
          fetchRolesCount()
        } catch (err) {
          console.error('Error locking user:', err)
          toast.error(err.response?.data?.message || 'Lỗi xảy ra khi khóa tài khoản.')
        }
      },
      true
    )
  }

  const handleAssignUser = (user) => {
    openConfirm(
      'Chuyển về quyền User',
      `Bạn có chắc chắn muốn chuyển tài khoản "${user.username}" về quyền USER?`,
      async () => {
        try {
          await userApi.setUser({ username: user.username })
          toast.success(`Đã chuyển ${user.username} về quyền USER thành công!`)
          fetchUsers()
          fetchRolesCount()
        } catch (err) {
          console.error('Error assigning user role:', err)
          toast.error(err.response?.data?.message || 'Lỗi xảy ra khi chuyển về quyền USER.')
        }
      }
    )
  }

  const handleUnlockUser = (user) => {
    openConfirm(
      'Mở khóa tài khoản',
      `Bạn có chắc chắn muốn mở khóa tài khoản "${user.username}"? Người dùng này sẽ có thể đăng nhập trở lại.`,
      async () => {
        try {
          await userApi.updateUser(user.username, {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email,
            phone: user.phone,
            isActive: true
          })
          toast.success(`Đã mở khóa tài khoản "${user.username}" thành công!`)
          fetchUsers()
        } catch (err) {
          console.error('Error unlocking user:', err)
          toast.error(err.response?.data?.message || 'Lỗi xảy ra khi mở khóa tài khoản.')
        }
      }
    )
  }

  // Edit user modal helpers
  const handleOpenEditModal = (user) => {
    setEditingUser(user)
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      isActive: user.isActive !== false
    })
    setIsEditModalOpen(true)
  }

  const handleEditInputChange = (e) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editForm.email.trim() || !editForm.phone.trim()) {
      toast.error('Vui lòng cung cấp đầy đủ email và số điện thoại.')
      return
    }

    try {
      await userApi.updateUser(editingUser.username, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone,
        isActive: editForm.isActive
      })
      toast.success(`Cập nhật thông tin tài khoản ${editingUser.username} thành công!`)
      setIsEditModalOpen(false)
      fetchUsers()
    } catch (err) {
      console.error('Error updating user profile:', err)
      toast.error(err.response?.data?.message || 'Lỗi xảy ra khi cập nhật hồ sơ.')
    }
  }

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-16">
      
      {/* ─── STATISTICS CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-none border border-black/5 flex flex-col justify-between h-28 shadow-sm">
          <p className="text-[10px] font-bold tracking-widest text-brand-muted uppercase">Tổng người dùng</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-display font-bold text-brand-charcoal">{rolesCount.total || users.length}</span>
            <span className="text-xxs text-brand-muted">thành viên</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-none border border-black/5 flex flex-col justify-between h-28 shadow-sm">
          <p className="text-[10px] font-bold tracking-widest text-brand-muted uppercase">Quản trị viên (Admin)</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-display font-bold text-brand-charcoal">{rolesCount.admin}</span>
            <span className="text-xxs text-brand-muted">tài khoản</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-none border border-black/5 flex flex-col justify-between h-28 shadow-sm">
          <p className="text-[10px] font-bold tracking-widest text-brand-muted uppercase">Nhân viên (Staff)</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-display font-bold text-brand-charcoal">{rolesCount.staff}</span>
            <span className="text-xxs text-brand-muted">tài khoản</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-none border border-black/5 flex flex-col justify-between h-28 shadow-sm">
          <p className="text-[10px] font-bold tracking-widest text-brand-muted uppercase">Khách hàng (Customer)</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-display font-bold text-brand-charcoal">{rolesCount.customer || Math.max(0, (rolesCount.total || users.length) - rolesCount.admin - rolesCount.staff)}</span>
            <span className="text-xxs text-brand-muted">khách hàng</span>
          </div>
        </div>
      </div>

      {/* ─── SEARCH FILTERS ROW ─── */}
      <div className="bg-white p-6 rounded-none border border-black/10 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <h3 className="text-xs font-bold tracking-widest text-brand-charcoal uppercase mb-3">Bộ lọc & Tìm kiếm tài khoản</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-brand-muted tracking-wider">Tên tài khoản</label>
              <input
                type="text"
                placeholder="Tìm username..."
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal text-xs rounded-none font-sans"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-brand-muted tracking-wider">Địa chỉ Email</label>
              <input
                type="text"
                placeholder="Tìm email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal text-xs rounded-none font-sans"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-brand-muted tracking-wider">Số điện thoại</label>
              <input
                type="text"
                placeholder="Tìm số điện thoại..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal text-xs rounded-none font-sans"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-5 py-2.5 border border-gray-200 font-semibold hover:bg-gray-50 text-[10px] tracking-widest uppercase rounded-none transition-colors duration-200 cursor-pointer"
            >
              Làm mới
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-brand-charcoal hover:bg-brand-dark text-white font-semibold text-[10px] tracking-widest uppercase rounded-none transition-colors duration-200 cursor-pointer"
            >
              Tìm kiếm
            </button>
          </div>
        </form>
      </div>

      {/* ─── USERS LIST TABLE ─── */}
      <div className="bg-white border border-black/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-charcoal text-white text-[9.5px] tracking-widest uppercase border-b border-black/10">
                <th className="py-4 px-4 font-semibold">Tài khoản (Username)</th>
                <th className="py-4 px-4 font-semibold">Họ & Tên</th>
                <th className="py-4 px-4 font-semibold">Email</th>
                <th className="py-4 px-4 font-semibold w-32">Số điện thoại</th>
                <th className="py-4 px-4 font-semibold w-40 text-center">Vai trò</th>
                <th className="py-4 px-4 font-semibold w-24 text-center">Trạng thái</th>
                {canManageUsers && <th className="py-4 px-4 font-semibold w-56 text-center">Thao tác quản lý</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={canManageUsers ? 7 : 6} className="py-16 text-center text-brand-muted">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin text-brand-charcoal" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang kết nối API và truy xuất danh sách thành viên...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={canManageUsers ? 7 : 6} className="py-16 text-center text-brand-muted font-medium">
                    Không tìm thấy tài khoản người dùng phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const isLocked = u.isActive === false
                  const isCustomer = !hasRole(u, 'ADMIN') && !hasRole(u, 'STAFF')
                  return (
                    <tr key={u.userId || u.username} className="hover:bg-black/[0.01] transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-semibold text-brand-charcoal">{u.username}</p>
                      </td>
                      <td className="py-4 px-4 font-medium text-brand-charcoal">
                        {u.lastName || u.firstName ? `${u.lastName || ''} ${u.firstName || ''}`.trim() : 'Chưa cập nhật'}
                      </td>
                      <td className="py-4 px-4 text-brand-muted select-all">
                        {u.email}
                      </td>
                      <td className="py-4 px-4 text-brand-muted">
                        {u.phone || 'Chưa liên kết'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {renderRoleBadges(u)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {isLocked ? (
                          <span className="inline-block px-2 py-0.5 text-[8.5px] font-bold bg-red-50 text-red-600 border border-red-200 uppercase tracking-widest">Bị khóa</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-[8.5px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-widest">Hoạt động</span>
                        )}
                      </td>
                      {canManageUsers && <td
                        className="py-4 px-4 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="text-[9.5px] uppercase tracking-wider font-semibold text-brand-charcoal hover:underline cursor-pointer"
                        >
                          Sửa
                        </button>
                        <span>|</span>

                        {isCustomer && (
                          <>
                            <button
                              onClick={() => handleAssignStaff(u)}
                              className="text-[9.5px] uppercase tracking-wider font-semibold text-brand-muted hover:text-brand-charcoal hover:underline cursor-pointer"
                              title="Gán vai trò Nhân viên"
                            >
                              +Staff
                            </button>
                            <span>|</span>
                            <button
                              onClick={() => handleAssignAdmin(u)}
                              className="text-[9.5px] uppercase tracking-wider font-semibold text-brand-muted hover:text-brand-charcoal hover:underline cursor-pointer"
                              title="Gán vai trò Quản trị viên"
                            >
                              +Admin
                            </button>
                            <span>|</span>
                          </>
                        )}

                        {hasRole(u, 'STAFF') && !hasRole(u, 'ADMIN') && (
                          <>
                            <button
                              onClick={() => handleAssignAdmin(u)}
                              className="text-[9.5px] uppercase tracking-wider font-semibold text-brand-muted hover:text-brand-charcoal hover:underline cursor-pointer"
                              title="Nâng lên vai trò Quản trị viên"
                            >
                              +Admin
                            </button>
                            <span>|</span>
                          </>
                        )}

                        {!isCustomer && u.username !== 'adminbee' && (
                          <>
                            <button
                              onClick={() => handleAssignUser(u)}
                              className="text-[9.5px] uppercase tracking-wider font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                              title="Chuyển tài khoản về vai trò User"
                            >
                              →User
                            </button>
                            <span>|</span>
                          </>
                        )}

                        {isLocked ? (
                          <button
                            onClick={() => handleUnlockUser(u)}
                            className="text-[9.5px] uppercase tracking-wider font-semibold text-green-700 hover:text-green-900 hover:underline cursor-pointer"
                            title="Mở khóa tài khoản"
                          >
                            Mở khóa
                          </button>
                        ) : (
                          <button
                            disabled={u.username === 'adminbee'}
                            onClick={() => handleLockUser(u)}
                            className={`text-[9.5px] uppercase tracking-wider font-semibold hover:underline cursor-pointer ${
                              u.username === 'adminbee'
                                ? 'text-gray-300 opacity-40 cursor-not-allowed hover:no-underline'
                                : 'text-red-700 hover:text-red-900'
                            }`}
                            title={u.username === 'adminbee' ? 'Không thể khóa tài khoản gốc hệ thống' : 'Khóa tài khoản'}
                          >
                            Khóa
                          </button>
                        )}
                        </div>
                      </td>}
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

      {/* ─── MODAL: EDIT USER PROFILE ─── */}
      {canManageUsers && isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-charcoal/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white border border-black/10 shadow-2xl p-6 md:p-8 space-y-6 rounded-none">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-brand-charcoal">
                Cập nhật thông tin: {editingUser?.username}
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="text-brand-charcoal text-sm hover:opacity-70 font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-semibold uppercase text-brand-muted text-[9.5px] tracking-wider">Họ (Last Name)</label>
                  <input
                    type="text"
                    name="lastName"
                    value={editForm.lastName}
                    onChange={handleEditInputChange}
                    placeholder="Ví dụ: Nguyễn"
                    className="w-full p-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal rounded-none font-sans"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold uppercase text-brand-muted text-[9.5px] tracking-wider">Tên (First Name)</label>
                  <input
                    type="text"
                    name="firstName"
                    value={editForm.firstName}
                    onChange={handleEditInputChange}
                    placeholder="Ví dụ: Văn A"
                    className="w-full p-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal rounded-none font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold uppercase text-brand-muted text-[9.5px] tracking-wider">Hộp thư Email *</label>
                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleEditInputChange}
                  required
                  placeholder="name@domain.com"
                  className="w-full p-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal rounded-none font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold uppercase text-brand-muted text-[9.5px] tracking-wider">Số điện thoại *</label>
                <input
                  type="text"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditInputChange}
                  required
                  placeholder="09xx xxx xxx"
                  className="w-full p-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal rounded-none font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold uppercase text-brand-muted text-[9.5px] tracking-wider">Trạng thái hoạt động</label>
                <select
                  name="isActive"
                  value={editForm.isActive ? 'true' : 'false'}
                  onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                  className="w-full p-2.5 border border-gray-200 focus:outline-none focus:border-brand-charcoal rounded-none font-sans bg-white"
                >
                  <option value="true">Hoạt động (Active)</option>
                  <option value="false">Khóa tài khoản (Locked)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 font-semibold hover:bg-gray-50 text-[10px] tracking-widest uppercase rounded-none transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-charcoal hover:bg-brand-dark text-white font-semibold text-[10px] tracking-widest uppercase rounded-none transition-colors cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {canManageUsers && <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />}

    </div>
  )
}
