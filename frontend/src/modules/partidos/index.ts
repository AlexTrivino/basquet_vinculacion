// Módulo partidos: la programación y el cierre de los partidos (con sus estadísticas y su acta), el box score
// público, las listas de partidos que leen el calendario, la portada, los flyers y el perfil del equipo, y el podio
// (la final y el tercer puesto) de la portada y del estudio de flyers.
export { getPartidos, getPartidosByEquipo, getPartidosByTorneo, getPodios, getPodiosDelTorneo } from './api/partidos.api';
export type { EquipoDelPodio, FotoDelPodio, PodioDeCategoria, PodiosDelTorneo, PodiosDePortada, PuestoDelPodio } from './api/partidos.api';
export { fechaCorta, partidoClave } from './podio';
export { clavesPartidos } from './api/claves';
export { BoxScoreModal } from './components/BoxScoreModal';
export { rutas } from './routes';
