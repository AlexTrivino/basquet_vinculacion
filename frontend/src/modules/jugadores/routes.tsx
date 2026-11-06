import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { withSuspense } from '@/shared/ui/withSuspense';

const JugadorProfile = lazy(() => import('./pages/JugadorProfile'));
const AdminJugadores = lazy(() => import('./pages/AdminJugadores'));

// publicas: dentro de MainLayout; admin: hijas de /admin (la guarda de super_admin está en app/router.tsx)
export const rutas = {
  publicas: [{ path: '/jugadores/:id', element: withSuspense(JugadorProfile) }],
  admin: [{ path: 'jugadores', element: withSuspense(AdminJugadores) }],
} satisfies Record<string, RouteObject[]>;
