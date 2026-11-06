import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { withSuspense } from '@/shared/ui/withSuspense';

const AdminPatrocinadores = lazy(() => import('./pages/AdminPatrocinadores'));

// admin: hijas de /admin (la guarda de super_admin está en app/router.tsx)
export const rutas = {
  admin: [{ path: 'patrocinadores', element: withSuspense(AdminPatrocinadores) }],
} satisfies Record<string, RouteObject[]>;
