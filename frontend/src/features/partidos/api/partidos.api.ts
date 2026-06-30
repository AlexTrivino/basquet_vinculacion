import axiosInstance from '../../../api/axios.config';
import type { ApiResponse, Partido } from '../../../types/api.types';

export async function actualizarPartido(
  idPartido: number,
  data: { estado?: string; marcador_local?: number; marcador_visitante?: number }
): Promise<ApiResponse<Partido>> {
  const response = await axiosInstance.put(`/partidos/${idPartido}`, data);
  return response.data;
}
