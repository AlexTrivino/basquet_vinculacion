import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { withSuspense } from '@/shared/ui/withSuspense';

const Dashboard = lazy(() => import('./pages/Dashboard'));

// admin: hijas de /admin (la guarda de super_admin está en app/router.tsx)
export const rutas = {
  admin: [{ path: 'dashboard', element: withSuspense(Dashboard) }],
} satisfies Record<string, RouteObject[]>;
