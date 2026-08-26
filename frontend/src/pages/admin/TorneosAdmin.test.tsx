import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TorneosAdmin from './TorneosAdmin';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mocks
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    userRole: 'super_admin',
    userId: 'admin1',
    token: 'fake-token',
    login: vi.fn(),
    logout: vi.fn(),
    loading: false
  })
}));

vi.mock('../../../features/torneos/api/torneos.api', () => ({
  getTorneosAdmin: vi.fn().mockResolvedValue({
    data: [
      {
        id_torneo: 1,
        nombre_torneo: 'Torneo Test Anular',
        fecha_inicio: '2026-01-01',
        fecha_fin: '2026-12-31',
        estado: 'programado',
        categorias: []
      }
    ],
    total: 1,
    pages: 1
  }),
  createTorneo: vi.fn(),
  updateTorneo: vi.fn(),
  anularTorneo: vi.fn(),
  addCategoria: vi.fn(),
  deleteCategoria: vi.fn(),
  uploadCalendario: vi.fn()
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('TorneosAdmin - Fase 4', () => {
  it('debe renderizar el botón de Nuevo Torneo', async () => {
    renderWithProviders(<TorneosAdmin />);
    const btnCrear = await screen.findByText('Nuevo Torneo');
    expect(btnCrear).toBeInTheDocument();
  });

  it('debe abrir el modal al presionar Nuevo Torneo', async () => {
    renderWithProviders(<TorneosAdmin />);
    const btnCrear = await screen.findByText('Nuevo Torneo');
    fireEvent.click(btnCrear);

    const inputNombre = await screen.findByPlaceholderText('Ej: Torneo Clausura 2026');
    expect(inputNombre).toBeInTheDocument();
    
    const btnSubmit = screen.getByRole('button', { name: /Crear Torneo/i });
    expect(btnSubmit).toBeInTheDocument();
  });
});
