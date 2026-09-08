import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestorPlantilla } from './GestorPlantilla';
import { BrowserRouter } from 'react-router-dom';

// Mocks
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    userRole: 'super_admin'
  })
}));

// Mocks de las APIs
vi.mock('../api/plantillas.api', () => ({
  getPlantillas: vi.fn().mockResolvedValue({
    data: [
      { id_plantilla: 1, id_jugador: 10, numero_camiseta: 10, posicion: 'Base', jugador: { nombres: 'Juan', apellidos: 'Perez', sexo: 'M' } }
    ]
  }),
  addJugadorToPlantilla: vi.fn(),
  removeJugadorFromPlantilla: vi.fn(),
  updateNumeroCamiseta: vi.fn()
}));

vi.mock('../../equipos/api/equipos.api', () => ({
  getEquipos: vi.fn().mockResolvedValue({ data: [] }),
  getInscripciones: vi.fn().mockResolvedValue({
    data: [{ id_torneo: 99, estado_inscripcion: 'aprobado', torneo: { estado: 'programado' }, categoria: { id_categoria: 1 } }]
  })
}));

vi.mock('../../torneos/api/torneos.api', () => ({
  getTorneos: vi.fn().mockResolvedValue({ data: [] })
}));

vi.mock('../../jugadores/api/jugadores.api', () => ({
  getJugadores: vi.fn().mockResolvedValue({ data: [], total: 0, pages: 1 })
}));

const mockCategoria = {
  id_categoria: 1,
  nombre_categoria: 'Senior',
  edad_minima: 18,
  edad_maxima: 99,
  genero: 'M'
};

describe('GestorPlantilla - Modos Admin y ReadOnly', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (props: any) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <GestorPlantilla {...props} />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('Modo Estándar (No Admin): renderiza selectores de equipo y torneo si no es un wizard', async () => {
    renderComponent({ isAdmin: false });
    // Verifica que renderiza el componente principal de plantilla (o el selector dependiendo del estado)
    const title = await screen.findByText('Roster del Equipo');
    expect(title).toBeInTheDocument();
  });

  it('Modo Admin (isAdmin=true): asume los overrides y muestra la plantilla sin selects previos', async () => {
    renderComponent({ 
      isAdmin: true, 
      idEquipoOverride: 5, 
      idTorneoOverride: 99, 
      categoriaOverride: mockCategoria 
    });

    // Muestra la interfaz principal de la plantilla, no el select
    const addBtn = await screen.findByRole('button', { name: /Añadir/i });
    expect(addBtn).toBeInTheDocument();
  });

  it('Modo ReadOnly (readOnly=true): NO renderiza botones de edición ni eliminación', async () => {
    renderComponent({ 
      isAdmin: true, 
      readOnly: true,
      idEquipoOverride: 5, 
      idTorneoOverride: 99, 
      categoriaOverride: mockCategoria 
    });

    // Validar que los botones de "Añadir Jugador", "X" o editar camiseta no existan
    // Esperamos a que cargue la tabla
    const row = await screen.findByText(/Falta Cédula/);
    expect(row).toBeInTheDocument();

    const addBtns = screen.queryByRole('button', { name: /Añadir/i });
    expect(addBtns).not.toBeInTheDocument();

    const removeBtns = screen.queryByRole('button', { name: /Quitar/i });
    expect(removeBtns).not.toBeInTheDocument();
  });
});
