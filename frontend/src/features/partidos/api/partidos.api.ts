import axiosInstance from '../../../api/axios.config';
import type { ApiResponse, Partido } from '../../../types/api.types';

export async function actualizarPartido(
  idPartido: number,
  data: { estado?: string; marcador_local?: number; marcador_visitante?: number }
): Promise<ApiResponse<Partido>> {
  const response = await axiosInstance.put(`/partidos/${idPartido}`, data);
  return response.data;
}
export async function crearPartido(data: {
  fecha: string;
  hora: string;
  id_torneo: number;
  fase: string;
  id_equipo_local: number;
  id_equipo_visitante: number;
  ubicacion: string;
}): Promise<ApiResponse<Partido>> {
  const response = await axiosInstance.post('/partidos', data);
  return response.data;
}

export async function getBoxScore(idPartido: number): Promise<ApiResponse<any>> {
  const response = await axiosInstance.get(`/partidos/${idPartido}/estadisticas`);
  return response.data;
}

export const subirActaPartido = async (idPartido: number, file: File): Promise<ApiResponse<{ url: string }>> => { 
  const formData = new FormData(); 
  formData.append('acta', file); 
  const response = await axiosInstance.post(`/partidos/${idPartido}/acta`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const eliminarActaPartido = async (idPartido: number): Promise<ApiResponse<null>> => {
  const response = await axiosInstance.delete(`/partidos/${idPartido}/acta`);
  return response.data;
};
