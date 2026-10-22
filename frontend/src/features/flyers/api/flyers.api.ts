import axiosInstance from '../../../api/axios.config';
import type { ApiResponse } from '../../../types/api.types';

export interface EquipoFlyer {
  id_equipo: number;
  nombre_equipo: string;
  url_logo: string | null;
}

export interface FiguraFlyer {
  jugador: { id_jugador: number; nombre: string; url_foto: string | null; numero_camiseta: number | null };
  equipo: EquipoFlyer | null;
  categoria: string | null;
  linea: { puntos: number; rebotes: number; asistencias: number; tapones: number; triples: number; tiros_libres: number };
  valoracion: number;
  partido?: string | null; // figura de una fecha, o el único partido del acumulado
  id_categoria?: number; // figuras acumuladas del torneo
  partidos?: number;
  promedio_puntos?: number;
}

export interface ResultadoFlyer {
  id_partido: number;
  hora: string | null;
  categoria: string | null;
  fase: string;
  llave?: string | null;
  estado: string;
  local: EquipoFlyer & { marcador: number };
  visitante: EquipoFlyer & { marcador: number };
  figura: FiguraFlyer | null;
}

export interface DatosFlyers {
  torneo: { id_torneo: number; nombre: string };
  fecha: string | null;
  fechas: string[];
  resultados: ResultadoFlyer[];
  figura_fecha: FiguraFlyer | null;
  figuras_categoria: FiguraFlyer[];
  figuras_equipo: FiguraFlyer[];
  // Totales por jugador (y categoría) para los líderes: de la fecha y de todo el torneo
  jugadores_fecha: FiguraFlyer[];
  jugadores_torneo: FiguraFlyer[];
}

// Resultados de una fecha (por defecto la última jugada) y figuras del torneo
export async function getDatosFlyers(idTorneo: number, fecha?: string): Promise<ApiResponse<DatosFlyers>> {
  const response = await axiosInstance.get('/estadisticas/flyers', { params: { id_torneo: idTorneo, fecha: fecha || undefined } });
  return response.data;
}
