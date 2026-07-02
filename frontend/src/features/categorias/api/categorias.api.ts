import axiosInstance from '../../../api/axios.config';
import type { ApiResponse, Categoria } from '../../../types/api.types';

export async function getCategorias(page = 1, perPage = 100): Promise<ApiResponse<Categoria[]>> {
  const response = await axiosInstance.get('/categorias', {
    params: { page, per_page: perPage },
  });
  return response.data;
}
