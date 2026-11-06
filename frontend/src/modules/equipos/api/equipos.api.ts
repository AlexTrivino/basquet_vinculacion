import axiosInstance from '@/shared/api/axios.config';
import type { ApiResponse, Equipo } from '@/shared/api/tipos';

export async function getEquipos(page = 1, perPage = 20): Promise<ApiResponse<Equipo[]>> {
  const response = await axiosInstance.get('/equipos', {
    params: { page, per_page: perPage },
  });
  return response.data;
}

export async function createEquipo(data: { nombre: string }): Promise<ApiResponse<any>> {
  const payload = { nombre_equipo: data.nombre };
  const response = await axiosInstance.post('/equipos', payload);
  return response.data;
}

export async function getEquipoById(id: number | string): Promise<ApiResponse<Equipo>> {
  const response = await axiosInstance.get(`/equipos/${id}`);
  return response.data;
}

export async function updateEquipo(id: number, data: Partial<Equipo>): Promise<ApiResponse<Equipo>> {
  const response = await axiosInstance.put(`/equipos/${id}`, data);
  return response.data;
}

export async function uploadLogoEquipo(id: number, file: File): Promise<ApiResponse<{ url: string }>> {
  const formData = new FormData();
  formData.append('logo', file);
  const response = await axiosInstance.post(`/equipos/${id}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteLogoEquipo(id: number): Promise<ApiResponse<null>> {
  const response = await axiosInstance.delete(`/equipos/${id}/logo`);
  return response.data;
}

export async function uploadBannerEquipo(id: number, file: File): Promise<ApiResponse<{ url: string }>> {
  const formData = new FormData();
  formData.append('banner', file);
  const response = await axiosInstance.post(`/equipos/${id}/banner`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteBannerEquipo(id: number): Promise<ApiResponse<null>> {
  const response = await axiosInstance.delete(`/equipos/${id}/banner`);
  return response.data;
}

export const getEquiposAdmin = async (page = 1, perPage = 20, idTorneo?: number, idCategoria?: number, search?: string, estado?: string) => {
  return (await axiosInstance.get('/equipos/admin/list', { params: { page, per_page: perPage, id_torneo: idTorneo, id_categoria: idCategoria, search, estado } })).data;
};

export const reactivarEquipo = async (idEquipo: number) => {
  return (await axiosInstance.put(`/equipos/${idEquipo}/reactivar`)).data;
};

export const desactivarEquipo = async (idEquipo: number) => {
  return (await axiosInstance.delete(`/equipos/${idEquipo}`)).data;
};
