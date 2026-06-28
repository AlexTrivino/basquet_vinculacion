/**
 * Error Boundary global para la aplicación React.
 *
 * Atrapa errores de renderizado en el árbol de componentes hijos
 * y muestra una UI de fallback en vez de una pantalla blanca.
 *
 * Debe usarse como componente de clase porque React no expone
 * `componentDidCatch` / `getDerivedStateFromError` en hooks.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // En producción se enviaría a un servicio de monitoreo.
    // Para el MVP, log en consola es suficiente.
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100dvh',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Algo salió mal
          </h1>
          <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
            Ocurrió un error inesperado. Intenta recargar la página.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Recargar página
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
