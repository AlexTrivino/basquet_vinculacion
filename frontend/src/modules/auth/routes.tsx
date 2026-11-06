import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { withSuspense } from '@/shared/ui/withSuspense';
import { ProtectedRoute } from './ProtectedRoute';

const Login = lazy(() => import('./pages/Login'));
const Registro = lazy(() => import('./pages/Registro'));
const RecuperarPassword = lazy(() => import('./pages/RecuperarPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const MiPerfil = lazy(() => import('./pages/MiPerfil'));

// publicas: dentro de MainLayout; sueltas: sin el Navbar (el login y la recuperación de la clave)
export const rutas = {
  publicas: [
    {
      path: '/perfil',
      element: <ProtectedRoute allowedRoles={['super_admin', 'delegado', 'visor']} />,
      children: [{ index: true, element: withSuspense(MiPerfil) }],
    },
  ],
  sueltas: [
    { path: '/auth/login', element: withSuspense(Login) },
    { path: '/auth/registro', element: withSuspense(Registro) },
    { path: '/auth/recuperar', element: withSuspense(RecuperarPassword) },
    { path: '/auth/reset-password', element: withSuspense(ResetPassword) },
  ],
} satisfies Record<string, RouteObject[]>;
