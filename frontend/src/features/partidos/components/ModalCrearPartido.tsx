import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Calendar } from 'lucide-react';
import { toast } from 'sonner';

import { getTorneos } from '../../torneos/api/torneos.api';
import { getInscripciones } from '../../equipos/api/equipos.api';
import { crearPartido } from '../api/partidos.api';
import { SearchableSelect, type Option } from '../../../components/SearchableSelect';
import { AsyncButton } from '../../../components/AsyncButton';

const partidoSchema = z.object({
  fecha: z.string().min(1, 'Fecha requerida'),
  hora: z.string().min(1, 'Hora requerida'),
  fase: z.string().min(1, 'Fase requerida'),
  ubicacion: z.string().min(1, 'Ubicación requerida'),
  id_torneo: z.number().min(1, 'Torneo requerido'),
  id_categoria: z.number().min(1, 'Categoría requerida'),
  id_equipo_local: z.number().min(1, 'Local requerido'),
  id_equipo_visitante: z.number().min(1, 'Visitante requerido'),
}).refine(data => data.id_equipo_local !== data.id_equipo_visitante, {
  message: "No puede jugar contra sí mismo",
  path: ["id_equipo_visitante"],
});

type PartidoFormValues = z.infer<typeof partidoSchema>;

interface ModalCrearPartidoProps {
  onClose: () => void;
  defaultTorneo?: number | '';
}

export function ModalCrearPartido({ onClose, defaultTorneo = '' }: ModalCrearPartidoProps) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PartidoFormValues>({
    resolver: zodResolver(partidoSchema),
    defaultValues: {
      ubicacion: 'Coliseo Pablo Delgado Álava',
      id_torneo: defaultTorneo ? Number(defaultTorneo) : undefined,
    }
  });

  const watchTorneo = watch('id_torneo');
  const watchCategoria = watch('id_categoria');
  const watchLocal = watch('id_equipo_local');
  const watchVisitante = watch('id_equipo_visitante');

  // Datos Torneos
  const { data: torneosRes, isLoading: loadingTorneos } = useQuery({
    queryKey: ['torneos', 'all'],
    queryFn: () => getTorneos(1, 100)
  });
  const torneos = torneosRes?.data || [];

  // Torneo Options
  const torneoOptions: Option[] = useMemo(() => 
    torneos.map(t => ({ value: t.id_torneo || t.id, label: t.nombre || t.nombre_torneo })),
  [torneos]);

  // Categorías Options
  const categoriaOptions: Option[] = useMemo(() => {
    if (!watchTorneo) return [];
    const torneo = torneos.find(t => (t.id_torneo || t.id) === watchTorneo);
    if (!torneo?.categorias) return [];
    return torneo.categorias.map(c => ({
      value: c.id_categoria,
      label: `${c.nombre_categoria} (${c.genero_categoria})`
    }));
  }, [torneos, watchTorneo]);

  // Inscripciones (Equipos Disponibles)
  const { data: inscripcionesRes, isLoading: loadingInscripciones } = useQuery({
    queryKey: ['inscripciones', watchTorneo, 'aprobado', watchCategoria],
    queryFn: () => getInscripciones(1, 100, watchTorneo as number, 'aprobado', watchCategoria as number),
    enabled: !!watchTorneo && !!watchCategoria
  });
  
  const equiposOpciones: Option[] = useMemo(() => {
    const inscripciones = inscripcionesRes?.data || [];
    return inscripciones.map(insc => {
      const idEquipo = insc.equipo?.id_equipo || insc.id_equipo;
      return {
        value: idEquipo,
        label: insc.equipo?.nombre_equipo || `Equipo ${idEquipo}`
      };
    });
  }, [inscripcionesRes]);

  const onSubmit = async (data: PartidoFormValues) => {
    try {
      await crearPartido(data);
      toast.success('Partido programado');
      queryClient.invalidateQueries({ queryKey: ['partidos'] });
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al programar partido');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden relative animate-fade-in-up">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Programar Nuevo Partido
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Torneo */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Torneo</label>
              <SearchableSelect
                options={torneoOptions}
                value={watchTorneo || ''}
                onChange={(v) => {
                  setValue('id_torneo', v as number);
                  setValue('id_categoria', undefined as any);
                  setValue('id_equipo_local', undefined as any);
                  setValue('id_equipo_visitante', undefined as any);
                }}
                disabled={loadingTorneos}
              />
              {errors.id_torneo && <p className="mt-1 text-xs text-red-600">{errors.id_torneo.message as str}</p>}
            </div>

            {/* Categoría */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Categoría</label>
              <SearchableSelect
                options={categoriaOptions}
                value={watchCategoria || ''}
                onChange={(v) => {
                  setValue('id_categoria', v as number);
                  setValue('id_equipo_local', undefined as any);
                  setValue('id_equipo_visitante', undefined as any);
                }}
                disabled={!watchTorneo || categoriaOptions.length === 0}
              />
              {errors.id_categoria && <p className="mt-1 text-xs text-red-600">{errors.id_categoria.message as str}</p>}
            </div>

            {/* Equipo Local */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Equipo Local</label>
              <SearchableSelect
                options={equiposOpciones.filter(o => o.value !== watchVisitante)}
                value={watchLocal || ''}
                onChange={(v) => setValue('id_equipo_local', v as number)}
                disabled={!watchCategoria || loadingInscripciones}
              />
              {errors.id_equipo_local && <p className="mt-1 text-xs text-red-600">{errors.id_equipo_local.message as str}</p>}
            </div>

            {/* Equipo Visitante */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Equipo Visitante</label>
              <SearchableSelect
                options={equiposOpciones.filter(o => o.value !== watchLocal)}
                value={watchVisitante || ''}
                onChange={(v) => setValue('id_equipo_visitante', v as number)}
                disabled={!watchCategoria || loadingInscripciones}
              />
              {errors.id_equipo_visitante && <p className="mt-1 text-xs text-red-600">{errors.id_equipo_visitante.message as str}</p>}
            </div>

            {/* Fecha y Hora */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fecha</label>
              <input type="date" {...register('fecha')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errors.fecha && <p className="mt-1 text-xs text-red-600">{errors.fecha.message as str}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Hora</label>
              <input type="time" {...register('hora')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errors.hora && <p className="mt-1 text-xs text-red-600">{errors.hora.message as str}</p>}
            </div>

            {/* Fase y Ubicación */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fase</label>
              <input type="text" placeholder="Ej: Grupos" {...register('fase')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errors.fase && <p className="mt-1 text-xs text-red-600">{errors.fase.message as str}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ubicación</label>
              <input type="text" {...register('ubicacion')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errors.ubicacion && <p className="mt-1 text-xs text-red-600">{errors.ubicacion.message as str}</p>}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <AsyncButton onClickAction={handleSubmit(onSubmit)} className="bg-primary-600 text-white px-6 py-2 rounded-md shadow-sm hover:bg-primary-700 font-medium">
              Guardar Partido
            </AsyncButton>
          </div>
        </form>
      </div>
    </div>
  );
}
