import axiosInstance from '../../../api/axios.config';
import type { ApiResponse, Jugador, Plantilla } from '../../../types/api.types';

// Jugadores
export async function getJugadores(page = 1, perPage = 20): Promise<ApiResponse<Jugador[]>> {
  const response = await axiosInstance.get('/jugadores', {
    params: { page, per_page: perPage },
  });
  return response.data;
}

export async function createJugador(data: { nombre: string; documento_identificacion: string; fecha_nacimiento: string; genero?: string; telefono?: string; correo?: string }): Promise<ApiResponse<any>> {
  const response = await axiosInstance.post('/jugadores', data);
  return response.data;
}

export async function deleteJugador(idJugador: number): Promise<ApiResponse<any>> {
  const response = await axiosInstance.delete(`/jugadores/${idJugador}`);
  return response.data;
}

// Plantillas
export async function getPlantillas(idEquipo?: number, page = 1, perPage = 50): Promise<ApiResponse<Plantilla[]>> {
  const response = await axiosInstance.get('/plantillas', {
    params: { id_equipo: idEquipo, page, per_page: perPage },
  });
  return response.data;
}

export async function createPlantilla(data: { id_jugador: number; id_equipo: number; id_torneo: number; numero_camiseta: number }): Promise<ApiResponse<Plantilla>> {
  const response = await axiosInstance.post('/plantillas', data);
  return response.data;
}

export async function deletePlantilla(idPlantilla: number): Promise<ApiResponse<any>> {
  const response = await axiosInstance.delete(`/plantillas/${idPlantilla}`);
  return response.data;
}

export async function updateNumeroCamiseta(idPlantilla: number, numeroCamiseta: number): Promise<ApiResponse<Plantilla>> {
  const response = await axiosInstance.patch(`/plantillas/${idPlantilla}`, {
    numero_camiseta: numeroCamiseta,
  });
  return response.data;
}

export async function buscarJugadorPorCedula(cedula: string, idTorneo?: number): Promise<ApiResponse<Jugador | null>> {
  const params: Record<string, any> = { cedula };
  if (idTorneo) {
    params.id_torneo = idTorneo;
  }
  const response = await axiosInstance.get('/jugadores/buscar', { params });
  return response.data;
}

export async function uploadFotoJugador(idJugador: number, file: File): Promise<ApiResponse<any>> {
  const formData = new FormData();
  formData.append('archivo', file);
  
  const response = await axiosInstance.post(`/jugadores/${idJugador}/foto`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function uploadCedulaJugador(idJugador: number, file: File): Promise<ApiResponse<any>> {
  const formData = new FormData();
  formData.append('archivo', file);
  
  const response = await axiosInstance.post(`/jugadores/${idJugador}/cedula`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function uploadActaJugador(idJugador: number, file: File): Promise<ApiResponse<any>> {
  const formData = new FormData();
  formData.append('archivo', file);
  
  const response = await axiosInstance.post(`/jugadores/${idJugador}/acta`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}
