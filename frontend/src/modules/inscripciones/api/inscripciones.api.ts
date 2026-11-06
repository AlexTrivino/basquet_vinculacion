import axiosInstance from '@/shared/api/axios.config';
import type { ApiResponse, Inscripcion } from '@/shared/api/tipos';

// Las llamadas a /inscripciones (antes estaban en equipos.api.ts).

export async function getInscripciones(page = 1, perPage = 50, idTorneo?: number, estado?: string, idCategoria?: number, idEquipo?: number): Promise<ApiResponse<Inscripcion[]>> {
  const params: any = { page, per_page: perPage };
  if (idTorneo) params.id_torneo = idTorneo;
  if (estado) params.estado_inscripcion = estado;
  if (idCategoria) params.id_categoria = idCategoria;
  if (idEquipo) params.id_equipo = idEquipo;
  
  const response = await axiosInstance.get('/inscripciones', { params });
  return response.data;
}

export async function createInscripcion(data: { id_torneo: number; id_equipo: number; id_categoria: number }): Promise<ApiResponse<Inscripcion>> {
  const response = await axiosInstance.post('/inscripciones', data);
  return response.data;
}

export async function reinscribirEquipo(data: { id_torneo: number; id_equipo: number; id_categoria: number; clonar_plantilla: boolean }): Promise<ApiResponse<Inscripcion>> {
  const response = await axiosInstance.post('/inscripciones/reinscribir', data);
  return response.data;
}

export async function updateInscripcionEstado(id: number, estado: 'aprobado' | 'rechazado'): Promise<ApiResponse<Inscripcion>> {
  const response = await axiosInstance.patch(`/inscripciones/${id}/estado`, { estado_inscripcion: estado });
  return response.data;
}

export async function editarInscripcion(id: number, data: { id_torneo: number; id_categoria: number }): Promise<ApiResponse<Inscripcion>> {
  const response = await axiosInstance.patch(`/inscripciones/${id}/editar`, data);
  return response.data;
}

export async function retirarEquipo(id: number): Promise<ApiResponse<Inscripcion>> {
  const response = await axiosInstance.put(`/inscripciones/${id}/retirar`);
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

export async function getInscripcionesPublicas(idTorneo?: number, idEquipo?: number): Promise<ApiResponse<Inscripcion[]>> {
  const params: any = { per_page: 200 };
  if (idTorneo) params.id_torneo = idTorneo;
  if (idEquipo) params.id_equipo = idEquipo;
  const response = await axiosInstance.get('/inscripciones/publicas', { params });
  return response.data;
}

export const finalizarBorradorInscripcion = async (idInscripcion: number | string): Promise<ApiResponse<Inscripcion>> => {
  const response = await axiosInstance.post(`/inscripciones/${idInscripcion}/finalizar-borrador`);
  return response.data;
};

export const purgarInscripcionesExpiradas = async (dias = 30): Promise<ApiResponse<{ inscripciones_purgadas: number; equipos_eliminados: number; dias_umbral: number }>> => {
  const response = await axiosInstance.post('/inscripciones/purgar-expiradas', null, {
    params: { dias },
  });
  return response.data;
};

/**
 * Elimina una inscripción en estado borrador.
 */
export async function deleteBorradorInscripcion(idInscripcion: number): Promise<ApiResponse<null>> {
  const { data } = await axiosInstance.delete<ApiResponse<null>>(`/inscripciones/${idInscripcion}`);
  return data;
}
