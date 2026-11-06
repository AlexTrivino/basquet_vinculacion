import { Suspense } from 'react';

// Placeholder temporal de carga mientras se bajan los chunks.
export const withSuspense = (Component: React.LazyExoticComponent<any>) => (
  <Suspense
    fallback={
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <div className="text-slate-400">Cargando contenido...</div>
      </div>
    }
  >
    <Component />
  </Suspense>
);
