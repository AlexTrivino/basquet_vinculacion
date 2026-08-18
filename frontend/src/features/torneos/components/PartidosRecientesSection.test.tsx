import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PartidosRecientesSection } from './PartidosRecientesSection';
import axiosInstance from '../../../api/axios.config';

vi.mock('../../../api/axios.config');

const mockPartidos = [
  {
    id_partido: 101,
    id_torneo: 1,
    fase: 'Final',
    estado: 'en_curso',
    marcador_local: 74,
    marcador_visitante: 70,
    fecha: '2026-08-01',
    ubicacion: 'Coliseo Mayor',
    equipo_local: { id_equipo: 1, nombre_equipo: 'Sharks Manta' },
    equipo_visitante: { id_equipo: 2, nombre_equipo: 'Delfines BC' },
  },
  {
    id_partido: 102,
    id_torneo: 1,
    fase: 'Semifinal',
    estado: 'finalizado',
    marcador_local: 85,
    marcador_visitante: 92,
    fecha: '2026-07-28',
    ubicacion: 'Cancha 2',
    equipo_local: { id_equipo: 3, nombre_equipo: 'Equipo A' },
    equipo_visitante: { id_equipo: 4, nombre_equipo: 'Equipo Ganador B' },
  },
  {
    id_partido: 103,
    id_torneo: 1,
    fase: 'Cuartos de Final',
    estado: 'programado',
    marcador_local: 0,
    marcador_visitante: 0,
    fecha: '2026-08-10',
    ubicacion: 'Coliseo Municipal',
    equipo_local: { id_equipo: 5, nombre_equipo: 'Equipo Futuro 1' },
    equipo_visitante: { id_equipo: 6, nombre_equipo: 'Equipo Futuro 2' },
  },
];

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PartidosRecientesSection />
    </QueryClientProvider>
  );
}

describe('PartidosRecientesSection Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada (retorna null) cuando la lista de partidos está vacía', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { success: true, data: [] },
    });

    const { container } = renderSection();
    
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });


  it('renderiza partidos en vivo con el badge EN VIVO pulsante', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { success: true, data: mockPartidos },
    });

    renderSection();

    expect(await screen.findByText('EN VIVO')).toBeInTheDocument();
    expect(screen.getByText('Sharks Manta')).toBeInTheDocument();
    expect(screen.getByText('Delfines BC')).toBeInTheDocument();
    expect(screen.getByText('74')).toBeInTheDocument();
    expect(screen.getByText('70')).toBeInTheDocument();
  });

  it('renderiza partidos finalizados mostrando el tag "Finalizado" y los marcadores finales', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { success: true, data: mockPartidos },
    });

    renderSection();

    expect(await screen.findByText('Finalizado')).toBeInTheDocument();
    expect(screen.getByText('Equipo Ganador B')).toBeInTheDocument();
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('renderiza partidos programados con el tag "Programado" sin mostrar marcadores', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { success: true, data: mockPartidos },
    });

    renderSection();

    expect(await screen.findByText('Programado')).toBeInTheDocument();
    expect(screen.getByText('Equipo Futuro 1')).toBeInTheDocument();
    expect(screen.getByText('Equipo Futuro 2')).toBeInTheDocument();
  });
});
