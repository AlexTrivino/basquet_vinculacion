import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EditarCamisetaModal } from './EditarCamisetaModal';
import type { Plantilla } from '../../../types/api.types';

describe('EditarCamisetaModal', () => {
  const mockPlantilla: Plantilla = {
    id: 1,
    id_plantilla: 1,
    id_jugador: 10,
    id_equipo: 5,
    id_torneo: 2,
    numero_camiseta: 15,
    jugador: {
      id: 10,
      id_jugador: 10,
      nombre: 'Luka Doncic',
      documento_identificacion: '0987654321',
      fecha_nacimiento: '1999-02-28',
    },
  };

  it('no se renderiza si isOpen es false', () => {
    const { container } = render(
      <EditarCamisetaModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        plantilla={mockPlantilla}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza correctamente el nombre del jugador y número actual', () => {
    render(
      <EditarCamisetaModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        plantilla={mockPlantilla}
      />
    );

    expect(screen.getByText('Modificar Camiseta')).toBeInTheDocument();
    expect(screen.getByText('Luka Doncic')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Ej. 23') as HTMLInputElement;
    expect(input.value).toBe('15');
  });

  it('llama a onSave con el nuevo número al enviar el formulario', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditarCamisetaModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSave}
        plantilla={mockPlantilla}
      />
    );

    const input = screen.getByPlaceholderText('Ej. 23');
    fireEvent.change(input, { target: { value: '77' } });

    const submitBtn = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(77);
    });
  });

  it('llama a onClose al pulsar Cancelar', () => {
    const onClose = vi.fn();
    render(
      <EditarCamisetaModal
        isOpen={true}
        onClose={onClose}
        onSave={vi.fn()}
        plantilla={mockPlantilla}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
