import { describe, expect, it } from 'vitest';
import { fechaCartel, filaDePartido, horaCartel, lineaCorta, numerosDe, textoFigura, textoPartidos, textoResultados, topJugadores } from './textos';
import type { FiguraFlyer, ResultadoFlyer } from './api/flyers.api';
import type { Partido } from '@/shared/api/tipos';

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

  it('un empate en el tercer puesto entra entero (tiros libres de Juvenil masculino, 30-10)', () => {
    const j = (id: number, tiros_libres: number, valoracion: number) =>
      ({ jugador: { id_jugador: id }, id_categoria: 3, valoracion, linea: { tiros_libres } }) as unknown as FiguraFlyer;
    const jugadores = [j(1, 13, 100), j(2, 12, 68), j(3, 12, 108), j(4, 12, 52), j(5, 11, 83)];
    // antes salían 1, 3 y 2: el 4 quedaba fuera con 12, lo mismo que el 2 y el 3
    expect(topJugadores(jugadores, 'tiros_libres').map((x) => x.jugador.id_jugador)).toEqual([1, 3, 2, 4]);
    expect(topJugadores(jugadores.slice(0, 3), 'tiros_libres').map((x) => x.jugador.id_jugador)).toEqual([1, 3, 2]);
  });

  it('la figura suma los triples y no muestra los números en cero', () => {
    const f = {
      jugador: { id_jugador: 9, nombre: 'ANA MERO' }, equipo: null, valoracion: 25, partidos: 1,
      linea: { puntos: 20, triples: 3, rebotes: 0, asistencias: 4, tapones: 1, tiros_libres: 2 },
    } as unknown as FiguraFlyer;
    expect(numerosDe(f.linea).map((n) => n.etiqueta)).toEqual(['Puntos', 'Triples', 'Asistencias', 'Tapones']);
    expect(lineaCorta(f.linea)).toBe('20 pts, 4 ast');
    expect(textoFigura('Figura de la fecha', f)).toContain('ANA MERO, con 20 puntos, 3 triples, 4 asistencias y 1 tapón en 1 partido.');
  });
});
