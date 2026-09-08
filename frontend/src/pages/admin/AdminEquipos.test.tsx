import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminEquipos from './AdminEquipos';
import { getEquiposAdmin } from '../../features/equipos/api/equipos.api';
import { getTorneos } from '../../features/torneos/api/torneos.api';
import { BrowserRouter } from 'react-router-dom';

// Mocks
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    userRole: 'super_admin'
  })
}));

vi.mock('../../features/equipos/api/equipos.api', () => ({
  getEquiposAdmin: vi.fn(),
  reactivarEquipo: vi.fn(),
  desactivarEquipo: vi.fn()
}));

vi.mock('../../features/torneos/api/torneos.api', () => ({
  getTorneos: vi.fn()
}));

// Mock del modal para probar que se abre correctamente
vi.mock('../../features/equipos/components/ModalGestionarPlantillasAdmin', () => ({
  ModalGestionarPlantillasAdmin: ({ isOpen, equipo }: any) => {
    if (!isOpen) return null;
    return <div data-testid="mock-modal-plantillas">Modal abierto para {equipo?.nombre_equipo}</div>;
  }
}));

describe('AdminEquipos - Tabla de Equipos', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    (getTorneos as any).mockResolvedValue({ data: [] });
    (getEquiposAdmin as any).mockResolvedValue({
      data: [
        {
          id_equipo: 1,
          nombre_equipo: 'Equipo Alpha',
          estado: 'activo',
          usuario: { nombre: 'Delegado A', email: 'a@test.com' },
          inscripciones: []
        }
      ],
      total: 1,
      pages: 1
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AdminEquipos />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('debe renderizar los nuevos botones de texto "Plantillas" y "Editar" en Acciones', async () => {
    renderComponent();
    
    // Esperar a que la tabla se cargue
    const equipoRow = await screen.findByText('Equipo Alpha');
    expect(equipoRow).toBeInTheDocument();

    const btnPlantillas = screen.getByRole('button', { name: /Plantillas/i });
    const btnEditar = screen.getByRole('button', { name: /Editar/i });

    expect(btnPlantillas).toBeInTheDocument();
    expect(btnEditar).toBeInTheDocument();
  });

  it('debe abrir ModalGestionarPlantillasAdmin al dar clic en el botón Plantillas', async () => {
    renderComponent();
    
    const btnPlantillas = await screen.findByRole('button', { name: /Plantillas/i });
    fireEvent.click(btnPlantillas);

    const mockModal = await screen.findByTestId('mock-modal-plantillas');
    expect(mockModal).toBeInTheDocument();
    expect(mockModal).toHaveTextContent('Modal abierto para Equipo Alpha');
  });
});
