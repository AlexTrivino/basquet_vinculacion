import axiosInstance from '../../../api/axios.config';
import type { ApiResponse, Jugador, Plantilla } from '../../../types/api.types';

// Jugadores
export async function getJugadores(page = 1, perPage = 20): Promise<ApiResponse<Jugador[]>> {
  const response = await axiosInstance.get('/jugadores', {
    params: { page, per_page: perPage },
  });
  return response.data;
}

export async function createJugador(data: { nombres: string; apellidos: string; documento_identificacion: string; fecha_nacimiento: string; genero: string }): Promise<ApiResponse<any>> {
  const response = await axiosInstance.post('/jugadores', data);
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
