// Tipos de la API que solo usa el módulo torneos (los que comparten varios están en shared/api/tipos.ts).
import type { FormatoFaseFinal } from '@/shared/api/tipos';

export interface PosicionFIBA {
  id?: number;
  id_equipo: number;
  nombre_equipo: string;
  url_logo?: string;
  PJ: number;
  PG: number;
  PP: number;
  puntos: number;
  PF: number;
  PC: number;
  DIF: number;
  posicion?: number;
  grupo?: string | null;
}

// ── Fase final: cuadro de llaves y recorrido de los grupos ──

export interface EquipoLlave {
  id_equipo: number;
  nombre_equipo: string;
  url_logo?: string | null;
}

export interface Llave {
  codigo: string;
  ronda: string;
  cruce: string;
  ref_local: string;
  ref_visitante: string;
  local: EquipoLlave | null;
  visitante: EquipoLlave | null;
  estado: 'finalizado' | 'programado' | 'listo' | 'espera';
  ganador: number | null;
  partido: {
    id_partido: number;
    fecha: string | null;
    hora: string | null;
    estado: string;
    marcador_local: number;
    marcador_visitante: number;
    ubicacion?: string;
  } | null;
}

export interface FaseFinal {
  id_torneo: number;
  id_categoria: number;
  formato: FormatoFaseFinal | null;
  formatos: Record<FormatoFaseFinal, { nombre: string; descripcion: string; grupos: string[]; cupos: number }>;
  grupos: Record<string, string | null>;
  fase_grupos: { jugados: number; esperados: number; pendientes: number; terminada: boolean };
  llaves: Llave[];
}

export type SituacionGrupo = 'clasificado' | 'zona' | 'depende' | 'eliminado';

export interface RecorridoEquipo extends EquipoLlave {
  posicion: number;
  PJ: number;
  PG: number;
  PP: number;
  puntos: number;
  restantes: number;
  situacion: SituacionGrupo;
  posiciones: (number | null)[];
}

export interface Recorrido {
  fechas: string[];
  cupos: number | null;
  grupos: { grupo: string | null; terminado: boolean; equipos: RecorridoEquipo[] }[];
}
