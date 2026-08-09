import axiosClient from '@/api/core/axiosClient.js'

const staffNotificationApi = {
  getMyNotifications: (params) => (
    axiosClient.get('/staff-notifications', { params })
  ),

  getUnreadCount: () => (
    axiosClient.get('/staff-notifications/unread-count')
  ),

  markAsRead: (notificationId) => (
    axiosClient.patch(`/staff-notifications/${notificationId}/read`)
  ),
}

export default staffNotificationApi
