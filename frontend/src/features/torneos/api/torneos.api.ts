import axiosInstance from '../../../api/axios.config';
import type { ApiResponse, Torneo, Partido, PosicionFIBA } from '../../../types/api.types';

// Ojo: axiosInstance (importado arriba) ya inyecta el baseUrl y el token.

export async function getTorneos(page = 1, perPage = 20): Promise<ApiResponse<Torneo[]>> {
  const response = await axiosInstance.get('/torneos', {
    params: { page, per_page: perPage },
  });
  return response.data;
}

export async function getTorneoById(id: string | number): Promise<ApiResponse<Torneo>> {
  const response = await axiosInstance.get(`/torneos/${id}`);
  return response.data;
}

export async function getPosicionesByTorneo(id: string | number): Promise<ApiResponse<PosicionFIBA[]>> {
  const response = await axiosInstance.get(`/torneos/${id}/posiciones`);
  return response.data;
}

export async function getPartidosByTorneo(idTorneo: string | number, page = 1, perPage = 20): Promise<ApiResponse<Partido[]>> {
  const response = await axiosInstance.get('/partidos', {
    params: { id_torneo: idTorneo, page, per_page: perPage },
  });
  return response.data;
}
