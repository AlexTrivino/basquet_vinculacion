/**
 * Interfaces base que mapean estrictamente a los esquemas (Schemas)
 * y respuestas del backend de Flask/Marshmallow.
 */

// ── Respuestas Genéricas ────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error_code?: string;
  pagination?: PaginationMeta;
}

// ── Modelos de Dominio ──────────────────────────────────────────

export interface Categoria {
  id?: number;
  id_categoria?: number;
  nombre?: string;
  nombre_categoria?: string;
  descripcion?: string;
  genero_categoria?: string;
  edad_minima?: number;
  edad_maxima?: number;
}

export interface Torneo {
  id?: number;
  id_torneo?: number;
  nombre?: string;
  nombre_torneo?: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  ubicacion?: string;
  estado: string;
}

export interface Equipo {
  id?: number;
  id_equipo?: number;
  nombre?: string;
  nombre_equipo?: string;
  logo_url?: string;
  id_usuario?: string;
  entrenador?: string;
}

export interface Inscripcion {
  id?: number;
  id_inscripcion?: number;
  id_torneo: number;
  id_equipo: number;
  id_categoria: number;
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
  estado_inscripcion?: 'pendiente' | 'aprobado' | 'rechazado';
  url_comprobante_pago?: string;
  fecha_inscripcion: string;
  
  // Relaciones
  torneo?: Torneo;
  equipo?: Equipo;
  categoria?: Categoria;
}

export interface Jugador {
  id: number;
  id_jugador?: number;
  nombres: string;
  apellidos: string;
  documento_identificacion: string;
  fecha_nacimiento: string;
  url_foto?: string;
  telefono?: string;
  correo?: string;
}

export interface Plantilla {
  id: number;
  id_plantilla?: number;
  id_jugador: number;
  id_equipo: number;
  id_torneo: number;
  numero_camiseta: number;
  
  // Relaciones
  jugador?: Jugador;
  equipo?: Equipo;
}

export interface Partido {
  id?: number;
  id_partido?: number;
  id_torneo?: number;
  id_categoria?: number;
  fecha_hora?: string;
  url_planilla_fiba?: string;
  fecha?: string;
  hora?: string;
  fase?: string;
  ubicacion?: string;
  estado: 'programado' | 'en_curso' | 'finalizado' | 'finalizado_wo' | 'suspendido';
  marcador_local: number;
  marcador_visitante: number;
  
  // Relaciones anidadas (Marshmallow _EquipoEnPartidoSchema, etc)
  equipo_local?: Equipo;
  equipo_visitante?: Equipo;
  torneo?: Torneo;
  categoria?: Categoria;
}

export interface PosicionFIBA {
  id?: number;
  id_equipo: number;
  nombre_equipo: string;
  PJ: number;
  PG: number;
  PP: number;
  puntos: number;
  PF: number;
  PC: number;
  DIF: number;
}
