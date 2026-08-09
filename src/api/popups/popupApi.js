import axiosClient from '@/api/core/axiosClient.js';

const popupApi = {
  // Lấy danh sách popup gợi ý coupon
  getPopups: () => {
    return axiosClient.get('/popup-coupon');
  },

  // Tạo mới popup gợi ý coupon
  createPopup: (data) => {
    return axiosClient.post('/popup-coupon', data);
  },

  // Cập nhật popup gợi ý coupon theo ID
  updatePopup: (id, data) => {
    return axiosClient.put(`/popup-coupon/${id}`, data);
  },

  // Xóa popup gợi ý coupon theo ID
  deletePopup: (id) => {
    return axiosClient.delete(`/popup-coupon/${id}`);
  }
};

export default popupApi;
