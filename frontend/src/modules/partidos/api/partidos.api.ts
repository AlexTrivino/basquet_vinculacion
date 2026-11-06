import axiosInstance from '@/shared/api/axios.config';
import type { ApiResponse, Partido } from '@/shared/api/tipos';

export async function actualizarPartido(
  idPartido: number,
  data: { estado?: string; marcador_local?: number; marcador_visitante?: number; fecha?: string; hora?: string; ubicacion?: string; fase?: string; id_equipo_local?: number; id_equipo_visitante?: number }
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

export async function getPartidos(params?: { 
  page?: number; 
  per_page?: number; 
  id_torneo?: number; 
  id_categoria?: number; 
  id_equipo?: number; 
  estados?: string; 
  pendientes_stats?: boolean; 
  search?: string; 
  sort_order?: 'asc' | 'desc'; 
}): Promise<ApiResponse<Partido[]>> {
  const response = await axiosInstance.get('/partidos', { params });
  return response.data;
}

export async function getBoxScore(idPartido: number): Promise<ApiResponse<any>> {
  const response = await axiosInstance.get(`/partidos/${idPartido}/estadisticas`);
  return response.data;
}

export async function getPartidosByEquipo(idEquipo: number | string): Promise<ApiResponse<Partido[]>> {
  const response = await axiosInstance.get('/partidos', {
    params: { id_equipo: idEquipo, per_page: 50 },
  });
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

export const anularPartido = async (idPartido: number): Promise<ApiResponse<null>> => {
  const response = await axiosInstance.delete(`/partidos/${idPartido}`);
  return response.data;
};

export const restaurarPartido = async (idPartido: number): Promise<ApiResponse<null>> => {
  const response = await axiosInstance.post(`/partidos/${idPartido}/restaurar`);
  return response.data;
};

export const eliminarPartido = async (idPartido: number): Promise<ApiResponse<null>> => {
  // Nota: Mantenemos el endpoint original que borra físicamente, 
  // pero el backend ahora anula en el DELETE base. 
  // Ajuste según sea necesario. En este rediseño, el botón eliminar llama a anularPartido.
  return anularPartido(idPartido);
};

// El calendario de un torneo (con las fechas para los flyers).
export async function getPartidosByTorneo(idTorneo: string | number, page = 1, perPage = 20, idCategoria?: number): Promise<ApiResponse<Partido[]>> {
  const params: any = { id_torneo: idTorneo, page, per_page: perPage };
  if (idCategoria) params.id_categoria = idCategoria;
  const response = await axiosInstance.get('/partidos', { params });
  return response.data;
}

// Carga las estadísticas de un partido al finalizarlo.
export async function postEstadisticasBulk(data: any): Promise<ApiResponse<any>> {
  const response = await axiosInstance.post('/estadisticas/bulk', data);
  return response.data;
}
