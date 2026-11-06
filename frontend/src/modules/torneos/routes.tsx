import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { withSuspense } from '@/shared/ui/withSuspense';

const TorneoDetail = lazy(() => import('./pages/TorneoDetail'));
const TorneosAdmin = lazy(() => import('./pages/TorneosAdmin'));
const FaseFinal = lazy(() => import('./pages/FaseFinal'));

// publicas: dentro de MainLayout; admin: hijas de /admin (la guarda de super_admin está en app/router.tsx)
export const rutas = {
  publicas: [{ path: '/torneos/:id', element: withSuspense(TorneoDetail) }],
  admin: [
    { path: 'torneos', element: withSuspense(TorneosAdmin) },
    { path: 'fase-final', element: withSuspense(FaseFinal) },
  ],
} satisfies Record<string, RouteObject[]>;
