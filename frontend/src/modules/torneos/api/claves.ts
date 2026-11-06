// Claves de React Query de torneos, en un solo lugar. Todas empiezan con 'torneos': invalidar `todos` refresca
// el detalle, las tablas, las llaves, el recorrido, el calendario (clavesPartidos.delTorneo) y los líderes.
// La lista del admin (['torneos_admin']) es del catálogo y sigue escrita en sus pantallas.
type Id = string | number | undefined;

export const clavesTorneos = {
  todos: ['torneos'] as const,
  detalle: (idTorneo: Id) => ['torneos', idTorneo] as const,
  posiciones: (idTorneo: Id, idCategoria?: number) => ['torneos', idTorneo, 'posiciones', idCategoria] as const,
  recorrido: (idTorneo: Id, idCategoria?: number) => ['torneos', idTorneo, 'recorrido', idCategoria] as const,
  faseFinal: (idTorneo: Id, idCategoria?: number) => ['torneos', idTorneo, 'fase-final', idCategoria] as const,
};
