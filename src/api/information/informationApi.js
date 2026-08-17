import axiosClient from '@/api/core/axiosClient.js'

const informationApi = {
  getMyInformation: (params, signal) => axiosClient.get('/information-order', { params, signal }),
  createInformation: (data) => axiosClient.post('/information-order', data),
  updateInformation: (id, data) => axiosClient.put(`/information-order/${encodeURIComponent(id)}`, data),
  deleteInformation: (id) => axiosClient.delete('/information-order', { params: { id } }),
}

export default informationApi
