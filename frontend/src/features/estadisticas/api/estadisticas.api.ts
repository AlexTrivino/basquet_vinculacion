import axiosInstance from '../../../api/axios.config';
import type { ApiResponse } from '../../../types/api.types';

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

export async function postEstadisticasBulk(data: any): Promise<ApiResponse<any>> {
  const response = await axiosInstance.post('/estadisticas/bulk', data);
  return response.data;
}

