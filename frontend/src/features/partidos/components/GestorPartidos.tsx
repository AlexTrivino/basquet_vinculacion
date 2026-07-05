import { useState } from 'react';
import { Calendar as CalendarIcon, Edit, Plus, X, FileText, BarChart2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { EmptyState } from '../../../components/EmptyState';
import { AsyncButton } from '../../../components/AsyncButton';
import { DataGridTable, type Column } from '../../../components/DataGridTable';
import { StatusBadge } from '../../../components/StatusBadge';
import { Skeleton } from '../../../components/Skeleton';
import { ConfirmationModal } from '../../../components/ConfirmationModal';

import { getTorneos, getPartidosByTorneo } from '../../torneos/api/torneos.api';
import { getInscripciones } from '../../equipos/api/equipos.api';
import { crearPartido, actualizarPartido, eliminarPartido } from '../api/partidos.api';
import { GestionActaModal } from './GestionActaModal';
import { GenerarEstadisticasModal } from './GenerarEstadisticasModal';
import type { Partido } from '../../../types/api.types';

const partidoSchema = z.object({
  fecha: z.string().min(1, 'Fecha es requerida'),
  hora: z.string().min(1, 'Hora es requerida'),
  fase: z.string().min(1, 'Fase es requerida'),
  ubicacion: z.string().min(1, 'Ubicación es requerida'),
  id_equipo_local: z.number().min(1, 'Local es requerido'),
  id_equipo_visitante: z.number().min(1, 'Visitante es requerido'),
}).refine(data => data.id_equipo_local !== data.id_equipo_visitante, {
  message: "Un equipo no puede jugar contra sí mismo",
  path: ["id_equipo_visitante"],
});
type PartidoFormValues = z.infer<typeof partidoSchema>;

const actualizarPartidoSchema = z.object({
  estado: z.string(),
  marcador_local: z.number().min(0, 'No puede ser negativo'),
  marcador_visitante: z.number().min(0, 'No puede ser negativo'),
});
type ActualizarPartidoFormValues = z.infer<typeof actualizarPartidoSchema>;

export function GestorPartidos() {
  const queryClient = useQueryClient();
  const [selectedTorneo, setSelectedTorneo] = useState<number | ''>('');
  const [showProgramar, setShowProgramar] = useState(false);
  const [editingPartido, setEditingPartido] = useState<Partido | null>(null);
  const [selectedPartidoActa, setSelectedPartidoActa] = useState<Partido | null>(null);
  const [estadisticasTarget, setEstadisticasTarget] = useState<{
    idPartido: number;
    idEquipo: number;
    nombreEquipo: string;
    marcadorOficial: number;
    tipoEquipo: 'local' | 'visitante';
  } | null>(null);
  const [partidoAEliminar, setPartidoAEliminar] = useState<Partido | null>(null);

  const { data: torneosRes, isLoading: loadingTorneos } = useQuery({
    queryKey: ['torneos', 1],
    queryFn: () => getTorneos(1, 100)
  });
  const torneos = torneosRes?.data || [];

  const { data: partidosRes, isLoading: loadingPartidos } = useQuery({
    queryKey: ['partidos', selectedTorneo],
    queryFn: () => getPartidosByTorneo(selectedTorneo as number, 1, 100),
    enabled: !!selectedTorneo
  });
  const partidos = partidosRes?.data || [];

  const { data: inscripcionesRes } = useQuery({
    queryKey: ['inscripciones', selectedTorneo, 'aprobado'],
    queryFn: () => getInscripciones(1, 100, selectedTorneo as number, 'aprobado'),
    enabled: !!selectedTorneo
  });
  const equiposDisponibles = inscripcionesRes?.data || [];

  const { register: registerCreate, handleSubmit: handleCreate, watch: watchCreate, reset: resetCreate, formState: { errors: errorsCreate } } = useForm<PartidoFormValues>({
    resolver: zodResolver(partidoSchema),
    defaultValues: {
      ubicacion: 'Coliseo Pablo Delgado Álava'
    }
  });

  const watchLocal = watchCreate('id_equipo_local');
  const watchVisitante = watchCreate('id_equipo_visitante');

  const onSubmitCreate = async (data: PartidoFormValues) => {
    if (!selectedTorneo) return;
    try {
      await crearPartido({ ...data, id_torneo: selectedTorneo as number });
      toast.success('Partido programado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['partidos', selectedTorneo] });
      setShowProgramar(false);
      resetCreate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al programar partido');
    }
  };

  const { register: registerUpdate, handleSubmit: handleUpdate, setValue: setValueUpdate, formState: { errors: errorsUpdate } } = useForm<ActualizarPartidoFormValues>({
    resolver: zodResolver(actualizarPartidoSchema)
  });

  const handleEditClick = (partido: Partido) => {
    const id = partido.id_partido || partido.id;
    if (!id) return;
    setEditingPartido(partido);
    setValueUpdate('estado', partido.estado);
    setValueUpdate('marcador_local', partido.marcador_local || 0);
    setValueUpdate('marcador_visitante', partido.marcador_visitante || 0);
    setShowProgramar(false);
  };

  const onSubmitUpdate = async (data: ActualizarPartidoFormValues) => {
    const id = editingPartido?.id_partido || editingPartido?.id;
    if (!id) return;
    try {
      await actualizarPartido(id, data);
      toast.success('Partido actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['partidos', selectedTorneo] });
      setEditingPartido(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar partido');
    }
  };

  const handleConfirmDelete = async () => {
    if (!partidoAEliminar) return;
    const id = partidoAEliminar.id_partido || partidoAEliminar.id;
    if (!id) return;
    
    try {
      await eliminarPartido(id);
      toast.success('Partido eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['partidos', selectedTorneo] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar el partido');
    } finally {
      setPartidoAEliminar(null);
    }
  };


  const columns: Column<Partido>[] = [
    { 
      key: 'fecha', 
      header: 'Fecha y Hora', 
      render: (row) => <span className="font-medium text-gray-900">{row.fecha} {row.hora}</span> 
    },
    { 
      key: 'fase', 
      header: 'Fase', 
      render: (row) => <span className="text-gray-500">{row.fase || 'Regular'}</span> 
    },
    { 
      key: 'encuentro', 
      header: 'Encuentro', 
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{row.equipo_local?.nombre_equipo || 'Local'}</span>
          <span className="text-gray-400 text-xs">vs</span>
          <span className="font-semibold text-gray-900">{row.equipo_visitante?.nombre_equipo || 'Visitante'}</span>
        </div>
      ) 
    },
    { 
      key: 'marcador', 
      header: 'Marcador', 
      render: (row) => (
        <span className="font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
          {row.marcador_local} - {row.marcador_visitante}
        </span>
      ) 
    },
    { 
      key: 'estado', 
      header: 'Estado', 
      render: (row) => (
        <StatusBadge 
          status={
            row.estado === 'programado' ? 'Programado' : 
            row.estado === 'en_curso' ? 'En Curso' : 
            row.estado === 'finalizado' ? 'Finalizado' : 
            row.estado === 'finalizado_wo' ? 'Finalizado W.O.' : 'Suspendido'
          } 
        />
      ) 
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => {
        const id = row.id_partido || row.id;
        const canUpload = row.estado === 'finalizado' || row.estado === 'finalizado_wo';
        
        return (
          <div className="flex gap-2 items-center flex-wrap">
            {canUpload && id && (
              <>
                {/* Acta */}
                <button
                  onClick={() => setSelectedPartidoActa(row)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    row.url_planilla_fiba ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Gestionar Acta"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {row.url_planilla_fiba ? 'Acta ✓' : 'Acta'}
                </button>
              </>
            )}
            
            {/* Editar */}
            <button 
              onClick={() => handleEditClick(row)}
              className="text-gray-500 hover:text-primary-600 transition-colors p-1"
              title="Editar Partido"
            >
              <Edit className="w-4 h-4" />
            </button>
            
            {/* Eliminar */}
            <button 
              onClick={() => setPartidoAEliminar(row)}
              className="text-gray-500 hover:text-red-600 transition-colors p-1"
              title="Eliminar Partido"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 w-full sm:w-1/2">
          <label className="text-sm font-medium text-gray-700">Seleccione un Torneo</label>
          <select 
            value={selectedTorneo}
            onChange={(e) => {
              setSelectedTorneo(e.target.value ? Number(e.target.value) : '');
              setShowProgramar(false);
              setEditingPartido(null);
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            disabled={loadingTorneos}
          >
            <option value="">Seleccione...</option>
            {torneos.map(t => (
              <option key={t.id_torneo || t.id} value={t.id_torneo || t.id}>{t.nombre || t.nombre_torneo}</option>
            ))}
          </select>
        </div>
        {selectedTorneo && (
          <button 
            onClick={() => { setShowProgramar(!showProgramar); setEditingPartido(null); }}
            className="flex items-center gap-2 bg-primary-600 px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Programar Partido
          </button>
        )}
      </div>

      {showProgramar && selectedTorneo && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 relative">
          <button onClick={() => setShowProgramar(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Programar Nuevo Partido</h3>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fecha</label>
              <input type="date" {...registerCreate('fecha')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errorsCreate.fecha && <p className="mt-1 text-xs text-red-600">{errorsCreate.fecha.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Hora</label>
              <input type="time" {...registerCreate('hora')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errorsCreate.hora && <p className="mt-1 text-xs text-red-600">{errorsCreate.hora.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fase</label>
              <input type="text" placeholder="Ej: Grupos, Semifinal" {...registerCreate('fase')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errorsCreate.fase && <p className="mt-1 text-xs text-red-600">{errorsCreate.fase.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ubicación</label>
              <input type="text" {...registerCreate('ubicacion')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errorsCreate.ubicacion && <p className="mt-1 text-xs text-red-600">{errorsCreate.ubicacion.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Equipo Local</label>
              <select 
                {...registerCreate('id_equipo_local', { valueAsNumber: true })} 
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="">Seleccione local...</option>
                {equiposDisponibles.map(insc => {
                  const idEquipo = insc.equipo?.id_equipo || insc.id_equipo;
                  const isDisabled = watchVisitante === idEquipo;
                  return (
                    <option key={`loc-${idEquipo}`} value={idEquipo} disabled={isDisabled}>
                      {insc.equipo?.nombre_equipo || `Equipo ${idEquipo}`}
                    </option>
                  );
                })}
              </select>
              {errorsCreate.id_equipo_local && <p className="mt-1 text-xs text-red-600">{errorsCreate.id_equipo_local.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Equipo Visitante</label>
              <select 
                {...registerCreate('id_equipo_visitante', { valueAsNumber: true })} 
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="">Seleccione visitante...</option>
                {equiposDisponibles.map(insc => {
                  const idEquipo = insc.equipo?.id_equipo || insc.id_equipo;
                  const isDisabled = watchLocal === idEquipo;
                  return (
                    <option key={`vis-${idEquipo}`} value={idEquipo} disabled={isDisabled}>
                      {insc.equipo?.nombre_equipo || `Equipo ${idEquipo}`}
                    </option>
                  );
                })}
              </select>
              {errorsCreate.id_equipo_visitante && <p className="mt-1 text-xs text-red-600">{errorsCreate.id_equipo_visitante.message}</p>}
            </div>
            <div className="sm:col-span-2 mt-2">
              <AsyncButton onClickAction={handleCreate(onSubmitCreate)} className="w-full bg-primary-600 py-2 text-white">
                Programar Partido
              </AsyncButton>
            </div>
          </form>
        </div>
      )}

      {editingPartido && selectedTorneo && (
        <div className="bg-white border border-primary-200 rounded-xl p-6 relative shadow-lg">
          <button onClick={() => setEditingPartido(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Actualizar Resultado
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {editingPartido.equipo_local?.nombre_equipo} vs {editingPartido.equipo_visitante?.nombre_equipo}
          </p>
          <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Marcador Local</label>
              <input type="number" {...registerUpdate('marcador_local', { valueAsNumber: true })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errorsUpdate.marcador_local && <p className="mt-1 text-xs text-red-600">{errorsUpdate.marcador_local.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Marcador Visitante</label>
              <input type="number" {...registerUpdate('marcador_visitante', { valueAsNumber: true })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errorsUpdate.marcador_visitante && <p className="mt-1 text-xs text-red-600">{errorsUpdate.marcador_visitante.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
              <select {...registerUpdate('estado')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none bg-white">
                <option value="programado">Programado</option>
                <option value="en_curso">En Curso</option>
                <option value="finalizado">Finalizado</option>
                <option value="finalizado_wo">Finalizado W.O.</option>
                <option value="suspendido">Suspendido</option>
              </select>
              {errorsUpdate.estado && <p className="mt-1 text-xs text-red-600">{errorsUpdate.estado.message}</p>}
            </div>
            <div className="sm:col-span-3 mt-2">
              <AsyncButton onClickAction={handleUpdate(onSubmitUpdate)} className="w-full bg-primary-600 py-2 text-white">
                Guardar Cambios
              </AsyncButton>
            </div>
          </form>

          {/* New sub-section for Rendimiento Individual (Estadísticas) */}
          <div className="border-t border-gray-200 mt-6 pt-6">
            <h4 className="text-md font-bold text-gray-900 mb-3">Rendimiento Individual (Estadísticas)</h4>
            
            {editingPartido.estado === 'finalizado' || editingPartido.estado === 'finalizado_wo' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {editingPartido.equipo_local?.id_equipo && (
                  <button
                    onClick={() => setEstadisticasTarget({
                      idPartido: editingPartido.id_partido || editingPartido.id as number,
                      idEquipo: editingPartido.equipo_local!.id_equipo!,
                      nombreEquipo: editingPartido.equipo_local?.nombre_equipo || 'Local',
                      marcadorOficial: editingPartido.marcador_local || 0,
                      tipoEquipo: 'local',
                    })}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-colors ${
                      editingPartido.stats_local_procesadas 
                        ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' 
                        : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    <BarChart2 className="w-6 h-6 mb-2" />
                    <span className="font-bold text-center">Stats Local</span>
                    <span className="text-xs mt-1 text-center font-medium opacity-80">{editingPartido.equipo_local?.nombre_equipo}</span>
                    {editingPartido.stats_local_procesadas && <span className="mt-2 bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded-full">✓ Procesadas</span>}
                  </button>
                )}
                
                {editingPartido.equipo_visitante?.id_equipo && (
                  <button
                    onClick={() => setEstadisticasTarget({
                      idPartido: editingPartido.id_partido || editingPartido.id as number,
                      idEquipo: editingPartido.equipo_visitante!.id_equipo!,
                      nombreEquipo: editingPartido.equipo_visitante?.nombre_equipo || 'Visitante',
                      marcadorOficial: editingPartido.marcador_visitante || 0,
                      tipoEquipo: 'visitante',
                    })}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-colors ${
                      editingPartido.stats_visitante_procesadas 
                        ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' 
                        : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    }`}
                  >
                    <BarChart2 className="w-6 h-6 mb-2" />
                    <span className="font-bold text-center">Stats Visitante</span>
                    <span className="text-xs mt-1 text-center font-medium opacity-80">{editingPartido.equipo_visitante?.nombre_equipo}</span>
                    {editingPartido.stats_visitante_procesadas && <span className="mt-2 bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded-full">✓ Procesadas</span>}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
                Guarde el partido como 'Finalizado' para habilitar la carga de estadísticas.
              </p>
            )}
          </div>
        </div>
      )}

      {selectedTorneo && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Calendario Oficial</h2>
          
          {loadingPartidos ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : partidos.length === 0 ? (
            <EmptyState
              title="No hay partidos programados"
              description="El torneo aún no tiene un calendario oficial generado para esta fase."
              icon={<CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />}
            />
          ) : (
            <DataGridTable 
              columns={columns} 
              data={partidos} 
              ariaLabel="Tabla de Partidos Programados" 
            />
          )}
        </div>
      )}

      {!selectedTorneo && !loadingTorneos && (
        <EmptyState
          title="Seleccione un torneo"
          description="Elija un torneo en el menú superior para ver y gestionar su calendario."
          icon={<CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />}
        />
      )}

      {selectedPartidoActa && (
        <GestionActaModal
          partido={selectedPartidoActa}
          onClose={() => setSelectedPartidoActa(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['partidos', selectedTorneo] })}
        />
      )}

      {estadisticasTarget && (
        <GenerarEstadisticasModal
          idPartido={estadisticasTarget.idPartido}
          idEquipo={estadisticasTarget.idEquipo}
          nombreEquipo={estadisticasTarget.nombreEquipo}
          marcadorOficial={estadisticasTarget.marcadorOficial}
          tipoEquipo={estadisticasTarget.tipoEquipo}
          onClose={() => setEstadisticasTarget(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['partidos', selectedTorneo] })}
        />
      )}

      {partidoAEliminar && (
        <ConfirmationModal
          title="Eliminar Partido"
          description={`¿Estás seguro de que deseas eliminar el partido entre ${partidoAEliminar.equipo_local?.nombre_equipo} y ${partidoAEliminar.equipo_visitante?.nombre_equipo}? Esta acción no se puede deshacer.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPartidoAEliminar(null)}
          isDangerous={true}
        />
      )}
    </div>
  );
}
