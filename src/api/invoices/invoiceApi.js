import axiosClient from '@/api/core/axiosClient.js'

const invoiceApi = {
  getAllInvoices: (params) => axiosClient.get('/invoices', { params }),
  getMyInvoices: () => axiosClient.get('/invoices/my'),
  getInvoiceById: (invoiceId) => axiosClient.get(`/invoices/${invoiceId}`),
}

export default invoiceApi
