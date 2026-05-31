import axios from 'axios';

const API_BASE = 'https://secure-election-management-system-martin-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally — but NOT for login attempts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    const isRegisterRequest = error.config?.url?.includes('/auth/register');

    // Never redirect on login or register failures — let the page handle errors
    if (!isLoginRequest && !isRegisterRequest && error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
