import axiosClient from '@/api/core/axiosClient.js';

const cartApi = {
  // Lấy giỏ hàng của người dùng hiện tại
  getMyCart: () => {
    return axiosClient.get('/cart');
  },

  // Thêm sản phẩm vào giỏ hàng
  addItem: (data) => {
    // data: { productVariantId, quantity }
    return axiosClient.post('/cart/items', data);
  },

  // Cập nhật số lượng sản phẩm trong giỏ hàng
  updateItem: (cartItemId, data) => {
    // data: { quantity }
    return axiosClient.put(`/cart/items/${cartItemId}`, data);
  },

  // Xóa một sản phẩm khỏi giỏ hàng
  removeItem: (cartItemId) => {
    return axiosClient.delete(`/cart/items/${cartItemId}`);
  },

  // Xóa toàn bộ giỏ hàng
  clearCart: () => {
    return axiosClient.delete('/cart/clear');
  }
};

export default cartApi;
