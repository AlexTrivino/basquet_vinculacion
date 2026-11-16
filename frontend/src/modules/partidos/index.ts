// Módulo partidos: la programación y el cierre de los partidos (con sus estadísticas y su acta), el box score
// público, las listas de partidos que leen el calendario, la portada, los flyers y el perfil del equipo, y el podio
// de la portada (la final y el tercer puesto del torneo más reciente).
export { getPartidos, getPartidosByEquipo, getPartidosByTorneo, getPodios } from './api/partidos.api';
export type { EquipoDelPodio, PodioDeCategoria, PodiosDePortada, PuestoDelPodio } from './api/partidos.api';
export { clavesPartidos } from './api/claves';
export { BoxScoreModal } from './components/BoxScoreModal';
export { rutas } from './routes';
