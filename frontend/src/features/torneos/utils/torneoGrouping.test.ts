import { describe, it, expect } from 'vitest';
import {
  obtenerAnioTorneo,
  agruparTorneosPorAniosRecientes,
} from './torneoGrouping';
import type { Torneo } from '../../../types/api.types';

describe('torneoGrouping utilities', () => {
  describe('obtenerAnioTorneo', () => {
    it('extrae correctamente el año de inicio en formato YYYY-MM-DD', () => {
      expect(obtenerAnioTorneo('2026-06-15')).toBe(2026);
      expect(obtenerAnioTorneo('2025-12-01')).toBe(2025);
    });

    it('extrae el año de strings ISO completos', () => {
      expect(obtenerAnioTorneo('2034-01-01T00:00:00.000Z')).toBe(2034);
    });

    it('retorna null para valores nulos, vacíos o inválidos', () => {
      expect(obtenerAnioTorneo(null)).toBeNull();
      expect(obtenerAnioTorneo(undefined)).toBeNull();
      expect(obtenerAnioTorneo('')).toBeNull();
      expect(obtenerAnioTorneo('invalido')).toBeNull();
    });
  });

  describe('agruparTorneosPorAniosRecientes', () => {
    it('agrupa por los 2 años más recientes con torneos reales', () => {
      const mockTorneos: Torneo[] = [
        {
          id_torneo: 1,
          nombre: 'Copa Verano 2026',
          fecha_inicio: '2026-07-01',
          fecha_fin: '2026-08-30',
          estado: 'en_curso',
        },
        {
          id_torneo: 2,
          nombre: 'Liga Manabí 2026',
          fecha_inicio: '2026-05-10',
          fecha_fin: '2026-09-15',
          estado: 'en_curso',
        },
        {
          id_torneo: 3,
          nombre: 'Interclubes 2025',
          fecha_inicio: '2025-10-01',
          fecha_fin: '2025-12-20',
          estado: 'finalizado',
        },
        {
          id_torneo: 4,
          nombre: 'Torneo Antiguo 2022',
          fecha_inicio: '2022-04-01',
          fecha_fin: '2022-06-01',
          estado: 'finalizado',
        },
      ];

      const resultado = agruparTorneosPorAniosRecientes(mockTorneos, 2);

      expect(resultado.aniosDisponibles).toEqual([2026, 2025, 2022]);
      expect(resultado.aniosMostrados).toEqual([2026, 2025]);
      expect(resultado.torneosPorAnio[2026]).toHaveLength(2);
      expect(resultado.torneosPorAnio[2025]).toHaveLength(1);
      expect(resultado.torneosActivos).toHaveLength(2);
    });

    it('se salta años vacíos en medio (ej. 2036 y 2034 sin torneos en 2035)', () => {
      const mockTorneos: Torneo[] = [
        {
          id_torneo: 10,
          nombre: 'Torneo Futuro 2036',
          fecha_inicio: '2036-03-01',
          fecha_fin: '2036-06-01',
          estado: 'en_curso',
        },
        {
          id_torneo: 11,
          nombre: 'Torneo Pasado 2034',
          fecha_inicio: '2034-08-01',
          fecha_fin: '2034-11-01',
          estado: 'finalizado',
        },
        {
          id_torneo: 12,
          nombre: 'Torneo Muy Antiguo 2030',
          fecha_inicio: '2030-01-01',
          fecha_fin: '2030-04-01',
          estado: 'finalizado',
        },
      ];

      const resultado = agruparTorneosPorAniosRecientes(mockTorneos, 2);

      expect(resultado.aniosDisponibles).toEqual([2036, 2034, 2030]);
      expect(resultado.aniosMostrados).toEqual([2036, 2034]);
      expect(resultado.torneosPorAnio[2036]).toBeDefined();
      expect(resultado.torneosPorAnio[2034]).toBeDefined();
      expect(resultado.torneosPorAnio[2035]).toBeUndefined();
    });

    it('clasifica un torneo que empieza a fines de 2026 y termina en 2027 como 2026', () => {
      const mockTorneos: Torneo[] = [
        {
          id_torneo: 20,
          nombre: 'Torneo Fin de Año',
          fecha_inicio: '2026-11-15',
          fecha_fin: '2027-02-28',
          estado: 'en_curso',
        },
      ];

      const resultado = agruparTorneosPorAniosRecientes(mockTorneos, 2);

      expect(resultado.aniosMostrados).toEqual([2026]);
      expect(resultado.torneosPorAnio[2026][0].nombre).toBe('Torneo Fin de Año');
    });

    it('detecta torneos en estado "inscripcion" como activos', () => {
      const mockTorneos: Torneo[] = [
        {
          id_torneo: 30,
          nombre: 'Copa Apertura 2026',
          fecha_inicio: '2026-09-01',
          fecha_fin: '2026-12-01',
          estado: 'inscripcion',
        },
      ];

      const resultado = agruparTorneosPorAniosRecientes(mockTorneos, 2);
      expect(resultado.torneosActivos).toHaveLength(1);
      expect(resultado.torneosActivos[0].estado).toBe('inscripcion');
    });
  });
});
