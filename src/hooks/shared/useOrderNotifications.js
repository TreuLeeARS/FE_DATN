import { useCallback, useEffect, useMemo, useState } from 'react'
import staffNotificationApi from '@/api/notifications/staffNotificationApi.js'

const POLL_INTERVAL = 15000
const PAGE_SIZE = 30
const unwrap = (response) => response?.data?.data ?? response?.data ?? response

const normalizeNotification = (notification) => ({
  id: notification.notificationId,
  orderId: notification.orderId,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  status: notification.status === true,
  createdAt: notification.createdAt,
  tone: notification.type === 'ORDER_CANCELED' ? 'red' : 'amber',
})

export const useOrderNotifications = () => {
  const [notifications, setNotifications] = useState([])
  const [serverUnreadCount, setServerUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    if (document.visibilityState === 'hidden') return

    try {
      setLoading(true)
      setError(false)

      const [notificationResponse, countResponse] = await Promise.all([
        staffNotificationApi.getMyNotifications({
          page: 0,
          size: PAGE_SIZE,
          sort: 'createdAt,desc',
        }),
        staffNotificationApi.getUnreadCount(),
      ])

      const notificationData = unwrap(notificationResponse)
      const content = Array.isArray(notificationData)
        ? notificationData
        : notificationData?.content || []

      setNotifications(content.map(normalizeNotification))
      setServerUnreadCount(Number(unwrap(countResponse)) || 0)
    } catch (requestError) {
      console.error('Không thể tải thông báo nhân viên:', requestError)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(refresh, 0)
    const interval = setInterval(refresh, POLL_INTERVAL)
    const onVisibility = () => document.visibilityState === 'visible' && refresh()

    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh])

  const markRead = useCallback(async (notificationId) => {
    const target = notifications.find((item) => item.id === notificationId)
    if (!target?.status) return

    setNotifications((items) => items.map((item) => (
      item.id === notificationId ? { ...item, status: false } : item
    )))
    setServerUnreadCount((count) => Math.max(0, count - 1))

    try {
      await staffNotificationApi.markAsRead(notificationId)
    } catch (requestError) {
      console.error('Không thể đánh dấu thông báo đã đọc:', requestError)
      setNotifications((items) => items.map((item) => (
        item.id === notificationId ? { ...item, status: true } : item
      )))
      setServerUnreadCount((count) => count + 1)
    }
  }, [notifications])

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications
      .filter((item) => item.status)
      .map((item) => item.id)

    if (unreadIds.length === 0) return

    try {
      await Promise.all(unreadIds.map(staffNotificationApi.markAsRead))
      setNotifications((items) => items.map((item) => ({ ...item, status: false })))
      setServerUnreadCount(0)
    } catch (requestError) {
      console.error('Không thể đánh dấu toàn bộ thông báo đã đọc:', requestError)
      refresh()
    }
  }, [notifications, refresh])

  const readIds = useMemo(
    () => notifications.filter((item) => !item.status).map((item) => item.id),
    [notifications],
  )

  return {
    notifications,
    readIds,
    unreadCount: serverUnreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  }
}
