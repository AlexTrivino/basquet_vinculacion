import axiosInstance from '../../../api/axios.config';
import type { ApiResponse, Torneo, Partido, PosicionFIBA } from '../../../types/api.types';

// Ojo: axiosInstance (importado arriba) ya inyecta el baseUrl y el token.

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

export async function getTorneoById(id: string | number): Promise<ApiResponse<Torneo>> {
  const response = await axiosInstance.get(`/torneos/${id}`);
  return response.data;
}

export async function getTorneosDisponiblesReinscripcion(): Promise<ApiResponse<Torneo[]>> {
  const response = await axiosInstance.get('/torneos/disponibles-reinscripcion');
  return response.data;
}

export async function getPosicionesByTorneo(id: string | number, idCategoria?: number): Promise<ApiResponse<PosicionFIBA[]>> {
  const params: any = {};
  if (idCategoria) params.id_categoria = idCategoria;
  const response = await axiosInstance.get(`/torneos/${id}/posiciones`, { params });
  return response.data;
}

export async function getPartidosByTorneo(idTorneo: string | number, page = 1, perPage = 20, idCategoria?: number): Promise<ApiResponse<Partido[]>> {
  const params: any = { id_torneo: idTorneo, page, per_page: perPage };
  if (idCategoria) params.id_categoria = idCategoria;
  const response = await axiosInstance.get('/partidos', { params });
  return response.data;
}

export async function createTorneo(payload: Partial<Torneo>): Promise<ApiResponse<Torneo>> {
  const response = await axiosInstance.post('/torneos', payload);
  return response.data;
}

export async function updateTorneo(id: string | number, payload: Partial<Torneo>): Promise<ApiResponse<Torneo>> {
  const response = await axiosInstance.put(`/torneos/${id}`, payload);
  return response.data;
}

export async function deleteTorneo(id: string | number): Promise<ApiResponse<void>> {
  const response = await axiosInstance.delete(`/torneos/${id}`);
  return response.data;
}

export async function anularTorneo(id: string | number): Promise<ApiResponse<void>> {
  const response = await axiosInstance.put(`/torneos/${id}/anular`);
  return response.data;
}

export async function addCategoria(idTorneo: string | number, payload: any): Promise<ApiResponse<any>> {
  const response = await axiosInstance.post(`/torneos/${idTorneo}/categorias`, payload);
  return response.data;
}

export async function deleteCategoria(idCategoria: string | number): Promise<ApiResponse<void>> {
  const response = await axiosInstance.delete(`/torneos/categorias/${idCategoria}`);
  return response.data;
}

export async function uploadCalendario(idTorneo: string | number, file: File): Promise<ApiResponse<{ url: string }>> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axiosInstance.post(`/torneos/${idTorneo}/calendario`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
