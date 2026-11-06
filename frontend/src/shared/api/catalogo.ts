import axiosInstance from './axios.config';
import type { ApiResponse, Categoria, Torneo } from './tipos';

// Torneos y categorías que leen todos los módulos (filtros, selects, asistentes y portada).
// Lo demás de torneos (detalle, posiciones, llaves, escrituras) es del módulo torneos.

export async function getTorneos(page = 1, perPage = 20, anio?: number): Promise<ApiResponse<Torneo[]>> {
  const params: any = { page, per_page: perPage };
  if (anio) params.anio = anio;
  
  const response = await axiosInstance.get('/torneos', { params });
  return response.data;
}

export async function getTorneosAdmin(page = 1, perPage = 20): Promise<ApiResponse<Torneo[]>> {
  const params: any = { page, per_page: perPage };
  const response = await axiosInstance.get('/torneos/admin', { params });
  return response.data;
}

export async function getTorneosDisponiblesReinscripcion(): Promise<ApiResponse<Torneo[]>> {
  const response = await axiosInstance.get('/torneos/disponibles-reinscripcion');
  return response.data;
}

export async function getCategorias(page = 1, perPage = 100, idTorneo?: number): Promise<ApiResponse<Categoria[]>> {
  const response = await axiosInstance.get('/categorias', {
    params: { page, per_page: perPage, id_torneo: idTorneo },
  });
  return response.data;
}
