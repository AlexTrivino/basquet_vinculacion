import axiosInstance from '@/shared/api/axios.config';
import type { ApiResponse } from '@/shared/api/tipos';
import type { FotoDelPodio } from '@/modules/partidos';

export interface EquipoFlyer {
  id_equipo: number;
  nombre_equipo: string;
  url_logo: string | null;
}

export interface FiguraFlyer {
  jugador: { id_jugador: number; nombre: string; url_foto: string | null; numero_camiseta: number | null };
  equipo: EquipoFlyer | null;
  categoria: string | null;
  linea: { puntos: number; rebotes: number; asistencias: number; tapones: number; triples: number; tiros_libres: number };
  valoracion: number;
  partido?: string | null; // figura de una fecha, o el único partido del acumulado
  id_categoria?: number; // figuras acumuladas del torneo
  partidos?: number;
  promedio_puntos?: number;
}

export interface ResultadoFlyer {
  id_partido: number;
  hora: string | null;
  categoria: string | null;
  fase: string;
  llave?: string | null;
  estado: string;
  local: EquipoFlyer & { marcador: number };
  visitante: EquipoFlyer & { marcador: number };
  figura: FiguraFlyer | null;
}

export interface DatosFlyers {
  torneo: { id_torneo: number; nombre: string };
  fecha: string | null;
  fechas: string[];
  resultados: ResultadoFlyer[];
  figura_fecha: FiguraFlyer | null;
  figuras_categoria: FiguraFlyer[];
  figuras_equipo: FiguraFlyer[];
  // Totales por jugador (y categoría) para los líderes: de la fecha y de todo el torneo
  jugadores_fecha: FiguraFlyer[];
  jugadores_torneo: FiguraFlyer[];
}

// Resultados de una fecha (por defecto la última jugada) y figuras del torneo
export async function getDatosFlyers(idTorneo: number, fecha?: string): Promise<ApiResponse<DatosFlyers>> {
  const response = await axiosInstance.get('/estadisticas/flyers', { params: { id_torneo: idTorneo, fecha: fecha || undefined } });
  return response.data;
}

// Clave de los podios del torneo en React Query: la leen el estudio y, al subir o quitar una foto, se invalida
export const clavePodios = (idTorneo: number) => ['flyers', 'podios', idTorneo] as const;

// ── Foto del equipo en el podio de una categoría (solo super_admin) ──
// Una por equipo y categoría: subir otra reemplaza la anterior y vuelve el encuadre al centro
export type Encuadre = Pick<FotoDelPodio, 'foco_x' | 'foco_y' | 'zoom'>;

const rutaFoto = (idCategoria: number, idEquipo: number) => `/torneos/categorias/${idCategoria}/podio/${idEquipo}/foto`;

export async function subirFotoPodio(idCategoria: number, idEquipo: number, foto: File): Promise<ApiResponse<FotoDelPodio>> {
  const datos = new FormData();
  datos.append('foto', foto);
  const response = await axiosInstance.post(rutaFoto(idCategoria, idEquipo), datos); // axios arma el multipart con su límite
  return response.data;
}

// Solo cambia cómo se encuadra: el archivo no se toca. Se mandan los tres campos y nada más.
export async function ajustarFotoPodio(idCategoria: number, idEquipo: number, { foco_x, foco_y, zoom }: Encuadre): Promise<ApiResponse<FotoDelPodio>> {
  const response = await axiosInstance.patch(rutaFoto(idCategoria, idEquipo), { foco_x, foco_y, zoom });
  return response.data;
}

export async function quitarFotoPodio(idCategoria: number, idEquipo: number): Promise<ApiResponse<null>> {
  const response = await axiosInstance.delete(rutaFoto(idCategoria, idEquipo));
  return response.data;
}
