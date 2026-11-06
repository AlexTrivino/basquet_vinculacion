/**
 * Página de acceso denegado.
 *
 * Renderizada por `ProtectedRoute` cuando el `userRole`
 * no coincide con `allowedRoles`.
 * Placeholder mínimo sin diseño (se estiliza en Fase 3).
 */
import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      fontFamily: 'Inter, system-ui, sans-serif',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
        Acceso denegado
      </h1>
      <p style={{ color: '#64748B', margin: '0.5rem 0 1.5rem' }}>
        No tienes permisos para acceder a esta sección.
      </p>
      <Link
        to="/"
        style={{
          color: '#2563EB',
          textDecoration: 'underline',
          fontWeight: 500,
        }}
      >
        Volver al inicio
      </Link>
    </main>
  );
}
