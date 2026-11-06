import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { withSuspense } from '@/shared/ui/withSuspense';

const AdminSanciones = lazy(() => import('./pages/AdminSanciones'));

// admin: hijas de /admin (la guarda de super_admin está en app/router.tsx)
export const rutas = {
  admin: [{ path: 'sanciones', element: withSuspense(AdminSanciones) }],
} satisfies Record<string, RouteObject[]>;
