import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge Component', () => {
  it('renderiza con estado Pendiente y veladura amarilla', () => {
    render(<StatusBadge status="Pendiente" />);
    const badge = screen.getByText('Pendiente');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-yellow-500\/15/);
    expect(badge.className).toMatch(/text-yellow-200/);
  });

  it('renderiza con estado Aprobado y veladura verde', () => {
    render(<StatusBadge status="Aprobado" />);
    const badge = screen.getByText('Aprobado');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-green-500\/15/);
    expect(badge.className).toMatch(/text-green-200/);
  });

  it('renderiza con estado Rechazado y veladura roja', () => {
    render(<StatusBadge status="Rechazado" />);
    const badge = screen.getByText('Rechazado');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-red-500\/15/);
    expect(badge.className).toMatch(/text-red-200/);
  });

  it('renderiza con veladura blanca para estados desconocidos', () => {
    render(<StatusBadge status="Desconocido" />);
    const badge = screen.getByText('Desconocido');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-white\/10/);
    expect(badge.className).toMatch(/text-crema/);
  });
});
