import { describe, expect, it } from 'vitest';
import type { PuestoDelPodio } from './api/partidos.api';
import { fechaCorta, partidoClave } from './podio';

const equipo = (id: number, nombre: string) => ({ id_equipo: id, nombre_equipo: nombre, url_logo: null });
const puesto = (extra: Partial<PuestoDelPodio> = {}): PuestoDelPodio => ({
  lugar: 1, equipo: equipo(1, 'COLEGIO JAVIER'), PJ: 6, PG: 6, PP: 0, PF: 328, PC: 202, sellos: [], partido: null, foto: null, url_foto_equipo: null, ...extra,
});
const partido = (extra: Partial<NonNullable<PuestoDelPodio['partido']>> = {}): NonNullable<PuestoDelPodio['partido']> => ({
  ronda: 'Final', fecha: '2026-11-02', propio: 58, rival: 55, wo: false, equipo_rival: equipo(2, 'SPELLMAN'), ...extra,
});

describe('partidoClave (lo leen la portada y el flyer del podio)', () => {
  it('fechaCorta pone el día y el mes abreviado en español', () => {
    expect(fechaCorta('2026-11-02')).toBe('2 nov');
    expect(fechaCorta('2026-10-31')).toBe('31 oct');
  });

  it('cuenta la ronda con su fecha y el marcador ante el rival', () => {
    expect(partidoClave(puesto({ partido: partido() }))).toEqual(['Final · 2 nov', '58 – 55 ante SPELLMAN']);
  });

  it('el W.O. dice si se ganó o se perdió, sin marcador', () => {
    expect(partidoClave(puesto({ partido: partido({ wo: true, propio: 20, rival: 0 }) }))).toEqual(['Final · 2 nov', 'Ganó por W.O. ante SPELLMAN']);
    expect(partidoClave(puesto({ lugar: 2, partido: partido({ wo: true, propio: 0, rival: 20 }) }))).toEqual(['Final · 2 nov', 'Perdió por W.O. ante SPELLMAN']);
  });

  it('sin fecha, la etiqueta es solo la ronda', () => {
    expect(partidoClave(puesto({ partido: partido({ fecha: null }) }))[0]).toBe('Final');
  });

  it('sin llaves cuenta la campaña en la tabla, con el singular de «ganado»', () => {
    expect(partidoClave(puesto({ PJ: 4, PG: 4 }))).toEqual(['1.º de la tabla', '4 ganados de 4']);
    expect(partidoClave(puesto({ lugar: 3, PJ: 3, PG: 1 }))).toEqual(['3.º de la tabla', '1 ganado de 3']);
  });
});
