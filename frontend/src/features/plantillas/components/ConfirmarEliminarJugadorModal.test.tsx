import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmarEliminarJugadorModal } from './ConfirmarEliminarJugadorModal';

describe('ConfirmarEliminarJugadorModal', () => {
  it('no se renderiza si isOpen es false', () => {
    const { container } = render(
      <ConfirmarEliminarJugadorModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        jugadorNombre="Nikola Jokic"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza la información del jugador y el dorsal', () => {
    render(
      <ConfirmarEliminarJugadorModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        jugadorNombre="Nikola Jokic"
        dorsal={15}
      />
    );

    expect(screen.getByText('¿Remover jugador del equipo?')).toBeInTheDocument();
    expect(screen.getByText('Nikola Jokic')).toBeInTheDocument();
    expect(screen.getByText(/Dorsal #15/)).toBeInTheDocument();
  });

  it('muestra la advertencia de mínimo de jugadores si willBreakMinimo es true', () => {
    render(
      <ConfirmarEliminarJugadorModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        jugadorNombre="Nikola Jokic"
        willBreakMinimo={true}
        minJugadores={10}
      />
    );

    expect(screen.getByText('Advertencia reglamentaria')).toBeInTheDocument();
    expect(screen.getByText(/por debajo del mínimo reglamentario \(10 jugadores\)/)).toBeInTheDocument();
  });

  it('llama a onConfirm al presionar el botón de confirmar', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmarEliminarJugadorModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        jugadorNombre="Nikola Jokic"
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /sí, remover/i });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalled();
  });

  it('llama a onClose al presionar el botón de cancelar', () => {
    const onClose = vi.fn();
    render(
      <ConfirmarEliminarJugadorModal
        isOpen={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        jugadorNombre="Nikola Jokic"
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
