import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { withSuspense } from '@/shared/ui/withSuspense';

const Inscripcion = lazy(() => import('./pages/Inscripcion'));
const Reinscripcion = lazy(() => import('./pages/Reinscripcion'));
const Plantilla = lazy(() => import('./pages/Plantilla'));

// delegado: hijas de /delegado (la guarda del rol está en app/router.tsx)
export const rutas = {
  delegado: [
    { path: 'inscripcion', element: withSuspense(Inscripcion) },
    { path: 'reinscripcion/:idEquipo', element: withSuspense(Reinscripcion) },
    { path: 'plantilla', element: withSuspense(Plantilla) },
  ],
} satisfies Record<string, RouteObject[]>;
