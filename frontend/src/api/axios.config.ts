/**
 * Cliente Axios centralizado con interceptores de autenticación.
 *
 * - Request: Inyecta `Authorization: Bearer <token>` desde localStorage.
 * - Response: Captura 401/403, purga localStorage y redirige a login.
 *
 * Uso en toda la app:
 *   import api from '@/api/axios.config';
 *   const { data } = await api.get('/torneos');
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Interceptor de Request ───────────────────────────────────────
// Inyecta el JWT en cada petición si existe en localStorage.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Axios detecta FormData automáticamente y setea multipart/form-data,
  // pero solo si no forzamos Content-Type manualmente.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// ── Interceptor de Response ──────────────────────────────────────
// Captura errores de autenticación globalmente.
// 401: token expirado o inválido.
// 403: rol insuficiente (sesión corrupta).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_role');
      window.location.href = '/auth/login';
    }

    return Promise.reject(error);
  },
);

export default api;
