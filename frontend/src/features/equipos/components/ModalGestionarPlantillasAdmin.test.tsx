import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModalGestionarPlantillasAdmin } from './ModalGestionarPlantillasAdmin';
import { getInscripciones } from '../api/equipos.api';
import { getTorneos } from '../../torneos/api/torneos.api';
import type { Equipo } from '../../../types/api.types';

// Mock dependencias
vi.mock('../api/equipos.api', () => ({
  getInscripciones: vi.fn(),
}));

vi.mock('../../torneos/api/torneos.api', () => ({
  getTorneos: vi.fn(),
}));

// Mock GestorPlantilla para no testear su complejidad interna aquí
vi.mock('../../plantillas/components/GestorPlantilla', () => ({
  GestorPlantilla: ({ readOnly, isAdmin }: any) => (
    <div data-testid="mock-gestor-plantilla">
      GestorPlantilla Mock - Admin: {isAdmin ? 'Yes' : 'No'} - ReadOnly: {readOnly ? 'Yes' : 'No'}
    </div>
  )
}));

const mockEquipo: Equipo = {
  id_equipo: 10,
  nombre_equipo: 'Equipo Test',
  estado: 'activo',
  url_logo: '',
  url_foto_equipo: ''
};

describe('ModalGestionarPlantillasAdmin', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ModalGestionarPlantillasAdmin isOpen={true} onClose={vi.fn()} equipo={mockEquipo} {...props} />
      </QueryClientProvider>
    );
  };

  it('no renderiza nada si isOpen es false o equipo es null', () => {
    const { container, rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ModalGestionarPlantillasAdmin isOpen={false} onClose={vi.fn()} equipo={mockEquipo} />
      </QueryClientProvider>
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <QueryClientProvider client={queryClient}>
        <ModalGestionarPlantillasAdmin isOpen={true} onClose={vi.fn()} equipo={null} />
      </QueryClientProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el empty state cuando no hay inscripciones', async () => {
    (getTorneos as any).mockResolvedValue({ data: [] });
    (getInscripciones as any).mockResolvedValue({ data: [], pagination: { page: 1, pages: 1, total: 0 } });

    renderComponent();

    expect(await screen.findByText('Sin inscripciones')).toBeInTheDocument();
    expect(screen.getByText('Este equipo no está inscrito en ningún torneo actualmente.')).toBeInTheDocument();
  });

  it('renderiza inscripciones y el select de torneos correctamente', async () => {
    (getTorneos as any).mockResolvedValue({
      data: [{ id_torneo: 1, nombre: 'Torneo A' }, { id_torneo: 2, nombre: 'Torneo B' }]
    });
    
    (getInscripciones as any).mockResolvedValue({
      data: [
        {
          id_inscripcion: 100,
          estado_inscripcion: 'aprobado',
          torneo: { id_torneo: 1, nombre: 'Torneo A', estado: 'programado' },
          categoria: { id_categoria: 1, nombre_categoria: 'Senior' }
        },
        {
          id_inscripcion: 101,
          estado_inscripcion: 'aprobado',
          torneo: { id_torneo: 2, nombre: 'Torneo B', estado: 'finalizado' },
          categoria: { id_categoria: 2, nombre_categoria: 'Master' }
        }
      ],
      pagination: { page: 1, pages: 1, total: 2 }
    });

    renderComponent();

    // Filtro torneos
    await screen.findByRole('combobox');
    expect((await screen.findAllByText('Torneo A'))[0]).toBeInTheDocument();

    // Inscripciones en pantalla
    const card1 = (await screen.findAllByText('Torneo A'))[0];
    const card2 = (await screen.findAllByText('Torneo B'))[0];
    expect(card1).toBeInTheDocument();
    expect(card2).toBeInTheDocument();

    // Verificar los botones según estado del torneo
    const editBtns = screen.getAllByRole('button', { name: /Editar Plantilla/i });
    expect(editBtns.length).toBe(1);

    const viewBtns = screen.getAllByRole('button', { name: /Ver Plantilla/i });
    expect(viewBtns.length).toBe(1);
  });

  it('cambia el filtro de torneo y hace refetch', async () => {
    (getTorneos as any).mockResolvedValue({
      data: [{ id_torneo: 1, nombre: 'Torneo A' }]
    });
    (getInscripciones as any).mockResolvedValue({ data: [], pagination: {} });

    renderComponent();
    
    const select = await screen.findByRole('combobox');
    await screen.findAllByText('Torneo A');
    
    // Cambiar filtro
    fireEvent.change(select, { target: { value: '1' } });
    
    // Verificar que getInscripciones se llama con idTorneo = 1 (el tercer argumento)
    await waitFor(() => {
      expect(getInscripciones).toHaveBeenCalledWith(1, 9, 1, undefined, undefined, 10);
    });
  });

  it('renderiza paginación y permite cambiar de página', async () => {
    (getTorneos as any).mockResolvedValue({ data: [] });
    (getInscripciones as any).mockResolvedValue({
      data: [{ id_inscripcion: 1, torneo: { nombre: 'Torneo Pag' }, categoria: { nombre_categoria: 'C1' } }],
      pagination: { page: 1, pages: 2, total: 10 }
    });

    renderComponent();

    const nextPageBtn = await screen.findByRole('button', { name: /Siguiente/i });
    expect(nextPageBtn).not.toBeDisabled();
    
    fireEvent.click(nextPageBtn);
    
    await waitFor(() => {
      // El primer param es la página
      expect(getInscripciones).toHaveBeenCalledWith(2, 9, undefined, undefined, undefined, 10);
    });
  });

  it('abre GestorPlantilla en modo edición (isAdmin=true) al dar click en Editar Plantilla', async () => {
    (getTorneos as any).mockResolvedValue({ data: [] });
    (getInscripciones as any).mockResolvedValue({
      data: [
        {
          id_inscripcion: 1,
          estado_inscripcion: 'aprobado',
          torneo: { id_torneo: 1, nombre: 'Torneo Activo', estado: 'programado' },
          categoria: { id_categoria: 1, nombre_categoria: 'Senior' }
        }
      ],
      pagination: { page: 1, pages: 1, total: 1 }
    });

    renderComponent();

    const btnEditar = await screen.findByRole('button', { name: /Editar Plantilla/i });
    fireEvent.click(btnEditar);

    const mockGestor = await screen.findByTestId('mock-gestor-plantilla');
    expect(mockGestor).toBeInTheDocument();
    // Torneo activo -> No readOnly, sí Admin
    expect(mockGestor).toHaveTextContent('GestorPlantilla Mock - Admin: Yes - ReadOnly: No');
  });

  it('abre GestorPlantilla en modo readOnly al dar click en Ver Plantilla (Torneo Finalizado)', async () => {
    (getTorneos as any).mockResolvedValue({ data: [] });
    (getInscripciones as any).mockResolvedValue({
      data: [
        {
          id_inscripcion: 2,
          estado_inscripcion: 'aprobado',
          torneo: { id_torneo: 2, nombre: 'Torneo Viejo', estado: 'finalizado' },
          categoria: { id_categoria: 1, nombre_categoria: 'Senior' }
        }
      ],
      pagination: { page: 1, pages: 1, total: 1 }
    });

    renderComponent();

    const btnVer = await screen.findByRole('button', { name: /Ver Plantilla/i });
    fireEvent.click(btnVer);

    const mockGestor = await screen.findByTestId('mock-gestor-plantilla');
    expect(mockGestor).toHaveTextContent('GestorPlantilla Mock - Admin: Yes - ReadOnly: Yes');
  });
});
