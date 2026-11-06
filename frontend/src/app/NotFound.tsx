/**
 * Página 404 — Ruta no encontrada.
 *
 * Renderizada por la ruta catch-all `*` del router.
 * Placeholder mínimo sin diseño (se estiliza en Fase 3).
 */
import { Link } from 'react-router-dom';

export default function NotFound() {
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
      <h1 style={{ fontSize: '4rem', fontWeight: 700, margin: 0 }}>404</h1>
      <p style={{ color: '#64748B', margin: '0.5rem 0 1.5rem' }}>
        La página que buscas no existe.
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
