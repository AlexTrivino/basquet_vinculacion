import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ActiveTournamentBadge } from './ActiveTournamentBadge';
import type { Torneo } from '../../../types/api.types';

describe('ActiveTournamentBadge Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el banner genérico institucional cuando no hay torneos activos (0 torneos)', () => {
    render(
      <BrowserRouter>
        <ActiveTournamentBadge torneosActivos={[]} />
      </BrowserRouter>
    );

    expect(
      screen.getByText('Baloncesto Formativo & Competitivo en Manta')
    ).toBeInTheDocument();
  });

  it('renderiza directamente el único torneo activo sin rotación cuando solo hay 1 torneo', () => {
    const torneos: Torneo[] = [
      {
        id_torneo: 1,
        nombre: 'Copa Verano 2026',
        estado: 'en_curso',
      },
    ];

    render(
      <BrowserRouter>
        <ActiveTournamentBadge torneosActivos={torneos} />
      </BrowserRouter>
    );

    expect(screen.getByText(/En Juego:/i)).toBeInTheDocument();
    expect(screen.getByText('Copa Verano 2026')).toBeInTheDocument();
  });

  it('intercala cíclicamente entre múltiples torneos activos con temporizador', () => {
    const torneos: Torneo[] = [
      {
        id_torneo: 1,
        nombre: 'Copa Verano 2026',
        estado: 'en_curso',
      },
      {
        id_torneo: 2,
        nombre: 'Liga Intercolegial 2026',
        estado: 'inscripcion',
      },
    ];

    render(
      <BrowserRouter>
        <ActiveTournamentBadge torneosActivos={torneos} />
      </BrowserRouter>
    );

    // Inicialmente muestra el primero
    expect(screen.getByText('Copa Verano 2026')).toBeInTheDocument();

    // Avanzar tiempo 4500ms + 300ms de transición
    act(() => {
      vi.advanceTimersByTime(4800);
    });

    // Ahora muestra el segundo
    expect(screen.getByText('Liga Intercolegial 2026')).toBeInTheDocument();
    expect(screen.getByText(/Inscripciones:/i)).toBeInTheDocument();
  });
});
