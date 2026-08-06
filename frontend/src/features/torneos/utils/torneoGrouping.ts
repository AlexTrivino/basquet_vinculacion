import type { Torneo } from '../../../types/api.types';

/**
 * Obtiene el año en que inicia un torneo a partir de su `fecha_inicio` (YYYY-MM-DD o ISO).
 * Usa extracción directa de caracteres para evitar desajustes de zona horaria UTC.
 */
export function obtenerAnioTorneo(fechaInicio?: string | null): number | null {
  if (!fechaInicio) return null;
  const yearStr = fechaInicio.trim().slice(0, 4);
  const year = parseInt(yearStr, 10);
  return isNaN(year) || year < 1900 || year > 2200 ? null : year;
}

export interface AgrupacionTorneos {
  aniosDisponibles: number[];
  aniosMostrados: number[];
  torneosPorAnio: Record<number, Torneo[]>;
  torneosActivos: Torneo[];
}

/**
 * Agrupa los torneos recibidos catalogándolos por su año de inicio (`fecha_inicio`)
 * y selecciona de manera reactiva los N años más recientes que tengan actividad registrada.
 *
 * @param torneos Lista completa de torneos.
 * @param maxAnios Cantidad máxima de años recientes a mostrar en pestañas (por defecto 2).
 */
export function agruparTorneosPorAniosRecientes(
  torneos: Torneo[] = [],
  maxAnios = 2
): AgrupacionTorneos {
  const mapaPorAnio: Record<number, Torneo[]> = {};
  const torneosActivos: Torneo[] = [];

  for (const torneo of torneos) {
    // Clasificar por año de inicio
    const anio = obtenerAnioTorneo(torneo.fecha_inicio);
    if (anio !== null) {
      if (!mapaPorAnio[anio]) {
        mapaPorAnio[anio] = [];
      }
      mapaPorAnio[anio].push(torneo);
    }

    // Detectar torneos en curso o en fase de inscripción
    const estado = (torneo.estado || '').toLowerCase();
    if (estado === 'en_curso' || estado === 'inscripcion') {
      torneosActivos.push(torneo);
    }
  }

  // Ordenar los años de forma descendente (más recientes primero)
  const aniosDisponibles = Object.keys(mapaPorAnio)
    .map(Number)
    .sort((a, b) => b - a);

  // Seleccionar los últimos N años con torneos reales
  const aniosMostrados = aniosDisponibles.slice(0, maxAnios);

  // Ordenar torneos dentro de cada año por fecha de inicio descendente
  for (const anio of aniosDisponibles) {
    mapaPorAnio[anio].sort((a, b) => {
      const fechaA = a.fecha_inicio || '';
      const fechaB = b.fecha_inicio || '';
      return fechaB.localeCompare(fechaA);
    });
  }

  return {
    aniosDisponibles,
    aniosMostrados,
    torneosPorAnio: mapaPorAnio,
    torneosActivos,
  };
}
