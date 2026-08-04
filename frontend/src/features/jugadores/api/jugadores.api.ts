import api from '../../../api/axios.config';
import type { ApiResponse, Jugador } from '../../../types/api.types';

export interface JugadorAdminFilterParams {
  search?: string;
  id_torneo?: number;
  id_equipo?: number;
  genero?: string;
  estado?: string;
  page?: number;
  per_page?: number;
}

export interface UpdateJugadorPayload {
  nombre?: string;
  nombres?: string;
  apellidos?: string;
  genero?: 'masculino' | 'femenino';
  documento_identificacion?: string;
  fecha_nacimiento?: string;
  correo?: string | null;
  telefono?: string | null;
  estado?: 'activo' | 'inactivo';
}

/**
 * Obtiene la lista de jugadores para administración con filtros y paginación.
 */
export const getJugadoresAdmin = async (params: JugadorAdminFilterParams = {}) => {
  const cleanParams: Record<string, any> = { admin: 'true' };
  if (params.search?.trim()) cleanParams.search = params.search.trim();
  if (params.id_torneo) cleanParams.id_torneo = params.id_torneo;
  if (params.id_equipo) cleanParams.id_equipo = params.id_equipo;
  if (params.genero && params.genero !== 'todos') cleanParams.genero = params.genero;
  if (params.estado && params.estado !== 'todos') cleanParams.estado = params.estado;
  if (params.page) cleanParams.page = params.page;
  if (params.per_page) cleanParams.per_page = params.per_page;

  const response = await api.get<ApiResponse<Jugador[]>>('/jugadores', {
    params: cleanParams,
  });
  return response.data;
};

/**
 * Obtiene el detalle completo de un jugador.
 */
export const getJugadorById = async (id: number) => {
  const response = await api.get<ApiResponse<Jugador>>(`/jugadores/${id}`);
  return response.data;
};

/**
 * Actualiza los datos de un jugador.
 */
export const updateJugador = async (id: number, data: UpdateJugadorPayload) => {
  const response = await api.put<ApiResponse<Jugador>>(`/jugadores/${id}`, data);
  return response.data;
};

/**
 * Sube la foto de perfil de un jugador.
 */
export const uploadFotoJugador = async (id: number, file: File) => {
  const formData = new FormData();
  formData.append('archivo', file);
  const response = await api.post<ApiResponse<Jugador>>(`/jugadores/${id}/foto`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Sube el documento de cédula de un jugador (PDF o imagen).
 */
export const uploadCedulaJugador = async (id: number, file: File) => {
  const formData = new FormData();
  formData.append('archivo', file);
  const response = await api.post<ApiResponse<Jugador>>(`/jugadores/${id}/cedula`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Sube el acta de bachiller de un jugador (PDF o imagen).
 */
export const uploadActaJugador = async (id: number, file: File) => {
  const formData = new FormData();
  formData.append('archivo', file);
  const response = await api.post<ApiResponse<Jugador>>(`/jugadores/${id}/acta`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Desactiva un jugador (soft delete).
 */
export const deleteJugador = async (id: number) => {
  const response = await api.delete<ApiResponse<null>>(`/jugadores/${id}`);
  return response.data;
};

/**
 * Perfil público del jugador con estadísticas y trayectoria.
 */
export const getJugadorPerfil = async (id: string | number) => {
  const response = await api.get<ApiResponse<any>>(`/jugadores/${id}/perfil`);
  return response.data;
};
