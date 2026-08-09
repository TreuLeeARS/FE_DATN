import axios from 'axios';

const backendUrl = (import.meta.env.VITE_BE_URL || 'http://localhost:8018').replace(/\/$/, '');
const apiBaseUrl = `${backendUrl}/api/v1`;

// Tạo một instance của axios với cấu hình mặc định
const axiosClient = axios.create({
  baseURL: apiBaseUrl, // Đường dẫn API từ Spring Boot/Node.js của bạn
  headers: {
    'Content-Type': 'application/json',
    "ngrok-skip-browser-warning": "true",
  },
  timeout: 10000, // Hủy request nếu phản hồi lâu hơn 10 giây
});

// Request Interceptor: Tự động đính kèm Token trước khi gửi request
axiosClient.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage (hoặc redux store, cookie, v.v...)
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Biến theo dõi trạng thái đang refresh và hàng đợi lưu các request bị dừng chờ refresh xong
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Xử lý dữ liệu trả về và lỗi tập trung
axiosClient.interceptors.response.use(
  (response) => {
    // Trả về trực tiếp data nhận được từ API để không cần gõ response.data ở bên ngoài
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Xử lý lỗi toàn cục (Global Error Handling)
    if (error.response) {
      const { status, data } = error.response;
      
      // Nếu gặp lỗi 401 Unauthorized và request chưa từng được retry
      if (status === 401 && !originalRequest._retry) {
        // Tránh lặp vô tận nếu API bị lỗi chính là đăng nhập hoặc làm mới token
        if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/refresh')) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('role');
          localStorage.removeItem('username');
          return Promise.reject(error);
        }

        // Nếu đang trong quá trình refresh token từ request trước đó, xếp request hiện tại vào hàng đợi
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return axiosClient(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          isRefreshing = false;
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('role');
          localStorage.removeItem('username');
          return Promise.reject(error);
        }

        try {
          // Gọi API refresh token sử dụng axios gốc để tránh lặp interceptor
          const res = await axios.post(
            `${apiBaseUrl}/auth/refresh`,
            { refreshToken }
          );

          if (res.data && res.data.data) {
            const { accessToken, refreshToken: newRefreshToken } = res.data.data;
            
            localStorage.setItem('accessToken', accessToken);
            if (newRefreshToken) {
              localStorage.setItem('refreshToken', newRefreshToken);
            }

            // Thiết lập header authorization mặc định mới cho axios
            axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;

            // Giải phóng hàng đợi chờ
            processQueue(null, accessToken);
            isRefreshing = false;

            // Thực hiện lại request ban đầu với token mới
            return axiosClient(originalRequest);
          } else {
            throw new Error('Refresh token response invalid');
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          
          // Hết hạn cả refresh token -> đăng xuất và chuyển hướng
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('role');
          localStorage.removeItem('username');
          
          window.location.href = '/auth';
          return Promise.reject(refreshError);
        }
      }

      switch (status) {
        case 403:
          console.error('Forbidden - Bạn không có quyền truy cập tài nguyên này.');
          break;
        case 404:
          console.error('Not Found - Không tìm thấy tài nguyên.');
          break;
        case 500:
          console.error('Internal Server Error - Lỗi hệ thống.');
          break;
        default:
          console.error(data?.message || 'Đã xảy ra lỗi không xác định.');
      }
    } else if (error.request) {
      // Lỗi do không kết nối được tới server
      console.error('Network Error - Không thể kết nối đến máy chủ.');
    } else {
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;
