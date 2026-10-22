import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PartidosList } from './PartidosList';

const auth = vi.hoisted(() => ({ rol: null as string | null }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ userRole: auth.rol }) }));
vi.mock('../../flyers/components/FlyerFecha', () => ({ default: () => <p>flyer de la fecha</p> }));
vi.mock('../api/torneos.api', () => ({
  getPartidosByTorneo: async () => ({
    data: [{
      id_partido: 1, fecha: '2026-10-22', hora: '16:00:00', estado: 'programado', fase: 'PRIMERA FASE', marcador_local: 0, marcador_visitante: 0,
      id_categoria: 3, categoria: { id_categoria: 3, nombre_categoria: 'Juvenil', genero_categoria: 'masculino' },
      equipo_local: { id_equipo: 1, nombre_equipo: 'SAN JOSÉ' }, equipo_visitante: { id_equipo: 2, nombre_equipo: 'FAE' },
    }],
  }),
}));

async function elegirFecha(rol: string | null) {
  auth.rol = rol;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <PartidosList torneoId="2" />
      </MemoryRouter>
    </QueryClientProvider>
  );
  fireEvent.click(await screen.findByRole('button', { name: /^22 de octubre/ }));
}

describe('flyer de la fecha en el calendario del torneo', () => {
  it('solo el admin lo ve al elegir una fecha', async () => {
    await elegirFecha('super_admin');
    expect(await screen.findByText('flyer de la fecha')).toBeTruthy();
  });

  it.each([null, 'delegado', 'visor'])('el rol %s no lo ve', async (rol) => {
    await elegirFecha(rol);
    await screen.findByText('Ver todos los partidos');
    expect(screen.queryByText('flyer de la fecha')).toBeNull();
    fireEvent.click(screen.getByText('Ver todos los partidos'));
    expect(screen.queryByText(/descargar su flyer/)).toBeNull();
  });
});
