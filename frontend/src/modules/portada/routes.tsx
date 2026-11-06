import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { withSuspense } from '@/shared/ui/withSuspense';

const Home = lazy(() => import('./pages/Home'));

// publicas: dentro de MainLayout
export const rutas = {
  publicas: [{ path: '/', element: withSuspense(Home) }],
} satisfies Record<string, RouteObject[]>;
