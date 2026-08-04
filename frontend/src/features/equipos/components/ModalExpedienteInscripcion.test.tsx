import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModalExpedienteInscripcion } from './ModalExpedienteInscripcion';
import * as plantillasApi from '../../plantillas/api/plantillas.api';
import type { Inscripcion } from '../../../types/api.types';

vi.mock('../../plantillas/api/plantillas.api');

const mockInscripcion: Inscripcion = {
  id_inscripcion: 1,
  id_torneo: 10,
  id_equipo: 20,
  id_categoria: 30,
  estado_inscripcion: 'pendiente',
  fecha_inscripcion: '2026-08-01',
  url_comprobante_pago: 'https://storage.supabase.co/comprobantes/recibo.pdf',
  equipo: {
    id_equipo: 20,
    nombre_equipo: 'Halcones de Portoviejo',
    usuario: {
      nombre: 'Carlos Delegado',
      correo: 'carlos@halcones.com',
    },
  },
  torneo: {
    id_torneo: 10,
    nombre: 'Copa Verano 2026',
    fecha_inicio: '2026-08-01',
    fecha_fin: '2026-09-01',
    estado: 'en_curso',
  },
  categoria: {
    id_categoria: 30,
    nombre_categoria: 'Senior Libre',
    edad_minima: 18,
    edad_maxima: 35,
  },
};

const mockPlantillas = [
  {
    id: 1,
    id_equipo: 20,
    id_jugador: 101,
    id_torneo: 10,
    numero_camiseta: 23,
    jugador: {
      id_jugador: 101,
      nombre: 'Michael Jordan',
      documento_identificacion: '1312345678',
      fecha_nacimiento: '2000-05-10',
      url_cedula: 'https://storage.supabase.co/docs/ci.pdf',
    },
  },
  {
    id: 2,
    id_equipo: 20,
    id_jugador: 102,
    id_torneo: 10,
    numero_camiseta: 7,
    jugador: {
      id_jugador: 102,
      nombre: 'Luka Doncic',
      documento_identificacion: '1398765432',
      fecha_nacimiento: '2004-02-28',
    },
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('ModalExpedienteInscripcion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada si isOpen es false', () => {
    const { container } = render(
      <ModalExpedienteInscripcion
        isOpen={false}
        onClose={vi.fn()}
        inscripcion={mockInscripcion}
        onAprobar={vi.fn()}
        onRechazar={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza información del club, delegado y comprobante', async () => {
    vi.spyOn(plantillasApi, 'getPlantillas').mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: mockPlantillas as any,
    });

    render(
      <ModalExpedienteInscripcion
        isOpen={true}
        onClose={vi.fn()}
        inscripcion={mockInscripcion}
        onAprobar={vi.fn()}
        onRechazar={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/Expediente: Halcones de Portoviejo/i)).toBeInTheDocument();
    expect(screen.getByText('Carlos Delegado')).toBeInTheDocument();
    expect(screen.getByText('carlos@halcones.com')).toBeInTheDocument();
    expect(screen.getAllByText(/Senior Libre/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Documento PDF Adjunto/i)).toBeInTheDocument();

    // Esperar a que cargue la plantilla
    await waitFor(() => {
      expect(screen.getByText('Michael Jordan')).toBeInTheDocument();
      expect(screen.getByText('Luka Doncic')).toBeInTheDocument();
    });

    expect(screen.getByText('#23')).toBeInTheDocument();
    expect(screen.getByText('#7')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cédula/i })).toBeInTheDocument();
    expect(screen.getByText('Sin cédula')).toBeInTheDocument();
  });

  it('permite aprobar la inscripción llamando a onAprobar', async () => {
    vi.spyOn(plantillasApi, 'getPlantillas').mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: mockPlantillas as any,
    });

    const onAprobar = vi.fn().mockResolvedValue(undefined);

    render(
      <ModalExpedienteInscripcion
        isOpen={true}
        onClose={vi.fn()}
        inscripcion={mockInscripcion}
        onAprobar={onAprobar}
        onRechazar={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    const btnAprobar = screen.getByRole('button', { name: /aprobar inscripción/i });
    fireEvent.click(btnAprobar);

    await waitFor(() => {
      expect(onAprobar).toHaveBeenCalledWith(1, 'Halcones de Portoviejo');
    });
  });
});
