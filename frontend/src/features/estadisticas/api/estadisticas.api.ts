import axiosInstance from '../../../api/axios.config';
import type { ApiResponse } from '../../../types/api.types';

export interface DashboardStats {
  inscripciones_pendientes: number;
  partidos_hoy: number;
  equipos_totales: number;
}

export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  const response = await axiosInstance.get('/estadisticas/dashboard');
  return response.data;
}

export async function postEstadisticasBulk(data: any): Promise<ApiResponse<any>> {
  const response = await axiosInstance.post('/estadisticas/bulk', data);
  return response.data;
}
