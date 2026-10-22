import { describe, expect, it } from 'vitest';
import { fechaCartel, filaDePartido, horaCartel, textoPartidos, textoResultados, topJugadores } from './textos';
import type { FiguraFlyer, ResultadoFlyer } from './api/flyers.api';
import type { Partido } from '../../types/api.types';

const partido = (local: number, visitante: number, estado = 'finalizado'): ResultadoFlyer => ({
  id_partido: local, hora: '17:00', categoria: 'Juvenil', fase: 'Grupo A', estado, figura: null,
  local: { id_equipo: 1, nombre_equipo: 'SAN JOSÉ', url_logo: null, marcador: local },
  visitante: { id_equipo: 2, nombre_equipo: 'FE Y ALEGRÍA', url_logo: null, marcador: visitante },
});

describe('textos de los flyers', () => {
  it('usa las convenciones de cartel y el caption abre con la cifra del día', () => {
    expect(fechaCartel('2026-10-11')).toBe('11 OCT');
    expect(horaCartel('17:00')).toBe('17H00');

    const texto = textoResultados('2026-10-11', [partido(46, 30), partido(71, 82), partido(20, 0, 'finalizado_wo')]);
    // El W.O. sale en la lista, pero no suma a los puntos ni a los partidos jugados
    expect(texto.startsWith('🏀 Domingo 11 de octubre en el Coliseo Pablo Delgado Álava: 229 puntos en 2 partidos.')).toBe(true);
    expect(texto).toContain('SAN JOSÉ 20-0 FE Y ALEGRÍA (W.O.)');
    expect(texto).toContain('#Manta #Manabí');
  });

  it('la programación sale del calendario y el caption trae las horas y el lema', () => {
    const p = {
      id_partido: 7, fecha: '2026-10-17', hora: '16:00:00', estado: 'programado', fase: 'PRIMERA FASE', llave: null,
      marcador_local: 0, marcador_visitante: 0,
      categoria: { nombre_categoria: 'Juvenil', genero_categoria: 'masculino' },
      equipo_local: { id_equipo: 32, nombre_equipo: 'MARÍA AUXILIADORA', url_logo: '/m.png' },
      equipo_visitante: { id_equipo: 17, nombre_equipo: 'FE Y ALEGRÍA' },
    } as Partido;
    const fila = filaDePartido(p);
    expect([fila.hora, fila.categoria, fila.local.url_logo, fila.visitante.url_logo]).toEqual(['16:00', 'Juvenil (masculino)', '/m.png', null]);
    const texto = textoPartidos('2026-10-17', [fila]);
    expect(texto.startsWith('🏀 Sábado 17 de octubre: 1 partido en el Coliseo Pablo Delgado Álava desde las 16H00.')).toBe(true);
    expect(texto).toContain('16H00 · Juvenil (masculino): MARÍA AUXILIADORA vs FE Y ALEGRÍA');
    expect(texto).toContain('¡Es momento de revivir el pasado!');
  });

  it('los líderes van por la estadística, sin ceros, y en empate gana la mejor valoración', () => {
    const j = (id: number, triples: number, valoracion: number, id_categoria = 3) =>
      ({ jugador: { id_jugador: id }, id_categoria, valoracion, linea: { triples } }) as unknown as FiguraFlyer;
    const jugadores = [j(1, 2, 10), j(2, 5, 12), j(3, 5, 20), j(4, 0, 30), j(5, 9, 40, 10)];
    expect(topJugadores(jugadores, 'triples').map((x) => x.jugador.id_jugador)).toEqual([5, 3, 2]);
    expect(topJugadores(jugadores, 'triples', 3).map((x) => x.jugador.id_jugador)).toEqual([3, 2, 1]);
  });
});
