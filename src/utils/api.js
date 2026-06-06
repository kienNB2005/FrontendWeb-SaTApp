import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- THÊM CƠ CHẾ HÀNG ĐỢI ĐỂ CHỐNG RACE CONDITION ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 2. Response Interceptor: Bắt lỗi 401 và tự động dùng refreshToken
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu mã lỗi là 401 (hết hạn token) và chưa từng thử refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Nếu đang có 1 request đi refresh rồi, thì các request khác cho xếp hàng chờ
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('Không có refresh token');
        }

        // Gọi API lên backend để lấy token mới
        const res = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
          refreshToken: refreshToken
        });

        const newAccessToken = res.data.result?.accessToken;
        const newRefreshToken = res.data.result?.refreshToken;

        if (newAccessToken) {
          // Lưu token mới vào localStorage
          localStorage.setItem('accessToken', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          // Gắn token mới vào request bị hỏng ban nãy và gọi lại nó
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          
          // Giải phóng hàng đợi: Cho phép các API đang đợi chạy tiếp với token mới
          processQueue(null, newAccessToken);
          
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Giải phóng hàng đợi kèm lỗi
        processQueue(refreshError, null);
        
        // Nếu refresh cũng thất bại -> Văng ra Login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false; // Mở khoá để các lượt sau có thể refresh tiếp
      }
    }

    return Promise.reject(error);
  }
);

export default api;
