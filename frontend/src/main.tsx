import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes/router';
import './index.css';

/**
 * Entry point de la aplicación React.
 *
 * Fase 2: Inyección de Providers (Auth), ErrorBoundary y RouterProvider.
 * Fase 4: Inyección del Toaster (Sonner).
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);

