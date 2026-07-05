import api from '../../../api/axios.config';
import type { ApiResponse, Sancion } from '../../../types/api.types';

export const getSanciones = async (idJugador?: number, estado?: string) => {
  return (await api.get<ApiResponse<Sancion[]>>('/sanciones/', { params: { id_jugador: idJugador, estado } })).data;
};

export const createSancion = async (data: Partial<Sancion>) => {
  return (await api.post<ApiResponse<Sancion>>('/sanciones/', data)).data;
};

export const updateSancion = async (id: number, data: { motivo?: string; estado?: string }) => {
  return (await api.put<ApiResponse<Sancion>>(`/sanciones/${id}`, data)).data;
};
