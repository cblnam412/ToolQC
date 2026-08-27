import axios from 'axios';

const api = axios.create({
  // In dev, Vite proxy forwards /api → http://localhost:3001/api
  // In production, point to your deployed backend URL
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Global error interceptor
api.interceptors.response.use(
  res => res,
  err => {
    console.error('[API Error]', err.response?.data || err.message);
    return Promise.reject(err);
  }
);

export default api;
