import api from '../../../api/axios.config';
import type { ApiResponse } from '../../../types/api.types';

interface EquipoCorto {
  id_equipo: number;
  nombre_equipo: string;
  url_logo?: string | null;
}

// Tarjeta del buscador: solo datos deportivos, nunca personales (cédula, contacto, documentos)
export interface JugadorVisor {
  id_jugador: number;
  nombre: string;
  url_foto?: string | null;
  genero?: string | null;
  edad?: number | null;
  numero_camiseta?: number | null;
  equipo?: EquipoCorto | null;
  torneo?: { id_torneo: number; nombre: string } | null;
  categoria?: { id_categoria: number; nombre_categoria: string; genero_categoria: string } | null;
  partidos_jugados: number;
  puntos_totales: number;
  promedio_puntos: number;
}

export interface PartidoJugador {
  id_partido: number;
  fecha: string | null;
  fase: string;
  estado: string;
  torneo: { id_torneo: number; nombre: string | null };
  categoria: string | null;
  equipo_local: EquipoCorto | null;
  equipo_visitante: EquipoCorto | null;
  marcador_local: number;
  marcador_visitante: number;
  lado: 'local' | 'visitante' | null;
  linea: Record<'puntos' | 'rebotes' | 'asistencias' | 'triples' | 'tiros_libres' | 'tapones' | 'robos' | 'faltas' | 'valoracion', number>;
}

export type FiltrosVisor = Partial<Record<'q' | 'id_torneo' | 'id_categoria' | 'id_equipo' | 'genero' | 'edad_min' | 'edad_max' | 'orden', string>>;

export async function buscarJugadores(filtros: FiltrosVisor, page = 1): Promise<ApiResponse<JugadorVisor[]>> {
  const { data } = await api.get('/visor/jugadores', { params: { ...filtros, page, per_page: 24 } });
  return data;
}

export async function getPartidosJugador(idJugador: number | string): Promise<ApiResponse<PartidoJugador[]>> {
  const { data } = await api.get(`/visor/jugadores/${idJugador}/partidos`);
  return data;
}
