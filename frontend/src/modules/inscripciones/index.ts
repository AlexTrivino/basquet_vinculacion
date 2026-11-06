// Módulo inscripciones: las inscripciones de los equipos (asistentes de inscripción y reinscripción, revisión,
// retiro y purga de borradores), las plantillas de 5 a 18 jugadores y las reglas de negocio que lee el frontend.
export {
  deleteBorradorInscripcion,
  getInscripciones,
  getInscripcionesPublicas,
  purgarInscripcionesExpiradas,
  retirarEquipo,
  updateInscripcionEstado,
} from './api/inscripciones.api';
export { buscarJugadorPorCedula, getPlantillas } from './api/plantillas.api';
export { ModalExpedienteInscripcion } from './components/ModalExpedienteInscripcion';
export { ModalGestionarPlantillasAdmin } from './components/ModalGestionarPlantillasAdmin';
export { ModalRechazarInscripcion } from './components/ModalRechazarInscripcion';
export { useBusinessRules } from './useBusinessRules';
export { rutas } from './routes';
