import axiosClient from '@/api/core/axiosClient.js';

const normalizeProductPayload = (data = {}) => ({
  ...data,
  ...(typeof data.name === 'string' && {
    name: data.name.trim().replace(/\s+/g, ' ').toLocaleUpperCase('vi-VN'),
  }),
  ...(typeof data.title === 'string' && {
    title: data.title.trim().replace(/\s+/g, ' ').toLocaleUpperCase('vi-VN'),
  }),
  ...(Array.isArray(data.imageUrls) && {
    imageUrls: [...new Set(
      data.imageUrls
        .map(url => String(url || '').trim())
        .filter(Boolean),
    )],
  }),
});

const productApi = {
  // Lấy danh sách sản phẩm (phân trang)
  getAllProducts: (params) => {
    return axiosClient.get('/products', { params });
  },

  // Lấy chi tiết sản phẩm
  getProductDetail: (id) => {
    return axiosClient.get(`/products/${id}`);
  },

  // Tìm kiếm và lọc sản phẩm
  searchProducts: (params) => {
    // params: { name, categoryId, minPrice, maxPrice, color, size, page, size }
    return axiosClient.get('/products/search', { params });
  },

  // Lấy sản phẩm theo category ID
  getProductsByCategory: (categoryId, params) => {
    return axiosClient.get(`/products/categories/${categoryId}/products`, { params });
  },

  // ================= ADMIN ENDPOINTS =================

  // Admin lấy tất cả sản phẩm (bao gồm cả sản phẩm xóa mềm)
  getAllProductsForAdmin: (params) => {
    return axiosClient.get('/products/admin', { params });
  },

  // Admin lấy chi tiết sản phẩm (bao gồm cả sản phẩm xóa mềm)
  getDetailForAdmin: (id) => {
    return axiosClient.get(`/products/admin/${id}`);
  },

  // Admin tạo mới sản phẩm
  createProduct: (data) => {
    return axiosClient.post('/products', normalizeProductPayload(data));
  },

  // Admin cập nhật thông tin sản phẩm
  updateProduct: (id, data) => {
    return axiosClient.put(`/products/${id}`, normalizeProductPayload(data));
  },

  // Admin xóa mềm sản phẩm
  deleteProduct: (id) => {
    return axiosClient.delete(`/products/${id}`);
  },

  // Admin khôi phục sản phẩm đã xóa mềm
  restoreProduct: (id) => {
    return axiosClient.put(`/products/${id}/restore`);
  },

  // Admin thêm biến thể cho sản phẩm
  addVariant: (productId, data) => {
    return axiosClient.post(`/products/${productId}/variants`, data);
  },

  // Admin cập nhật biến thể sản phẩm
  updateVariant: (productId, variantId, data) => {
    return axiosClient.put(`/products/${productId}/variants/${variantId}`, data);
  },

  // Admin xóa biến thể sản phẩm
  deleteVariant: (productId, variantId) => {
    return axiosClient.delete(`/products/${productId}/variants/${variantId}`);
  }
};

export default productApi;
