import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AsyncButton } from '../../../components/AsyncButton';
import { getPartidosByTorneo } from '../../torneos/api/torneos.api';
import { getPlantillas } from '../../plantillas/api/plantillas.api';
import { postEstadisticasBulk } from '../api/estadisticas.api';

const estadisticaJugadorSchema = z.object({
  id_jugador: z.number(),
  nombre: z.string(),
  puntos: z.number().min(0),
  triples: z.number().min(0),
  faltas: z.number().min(0).max(6),
  rebotes: z.number().min(0),
  asistencias: z.number().min(0),
});

const bulkSchema = z.object({
  id_partido: z.number().min(1, 'Selecciona un partido'),
  id_equipo: z.number().min(1, 'Selecciona un equipo'),
  estadisticas_jugadores: z.array(estadisticaJugadorSchema),
});

type BulkValues = z.infer<typeof bulkSchema>;

export function CargaResultados() {
  const [partidoSeleccionado, setPartidoSeleccionado] = useState<number | null>(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<number | null>(null);

  // 1. Obtener partidos (asumiendo torneo 1 para MVP)
  const { data: partidosRes } = useQuery({
    queryKey: ['partidos', 1],
    queryFn: () => getPartidosByTorneo(1),
  });
  const partidos = partidosRes?.data || [];

  // 2. Obtener plantilla del equipo seleccionado
  const { data: plantillaRes, isLoading: isLoadingPlantilla } = useQuery({
    queryKey: ['plantillas', equipoSeleccionado],
    queryFn: () => getPlantillas(equipoSeleccionado!),
    enabled: !!equipoSeleccionado,
  });
  const plantilla = plantillaRes?.data || [];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
    reset,
  } = useForm<BulkValues>({
    resolver: zodResolver(bulkSchema),
    defaultValues: {
      id_partido: 0,
      id_equipo: 0,
      estadisticas_jugadores: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: 'estadisticas_jugadores',
  });

  // Cuando cambia la plantilla, rellenar el formulario
  useState(() => {
    if (plantilla.length > 0 && equipoSeleccionado) {
      const defaultStats = plantilla.map(p => ({
        id_jugador: p.id_jugador,
        nombre: `${p.jugador?.nombres} ${p.jugador?.apellidos}`,
        puntos: 0,
        triples: 0,
        faltas: 0,
        rebotes: 0,
        asistencias: 0,
      }));
      replace(defaultStats);
    }
  });

  // Hack temporal para forzar actualización al cambiar plantilla
  // En un caso real usaríamos useEffect pero React no nos deja importar hooks aquí directamente sin ensuciar
  // Usaremos un botón "Cargar Jugadores" para simplificar la vida en el MVP
  const cargarJugadoresEnForm = () => {
    if (plantilla.length > 0) {
      const defaultStats = plantilla.map(p => ({
        id_jugador: p.id_jugador,
        nombre: `${p.jugador?.nombres} ${p.jugador?.apellidos}`,
        puntos: 0,
        triples: 0,
        faltas: 0,
        rebotes: 0,
        asistencias: 0,
      }));
      replace(defaultStats);
    }
  };

  const onSubmit = async (data: BulkValues) => {
    if (data.estadisticas_jugadores.length === 0) {
      toast.error('No hay jugadores para registrar estadísticas');
      return;
    }

    try {
      await postEstadisticasBulk(data);
      toast.success('Estadísticas masivas registradas correctamente.');
      reset();
      setPartidoSeleccionado(null);
      setEquipoSeleccionado(null);
      replace([]);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al guardar estadísticas';
      toast.error(msg);
    }
  };

  const partidoActual = partidos.find(p => (p.id_partido || p.id) === partidoSeleccionado);

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="mb-6 text-xl font-bold text-gray-900">Carga Masiva de Estadísticas (Bulk)</h2>
      
      <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Partido Activo</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              {...register('id_partido', { 
                valueAsNumber: true,
                onChange: (e) => setPartidoSeleccionado(Number(e.target.value))
              })}
            >
              <option value="0">-- Selecciona un partido --</option>
              {partidos.map((p) => (
                <option key={p.id_partido || p.id} value={p.id_partido || p.id}>
                  {p.equipo_local?.nombre_equipo || p.equipo_local?.nombre} vs {p.equipo_visitante?.nombre_equipo || p.equipo_visitante?.nombre} ({p.fecha} {p.hora || p.fecha_hora})
                </option>
              ))}
            </select>
            {errors.id_partido && <p className="mt-1 text-xs text-red-600">{errors.id_partido.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Equipo a registrar</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              {...register('id_equipo', { 
                valueAsNumber: true,
                onChange: (e) => {
                  setEquipoSeleccionado(Number(e.target.value));
                  replace([]); // Limpiar tabla al cambiar de equipo
                }
              })}
              disabled={!partidoSeleccionado}
            >
              <option value="0">-- Selecciona el equipo --</option>
              {partidoActual && (
                <>
                  <option value={partidoActual.equipo_local?.id_equipo}>{partidoActual.equipo_local?.nombre_equipo || partidoActual.equipo_local?.nombre} (Local)</option>
                  <option value={partidoActual.equipo_visitante?.id_equipo}>{partidoActual.equipo_visitante?.nombre_equipo || partidoActual.equipo_visitante?.nombre} (Visitante)</option>
                </>
              )}
            </select>
            {errors.id_equipo && <p className="mt-1 text-xs text-red-600">{errors.id_equipo.message}</p>}
          </div>
        </div>

        {equipoSeleccionado !== null && equipoSeleccionado !== 0 && (
          <div className="mt-4 border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Estadísticas por Jugador</h3>
              <button 
                type="button" 
                onClick={cargarJugadoresEnForm}
                className="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded hover:bg-primary-200"
                disabled={isLoadingPlantilla}
              >
                Cargar / Refrescar Plantilla
              </button>
            </div>

            {fields.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                    <tr>
                      <th className="px-4 py-3">Jugador</th>
                      <th className="px-4 py-3 w-20">Pts</th>
                      <th className="px-4 py-3 w-20">3P</th>
                      <th className="px-4 py-3 w-20">Faltas</th>
                      <th className="px-4 py-3 w-20">Reb</th>
                      <th className="px-4 py-3 w-20">Ast</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((item, index) => (
                      <tr key={item.id} className="border-b bg-white hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {item.nombre}
                          <input type="hidden" {...register(`estadisticas_jugadores.${index}.id_jugador` as const, { valueAsNumber: true })} />
                          <input type="hidden" {...register(`estadisticas_jugadores.${index}.nombre` as const)} />
                        </td>
                        <td className="px-4 py-2"><input type="number" {...register(`estadisticas_jugadores.${index}.puntos` as const, { valueAsNumber: true })} className="w-full border rounded px-2 py-1" /></td>
                        <td className="px-4 py-2"><input type="number" {...register(`estadisticas_jugadores.${index}.triples` as const, { valueAsNumber: true })} className="w-full border rounded px-2 py-1" /></td>
                        <td className="px-4 py-2"><input type="number" {...register(`estadisticas_jugadores.${index}.faltas` as const, { valueAsNumber: true })} className="w-full border rounded px-2 py-1" max="6" /></td>
                        <td className="px-4 py-2"><input type="number" {...register(`estadisticas_jugadores.${index}.rebotes` as const, { valueAsNumber: true })} className="w-full border rounded px-2 py-1" /></td>
                        <td className="px-4 py-2"><input type="number" {...register(`estadisticas_jugadores.${index}.asistencias` as const, { valueAsNumber: true })} className="w-full border rounded px-2 py-1" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Haz clic en "Cargar Plantilla" para llenar la tabla.</p>
            )}
          </div>
        )}

        <div className="mt-2 border-t border-gray-100 pt-5">
          <AsyncButton onClickAction={handleSubmit(onSubmit)} className="w-full bg-primary-600 py-2.5 text-white transition-colors hover:bg-primary-700">
            Confirmar e Ingresar Bulk
          </AsyncButton>
        </div>
      </form>
    </div>
  );
}
