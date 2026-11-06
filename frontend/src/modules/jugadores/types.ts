// Tipos de la API que solo usa el módulo jugadores (los que comparten varios están en shared/api/tipos.ts).

export interface ParticipacionJugador {
  id_plantilla: number;
  numero_camiseta?: number | null;
  id_equipo: number;
  nombre_equipo: string;
  url_logo?: string | null;
  id_torneo: number;
  nombre_torneo: string;
  estado_torneo?: string;
  anio?: number | null;
  id_categoria?: number | null;
  nombre_categoria?: string | null;
}

export interface MetricasEstadisticasJugador {
  partidos_jugados: number;
  puntos_totales: number;
  promedio_puntos: number;
  rebotes_totales: number;
  asistencias_totales: number;
  triples_totales: number;
  tapones_totales: number;
  tiros_libres_totales: number;
}

export interface JugadorPerfilResponse {
  id_jugador: number;
  nombre: string;
  url_foto?: string | null;
  participaciones?: ParticipacionJugador[];
  equipo_actual?: string | null;
  torneo_actual?: string | null;
  id_equipo_actual?: number | null;
  id_torneo_actual?: number | null;
  estadisticas: MetricasEstadisticasJugador;
  estadisticas_por_torneo?: Record<string, MetricasEstadisticasJugador>;
  documento_identificacion?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  correo?: string | null;
  telefono?: string | null;
  url_cedula?: string | null;
  url_acta_bachiller?: string | null;
  delegados_autorizados?: string[];
}
