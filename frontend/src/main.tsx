import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes/router';
import './index.css';

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

