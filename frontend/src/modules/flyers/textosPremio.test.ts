import { describe, expect, it } from 'vitest';
import type { FiguraFlyer, FinalDeCategoria } from './api/flyers.api';
import { ENLACE, ETIQUETAS } from './textos';
import { etiquetaCandidato, numerosDelPremio, PREMIOS, resultadoDeLaFinal, textoPremio } from './textosPremio';

const JAVIER = { id_equipo: 1, nombre_equipo: 'COLEGIO JAVIER', url_logo: null };
const SPELLMAN = { id_equipo: 2, nombre_equipo: 'SPELLMAN', url_logo: null };
const FINAL: FinalDeCategoria = { id_partido: 99, ronda: 'Final', fecha: '2026-11-02', campeon: { ...JAVIER, marcador: 58 }, vice: { ...SPELLMAN, marcador: 55 } };
const PREMIO = { categoria: { id_categoria: 9, nombre_categoria: 'INFANTIL +40', genero_categoria: 'masculino' }, final: FINAL };
const TORNEO = 'CAMPEONATO NACIONAL INTERCOLEGIAL EXALUMNOS - SEDE MANTA';

const figura = (linea: Partial<FiguraFlyer['linea']>, equipo: FiguraFlyer['equipo'] = JAVIER, nombre = 'BRYAN CHÁVEZ'): FiguraFlyer => ({
  jugador: { id_jugador: 1, nombre, url_foto: null, numero_camiseta: 7 },
  equipo,
  categoria: null,
  linea: { puntos: 0, rebotes: 0, asistencias: 0, tapones: 0, triples: 0, tiros_libres: 0, ...linea },
  valoracion: 0,
});
const COMPLETA = { puntos: 18, triples: 2, rebotes: 7, asistencias: 3, tapones: 2, tiros_libres: 4 };

describe('los números de cada premio', () => {
  it('el MVP cuenta puntos, triples, rebotes, asistencias y tapones, en ese orden y sin los tiros libres', () => {
    expect(numerosDelPremio('mvp', COMPLETA).map((n) => [n.etiqueta, n.valor])).toEqual([
      ['Puntos', 18], ['Triples', 2], ['Rebotes', 7], ['Asistencias', 3], ['Tapones', 2],
    ]);
  });

  it('el mejor defensa cuenta solo rebotes y tapones', () => {
    expect(numerosDelPremio('defensa', COMPLETA).map((n) => [n.etiqueta, n.valor])).toEqual([['Rebotes', 7], ['Tapones', 2]]);
  });

  it('el que está en 0 no sale, y si no queda ninguno la lista va vacía', () => {
    expect(numerosDelPremio('mvp', { ...COMPLETA, triples: 0, asistencias: 0 }).map((n) => n.etiqueta)).toEqual(['Puntos', 'Rebotes', 'Tapones']);
    expect(numerosDelPremio('defensa', { ...COMPLETA, tapones: 0 }).map((n) => n.etiqueta)).toEqual(['Rebotes']);
    expect(numerosDelPremio('defensa', { ...COMPLETA, rebotes: 0, tapones: 0 })).toEqual([]);
  });
});

describe('el resultado de la final', () => {
  it('desde el campeón: gana, y la etiqueta lleva la ronda y la fecha', () => {
    expect(resultadoDeLaFinal(FINAL, 1)).toEqual(['Final · 2 nov', '58 – 55 ante SPELLMAN']);
  });

  it('desde el subcampeón: su marcador va primero, aunque perdió', () => {
    expect(resultadoDeLaFinal(FINAL, 2)).toEqual(['Final · 2 nov', '55 – 58 ante COLEGIO JAVIER']);
  });

  it('sin equipo conocido se cuenta desde el campeón; sin fecha, la etiqueta es solo la ronda', () => {
    expect(resultadoDeLaFinal({ ...FINAL, fecha: null }, null)).toEqual(['Final', '58 – 55 ante SPELLMAN']);
    expect(resultadoDeLaFinal(FINAL)[1]).toBe('58 – 55 ante SPELLMAN');
  });
});

describe('el selector de jugador', () => {
  it('cada opción lleva el nombre y las cifras del premio en la final', () => {
    expect(etiquetaCandidato('mvp', figura(COMPLETA))).toBe('BRYAN CHÁVEZ · 18 pts, 2 tri, 7 reb, 3 ast, 2 tap');
  });

  it('el mejor defensa muestra además su equipo, porque hay dos finalistas', () => {
    expect(etiquetaCandidato('defensa', figura(COMPLETA, SPELLMAN))).toBe('BRYAN CHÁVEZ · 7 reb, 2 tap · SPELLMAN');
  });

  it('un jugador sin cifras del premio lo dice', () => {
    expect(etiquetaCandidato('defensa', figura({ puntos: 20 }, null))).toBe('BRYAN CHÁVEZ · sin cifras');
  });
});

describe('la descripción para Instagram', () => {
  it('MVP: el premio, el jugador con su equipo, sus números y el resultado', () => {
    const texto = textoPremio('mvp', TORNEO, PREMIO, figura(COMPLETA));
    expect(texto).toBe([
      '🏆 MVP de la final de INFANTIL +40 (masculino) en CAMPEONATO NACIONAL INTERCOLEGIAL EXALUMNOS - SEDE MANTA: BRYAN CHÁVEZ (COLEGIO JAVIER), con 18 puntos, 2 triples, 7 rebotes, 3 asistencias y 2 tapones en la final (58 – 55 ante SPELLMAN).',
      ENLACE,
      ETIQUETAS,
    ].join('\n\n'));
  });

  it('mejor defensa: solo rebotes y tapones, y el resultado desde el equipo del jugador', () => {
    const texto = textoPremio('defensa', TORNEO, PREMIO, figura(COMPLETA, SPELLMAN, 'CARLOS MACÍAS'));
    expect(texto).toContain('🛡️ Mejor defensa de la final de INFANTIL +40 (masculino) en CAMPEONATO');
    expect(texto).toContain('CARLOS MACÍAS (SPELLMAN), con 7 rebotes y 2 tapones en la final (55 – 58 ante COLEGIO JAVIER).');
    expect(texto).not.toContain('puntos');
  });

  it('un solo número, en singular, y sin números no hay «con»', () => {
    expect(textoPremio('defensa', TORNEO, PREMIO, figura({ rebotes: 1 }))).toContain('(COLEGIO JAVIER), con 1 rebote en la final');
    const sin = textoPremio('defensa', TORNEO, PREMIO, figura({ puntos: 9 }));
    expect(sin).toContain('BRYAN CHÁVEZ (COLEGIO JAVIER) en la final');
    expect(sin).not.toContain('con ');
  });

  it('sin equipo, solo el nombre', () => {
    expect(textoPremio('mvp', TORNEO, PREMIO, figura({ puntos: 5 }, null))).toContain(': BRYAN CHÁVEZ, con 5 puntos en la final (58 – 55 ante SPELLMAN).');
  });
});

describe('los premios', () => {
  it('«DEFENSA» lleva «MEJOR» encima y «MVP», su traducción; la descarga dice cuál es', () => {
    expect(PREMIOS.defensa).toMatchObject({ palabra: 'DEFENSA', encima: 'Mejor', descarga: 'Descargar mejor defensa' });
    expect(PREMIOS.mvp).toMatchObject({ palabra: 'MVP', encima: 'Jugador más valioso', descarga: 'Descargar MVP' });
  });
});
