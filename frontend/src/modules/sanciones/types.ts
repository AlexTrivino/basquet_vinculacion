// Tipos de la API que solo usa el módulo sanciones (los que comparten varios están en shared/api/tipos.ts).

export interface Sancion {
  id?: number;
  id_sancion: number;
  motivo: string;
  fecha: string;
  estado: string;
  id_jugador: number;
  id_partido: number;
  created_at: string;
  jugador?: { id_jugador: number; nombre: string };
  partido?: { id_partido: number; fecha_programada: string; estado: string };
}
