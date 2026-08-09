import axiosClient from '@/api/core/axiosClient.js';

const normalizeCategoryPayload = (data = {}) => ({
  ...data,
  ...(typeof data.name === 'string' && {
    name: data.name.trim().replace(/\s+/g, ' ').toLocaleUpperCase('vi-VN'),
  }),
});

const categoryApi = {
  // Lấy danh sách tất cả danh mục phân trang
  getAllCategories: (params) => {
    return axiosClient.get('/categorys', { params });
  },

  // Lấy các danh mục gốc (không có parent)
  getRootCategories: () => {
    return axiosClient.get('/categorys/root');
  },

  // Lấy danh mục con theo parent ID
  getCategoriesByParent: (parentId) => {
    return axiosClient.get(`/categorys/${parentId}`);
  },

  // ADMIN: Tạo danh mục mới
  createCategory: (data) => {
    return axiosClient.post('/categorys', normalizeCategoryPayload(data));
  },

  // ADMIN: Xóa danh mục theo ID (Xóa Mềm)
  deleteCategory: (id) => {
    return axiosClient.delete(`/categorys/${id}`);
  },

  // ADMIN/STAFF: Lấy tất cả danh mục (bao gồm cả đã xóa mềm)
  getAllCategoriesForAdmin: () => {
    return axiosClient.get('/categorys/admin/all');
  },

  // ADMIN/STAFF: Cập nhật thông tin danh mục theo ID
  updateCategory: (id, data) => {
    return axiosClient.put(`/categorys/${id}`, normalizeCategoryPayload(data));
  },

  // ADMIN/STAFF: Khôi phục danh mục đã bị xóa mềm
  restoreCategory: (id) => {
    return axiosClient.patch(`/categorys/${id}/restore`);
  }
};

export default categoryApi;
