import axiosClient from '@/api/core/axiosClient.js';

const authApi = {
  // Gửi thông tin đăng nhập
  login: (credentials) => {
    // credentials: { email, password }
    return axiosClient.post('/auth/login', credentials);
  },

  // Đăng ký tài khoản mới
  register: (userData) => {
    // userData: { name, email, password, ... }
    return axiosClient.post('/auth/register', userData);
  },

  // Lấy thông tin người dùng hiện tại
  getProfile: () => {
    return axiosClient.get('/auth/profile');
  },

  // Đăng xuất
  logout: () => {
    return axiosClient.post('/auth/logout');
  },

  // Gửi lại email kích hoạt
  resendActivation: (email) => {
    return axiosClient.post('/auth/resend-activation', null, { params: { email } });
  },

  // Gửi email khôi phục mật khẩu
  sendEmailResetPassword: (payload) => {
    return axiosClient.post('/auth/send-email-for-reset-password', payload);
  },

  // Đặt lại mật khẩu mới
  resetPassword: (payload) => {
    return axiosClient.put('/auth/forgot-password', payload);
  },
};

export default authApi;
