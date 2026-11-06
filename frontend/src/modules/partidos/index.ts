// Módulo partidos: la programación y el cierre de los partidos (con sus estadísticas y su acta), el box score
// público y las listas de partidos que leen el calendario, la portada, los flyers y el perfil del equipo.
export { getPartidos, getPartidosByEquipo, getPartidosByTorneo } from './api/partidos.api';
export { clavesPartidos } from './api/claves';
export { BoxScoreModal } from './components/BoxScoreModal';
export { rutas } from './routes';
