import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { ProtectedRoute, rutas as auth } from '@/modules/auth';
import { rutas as auspicios } from '@/modules/auspicios';
import { rutas as sanciones } from '@/modules/sanciones';
import { rutas as partidos } from '@/modules/partidos';
import { MainLayout } from './MainLayout';
import NotFound from './NotFound';
import Unauthorized from './Unauthorized';
import { withSuspense } from '@/shared/ui/withSuspense';

// --- Lazy loaded pages (Code Splitting) ---
// Público
const Home = lazy(() => import('@/pages/public/Home'));
const TorneoDetail = lazy(() => import('@/pages/public/TorneoDetail'));
const EquipoProfile = lazy(() => import('@/pages/public/EquipoProfile'));
const DirectorioEquipos = lazy(() => import('@/pages/public/DirectorioEquipos'));
const JugadorProfile = lazy(() => import('@/pages/public/JugadorProfile'));

// Visor
const BuscadorJugadores = lazy(() => import('@/pages/visor/BuscadorJugadores'));

// Delegado
const DelegadoDashboard = lazy(() => import('@/pages/delegado/Dashboard'));
const DelegadoInscripcion = lazy(() => import('@/pages/delegado/Inscripcion'));
const DelegadoReinscripcion = lazy(() => import('@/pages/delegado/Reinscripcion'));
const DelegadoPlantilla = lazy(() => import('@/pages/delegado/Plantilla'));

// Admin
const AdminTorneos = lazy(() => import('@/pages/admin/TorneosAdmin'));
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminAuditoria = lazy(() => import('@/pages/admin/Auditoria'));
const AdminEquipos = lazy(() => import('@/pages/admin/AdminEquipos'));
const AdminJugadores = lazy(() => import('@/pages/admin/AdminJugadores'));
const AdminFaseFinal = lazy(() => import('@/pages/admin/FaseFinal'));

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
        path: '/visor',
        element: <ProtectedRoute allowedRoles={['visor', 'super_admin']} />,
        children: [{ index: true, element: withSuspense(BuscadorJugadores) }],
      },
      ...auth.publicas,
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
          ...partidos.admin,
          ...sanciones.admin,
          ...auspicios.admin,
          { path: 'fase-final', element: withSuspense(AdminFaseFinal) },
        ],
      },
    ],
  },
  // Auth Layout (se excluye MainLayout para no mostrar el Navbar en Login)
  ...auth.sueltas,
  {
    path: '/unauthorized',
    element: <Unauthorized />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
