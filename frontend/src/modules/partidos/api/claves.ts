// Claves de React Query de partidos, en un solo lugar. Los arreglos son los de siempre, letra por letra:
// las altas, ediciones y la fase final invalidan `todos`; el calendario va bajo 'torneos' para que invalidar
// ['torneos'] (al finalizar un partido) también lo refresque.
type Id = string | number | undefined;

export const clavesPartidos = {
  todos: ['partidos'] as const,
  lista: (...filtros: unknown[]) => ['partidos', ...filtros] as const,
  delEquipo: (idEquipo: Id) => ['partidos', idEquipo] as const,
  pendientesDeEstadisticas: ['partidos', 'pendientes_stats'] as const,
  programados: ['partidos', 'programados'] as const,
  delTorneo: (idTorneo: string | undefined, idCategoria?: number) => ['torneos', idTorneo, 'partidos', idCategoria] as const,
  boxScore: (idPartido: Id) => ['partido', idPartido, 'box-score'] as const,
  estadisticas: (idPartido: Id) => ['partido-stats', idPartido] as const,
};
