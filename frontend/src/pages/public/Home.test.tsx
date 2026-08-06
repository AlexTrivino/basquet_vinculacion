import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './Home';
import * as torneosApi from '../../features/torneos/api/torneos.api';
import axiosInstance from '../../api/axios.config';

vi.mock('../../features/torneos/api/torneos.api');
vi.mock('../../api/axios.config');

const mockTorneos = [
  {
    id_torneo: 1,
    nombre: 'Copa Verano Manta 2026',
    fecha_inicio: '2026-06-01',
    fecha_fin: '2026-08-30',
    estado: 'en_curso',
    categorias: [
      { id_categoria: 10, nombre_categoria: 'Senior Libre' },
      { id_categoria: 11, nombre_categoria: 'Maxibasquet +35' },
    ],
  },
  {
    id_torneo: 2,
    nombre: 'Liga Provincial 2026',
    fecha_inicio: '2026-04-15',
    fecha_fin: '2026-09-01',
    estado: 'inscripcion',
    categorias: [
      { id_categoria: 12, nombre_categoria: 'Sub-21 Promesas' },
    ],
  },
  {
    id_torneo: 3,
    nombre: 'Torneo Interclubes Costa 2025',
    fecha_inicio: '2025-10-01',
    fecha_fin: '2025-12-15',
    estado: 'finalizado',
    categorias: [
      { id_categoria: 13, nombre_categoria: 'Abierta Masculino' },
    ],
  },
];

const mockPartidos = [
  {
    id_partido: 101,
    id_torneo: 1,
    fase: 'Jornada 1',
    estado: 'finalizado',
    marcador_local: 88,
    marcador_visitante: 82,
    fecha: '2026-06-10',
    ubicacion: 'Coliseo Manta',
    equipo_local: { id_equipo: 1, nombre_equipo: 'Delfines BC' },
    equipo_visitante: { id_equipo: 2, nombre_equipo: 'Portoviejo Stars' },
  },
];

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(torneosApi.getTorneos).mockResolvedValue({
      success: true,
      message: 'Torneos obtenidos',
      data: mockTorneos as any,
    });

    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: {
        success: true,
        data: mockPartidos,
      },
    });
  });

  it('renderiza el título principal y el badge de torneo activo', async () => {
    renderWithProviders(<Home />);

    expect(
      screen.getByRole('heading', { name: /Torneos Baloncesto Manta/i, level: 1 })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/En Juego:/i)).toBeInTheDocument();
    });
  });

  it('autogenera las pestañas para los 2 años más recientes (2026 y 2025)', async () => {
    renderWithProviders(<Home />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Torneos 2026/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Torneos 2025/i })).toBeInTheDocument();
    });

    // Por defecto muestra los del año más reciente (2026) en las tarjetas
    expect(
      screen.getByRole('heading', { name: 'Copa Verano Manta 2026', level: 3 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Liga Provincial 2026', level: 3 })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Torneo Interclubes Costa 2025', level: 3 })
    ).not.toBeInTheDocument();
  });

  it('cambia reactivamente de año al hacer clic en la pestaña 2025', async () => {
    renderWithProviders(<Home />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Torneos 2025/i })).toBeInTheDocument();
    });

    const tab2025 = screen.getByRole('button', { name: /Torneos 2025/i });
    fireEvent.click(tab2025);

    // Ahora debe mostrar la tarjeta de 2025 y ocultar las de 2026
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Torneo Interclubes Costa 2025', level: 3 })
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('heading', { name: 'Copa Verano Manta 2026', level: 3 })
    ).not.toBeInTheDocument();
  });

  it('muestra el tooltip para delegados al interactuar con inscripciones abiertas', async () => {
    renderWithProviders(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/INSCRIPCIONES ABIERTAS/i)).toBeInTheDocument();
    });

    const badgeInscripcion = screen.getByText(/INSCRIPCIONES ABIERTAS/i);
    fireEvent.mouseEnter(badgeInscripcion);

    await waitFor(() => {
      expect(
        screen.getByText(/Debes crear una cuenta o iniciar sesión como/i)
      ).toBeInTheDocument();
    });
  });

  it('muestra un mensaje de error accesible cuando falla la carga de torneos', async () => {
    vi.mocked(torneosApi.getTorneos).mockRejectedValue(new Error('Network error'));

    renderWithProviders(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/Error al cargar los torneos/i)
      ).toBeInTheDocument();
    });
  });

  it('muestra un EmptyState cuando la base de datos no contiene torneos', async () => {
    vi.mocked(torneosApi.getTorneos).mockResolvedValue({
      success: true,
      message: 'Sin torneos',
      data: [],
    });

    renderWithProviders(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/Sin torneos registrados/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/No hay torneos registrados para el año/i)
      ).toBeInTheDocument();
    });
  });

  it('renderiza el botón deshabilitado de archivo histórico con badge "Próximamente"', async () => {
    renderWithProviders(<Home />);

    await waitFor(() => {
      const btnHistorico = screen.getByRole('button', { name: /Ver torneos anteriores/i });
      expect(btnHistorico).toBeDisabled();
      expect(screen.getByText(/Próximamente/i)).toBeInTheDocument();
    });
  });
});

