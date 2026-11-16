import axiosInstance from '@/shared/api/axios.config';
import type { ApiResponse, Partido } from '@/shared/api/tipos';

export async function actualizarPartido(
  idPartido: number,
  data: { estado?: string; marcador_local?: number; marcador_visitante?: number; fecha?: string; hora?: string; ubicacion?: string; fase?: string; id_equipo_local?: number; id_equipo_visitante?: number }
): Promise<ApiResponse<Partido>> {
  const response = await axiosInstance.put(`/partidos/${idPartido}`, data);
  return response.data;
}
export async function crearPartido(data: {
  fecha: string;
  hora: string;
  id_torneo: number;
  fase: string;
  id_equipo_local: number;
  id_equipo_visitante: number;
  ubicacion: string;
}): Promise<ApiResponse<Partido>> {
  const response = await axiosInstance.post('/partidos', data);
  return response.data;
}

export async function getPartidos(params?: { 
  page?: number; 
  per_page?: number; 
  id_torneo?: number; 
  id_categoria?: number; 
  id_equipo?: number; 
  estados?: string; 
  pendientes_stats?: boolean; 
  search?: string; 
  sort_order?: 'asc' | 'desc'; 
}): Promise<ApiResponse<Partido[]>> {
  const response = await axiosInstance.get('/partidos', { params });
  return response.data;
}

export async function getBoxScore(idPartido: number): Promise<ApiResponse<any>> {
  const response = await axiosInstance.get(`/partidos/${idPartido}/estadisticas`);
  return response.data;
}

export async function getPartidosByEquipo(idEquipo: number | string): Promise<ApiResponse<Partido[]>> {
  const response = await axiosInstance.get('/partidos', {
    params: { id_equipo: idEquipo, per_page: 50 },
  });
  return response.data;
}

export const subirActaPartido = async (idPartido: number, file: File): Promise<ApiResponse<{ url: string }>> => { 
  const formData = new FormData(); 
  formData.append('acta', file); 
  const response = await axiosInstance.post(`/partidos/${idPartido}/acta`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const eliminarActaPartido = async (idPartido: number): Promise<ApiResponse<null>> => {
  const response = await axiosInstance.delete(`/partidos/${idPartido}/acta`);
  return response.data;
};

export const anularPartido = async (idPartido: number): Promise<ApiResponse<null>> => {
  const response = await axiosInstance.delete(`/partidos/${idPartido}`);
  return response.data;
};

export const restaurarPartido = async (idPartido: number): Promise<ApiResponse<null>> => {
  const response = await axiosInstance.post(`/partidos/${idPartido}/restaurar`);
  return response.data;
};

export const eliminarPartido = async (idPartido: number): Promise<ApiResponse<null>> => {
  // Nota: Mantenemos el endpoint original que borra físicamente, 
  // pero el backend ahora anula en el DELETE base. 
  // Ajuste según sea necesario. En este rediseño, el botón eliminar llama a anularPartido.
  return anularPartido(idPartido);
};

// El calendario de un torneo (con las fechas para los flyers).
export async function getPartidosByTorneo(idTorneo: string | number, page = 1, perPage = 20, idCategoria?: number): Promise<ApiResponse<Partido[]>> {
  const params: any = { id_torneo: idTorneo, page, per_page: perPage };
  if (idCategoria) params.id_categoria = idCategoria;
  const response = await axiosInstance.get('/partidos', { params });
  return response.data;
}

// Carga las estadísticas de un partido al finalizarlo.
export async function postEstadisticasBulk(data: any): Promise<ApiResponse<any>> {
  const response = await axiosInstance.post('/estadisticas/bulk', data);
  return response.data;
}

// ── Podio de la portada: el del torneo más reciente que ya tenga alguno (pública) ──
export interface EquipoDelPodio {
  id_equipo: number;
  nombre_equipo: string;
  url_logo: string | null;
}

// La foto de un equipo en el podio de una categoría y su encuadre en el flyer: el punto de la foto que queda al
// centro del héroe (foco_x y foco_y, de 0 a 100 %) y cuánto se acerca (zoom, de 1 a 3)
export interface FotoDelPodio {
  url: string;
  ancho: number;
  alto: number;
  foco_x: number;
  foco_y: number;
  zoom: number;
}

export interface PuestoDelPodio {
  lugar: 1 | 2 | 3;
  equipo: EquipoDelPodio;
  PJ: number;
  PG: number;
  PP: number;
  PF: number;
  PC: number;
  sellos: ('invicto' | 'mas_puntos')[];
  // El partido que definió el puesto (final, tercer puesto o repechaje); null si salió de la tabla
  partido: { ronda: string; fecha: string | null; propio: number; rival: number; wo: boolean; equipo_rival: EquipoDelPodio } | null;
  // La que subió el admin para el flyer; si no hay, la del equipo (la del delegado) y, si tampoco, el escudo
  foto: FotoDelPodio | null;
  url_foto_equipo: string | null;
}

export interface PodioDeCategoria {
  categoria: { id_categoria: number; nombre_categoria: string; genero_categoria: string };
  puestos: PuestoDelPodio[];
}

export interface PodiosDePortada {
  torneo: { id_torneo: number; nombre: string; estado: string; fecha_inicio: string; fecha_fin: string } | null;
  podios: PodioDeCategoria[];
}

export async function getPodios(): Promise<ApiResponse<PodiosDePortada>> {
  const response = await axiosInstance.get('/torneos/podios');
  return response.data;
}

// Los podios de un torneo en concreto (el estudio de flyers elige el torneo)
export interface PodiosDelTorneo {
  torneo: NonNullable<PodiosDePortada['torneo']>;
  podios: PodioDeCategoria[];
}

export async function getPodiosDelTorneo(idTorneo: number): Promise<ApiResponse<PodiosDelTorneo>> {
  const response = await axiosInstance.get(`/torneos/${idTorneo}/podios`);
  return response.data;
}
