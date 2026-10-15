import { describe, expect, it } from 'vitest';
import { fechaCartel, horaCartel, textoResultados } from './textos';
import type { ResultadoFlyer } from './api/flyers.api';

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
});
