import api from '../../../api/axios.config';
import type { ApiResponse } from '../../../types/api.types';
import type { JugadorPerfilResponse } from '../../../types/api.types';

export const getJugadorPerfil = async (id: string) => {
  const response = await api.get<ApiResponse<JugadorPerfilResponse>>(`/jugadores/${id}/perfil`);
  return response.data;
};
