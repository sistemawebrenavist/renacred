import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Injetar token JWT automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@renacred:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirecionar para login em caso de 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('@renacred:token');
      localStorage.removeItem('@renacred:user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
