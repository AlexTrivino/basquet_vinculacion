import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge Component', () => {
  it('renderiza con estado Pendiente y color amarillo', () => {
    render(<StatusBadge status="Pendiente" />);
    const badge = screen.getByText('Pendiente');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-yellow-100/);
    expect(badge.className).toMatch(/text-yellow-800/);
  });

  it('renderiza con estado Aprobado y color verde', () => {
    render(<StatusBadge status="Aprobado" />);
    const badge = screen.getByText('Aprobado');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-green-100/);
    expect(badge.className).toMatch(/text-green-800/);
  });

  it('renderiza con estado Rechazado y color rojo', () => {
    render(<StatusBadge status="Rechazado" />);
    const badge = screen.getByText('Rechazado');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-red-100/);
    expect(badge.className).toMatch(/text-red-800/);
  });

  it('renderiza con color gris para estados desconocidos', () => {
    render(<StatusBadge status="Desconocido" />);
    const badge = screen.getByText('Desconocido');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-gray-100/);
    expect(badge.className).toMatch(/text-gray-800/);
  });
});
