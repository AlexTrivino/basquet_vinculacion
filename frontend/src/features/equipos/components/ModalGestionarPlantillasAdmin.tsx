import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Users, Eye, Pencil, Shield, Clock, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { getInscripciones } from '../api/equipos.api';
import { getTorneos } from '../../torneos/api/torneos.api';
import { GestorPlantilla } from '../../plantillas/components/GestorPlantilla';
import type { Equipo, Inscripcion } from '../../../types/api.types';
interface ModalGestionarPlantillasAdminProps {
  isOpen: boolean;
  onClose: () => void;
  equipo: Equipo | null;
}

export function ModalGestionarPlantillasAdmin({ isOpen, onClose, equipo }: ModalGestionarPlantillasAdminProps) {
  const [editingInscripcion, setEditingInscripcion] = useState<Inscripcion | null>(null);
  const [page, setPage] = useState(1);
  const [selectedTorneo, setSelectedTorneo] = useState<number | ''>('');

  const { data: torneosRes } = useQuery({
    queryKey: ['torneos', 'admin-filter'],
    queryFn: () => getTorneos(1, 100),
  });
  const torneos = torneosRes?.data || [];

  const { data: inscripcionesRes, isLoading } = useQuery({
    queryKey: ['admin-inscripciones-equipo', equipo?.id_equipo || equipo?.id, page, selectedTorneo],
    queryFn: () => getInscripciones(page, 9, selectedTorneo ? Number(selectedTorneo) : undefined, undefined, undefined, equipo?.id_equipo || equipo?.id),
    enabled: isOpen && !!equipo,
  });
  const inscripciones = inscripcionesRes?.data || [];
  const pagination = inscripcionesRes?.pagination;

  if (!isOpen || !equipo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className={`relative bg-marino-claro rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden max-h-[90vh] transition-all ${editingInscripcion ? 'max-w-[1700px]' : 'max-w-5xl'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-marino-claro">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-celeste/10 rounded-xl">
              <Users className="w-5 h-5 text-oro" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-crema flex items-center gap-2">
                Gestión de Plantillas
                <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                  {equipo.nombre_equipo}
                </span>
              </h2>
              {editingInscripcion ? (
                <p className="text-xs text-slate-400 mt-0.5">
                  Modificando plantilla para {editingInscripcion.torneo?.nombre || 'Torneo'} - {editingInscripcion.categoria?.nombre_categoria || 'Categoría'}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecciona el torneo y categoría para gestionar su plantilla
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editingInscripcion && (
              <button
                onClick={() => setEditingInscripcion(null)}
                className="px-3 py-1.5 text-sm font-semibold text-slate-300 bg-white/10 rounded-lg hover:bg-white/15 transition-colors"
              >
                Volver a Torneos
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-300 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white/[0.03] p-6">
          {editingInscripcion ? (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <GestorPlantilla 
                isAdmin={true}
                readOnly={editingInscripcion.torneo?.estado === 'finalizado'}
                idEquipoOverride={equipo.id_equipo || equipo.id}
                idTorneoOverride={editingInscripcion.id_torneo}
                categoriaOverride={editingInscripcion.categoria}
              />
            </div>
          ) : (
            <div className="animate-in slide-in-from-left-4 duration-300 space-y-4 flex flex-col h-full">
              {/* Filtros */}
              <div className="flex items-center justify-between gap-4 bg-marino-claro p-3 rounded-xl border border-white/10 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <Filter className="w-4 h-4 text-oro" />
                  Filtrar por Torneo:
                </div>
                <select
                  value={selectedTorneo}
                  onChange={(e) => {
                    setSelectedTorneo(e.target.value ? Number(e.target.value) : '');
                    setPage(1);
                  }}
                  className="px-3 py-1.5 border border-white/15 rounded-lg text-sm focus:ring-2 focus:ring-celeste focus:border-celeste bg-white/5 flex-1 max-w-xs"
                >
                  <option value="">Todos los torneos</option>
                  {torneos.map((t: any) => (
                    <option key={t.id_torneo} value={t.id_torneo}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-4 border-celeste/30 border-t-celeste rounded-full animate-spin"></div>
                </div>
              ) : inscripciones.length === 0 ? (
                <div className="text-center py-12 px-4 bg-marino-claro rounded-2xl border border-white/10">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                    <Shield className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-crema mb-1">Sin inscripciones</h3>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto">
                    Este equipo no está inscrito en ningún torneo actualmente.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inscripciones.map(insc => {
                    const isFinalizado = insc.torneo?.estado === 'finalizado';
                    const isActivo = insc.torneo?.estado === 'programado' || insc.torneo?.estado === 'en_curso';
                    
                    return (
                      <div 
                        key={insc.id_inscripcion || insc.id} 
                        className="bg-marino-claro border border-white/10 rounded-xl p-4 shadow-sm hover:border-celeste/50 hover:shadow-md transition-all flex flex-col h-full"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isActivo ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/10 text-slate-300'
                          }`}>
                            {insc.torneo?.estado?.replace('_', ' ') || 'Desconocido'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            insc.estado_inscripcion === 'aprobado' 
                              ? 'bg-blue-500/15 text-blue-200'
                              : 'bg-amber-500/15 text-amber-200'
                          }`}>
                            {insc.estado_inscripcion}
                          </span>
                        </div>
                        
                        <h4 className="font-bold text-crema mb-1">{insc.torneo?.nombre || 'Torneo'}</h4>
                        <p className="text-sm font-medium text-slate-300 mb-4">{insc.categoria?.nombre_categoria || 'Categoría'}</p>
                        
                        <div className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Inscrito: {new Date(insc.fecha_inscripcion || '').toLocaleDateString()}</span>
                        </div>
                        
                        <div className="mt-auto pt-4 border-t border-white/10 flex gap-2">
                          <button
                            onClick={() => setEditingInscripcion(insc)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                              isFinalizado
                                ? 'bg-white/10 text-slate-300 hover:bg-white/15'
                                : 'bg-celeste/10 text-celeste hover:bg-celeste/15'
                            }`}
                          >
                            {isFinalizado ? (
                              <>
                                <Eye className="w-4 h-4" />
                                Ver Plantilla
                              </>
                            ) : (
                              <>
                                <Pencil className="w-4 h-4" />
                                Editar Plantilla
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Paginación */}
              {pagination && pagination.pages > 1 && (
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-sm text-slate-400 font-medium">
                    Mostrando página <span className="text-crema font-bold">{pagination.page}</span> de {pagination.pages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-slate-300 bg-marino-claro border border-white/15 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                      disabled={page === pagination.pages}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-slate-300 bg-marino-claro border border-white/15 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
