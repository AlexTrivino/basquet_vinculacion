import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { ProtectedRoute } from './ProtectedRoute';
import { MainLayout } from '../components/MainLayout';
import NotFound from '../pages/errors/NotFound';
import Unauthorized from '../pages/errors/Unauthorized';

// --- Lazy loaded pages (Code Splitting) ---
// Público
const Home = lazy(() => import('../pages/public/Home'));
const TorneoDetail = lazy(() => import('../pages/public/TorneoDetail'));
const EquipoProfile = lazy(() => import('../pages/public/EquipoProfile'));
const DirectorioEquipos = lazy(() => import('../pages/public/DirectorioEquipos'));
const JugadorProfile = lazy(() => import('../pages/public/JugadorProfile'));

// Auth
const Login = lazy(() => import('../pages/auth/Login'));
const Registro = lazy(() => import('../pages/auth/Registro'));
const RecuperarPassword = lazy(() => import('../pages/auth/RecuperarPassword'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));
const MiPerfil = lazy(() => import('../pages/auth/MiPerfil'));

// Delegado
const DelegadoDashboard = lazy(() => import('../pages/delegado/Dashboard'));
const DelegadoInscripcion = lazy(() => import('../pages/delegado/Inscripcion'));
const DelegadoReinscripcion = lazy(() => import('../pages/delegado/Reinscripcion'));
const DelegadoPlantilla = lazy(() => import('../pages/delegado/Plantilla'));

// Admin
const AdminTorneos = lazy(() => import('../pages/admin/TorneosAdmin'));
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const AdminAuditoria = lazy(() => import('../pages/admin/Auditoria'));
const AdminEquipos = lazy(() => import('../pages/admin/AdminEquipos'));
const AdminPartidos = lazy(() => import('../pages/admin/Partidos'));
const AdminSanciones = lazy(() => import('../pages/admin/AdminSanciones'));
const AdminJugadores = lazy(() => import('../pages/admin/AdminJugadores'));

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
        path: '/equipos',
        element: withSuspense(DirectorioEquipos),
      },
      {
        path: '/equipos/:id',
        element: withSuspense(EquipoProfile),
      },
      {
        path: '/jugadores/:id',
        element: withSuspense(JugadorProfile),
      },
      {
        path: '/perfil',
        element: <ProtectedRoute allowedRoles={['super_admin', 'delegado']} />,
        children: [
          { index: true, element: withSuspense(MiPerfil) },
        ],
      },
      {
        path: '/delegado',
        element: <ProtectedRoute allowedRoles={['delegado']} />,
        children: [
          { path: 'dashboard', element: withSuspense(DelegadoDashboard) },
          { path: 'inscripcion', element: withSuspense(DelegadoInscripcion) },
          { path: 'reinscripcion/:idEquipo', element: withSuspense(DelegadoReinscripcion) },
          { path: 'plantilla', element: withSuspense(DelegadoPlantilla) },
        ],
      },
      {
        path: '/admin',
        element: <ProtectedRoute allowedRoles={['super_admin']} />,
        children: [
          { index: true, element: <Navigate to="torneos" replace /> },
          { path: 'torneos', element: withSuspense(AdminTorneos) },
          { path: 'dashboard', element: withSuspense(AdminDashboard) },
          { path: 'auditoria', element: withSuspense(AdminAuditoria) },
          { path: 'equipos', element: withSuspense(AdminEquipos) },
          { path: 'jugadores', element: withSuspense(AdminJugadores) },
          { path: 'partidos', element: withSuspense(AdminPartidos) },
          { path: 'sanciones', element: withSuspense(AdminSanciones) },
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
    path: '/auth/registro',
    element: withSuspense(Registro),
  },
  {
    path: '/auth/recuperar',
    element: withSuspense(RecuperarPassword),
  },
  {
    path: '/auth/reset-password',
    element: withSuspense(ResetPassword),
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
