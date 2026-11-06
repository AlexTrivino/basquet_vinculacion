import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { ProtectedRoute, rutas as auth } from '@/modules/auth';
import { rutas as auspicios } from '@/modules/auspicios';
import { rutas as sanciones } from '@/modules/sanciones';
import { rutas as partidos } from '@/modules/partidos';
import { rutas as torneos } from '@/modules/torneos';
import { rutas as inscripciones } from '@/modules/inscripciones';
import { rutas as equipos } from '@/modules/equipos';
import { rutas as jugadores } from '@/modules/jugadores';
import { rutas as visor } from '@/modules/visor';
import { MainLayout } from './MainLayout';
import NotFound from './NotFound';
import Unauthorized from './Unauthorized';
import { withSuspense } from '@/shared/ui/withSuspense';

// --- Lazy loaded pages (Code Splitting) ---
// Público
const Home = lazy(() => import('@/pages/public/Home'));

// Delegado

// Admin
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));

export const router = createBrowserRouter([
  {
    // MainLayout envuelve a todas las rutas de negocio para proveer el Navbar
    element: <MainLayout />,
    children: [
      {
        path: '/',
        element: withSuspense(Home),
      },
      ...torneos.publicas,
      ...equipos.publicas,
      ...jugadores.publicas,
      ...visor.publicas,
      ...auth.publicas,
      {
        path: '/delegado',
        element: <ProtectedRoute allowedRoles={['delegado']} />,
        children: [
          ...equipos.delegado,
          ...inscripciones.delegado,
        ],
      },
      {
        path: '/admin',
        element: <ProtectedRoute allowedRoles={['super_admin']} />,
        children: [
          { index: true, element: <Navigate to="torneos" replace /> },
          ...torneos.admin,
          { path: 'dashboard', element: withSuspense(AdminDashboard) },
          ...equipos.admin,
          ...jugadores.admin,
          ...partidos.admin,
          ...sanciones.admin,
          ...auspicios.admin,
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
