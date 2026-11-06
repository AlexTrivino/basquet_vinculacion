import axiosInstance from '@/shared/api/axios.config';
import type { ApiResponse } from '@/shared/api/tipos';

export interface DashboardStats {
  inscripciones_pendientes: number;
  partidos_hoy: number;
  equipos_totales: number;
  partidos_sin_estadisticas: number;
}

export interface ActividadReciente {
  tipo: 'inscripcion' | 'partido';
  titulo: string;
  descripcion: string;
  fecha: string | null;
  estado: string;
}

export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  const response = await axiosInstance.get('/estadisticas/dashboard');
  return response.data;
}

export async function getActividadReciente(): Promise<ApiResponse<ActividadReciente[]>> {
  const response = await axiosInstance.get('/estadisticas/dashboard/actividad-reciente');
  return response.data;
}

// Líderes de un torneo (pestaña Estadísticas del torneo)
export async function getLideresEstadisticos(idTorneo: string | number, idCategoria?: number): Promise<ApiResponse<any>> {
  const params: any = {};
  if (idCategoria) params.id_categoria = idCategoria;
  const response = await axiosInstance.get(`/torneos/${idTorneo}/lideres`, { params });
  return response.data;
}

// Totales públicos de la portada (sin autenticación)
export async function getEstadisticasPublicas(): Promise<
  ApiResponse<{ puntos_totales: number; puntos_por_torneo?: Record<string, number> }>
> {
  const response = await axiosInstance.get('/estadisticas/publicas');
  return response.data;
}

// La figura acumulada de cada categoría de los torneos vigentes, o del último finalizado (la sección de figuras de la portada)
export interface FiguraDelTorneo {
  torneo: { id_torneo: number; nombre: string };
  categoria: string | null;
  jugador: { id_jugador: number; nombre: string; url_foto: string | null; numero_camiseta: number | null };
  equipo: { id_equipo: number; nombre_equipo: string; url_logo: string | null } | null;
  partidos: number;
  linea: { puntos: number; rebotes: number; asistencias: number; tapones: number; triples: number; tiros_libres: number };
  promedio_puntos: number;
  valoracion: number;
}

export async function getFigurasPortada(): Promise<ApiResponse<FiguraDelTorneo[]>> {
  const response = await axiosInstance.get('/estadisticas/figuras');
  return response.data;
}
