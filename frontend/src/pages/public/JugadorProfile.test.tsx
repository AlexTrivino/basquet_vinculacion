import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JugadorProfile from './JugadorProfile';
import * as jugadoresApi from '../../features/jugadores/api/jugadores.api';
import * as sancionesApi from '../../features/sanciones/api/sanciones.api';

// Mock de APIs
vi.mock('../../features/jugadores/api/jugadores.api');
vi.mock('../../features/sanciones/api/sanciones.api');

const mockJugadorData = {
  id_jugador: 42,
  nombre: 'Alexander Triviño',
  url_foto: 'https://ejemplo.com/foto.jpg',
  participaciones: [
    {
      id_plantilla: 101,
      numero_camiseta: 23,
      id_equipo: 5,
      nombre_equipo: 'Sharks Manta',
      url_logo: 'https://ejemplo.com/sharks.png',
      id_torneo: 1,
      nombre_torneo: 'Torneo Apertura 2026',
      anio: 2026,
      id_categoria: 2,
      nombre_categoria: 'Maxi 35',
    },
    {
      id_plantilla: 102,
      numero_camiseta: 10,
      id_equipo: 8,
      nombre_equipo: 'Manta Hoops',
      url_logo: null,
      id_torneo: 2,
      nombre_torneo: 'Copa Ciudad 2026',
      anio: 2026,
      id_categoria: 1,
      nombre_categoria: 'Libre Masculino',
    },
  ],
  estadisticas: {
    partidos_jugados: 15,
    puntos_totales: 220,
    promedio_puntos: 14.7,
    rebotes_totales: 60,
    asistencias_totales: 45,
    triples_totales: 18,
  },
  estadisticas_por_torneo: {
    '1': {
      partidos_jugados: 10,
      puntos_totales: 160,
      promedio_puntos: 16.0,
      rebotes_totales: 40,
      asistencias_totales: 30,
      triples_totales: 12,
    },
    '2': {
      partidos_jugados: 5,
      puntos_totales: 60,
      promedio_puntos: 12.0,
      rebotes_totales: 20,
      asistencias_totales: 15,
      triples_totales: 6,
    },
  },
  documento_identificacion: '1314151617',
  fecha_nacimiento: '1995-06-15',
  genero: 'masculino',
  correo: 'alex@test.com',
  telefono: '0999999999',
};

import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/jugadores/42']}>
          <Routes>
            <Route path="/jugadores/:id" element={<JugadorProfile />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('JugadorProfile', () => {
  it('renderiza el nombre del jugador en MAYÚSCULAS COMPLETAS', async () => {
    vi.mocked(jugadoresApi.getJugadorPerfil).mockResolvedValue({
      data: mockJugadorData as any,
    } as any);
    vi.mocked(sancionesApi.getSanciones).mockResolvedValue({
      data: [],
    } as any);

    renderWithProviders();

    expect(await screen.findByText('ALEXANDER TRIVIÑO')).toBeInTheDocument();
  });

  it('muestra las participaciones con los nombres de equipos, torneos y números de camiseta contextuales', async () => {
    vi.mocked(jugadoresApi.getJugadorPerfil).mockResolvedValue({
      data: mockJugadorData as any,
    } as any);
    vi.mocked(sancionesApi.getSanciones).mockResolvedValue({
      data: [],
    } as any);

    renderWithProviders();

    expect(await screen.findByText('Sharks Manta')).toBeInTheDocument();
    expect(screen.getByText('#23')).toBeInTheDocument();
    expect(screen.getByText('Manta Hoops')).toBeInTheDocument();
    expect(screen.getByText('#10')).toBeInTheDocument();
    expect(screen.getByText('Maxi 35')).toBeInTheDocument();
    expect(screen.getByText('Libre Masculino')).toBeInTheDocument();
  });

  it('pagina las participaciones mostrando un máximo de 4 a la vez y permite navegar adelante y atrás sin duplicar', async () => {
    const jugadorConMuchasParticipaciones = {
      ...mockJugadorData,
      participaciones: [
        { id_plantilla: 1, id_equipo: 1, nombre_equipo: 'Equipo A (2026)', anio: 2026, id_torneo: 1, nombre_torneo: 'Torneo 2026', numero_camiseta: 1, nombre_categoria: 'Libre' },
        { id_plantilla: 2, id_equipo: 2, nombre_equipo: 'Equipo B (2024)', anio: 2024, id_torneo: 2, nombre_torneo: 'Torneo 2024', numero_camiseta: 2, nombre_categoria: 'Libre' },
        { id_plantilla: 3, id_equipo: 3, nombre_equipo: 'Equipo C (2023)', anio: 2023, id_torneo: 3, nombre_torneo: 'Torneo 2023', numero_camiseta: 3, nombre_categoria: 'Libre' },
        { id_plantilla: 4, id_equipo: 4, nombre_equipo: 'Equipo D (2022)', anio: 2022, id_torneo: 4, nombre_torneo: 'Torneo 2022', numero_camiseta: 4, nombre_categoria: 'Libre' },
        { id_plantilla: 5, id_equipo: 5, nombre_equipo: 'Equipo E (2021)', anio: 2021, id_torneo: 5, nombre_torneo: 'Torneo 2021', numero_camiseta: 5, nombre_categoria: 'Libre' },
      ],
    };

    vi.mocked(jugadoresApi.getJugadorPerfil).mockResolvedValue({
      data: jugadorConMuchasParticipaciones as any,
    } as any);

    renderWithProviders();

    // Página 1: Muestra los 4 más recientes (2026, 2024, 2023, 2022)
    expect(await screen.findByText('Equipo A (2026)')).toBeInTheDocument();
    expect(screen.getByText('Equipo B (2024)')).toBeInTheDocument();
    expect(screen.getByText('Equipo C (2023)')).toBeInTheDocument();
    expect(screen.getByText('Equipo D (2022)')).toBeInTheDocument();
    expect(screen.queryByText('Equipo E (2021)')).not.toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    // Navegar a la página 2
    const btnSiguiente = screen.getByRole('button', { name: /página siguiente/i });
    fireEvent.click(btnSiguiente);

    // Página 2: Muestra el 5to equipo (2021) y oculta los de la pág 1
    expect(await screen.findByText('Equipo E (2021)')).toBeInTheDocument();
    expect(screen.queryByText('Equipo A (2026)')).not.toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    // Navegar de vuelta a la página 1
    const btnAnterior = screen.getByRole('button', { name: /página anterior/i });
    fireEvent.click(btnAnterior);

    // Página 1 nuevamente
    expect(await screen.findByText('Equipo A (2026)')).toBeInTheDocument();
    expect(screen.queryByText('Equipo E (2021)')).not.toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('permite cambiar el filtro de estadísticas para ver números específicos de un torneo', async () => {
    vi.mocked(jugadoresApi.getJugadorPerfil).mockResolvedValue({
      data: mockJugadorData as any,
    } as any);

    renderWithProviders();

    // Por defecto muestra las estadísticas globales (220 puntos)
    expect(await screen.findByText('220')).toBeInTheDocument();

    // Cambiar el select a Torneo 1 (160 puntos)
    const selectFiltro = screen.getByRole('combobox', { name: /filtro de torneo/i });
    fireEvent.change(selectFiltro, { target: { value: '1' } });

    expect(await screen.findByText('160')).toBeInTheDocument();
    expect(screen.queryByText('220')).not.toBeInTheDocument();
  });

  it('muestra la pantalla de error "Jugador no encontrado" cuando la API retorna null o falla', async () => {
    vi.mocked(jugadoresApi.getJugadorPerfil).mockResolvedValue({
      data: null as any,
    } as any);

    renderWithProviders();

    expect(await screen.findByText('Jugador no encontrado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver al inicio/i })).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando el jugador no tiene participaciones registradas', async () => {
    const jugadorSinParticipaciones = {
      ...mockJugadorData,
      participaciones: [],
    };

    vi.mocked(jugadoresApi.getJugadorPerfil).mockResolvedValue({
      data: jugadorSinParticipaciones as any,
    } as any);

    renderWithProviders();

    expect(
      await screen.findByText(/Actualmente no registra equipos activos asignados/i)
    ).toBeInTheDocument();
  });
});


