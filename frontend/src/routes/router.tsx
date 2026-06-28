import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import NotFound from '../pages/errors/NotFound';
import Unauthorized from '../pages/errors/Unauthorized';

// --- Lazy loaded pages (Code Splitting) ---
// Público
const Home = lazy(() => import('../pages/Home'));
const TorneoDetail = lazy(() => import('../pages/TorneoDetail'));

// Auth
const Login = lazy(() => import('../pages/auth/Login'));
const Recuperar = lazy(() => import('../pages/auth/Recuperar'));

// Delegado
const DelegadoDashboard = lazy(() => import('../pages/delegado/Dashboard'));
const DelegadoInscripcion = lazy(() => import('../pages/delegado/Inscripcion'));
const DelegadoPlantilla = lazy(() => import('../pages/delegado/Plantilla'));

// Admin
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const AdminAuditoria = lazy(() => import('../pages/admin/Auditoria'));
const AdminPartidos = lazy(() => import('../pages/admin/Partidos'));
const AdminEstadisticas = lazy(() => import('../pages/admin/Estadisticas'));

// --- Suspense Wrapper ---
// Muestra un indicador de carga temporal mientras se descarga el chunk de la ruta.
// Sin diseño por ahora, se reemplazará con un Skeleton en la Fase 3.
const withSuspense = (Component: React.LazyExoticComponent<any>) => (
  <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: withSuspense(Home),
  },
  {
    path: '/torneos/:id',
    element: withSuspense(TorneoDetail),
  },
  {
    path: '/auth/login',
    element: withSuspense(Login),
  },
  {
    path: '/auth/recuperar',
    element: withSuspense(Recuperar),
  },
  {
    path: '/delegado',
    element: <ProtectedRoute allowedRoles={['delegado']} />,
    children: [
      { path: 'dashboard', element: withSuspense(DelegadoDashboard) },
      { path: 'inscripcion', element: withSuspense(DelegadoInscripcion) },
      { path: 'plantilla', element: withSuspense(DelegadoPlantilla) },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['super_admin']} />,
    children: [
      { path: 'dashboard', element: withSuspense(AdminDashboard) },
      { path: 'auditoria', element: withSuspense(AdminAuditoria) },
      { path: 'partidos', element: withSuspense(AdminPartidos) },
      { path: 'estadisticas', element: withSuspense(AdminEstadisticas) },
    ],
  },
  {
    path: '/unauthorized',
    element: <Unauthorized />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
