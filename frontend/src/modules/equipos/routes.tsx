import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { withSuspense } from '@/shared/ui/withSuspense';

const DirectorioEquipos = lazy(() => import('./pages/DirectorioEquipos'));
const EquipoProfile = lazy(() => import('./pages/EquipoProfile'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Auditoria = lazy(() => import('./pages/Auditoria'));
const AdminEquipos = lazy(() => import('./pages/AdminEquipos'));

// publicas: dentro de MainLayout; delegado y admin: hijas de /delegado y /admin (sus guardas están en app/router.tsx)
export const rutas = {
  publicas: [
    { path: '/equipos', element: withSuspense(DirectorioEquipos) },
    { path: '/equipos/:id', element: withSuspense(EquipoProfile) },
  ],
  delegado: [{ path: 'dashboard', element: withSuspense(Dashboard) }],
  admin: [
    { path: 'auditoria', element: withSuspense(Auditoria) },
    { path: 'equipos', element: withSuspense(AdminEquipos) },
  ],
} satisfies Record<string, RouteObject[]>;
