import axiosInstance from '../../../api/axios.config';
import type { ApiResponse, Categoria } from '../../../types/api.types';

export async function getCategorias(page = 1, perPage = 100, idTorneo?: number): Promise<ApiResponse<Categoria[]>> {
  const response = await axiosInstance.get('/categorias', {
    params: { page, per_page: perPage, id_torneo: idTorneo },
  });
  return response.data;
}
