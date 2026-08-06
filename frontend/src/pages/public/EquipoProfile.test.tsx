import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EquipoProfile from './EquipoProfile';
import * as equiposApi from '../../features/equipos/api/equipos.api';
import * as partidosApi from '../../features/partidos/api/partidos.api';
import * as plantillasApi from '../../features/plantillas/api/plantillas.api';

// Mocks de APIs
vi.mock('../../features/equipos/api/equipos.api');
vi.mock('../../features/partidos/api/partidos.api');
vi.mock('../../features/plantillas/api/plantillas.api');
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    userRole: null,
    user: null,
  }),
}));

const mockEquipo = {
  id_equipo: 1,
  nombre_equipo: 'Delfines Basketball Club',
  url_logo: 'https://ejemplo.com/delfines.png',
  url_foto_equipo: 'https://ejemplo.com/banner.jpg',
  estado: 'activo',
  usuario: {
    nombre: 'Carlos Delgado',
    correo: 'carlos@delfines.com',
  },
};

const mockPlantillas = [
  {
    id_plantilla: 101,
    id_jugador: 50,
    id_equipo: 1,
    id_torneo: 1,
    numero_camiseta: 23,
    jugador: {
      id_jugador: 50,
      nombre: 'Michael Jordán',
      url_foto: null,
    },
  },
  {
    id_plantilla: 102,
    id_jugador: 51,
    id_equipo: 1,
    id_torneo: 1,
    numero_camiseta: 7,
    jugador: {
      id_jugador: 51,
      nombre: 'Luka Doncic',
      url_foto: null,
    },
  },
];

const mockPartidos = [
  {
    id_partido: 201,
    fecha: '2026-03-10',
    hora: '19:30',
    estado: 'finalizado',
    marcador_local: 84,
    marcador_visitante: 76,
    id_equipo_local: 1,
    id_equipo_visitante: 2,
    ubicacion: 'Coliseo Pablo Delgado Álava',
    torneo: { id_torneo: 99, nombre: 'Supercopa Manta 2026' },
    equipo_local: { id_equipo: 1, nombre_equipo: 'Delfines Basketball Club' },
    equipo_visitante: { id_equipo: 2, nombre_equipo: 'Tiburones BBC' },
  },
  {
    id_partido: 202,
    fecha: '2026-03-18',
    hora: '20:00',
    estado: 'programado',
    marcador_local: 0,
    marcador_visitante: 0,
    id_equipo_local: 3,
    id_equipo_visitante: 1,
    ubicacion: 'Cancha Central',
    fase: 'Semifinales',
    torneo: { id_torneo: 99, nombre: 'Supercopa Manta 2026' },
    equipo_local: { id_equipo: 3, nombre_equipo: 'Leones de Manta' },
    equipo_visitante: { id_equipo: 1, nombre_equipo: 'Delfines Basketball Club' },
  },
];

const mockInscripciones = [
  {
    id_inscripcion: 301,
    id_torneo: 1,
    id_equipo: 1,
    id_categoria: 10,
    estado_inscripcion: 'aprobado',
    torneo: {
      id_torneo: 1,
      nombre: 'Copa Verano Manta 2026',
      fecha_inicio: '2026-01-15',
    },
    categoria: {
      id_categoria: 10,
      nombre_categoria: 'Senior Libre',
      genero_categoria: 'Masculino',
    },
  },
  {
    id_inscripcion: 302,
    id_torneo: 2,
    id_equipo: 1,
    id_categoria: 11,
    estado_inscripcion: 'aprobado',
    torneo: {
      id_torneo: 2,
      nombre: 'Torneo Apertura 2024',
      fecha_inicio: '2024-05-10',
    },
    categoria: {
      id_categoria: 11,
      nombre_categoria: 'Maxi +35',
      genero_categoria: 'Masculino',
    },
  },
  {
    id_inscripcion: 303,
    id_torneo: 3,
    id_equipo: 1,
    id_categoria: 12,
    estado_inscripcion: 'aprobado',
    torneo: {
      id_torneo: 3,
      nombre: 'Liga Provincial 2023',
      fecha_inicio: '2023-08-20',
    },
    categoria: {
      id_categoria: 12,
      nombre_categoria: 'Senior Libre',
      genero_categoria: 'Masculino',
    },
  },
  {
    id_inscripcion: 304,
    id_torneo: 4,
    id_equipo: 1,
    id_categoria: 13,
    estado_inscripcion: 'aprobado',
    torneo: {
      id_torneo: 4,
      nombre: 'Copa Fundadores 2022',
      fecha_inicio: '2022-09-01',
    },
    categoria: {
      id_categoria: 13,
      nombre_categoria: 'Sub-23',
      genero_categoria: 'Masculino',
    },
  },
];

const renderComponent = (teamId = 1) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <EquipoProfile teamId={teamId} />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('EquipoProfile Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(equiposApi, 'getEquipoById').mockResolvedValue({
      success: true,
      data: mockEquipo,
      message: 'Equipo encontrado',
    });

    vi.spyOn(plantillasApi, 'getPlantillas').mockResolvedValue({
      success: true,
      data: mockPlantillas,
      message: 'Plantilla obtenida',
    });

    vi.spyOn(partidosApi, 'getPartidosByEquipo').mockResolvedValue({
      success: true,
      data: mockPartidos,
      message: 'Partidos obtenidos',
    });

    vi.spyOn(equiposApi, 'getInscripcionesPublicas').mockResolvedValue({
      success: true,
      data: mockInscripciones,
      message: 'Inscripciones obtenidas',
    });
  });

  it('renderiza la cabecera deportiva con el nombre en mayúsculas y delegado', async () => {
    renderComponent();

    expect(await screen.findByRole('heading', { name: /delfines basketball club/i })).toBeInTheDocument();
    expect(screen.getByText(/Carlos Delgado/i)).toBeInTheDocument();
    expect(screen.getByText('Club Oficial')).toBeInTheDocument();
  });

  it('muestra el último resultado con marcador y badge de victoria', async () => {
    renderComponent();

    expect(await screen.findByText('Último Resultado')).toBeInTheDocument();
    expect(screen.getByText('Victoria')).toBeInTheDocument();
    expect(screen.getByText('84')).toBeInTheDocument();
    expect(screen.getByText('76')).toBeInTheDocument();
    expect(screen.getByText(/Tiburones BBC/i)).toBeInTheDocument();
  });

  it('muestra la cola de próximos partidos con hora y rival', async () => {
    renderComponent();

    expect(await screen.findByText('Próximos Encuentros')).toBeInTheDocument();
    expect(screen.getByText(/Leones de Manta/i)).toBeInTheDocument();
    expect(screen.getByText(/20:00/i)).toBeInTheDocument();
  });

  it('renderiza la lista del roster oficial con jugadores y números de camiseta', async () => {
    renderComponent();

    expect(await screen.findByText(/Michael Jordán/i)).toBeInTheDocument();
    expect(screen.getByText('#23')).toBeInTheDocument();
    expect(screen.getByText(/Luka Doncic/i)).toBeInTheDocument();
    expect(screen.getByText('#7')).toBeInTheDocument();
  });

  it('paginación del historial de participaciones muestra máximo 3 tarjetas por vista y navega correctamente', async () => {
    renderComponent();

    // Deben aparecer las 3 primeras ordenadas por año (2026, 2024, 2023)
    expect(await screen.findByRole('heading', { name: 'Copa Verano Manta 2026' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Torneo Apertura 2024' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Liga Provincial 2023' })).toBeInTheDocument();

    // La 4ta (2022) NO debe estar en la primera página
    expect(screen.queryByRole('heading', { name: 'Copa Fundadores 2022' })).not.toBeInTheDocument();

    // Navegar a la página 2
    const btnSiguiente = screen.getByRole('button', { name: /Página siguiente/i });
    fireEvent.click(btnSiguiente);

    // Ahora en página 2 debe verse la del 2022
    expect(await screen.findByRole('heading', { name: 'Copa Fundadores 2022' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Copa Verano Manta 2026' })).not.toBeInTheDocument();

    // Regresar a la página 1
    const btnAnterior = screen.getByRole('button', { name: /Página anterior/i });
    fireEvent.click(btnAnterior);

    expect(await screen.findByRole('heading', { name: 'Copa Verano Manta 2026' })).toBeInTheDocument();
  });

  it('detecta correctamente una derrota en el último partido cuando el rival anota más puntos', async () => {
    const partidoDerrota = [
      {
        ...mockPartidos[0],
        marcador_local: 70,
        marcador_visitante: 85, // Delfines es local con 70 vs 85
      },
    ];

    vi.spyOn(partidosApi, 'getPartidosByEquipo').mockResolvedValue({
      success: true,
      data: partidoDerrota,
      message: 'Partidos obtenidos',
    });

    renderComponent();

    expect(await screen.findByText('Derrota')).toBeInTheDocument();
  });

  it('muestra el banner de advertencia cuando el equipo está inactivo', async () => {
    vi.spyOn(equiposApi, 'getEquipoById').mockResolvedValue({
      success: true,
      data: { ...mockEquipo, estado: 'inactivo' },
      message: 'Equipo inactivo',
    });

    renderComponent();

    expect(
      await screen.findByText(/Este equipo se encuentra actualmente inactivo en la liga/i)
    ).toBeInTheDocument();
  });

  it('muestra los EmptyStates correspondientes cuando el club no tiene partidos ni participaciones', async () => {
    vi.spyOn(partidosApi, 'getPartidosByEquipo').mockResolvedValue({
      success: true,
      data: [],
      message: 'Sin partidos',
    });

    vi.spyOn(equiposApi, 'getInscripcionesPublicas').mockResolvedValue({
      success: true,
      data: [],
      message: 'Sin inscripciones',
    });

    renderComponent();

    expect(await screen.findByText('Sin partidos finalizados')).toBeInTheDocument();
    expect(screen.getByText('Sin compromisos programados')).toBeInTheDocument();
    expect(screen.getByText('Aún no registra participaciones oficiales aprobadas.')).toBeInTheDocument();
  });

  it('muestra la pantalla de error "Equipo no encontrado" cuando la API retorna null', async () => {
    vi.spyOn(equiposApi, 'getEquipoById').mockResolvedValue({
      success: true,
      data: null as any,
      message: 'No encontrado',
    });

    renderComponent();

    expect(await screen.findByText('Equipo no encontrado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver al Directorio/i })).toBeInTheDocument();
  });
});

