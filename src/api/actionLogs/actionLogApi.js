import axiosClient from '@/api/core/axiosClient.js'

const actionLogApi = {
  getActionLogs: (params, signal) => axiosClient.get('/action-logs', { params, signal }),
  getActionLog: (id, signal) => axiosClient.get(`/action-logs/${encodeURIComponent(id)}`, { signal }),
}

export default actionLogApi
