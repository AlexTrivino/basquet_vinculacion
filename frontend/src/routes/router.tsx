import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from './ProtectedRoute';
import { MainLayout } from '../components/MainLayout';
import NotFound from '../pages/errors/NotFound';
import Unauthorized from '../pages/errors/Unauthorized';

// --- Lazy loaded pages (Code Splitting) ---
// Público
const Home = lazy(() => import('../pages/public/Home'));
const TorneoDetail = lazy(() => import('../pages/public/TorneoDetail'));

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
// Placeholder temporal de carga mientras se bajan los chunks.
const withSuspense = (Component: React.LazyExoticComponent<any>) => (
  <Suspense
    fallback={
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <div className="text-gray-500">Cargando contenido...</div>
      </div>
    }
  >
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    // MainLayout envuelve a todas las rutas de negocio para proveer el Navbar
    element: <MainLayout />,
    children: [
      {
        path: '/',
        element: withSuspense(Home),
      },
      {
        path: '/torneos/:id',
        element: withSuspense(TorneoDetail),
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
    ],
  },
  // Auth Layout (se excluye MainLayout para no mostrar el Navbar en Login)
  {
    path: '/auth/login',
    element: withSuspense(Login),
  },
  {
    path: '/auth/recuperar',
    element: withSuspense(Recuperar),
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
