import axiosClient from '@/api/core/axiosClient.js';

const paymentApi = {
  // Lấy các phương thức thanh toán đang được backend cấu hình
  getAllPaymentMethods: () => {
    return axiosClient.get('/payment-methods');
  },

  // Tạo thanh toán COD
  createCodPayment: async (data) => {
    // data: { orderId, amount }

    return axiosClient.post('/payments/cod', data);
  },

  // ADMIN/STAFF: Xác nhận thanh toán COD
  confirmCodPayment: (paymentId) => {
    return axiosClient.put(`/payments/cod/${paymentId}/confirm`);
  },

  // Lấy thông tin thanh toán theo ID đơn hàng
  getPaymentByOrderId: (orderId) => {
    return axiosClient.get(`/payments/${orderId}`);
  },

  // Lấy trạng thái thanh toán theo ID đơn hàng
  getPaymentStatusByOrderId: (orderId) => {
    return axiosClient.get(`/payments/status/${encodeURIComponent(orderId)}`);
  },

  // Tạo lại giao dịch MoMo cho đơn hàng chưa thanh toán
  retryMomoPayment: (beeOrderId) =>
    axiosClient.post(`/payments/momo/retry/${encodeURIComponent(beeOrderId)}`),
};

export default paymentApi;
