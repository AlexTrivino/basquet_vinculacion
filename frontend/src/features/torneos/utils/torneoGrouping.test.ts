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

    it('retorna null para valores fuera de rango o caracteres extraños', () => {
      expect(obtenerAnioTorneo('1899-12-31')).toBeNull();
      expect(obtenerAnioTorneo('2201-01-01')).toBeNull();
      expect(obtenerAnioTorneo('   ')).toBeNull();
      expect(obtenerAnioTorneo('ABCD-01-01')).toBeNull();
    });
  });

  describe('agruparTorneosPorAniosRecientes', () => {
    it('ordena los torneos dentro del mismo año por fecha de inicio descendente (más recientes primero)', () => {
      const mockTorneos: Torneo[] = [
        {
          id_torneo: 1,
          nombre: 'Torneo Enero 2026',
          fecha_inicio: '2026-01-10',
          estado: 'finalizado',
        },
        {
          id_torneo: 2,
          nombre: 'Torneo Diciembre 2026',
          fecha_inicio: '2026-12-05',
          estado: 'en_curso',
        },
        {
          id_torneo: 3,
          nombre: 'Torneo Julio 2026',
          fecha_inicio: '2026-07-20',
          estado: 'finalizado',
        },
      ];

      const resultado = agruparTorneosPorAniosRecientes(mockTorneos, 2);
      const nombresOrdenados = resultado.torneosPorAnio[2026].map((t) => t.nombre);

      expect(nombresOrdenados).toEqual([
        'Torneo Diciembre 2026',
        'Torneo Julio 2026',
        'Torneo Enero 2026',
      ]);
    });

    it('maneja arrays vacíos sin lanzar excepciones', () => {
      const resultado = agruparTorneosPorAniosRecientes([], 2);
      expect(resultado.aniosDisponibles).toEqual([]);
      expect(resultado.aniosMostrados).toEqual([]);
      expect(resultado.torneosPorAnio).toEqual({});
      expect(resultado.torneosActivos).toEqual([]);
    });

    it('respeta diferentes valores de maxAnios (ej. maxAnios = 1 o maxAnios = 4)', () => {
      const mockTorneos: Torneo[] = [
        { id_torneo: 1, nombre: 'T2026', fecha_inicio: '2026-01-01' },
        { id_torneo: 2, nombre: 'T2025', fecha_inicio: '2025-01-01' },
        { id_torneo: 3, nombre: 'T2024', fecha_inicio: '2024-01-01' },
        { id_torneo: 4, nombre: 'T2023', fecha_inicio: '2023-01-01' },
      ];

      const res1 = agruparTorneosPorAniosRecientes(mockTorneos, 1);
      expect(res1.aniosMostrados).toEqual([2026]);

      const res4 = agruparTorneosPorAniosRecientes(mockTorneos, 4);
      expect(res4.aniosMostrados).toEqual([2026, 2025, 2024, 2023]);
    });

    it('tolera torneos sin fecha_inicio asignada sin romper la agrupación', () => {
      const mockTorneos: Torneo[] = [
        { id_torneo: 1, nombre: 'T Con Fecha', fecha_inicio: '2026-05-01', estado: 'en_curso' },
        { id_torneo: 2, nombre: 'T Sin Fecha', fecha_inicio: undefined, estado: 'en_curso' },
      ];

      const res = agruparTorneosPorAniosRecientes(mockTorneos, 2);
      expect(res.aniosMostrados).toEqual([2026]);
      expect(res.torneosActivos).toHaveLength(2); // Ambos detectados como activos
    });
  });
});

