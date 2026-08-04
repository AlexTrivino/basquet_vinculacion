import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModalRechazarInscripcion } from './ModalRechazarInscripcion';

describe('ModalRechazarInscripcion', () => {
  it('no se renderiza si isOpen es false', () => {
    const { container } = render(
      <ModalRechazarInscripcion
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        nombreEquipo="Tiburones"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza la advertencia y el nombre del equipo a rechazar', () => {
    render(
      <ModalRechazarInscripcion
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        nombreEquipo="Tiburones de Manta"
      />
    );

    expect(screen.getByText('Rechazar Inscripción')).toBeInTheDocument();
    expect(screen.getByText('Tiburones de Manta')).toBeInTheDocument();
    expect(screen.getByText(/Acción permanente y destructiva/i)).toBeInTheDocument();
  });

  it('llama a onConfirm al presionar el botón de rechazar', () => {
    const onConfirm = vi.fn();
    render(
      <ModalRechazarInscripcion
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        nombreEquipo="Tiburones de Manta"
      />
    );

    const btn = screen.getByRole('button', { name: /sí, rechazar solicitud/i });
    fireEvent.click(btn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('llama a onClose al presionar cancelar', () => {
    const onClose = vi.fn();
    render(
      <ModalRechazarInscripcion
        isOpen={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        nombreEquipo="Tiburones de Manta"
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
