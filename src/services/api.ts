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

// Redirecionar para login em caso de 401 ou token expirado/inválido
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = (error.response?.data?.message || '').toLowerCase();

    const isAuthFailure =
      status === 401 ||
      (status === 403 &&
        (message.includes('token') ||
          message.includes('autentica') ||
          message.includes('expirad') ||
          message.includes('inválid')));

    if (isAuthFailure && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('@renacred:token');
      localStorage.removeItem('@renacred:user');
      window.location.href = '/login?expired=1';
    }
    return Promise.reject(error);
  }
);

export default api;
