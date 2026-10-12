import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes/router';
import './index.css';

// Tras un deploy, una pestaña abierta desde antes pide chunks que el build nuevo ya borró
// ("Failed to fetch dynamically imported module"): se recarga una vez para traer el index.html nuevo.
// Si vuelve a fallar en menos de 10 s, el chunk falta de verdad y se deja ver el error (sin bucle).
window.addEventListener('vite:preloadError', () => {
  try {
    if (Date.now() - Number(sessionStorage.getItem('recarga-por-deploy')) < 10_000) return;
    sessionStorage.setItem('recarga-por-deploy', String(Date.now()));
  } catch {
    return; // sin sessionStorage no hay cómo evitar un bucle de recargas: mejor mostrar el error
  }
  window.location.reload();
});

const queryClient = new QueryClient();

/**
 * Entry point de la aplicación React.
 *
 * Fase 2: Inyección de Providers (Auth), ErrorBoundary y RouterProvider.
 * Fase 4: Inyección del Toaster (Sonner).
 * Fase 9: Inyección de QueryClientProvider para manejo de estado del servidor.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);

