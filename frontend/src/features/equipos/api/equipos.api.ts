import axiosInstance from '../../../api/axios.config';
import type { ApiResponse, Equipo, Inscripcion } from '../../../types/api.types';

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

export async function getInscripciones(page = 1, perPage = 50, idTorneo?: number, estado?: string, idCategoria?: number): Promise<ApiResponse<Inscripcion[]>> {
  const params: any = { page, per_page: perPage };
  if (idTorneo) params.id_torneo = idTorneo;
  if (estado) params.estado_inscripcion = estado;
  if (idCategoria) params.id_categoria = idCategoria;
  
  const response = await axiosInstance.get('/inscripciones', { params });
  return response.data;
}

export async function createInscripcion(data: { id_torneo: number; id_equipo: number; id_categoria: number }): Promise<ApiResponse<Inscripcion>> {
  const response = await axiosInstance.post('/inscripciones', data);
  return response.data;
}

export async function updateInscripcionEstado(id: number, estado: 'aprobado' | 'rechazado'): Promise<ApiResponse<Inscripcion>> {
  const response = await axiosInstance.patch(`/inscripciones/${id}/estado`, { estado_inscripcion: estado });
  return response.data;
}

export async function subirComprobante(idInscripcion: number | string, file: File): Promise<ApiResponse<Inscripcion>> {
  const formData = new FormData();
  formData.append('archivo', file);
  
  const response = await axiosInstance.post(`/inscripciones/${idInscripcion}/comprobante`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function inscribirEquipoCompleto(formData: FormData): Promise<ApiResponse<Inscripcion>> {
  const response = await axiosInstance.post('/inscripciones/completa', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
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

export async function getInscripcionesPublicas(idTorneo?: number, idEquipo?: number): Promise<ApiResponse<Inscripcion[]>> {
  const params: any = {};
  if (idTorneo) params.id_torneo = idTorneo;
  if (idEquipo) params.id_equipo = idEquipo;
  const response = await axiosInstance.get('/inscripciones/publicas', { params });
  return response.data;
}

export const getEquiposAdmin = async (page = 1, perPage = 20, idTorneo?: number, idCategoria?: number, search?: string) => {
  return (await axiosInstance.get('/equipos/admin/list', { params: { page, per_page: perPage, id_torneo: idTorneo, id_categoria: idCategoria, search } })).data;
};

export const reactivarEquipo = async (idEquipo: number) => {
  return (await axiosInstance.put(`/equipos/${idEquipo}/reactivar`)).data;
};

export const desactivarEquipo = async (idEquipo: number) => {
  return (await axiosInstance.delete(`/equipos/${idEquipo}`)).data;
};
