import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '@/modules/auth';
import { withSuspense } from '@/shared/ui/withSuspense';

const BuscadorJugadores = lazy(() => import('./pages/BuscadorJugadores'));

// publicas: dentro de MainLayout, con su propia guarda (visor y super_admin)
export const rutas = {
  publicas: [
    {
      path: '/visor',
      element: <ProtectedRoute allowedRoles={['visor', 'super_admin']} />,
      children: [{ index: true, element: withSuspense(BuscadorJugadores) }],
    },
  ],
} satisfies Record<string, RouteObject[]>;
