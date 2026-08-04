import { describe, it, expect } from 'vitest';
import { calculateExactAge } from './GestorPlantilla';

describe('calculateExactAge (Año Natural / Calendario)', () => {
  it('calcula la edad por año calendario sin importar mes ni día', () => {
    const currentYear = new Date().getFullYear();
    const birthYear = 2000;
    const expectedAge = currentYear - birthYear;

    // Jugador nacido el 1 de enero
    expect(calculateExactAge('2000-01-01')).toBe(expectedAge);

    // Jugador nacido el 31 de diciembre
    expect(calculateExactAge('2000-12-31')).toBe(expectedAge);

    // Jugador nacido el 15 de julio
    expect(calculateExactAge('2000-07-15')).toBe(expectedAge);
  });

  it('retorna null para formatos inválidos o fechas vacías', () => {
    expect(calculateExactAge('')).toBeNull();
    expect(calculateExactAge(undefined)).toBeNull();
    expect(calculateExactAge('invalido')).toBeNull();
  });
});
