// Módulo estadísticas: el panel del admin (tablero, actividad reciente, pendientes y el estudio de flyers), los
// líderes de un torneo y, para la portada, los totales públicos y las figuras del torneo.
export { getEstadisticasPublicas, getFigurasPortada } from './api/estadisticas.api';
export type { FiguraDelTorneo } from './api/estadisticas.api';
export { LideresEstadisticos } from './components/LideresEstadisticos';
export { rutas } from './routes';
