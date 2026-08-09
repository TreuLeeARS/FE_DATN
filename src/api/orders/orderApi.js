import axiosClient from '@/api/core/axiosClient.js';

const orderApi = {
  // ADMIN/STAFF: Lấy danh sách tất cả đơn hàng (có phân trang)
  getAllOrders: (params) => {
    // params: { page, size, sort }
    return axiosClient.get('/orders', { params });
  },

  // Tạo đơn hàng mới từ checkout
  checkout: (checkoutData) => {
    // checkoutData: { cartItemIds, fullName, phone, address, couponCode, paymentMethodType }
    return axiosClient.post('/orders/checkout', checkoutData);
  },

  // Lấy chi tiết đơn hàng theo ID
  getOrderById: (orderId) => {
    return axiosClient.get(`/orders/${orderId}`);
  },

  // Lấy danh sách đơn hàng của người dùng hiện tại
  getMyOrders: (params) => {
    return axiosClient.get('/orders/my', { params });
  },

  // Hủy đơn hàng
  cancelOrder: (orderId) => {
    return axiosClient.post(`/orders/${orderId}/cancel`);
  },

  // ADMIN/STAFF: Lấy chi tiết đơn hàng với quyền admin
  getAdminOrderDetails: (orderId) => {
    return axiosClient.get(`/orders/admin/details/${orderId}`);
  },

  // ADMIN/STAFF: Cập nhật trạng thái đơn hàng (ví dụ: SHIPPING, DELIVERED)
  updateOrderStatus: (orderId, status) => {
    return axiosClient.put(`/orders/${orderId}/status`, null, {
      params: { status }
    });
  },

  // ADMIN/STAFF: Đổi trạng thái sang đang giao hàng
  setStatusIsShipping: (orderId) => {
    return axiosClient.put(`/orders/${orderId}/update-status-shipping/`);
  },

  // ADMIN/STAFF: Đổi trạng thái sang đã giao hàng thành công
  setStatusIsDelivered: (orderId) => {
    return axiosClient.put(`/orders/${orderId}/update-status-delivered/`);
  }
};

export default orderApi;
