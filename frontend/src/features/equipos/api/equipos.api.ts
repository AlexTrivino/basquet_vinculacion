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

export async function getInscripciones(page = 1, perPage = 50): Promise<ApiResponse<Inscripcion[]>> {
  const response = await axiosInstance.get('/inscripciones', {
    params: { page, per_page: perPage },
  });
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
