import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Edit } from 'lucide-react';
import { toast } from 'sonner';

import { getInscripciones } from '../../equipos/api/equipos.api';
import { actualizarPartido } from '../api/partidos.api';
import { SearchableSelect, type Option } from '../../../components/SearchableSelect';
import { AsyncButton } from '../../../components/AsyncButton';
import type { Partido } from '../../../types/api.types';

const partidoUpdateSchema = z.object({
  fecha: z.string().min(1, 'Fecha requerida'),
  hora: z.string().min(1, 'Hora requerida'),
  fase: z.string().min(1, 'Fase requerida'),
  ubicacion: z.string().min(1, 'Ubicación requerida'),
  id_equipo_local: z.number().min(1, 'Local requerido'),
  id_equipo_visitante: z.number().min(1, 'Visitante requerido'),
  estado: z.string().min(1, 'Estado requerido'),
  marcador_local: z.number().min(0, 'No puede ser negativo'),
  marcador_visitante: z.number().min(0, 'No puede ser negativo'),
}).refine(data => data.id_equipo_local !== data.id_equipo_visitante, {
  message: "No puede jugar contra sí mismo",
  path: ["id_equipo_visitante"],
});

type PartidoUpdateValues = z.infer<typeof partidoUpdateSchema>;

interface ModalEditarPartidoProps {
  partido: Partido;
  onClose: () => void;
}

export function ModalEditarPartido({ partido, onClose }: ModalEditarPartidoProps) {
  const queryClient = useQueryClient();
  const isProgramado = partido.estado === 'programado';

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PartidoUpdateValues>({
    resolver: zodResolver(partidoUpdateSchema),
    defaultValues: {
      fecha: partido.fecha,
      hora: partido.hora,
      fase: partido.fase,
      ubicacion: partido.ubicacion || 'Coliseo Pablo Delgado Álava',
      id_equipo_local: partido.id_equipo_local,
      id_equipo_visitante: partido.id_equipo_visitante,
      estado: partido.estado,
      marcador_local: partido.marcador_local || 0,
      marcador_visitante: partido.marcador_visitante || 0,
    }
  });

  const watchLocal = watch('id_equipo_local');
  const watchVisitante = watch('id_equipo_visitante');

  // Inscripciones (Equipos Disponibles en esa categoría y torneo)
  const { data: inscripcionesRes, isLoading: loadingInscripciones } = useQuery({
    queryKey: ['inscripciones', partido.id_torneo, 'aprobado', partido.id_categoria],
    queryFn: () => getInscripciones(1, 100, partido.id_torneo, 'aprobado', partido.id_categoria),
    enabled: isProgramado // Solo cargamos si está programado, porque si no, no se puede editar equipos
  });
  
  const equiposOpciones: Option[] = useMemo(() => {
    if (!isProgramado) {
      // Si no está programado, solo mostramos los equipos actuales como opciones para el select (disabled anyway)
      return [
        { value: partido.id_equipo_local, label: partido.equipo_local?.nombre_equipo || 'Local' },
        { value: partido.id_equipo_visitante, label: partido.equipo_visitante?.nombre_equipo || 'Visitante' }
      ];
    }
    const inscripciones = inscripcionesRes?.data || [];
    return inscripciones.map(insc => {
      const idEquipo = insc.equipo?.id_equipo || insc.id_equipo;
      return {
        value: idEquipo,
        label: insc.equipo?.nombre_equipo || `Equipo ${idEquipo}`
      };
    });
  }, [inscripcionesRes, isProgramado, partido]);

  const estadoOpciones = [
    { value: 'programado', label: 'Programado' },
    { value: 'en_curso', label: 'En Curso' },
    { value: 'finalizado', label: 'Finalizado' },
    { value: 'finalizado_wo', label: 'Finalizado W.O.' },
    { value: 'suspendido', label: 'Suspendido' },
    { value: 'anulado', label: 'Anulado' },
  ];

  const onSubmit = async (data: PartidoUpdateValues) => {
    try {
      // Si no es programado, restauramos los IDs originales por seguridad (el backend los rechazaría si cambian)
      if (!isProgramado) {
        data.id_equipo_local = partido.id_equipo_local;
        data.id_equipo_visitante = partido.id_equipo_visitante;
      }
      
      await actualizarPartido(partido.id_partido!, data);
      toast.success('Partido actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['partidos'] });
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar partido');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden relative animate-fade-in-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary-600" />
            Editar Partido
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!isProgramado && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg">
              <strong>Nota:</strong> Como este partido ya no está en estado "Programado", no es posible modificar los equipos que se enfrentan.
            </div>
          )}
          
          <form id="editPartidoForm" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Equipo Local */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Equipo Local</label>
                <SearchableSelect
                  options={equiposOpciones.filter(o => o.value !== watchVisitante)}
                  value={watchLocal}
                  onChange={(v) => setValue('id_equipo_local', v as number)}
                  disabled={!isProgramado || loadingInscripciones}
                />
                {errors.id_equipo_local && <p className="mt-1 text-xs text-red-600">{errors.id_equipo_local.message as string}</p>}
              </div>

              {/* Equipo Visitante */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Equipo Visitante</label>
                <SearchableSelect
                  options={equiposOpciones.filter(o => o.value !== watchLocal)}
                  value={watchVisitante}
                  onChange={(v) => setValue('id_equipo_visitante', v as number)}
                  disabled={!isProgramado || loadingInscripciones}
                />
                {errors.id_equipo_visitante && <p className="mt-1 text-xs text-red-600">{errors.id_equipo_visitante.message as string}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fecha */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Fecha</label>
                <input type="date" {...register('fecha')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
                {errors.fecha && <p className="mt-1 text-xs text-red-600">{errors.fecha.message as string}</p>}
              </div>
              
              {/* Hora */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Hora</label>
                <input type="time" {...register('hora')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
                {errors.hora && <p className="mt-1 text-xs text-red-600">{errors.hora.message as string}</p>}
              </div>
              
              {/* Fase */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Fase</label>
                <input type="text" {...register('fase')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
                {errors.fase && <p className="mt-1 text-xs text-red-600">{errors.fase.message as string}</p>}
              </div>
              
              {/* Ubicación */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Ubicación</label>
                <input type="text" {...register('ubicacion')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
                {errors.ubicacion && <p className="mt-1 text-xs text-red-600">{errors.ubicacion.message as string}</p>}
              </div>
            </div>

            <div className="border-t border-gray-200 my-4 pt-4">
              <h4 className="text-md font-semibold text-gray-800 mb-3">Estado y Marcador Actual</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {/* Estado */}
                <div className="md:col-span-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Estado del Partido</label>
                  <select {...register('estado')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none bg-white">
                    {estadoOpciones.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.estado && <p className="mt-1 text-xs text-red-600">{errors.estado.message as string}</p>}
                </div>
                
                {/* Marcadores */}
                <div className="md:col-span-2 flex items-center gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-gray-700 text-center truncate">
                      {partido.equipo_local?.nombre_equipo || 'Local'}
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      {...register('marcador_local', { valueAsNumber: true })} 
                      className="w-full text-center rounded-md border border-gray-300 px-3 py-2 text-lg font-bold focus:border-primary-500 focus:outline-none" 
                    />
                  </div>
                  <span className="text-xl font-bold text-gray-400 mt-6">-</span>
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-gray-700 text-center truncate">
                      {partido.equipo_visitante?.nombre_equipo || 'Visitante'}
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      {...register('marcador_visitante', { valueAsNumber: true })} 
                      className="w-full text-center rounded-md border border-gray-300 px-3 py-2 text-lg font-bold focus:border-primary-500 focus:outline-none" 
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Nota: Modificar el marcador manualmente aquí sobreescribirá el cálculo automático de estadísticas al momento de guardar.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <AsyncButton onClickAction={handleSubmit(onSubmit)} className="bg-primary-600 text-white px-6 py-2 rounded-md shadow-sm hover:bg-primary-700 font-medium transition-colors">
            Guardar Cambios
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}
