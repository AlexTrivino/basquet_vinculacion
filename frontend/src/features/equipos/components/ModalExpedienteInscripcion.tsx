import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  FileText,
  ExternalLink,
  Users,
  Shield,
  User,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Eye,
  Check,
  Ban,
  Maximize2,
} from 'lucide-react';
import type { Inscripcion, Plantilla } from '../../../types/api.types';
import { getPlantillas } from '../../plantillas/api/plantillas.api';
import { StatusBadge } from '../../../components/StatusBadge';
import { AsyncButton } from '../../../components/AsyncButton';
import { ModalRechazarInscripcion } from './ModalRechazarInscripcion';

interface ModalExpedienteInscripcionProps {
  isOpen: boolean;
  onClose: () => void;
  inscripcion: Inscripcion | null;
  onAprobar: (id: number, nombreEquipo: string) => Promise<void>;
  onRechazar: (id: number, nombreEquipo: string) => Promise<void>;
  isUpdating?: boolean;
}

function calculateAge(birthDateString?: string): number | null {
  if (!birthDateString) return null;
  const parts = birthDateString.split('-');
  if (parts.length < 1) return null;
  const birthYear = parseInt(parts[0], 10);
  if (isNaN(birthYear)) return null;
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  return age >= 0 ? age : null;
}

function formatDate(fechaStr?: string): string {
  if (!fechaStr) return '-';
  const parts = fechaStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return fechaStr;
}

export function ModalExpedienteInscripcion({
  isOpen,
  onClose,
  inscripcion,
  onAprobar,
  onRechazar,
  isUpdating = false,
}: ModalExpedienteInscripcionProps) {
  const [modalRechazarOpen, setModalRechazarOpen] = useState(false);

  const idEquipo = inscripcion?.equipo?.id_equipo || inscripcion?.equipo?.id || inscripcion?.id_equipo;
  const idInscripcion = inscripcion?.id_inscripcion || inscripcion?.id || 0;
  const nombreEquipo = inscripcion?.equipo?.nombre_equipo || inscripcion?.equipo?.nombre || 'Equipo';
  const estado = inscripcion?.estado_inscripcion || inscripcion?.estado || 'pendiente';

  // Consulta de la plantilla del equipo
  const { data: plantillasResponse, isLoading: isLoadingPlantilla } = useQuery({
    queryKey: ['plantillas', idEquipo],
    queryFn: () => getPlantillas(idEquipo),
    enabled: isOpen && !!idEquipo,
  });

  const plantillas: Plantilla[] = plantillasResponse?.data || [];
  const totalJugadores = plantillas.length;
  const cumpleMinimo = totalJugadores >= 10;

  if (!isOpen || !inscripcion) return null;

  const urlComprobante = inscripcion.url_comprobante_pago;
  const isPdf = urlComprobante ? urlComprobante.toLowerCase().includes('.pdf') : false;
  const usuarioDelegado = inscripcion.equipo?.usuario;
  const categoria = inscripcion.categoria;
  const edadMin = categoria?.edad_minima;
  const edadMax = categoria?.edad_maxima;

  const handleConfirmRechazar = async () => {
    await onRechazar(idInscripcion, nombreEquipo);
    setModalRechazarOpen(false);
    onClose();
  };

  const handleConfirmAprobar = async () => {
    await onAprobar(idInscripcion, nombreEquipo);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-expediente-title"
      >
        <div className="relative w-full max-w-[1550px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col h-[94vh] max-h-[94vh] overflow-hidden">
          {/* Cabecera del Expediente */}
          <div className="flex items-center justify-between px-6 sm:px-8 py-5 bg-gray-900 text-white shrink-0 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-600/30 border border-primary-500/40 text-primary-400 flex items-center justify-center shadow-inner">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 id="modal-expediente-title" className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Expediente: {nombreEquipo}
                  </h2>
                  <StatusBadge
                    status={estado === 'pendiente' ? 'Pendiente' : estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}
                  />
                </div>
                <p className="text-sm text-gray-300 mt-0.5">
                  {inscripcion.torneo?.nombre || inscripcion.torneo?.nombre_torneo || 'Torneo'} •{' '}
                  <span className="text-primary-300 font-semibold">
                    {categoria?.nombre_categoria || categoria?.nombre || 'Categoría General'}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2.5 rounded-2xl hover:bg-gray-800 transition-colors"
              aria-label="Cerrar expediente"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Contenido Principal en 2 Columnas Desahogadas */}
          <div className="p-6 sm:p-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-8 bg-gray-50/70 flex-1">
            {/* Columna Izquierda: Información del Equipo, Delegado y Comprobante (4 columnas) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Tarjeta de Información General */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-600" />
                  Datos de la Solicitud
                </h3>

                <div className="space-y-3.5 text-sm">
                  <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                    <span className="text-gray-500 font-medium">Equipo:</span>
                    <span className="font-bold text-gray-900 text-right text-base">{nombreEquipo}</span>
                  </div>

                  <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                    <span className="text-gray-500 font-medium">Delegado:</span>
                    <span className="font-semibold text-gray-900 text-right">
                      {usuarioDelegado?.nombre || 'No especificado'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                    <span className="text-gray-500 font-medium">Correo:</span>
                    <span className="font-medium text-gray-700 text-right text-xs truncate max-w-[200px]">
                      {usuarioDelegado?.correo || 'Sin correo'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                    <span className="text-gray-500 font-medium">Categoría:</span>
                    <span className="font-bold text-primary-700 text-right">
                      {categoria?.nombre_categoria || categoria?.nombre || 'General'}
                      {(edadMin !== undefined || edadMax !== undefined) && (
                        <span className="text-xs text-gray-500 font-normal block">
                          ({edadMin ?? 0} a {edadMax ? `${edadMax} años` : 'adelante'})
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-start justify-between">
                    <span className="text-gray-500 font-medium">Fecha Envío:</span>
                    <span className="font-semibold text-gray-700 text-right">
                      {formatDate(inscripcion.fecha_inscripcion)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Comprobante de Pago */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    Comprobante de Pago
                  </h3>
                  {urlComprobante && (
                    <a
                      href={urlComprobante}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-800 hover:underline"
                    >
                      Abrir original <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {urlComprobante ? (
                  <div className="rounded-2xl border border-gray-200 overflow-hidden bg-gray-50">
                    {isPdf ? (
                      <div className="p-8 text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
                          <FileText className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-gray-900">Documento PDF Adjunto</p>
                          <p className="text-xs text-gray-500 mt-1">Comprobante de transferencia bancaria</p>
                        </div>
                        <a
                          href={urlComprobante}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 text-sm font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Previsualizar Documento PDF
                        </a>
                      </div>
                    ) : (
                      <div className="relative group">
                        <img
                          src={urlComprobante}
                          alt="Comprobante de Pago"
                          className="w-full h-72 sm:h-80 object-cover object-top hover:opacity-95 transition-opacity"
                        />
                        <a
                          href={urlComprobante}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-sm font-bold gap-2 transition-opacity backdrop-blur-[2px]"
                        >
                          <Maximize2 className="w-5 h-5" /> Ver imagen completa
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-sm font-bold text-amber-800">Sin comprobante de pago</p>
                    <p className="text-xs text-amber-700">Esta solicitud no cuenta con archivo de respaldo adjunto.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha: Nómina y Plantilla de Jugadores (8 columnas) */}
            <div className="lg:col-span-8 bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Plantilla Oficial de Jugadores</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Nómina enviada para revisión y validación reglamentaria</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold ${
                      cumpleMinimo
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {cumpleMinimo ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                    {totalJugadores} / 18 Jugadores {cumpleMinimo ? '(Reglamentario)' : '(Incompleto)'}
                  </span>
                </div>
              </div>

              {/* Lista de Jugadores */}
              {isLoadingPlantilla ? (
                <div className="py-20 text-center text-gray-400 space-y-3">
                  <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-medium">Cargando nómina de jugadores...</p>
                </div>
              ) : plantillas.length === 0 ? (
                <div className="py-20 text-center text-gray-400 space-y-3">
                  <Users className="w-12 h-12 mx-auto text-gray-300" />
                  <p className="text-base font-semibold text-gray-600">No hay jugadores registrados en esta plantilla.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[540px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-700 border-b border-gray-200 uppercase tracking-wider text-xs sticky top-0 z-10 font-bold">
                        <th className="py-3.5 px-4">Dorsal</th>
                        <th className="py-3.5 px-4">Foto</th>
                        <th className="py-3.5 px-4">Jugador / Datos</th>
                        <th className="py-3.5 px-4">Cédula</th>
                        <th className="py-3.5 px-4">Edad</th>
                        <th className="py-3.5 px-4 text-right">Documentos Adjuntos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                      {plantillas.map((p) => {
                        const j = p.jugador;
                        const edad = calculateAge(j?.fecha_nacimiento);
                        let cumpleEdad = true;
                        let advertenciaEdad = '';

                        if (edad !== null) {
                          if (edadMin !== undefined && edad < edadMin) {
                            cumpleEdad = false;
                            advertenciaEdad = `Menor a mín. (${edadMin})`;
                          }
                          if (edadMax !== undefined && edadMax !== null && edad > edadMax) {
                            cumpleEdad = false;
                            advertenciaEdad = `Supera máx. (${edadMax})`;
                          }
                        }

                        return (
                          <tr key={p.id || p.id_plantilla} className="hover:bg-gray-50/80 transition-colors">
                            {/* Dorsal */}
                            <td className="py-3 px-4">
                              <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-gray-100 font-extrabold text-gray-800 text-sm border border-gray-200 shadow-xs">
                                #{p.numero_camiseta ?? '-'}
                              </span>
                            </td>

                            {/* Foto de Perfil Grande e Interactiva (Clic para abrir) */}
                            <td className="py-3 px-4">
                              {j?.url_foto ? (
                                <a
                                  href={j.url_foto}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group relative block w-14 h-14 rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-primary-500 shadow-sm transition-all hover:scale-105"
                                  title="Clic para ver foto en tamaño completo"
                                >
                                  <img
                                    src={j.url_foto}
                                    alt={j.nombre}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                    <Maximize2 className="w-4 h-4" />
                                  </div>
                                </a>
                              ) : (
                                <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-700 font-extrabold flex items-center justify-center text-lg border-2 border-primary-100 shadow-xs">
                                  {j?.nombre ? j.nombre.charAt(0).toUpperCase() : '?'}
                                </div>
                              )}
                            </td>

                            {/* Nombre del Jugador */}
                            <td className="py-3 px-4">
                              <span className="font-bold text-gray-900 block text-sm">{j?.nombre || 'Sin nombre'}</span>
                              <span className="text-xs text-gray-400">
                                Nac: {formatDate(j?.fecha_nacimiento)}
                              </span>
                            </td>

                            {/* Cédula */}
                            <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-700">
                              {j?.documento_identificacion || '-'}
                            </td>

                            {/* Edad */}
                            <td className="py-3 px-4">
                              {edad !== null ? (
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                                    cumpleEdad
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}
                                  title={cumpleEdad ? 'Edad reglamentaria' : advertenciaEdad}
                                >
                                  {edad} años {!cumpleEdad && '⚠️'}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>

                            {/* Documentos con Etiquetas de Texto Explícitas */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {j?.url_cedula ? (
                                  <a
                                    href={j.url_cedula}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 active:bg-primary-200 border border-primary-200 transition-all shadow-xs"
                                    title="Ver Cédula de Identidad en tamaño completo"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-primary-600" />
                                    Cédula
                                  </a>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-gray-400 bg-gray-100 border border-gray-200">
                                    Sin cédula
                                  </span>
                                )}

                                {j?.url_acta_bachiller && (
                                  <a
                                    href={j.url_acta_bachiller}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-200 transition-all shadow-xs"
                                    title="Ver Acta de Grado de Bachiller"
                                  >
                                    <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                                    Acta de Grado
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Footer de Acciones del Expediente */}
          <div className="flex items-center justify-between px-6 sm:px-8 py-4 sm:py-5 bg-white border-t border-gray-200 shrink-0 shadow-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              Cerrar Expediente
            </button>

            {estado === 'pendiente' ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalRechazarOpen(true)}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 active:bg-red-200 transition-colors disabled:opacity-50 shadow-xs"
                >
                  <Ban className="w-4 h-4" />
                  Rechazar Solicitud
                </button>

                <AsyncButton
                  onClickAction={handleConfirmAprobar}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Aprobar Inscripción
                </AsyncButton>
              </div>
            ) : (
              <div className="text-sm text-gray-500 font-semibold">
                Esta solicitud ya fue resuelta ({estado.toUpperCase()}).
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Rechazo */}
      <ModalRechazarInscripcion
        isOpen={modalRechazarOpen}
        onClose={() => setModalRechazarOpen(false)}
        onConfirm={handleConfirmRechazar}
        nombreEquipo={nombreEquipo}
        isLoading={isUpdating}
      />
    </>
  );
}
