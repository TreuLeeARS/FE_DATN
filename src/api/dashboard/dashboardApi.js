import axiosClient from '@/api/core/axiosClient.js';

// Số sản phẩm bán chạy trả về khi nơi gọi không truyền giới hạn riêng.
const DEFAULT_BEST_SELLER_LIMIT = 10

const dashboardApi = {
  // Lấy tổng quan dashboard
  getSummary: () => {
    return axiosClient.get('/admin/dashboard/summary');
  },

  // Lấy danh sách sản phẩm bán chạy
  getBestSellers: (from, to, limit = DEFAULT_BEST_SELLER_LIMIT) => {
    return axiosClient.get('/admin/dashboard/best-sellers', {
      params: { from, to, limit }
    });
  },

  // Thống kê doanh thu theo ngày
  getRevenueDaily: (from, to) => {
    return axiosClient.get('/admin/dashboard/revenue/daily', {
      params: { from, to }
    });
  },

  // Thống kê doanh thu theo tháng
  getRevenueMonthly: (from, to) => {
    return axiosClient.get('/admin/dashboard/revenue/monthly', {
      params: { from, to }
    });
  }
};

export default dashboardApi;
