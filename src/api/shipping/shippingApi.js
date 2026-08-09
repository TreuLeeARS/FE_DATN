import axiosClient from '@/api/core/axiosClient.js'

const shippingApi = {
  // data: { subtotalAmount, province, district, ward, shippingAddress }
  calculate: (data) => axiosClient.post('/shipping-fee/calculate', data),
}

export default shippingApi
