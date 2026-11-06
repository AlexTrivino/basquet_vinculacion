// Módulo auth: la sesión (AuthContext), la guarda de rutas y el login, el registro y el perfil.
export { AuthProvider, useAuth } from './AuthContext';
export { ProtectedRoute } from './ProtectedRoute';
export { getPerfil } from './api/usuarios.api';
export { rutas } from './routes';
