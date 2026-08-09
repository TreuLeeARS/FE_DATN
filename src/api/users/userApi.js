import axiosClient from '@/api/core/axiosClient.js';

const userApi = {
  getUserByUsername: (username) => {
    return axiosClient.get(`/users/${encodeURIComponent(username)}`)
  },

  updateMyProfile: (data) => {
    return axiosClient.patch('/users/profile', data)
  },

  // Lấy danh sách người dùng phân trang (Admin/Staff)
  getUsers: (params) => {
    // params: { page, size, sort }
    return axiosClient.get('/users', { params });
  },

  // Tìm kiếm và lọc danh sách người dùng (Admin/Staff)
  searchUsers: (params) => {
    // params: { username, email, phone, firstName, lastName, page, size, sort }
    return axiosClient.get('/users/search', { params });
  },

  // Cập nhật thông tin người dùng theo username (Admin)
  updateUser: (username, data) => {
    return axiosClient.put(`/users/${username}`, data);
  },

  // Xóa/Khóa tài khoản người dùng theo username (Admin)
  deleteUser: (username) => {
    return axiosClient.delete(`/users/${username}`);
  },

  // Gán vai trò quản trị viên (Admin)
  setAdmin: (data) => {
    // data: { username }
    return axiosClient.post('/users/set-admin', data);
  },

  // Gán vai trò nhân viên (Admin)
  setStaff: (data) => {
    // data: { username }
    return axiosClient.post('/users/set-staff', data);
  },

  // Chuyển tài khoản về vai trò người dùng (Admin)
  setUser: (data) => {
    // data: { username }
    return axiosClient.post('/users/set-user', data);
  },

  // Đếm số lượng người dùng theo vai trò (Admin/Staff)
  countByRole: () => {
    return axiosClient.get('/users/count-by-role');
  }
};

export default userApi;
