/**
 * HOC de ruta protegida con verificación de roles (RBAC).
 *
 * Compara el `userRole` del AuthContext contra el array `allowedRoles`.
 * - Si el usuario no está autenticado → redirige a `/auth/login`.
 * - Si el rol no está en la lista permitida → redirige a `/unauthorized`.
 * - Si pasa ambas verificaciones → renderiza `<Outlet />`.
 *
 * Uso en el router:
 *   <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
 *     <Route path="dashboard" element={<AdminDashboard />} />
 *   </Route>
 */
import { Navigate, Outlet } from 'react-router-dom';

import { useAuth, type UserRole } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
