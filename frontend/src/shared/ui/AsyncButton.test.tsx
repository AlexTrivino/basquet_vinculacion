import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AsyncButton } from './AsyncButton';

describe('AsyncButton Component', () => {
  it('renderiza el botón correctamente con el texto', () => {
    render(<AsyncButton onClickAction={() => {}}>Guardar</AsyncButton>);
    expect(screen.getByRole('button', { name: /Guardar/i })).toBeInTheDocument();
  });

  it('se deshabilita y llama a onClickAction durante el click, volviendo a habilitarse al terminar', async () => {
    let resolvePromise: (value: void) => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });

    const mockAction = vi.fn(() => promise);

    render(<AsyncButton onClickAction={mockAction}>Guardar</AsyncButton>);
    
    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();

    // 1. Act: Click!
    fireEvent.click(button);

    // 2. Assert (en proceso)
    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();

    // 3. Resolve
    resolvePromise!();

    // 4. Assert (completado)
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('no ejecuta la acción si el botón ya está deshabilitado nativamente', () => {
    const mockAction = vi.fn();
    render(
      <AsyncButton onClickAction={mockAction} disabled>
        Guardar
      </AsyncButton>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockAction).not.toHaveBeenCalled();
  });
});
