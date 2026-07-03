import axiosInstance from '../../../api/axios.config';
import type { ApiResponse } from '../../../types/api.types';

export interface UserProfile {
  id_usuario: number;
  id_supabase: string;
  correo: string;
  nombre: string;
  rol: string;
  activo: boolean;
  creado_en: string;
}

export const getPerfil = async (): Promise<ApiResponse<UserProfile>> => {
  const response = await axiosInstance.get('/usuarios/me');
  return response.data;
};

export const actualizarPerfil = async (nombre: string): Promise<ApiResponse<UserProfile>> => {
  const response = await axiosInstance.put('/usuarios/me', { nombre });
  return response.data;
};
