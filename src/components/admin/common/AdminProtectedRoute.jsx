import { Navigate } from 'react-router-dom'
import { isAdmin } from '@/utils/auth/auth.js'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

export const AdminProtectedRoute = ({ children }) => {
  const isAuthAdmin = isAdmin()

  useEffect(() => {
    if (!isAuthAdmin) {
      toast.error('Bạn không có quyền truy cập vào khu vực Quản trị!', {
        id: 'admin-unauthorized-toast',
      })
    }
  }, [isAuthAdmin])

  if (!isAuthAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
