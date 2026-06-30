import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AsyncButton } from '../../../components/AsyncButton';
import { getPartidosByTorneo } from '../../torneos/api/torneos.api';
import { getPlantillas } from '../../plantillas/api/plantillas.api';
import { postEstadisticasBulk } from '../api/estadisticas.api';
import { actualizarPartido } from '../../partidos/api/partidos.api';

const estadisticaJugadorSchema = z.object({
  id_jugador: z.coerce.number(),
  nombre: z.string(),
  puntos: z.number().min(0),
  triples: z.number().min(0),
  faltas: z.number().min(0).max(6),
  rebotes: z.number().min(0),
  asistencias: z.number().min(0),
  sancion_tipo: z.string().optional(),
});

const bulkSchema = z.object({
  id_partido: z.number().min(1, 'Selecciona un partido'),
  id_equipo: z.number().min(1, 'Selecciona un equipo'),
  estadisticas_jugadores: z.array(estadisticaJugadorSchema),
});

type BulkValues = z.infer<typeof bulkSchema>;

export function CargaResultados() {
  const queryClient = useQueryClient();
  const [partidoSeleccionado, setPartidoSeleccionado] = useState<number | null>(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<number | null>(null);
  const [marcadorLocal, setMarcadorLocal] = useState<number>(0);
  const [marcadorVisitante, setMarcadorVisitante] = useState<number>(0);

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
    resolver: zodResolver(bulkSchema) as any,
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
        id_jugador: p.jugador?.id_jugador || p.id_jugador,
        nombre: `${p.jugador?.nombres} ${p.jugador?.apellidos}`,
        puntos: 0,
        triples: 0,
        faltas: 0,
        rebotes: 0,
        asistencias: 0,
        sancion_tipo: "",
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
        id_jugador: p.jugador?.id_jugador || p.id_jugador,
        nombre: `${p.jugador?.nombres} ${p.jugador?.apellidos}`,
        puntos: 0,
        triples: 0,
        faltas: 0,
        rebotes: 0,
        asistencias: 0,
        sancion_tipo: "",
      }));
      replace(defaultStats);
    }
  };

  // Helper para evitar errores de NaN en validación de Zod cuando se vacía un input
  const handleEmptyNumber = (index: number, field: 'puntos' | 'triples' | 'faltas' | 'rebotes' | 'asistencias', e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === '' || isNaN(e.target.valueAsNumber)) {
      e.target.value = '0';
      setValue(`estadisticas_jugadores.${index}.${field}`, 0, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: BulkValues) => {
    if (data.estadisticas_jugadores.length === 0) {
      toast.error('No hay jugadores para registrar estadísticas');
      return;
    }

    const partidoTarget = partidos.find(p => (p.id_partido || p.id) === data.id_partido);
    if (!partidoTarget) {
      toast.error('Partido no encontrado');
      return;
    }

    const sumaPuntos = data.estadisticas_jugadores.reduce((acc, curr) => acc + (curr.puntos || 0), 0);
    const esLocal = partidoTarget.equipo_local?.id_equipo === data.id_equipo;
    const puntosGlobal = esLocal ? partidoTarget.marcador_local : partidoTarget.marcador_visitante;

    if (sumaPuntos !== puntosGlobal) {
      toast.error(`Error Matemático: La suma de puntos individuales (${sumaPuntos}) no coincide con el marcador global (${puntosGlobal}).`);
      return;
    }

    try {
      const payload = {
        ...data,
        estadisticas_jugadores: data.estadisticas_jugadores.map(jugador => {
          const { nombre, ...restoJugador } = jugador;
          return {
            ...restoJugador,
            sancion_tipo: restoJugador.sancion_tipo === "" ? undefined : restoJugador.sancion_tipo
          };
        })
      };

      await postEstadisticasBulk(payload);
      toast.success('Estadísticas masivas registradas correctamente.');
      reset();
      setPartidoSeleccionado(null);
      setEquipoSeleccionado(null);
      replace([]);
    } catch (error: any) {
      let msg = error.response?.data?.message || 'Error al guardar estadísticas';
      if (typeof msg === 'object') {
        msg = JSON.stringify(msg);
      }
      toast.error(msg);
    }
  };

  const handleGuardarMarcador = async () => {
    if (!partidoSeleccionado) return;
    try {
      await actualizarPartido(partidoSeleccionado, {
        estado: 'finalizado',
        marcador_local: marcadorLocal,
        marcador_visitante: marcadorVisitante,
      });
      toast.success('Marcador guardado y partido finalizado.');
      queryClient.invalidateQueries({ queryKey: ['partidos', 1] });
    } catch (error: any) {
      let msg = error.response?.data?.message || 'Error al actualizar el partido';
      if (typeof msg === 'object') {
        msg = JSON.stringify(msg);
      }
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
                onChange: (e) => {
                  const val = Number(e.target.value);
                  setPartidoSeleccionado(val);
                  const p = partidos.find(part => (part.id_partido || part.id) === val);
                  if (p) {
                    setMarcadorLocal(p.marcador_local || 0);
                    setMarcadorVisitante(p.marcador_visitante || 0);
                  }
                }
              })}
            >
              <option value="0">-- Selecciona un partido --</option>
              {partidos.map((p) => (
                <option key={p.id_partido || p.id} value={p.id_partido || p.id}>
                  {p.equipo_local?.nombre_equipo || p.equipo_local?.nombre} vs {p.equipo_visitante?.nombre_equipo || p.equipo_visitante?.nombre} ({p.fecha} {p.hora || p.fecha_hora}) - {p.estado === 'finalizado' ? '[CERRADO]' : '[ABIERTO]'}
                </option>
              ))}
            </select>
            {errors.id_partido && <p className="mt-1 text-xs text-red-600">{errors.id_partido.message}</p>}
          </div>

          {partidoActual && (
            <div className="sm:col-span-2 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <h3 className="mb-4 text-sm font-bold text-blue-900">Bloque 1: Cierre de Partido (Marcador Global)</h3>
              <div className="grid sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Marcador Local ({partidoActual.equipo_local?.nombre_equipo || partidoActual.equipo_local?.nombre})</label>
                  <input type="number" value={marcadorLocal} onChange={e => setMarcadorLocal(Number(e.target.value))} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" min="0" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Marcador Visitante ({partidoActual.equipo_visitante?.nombre_equipo || partidoActual.equipo_visitante?.nombre})</label>
                  <input type="number" value={marcadorVisitante} onChange={e => setMarcadorVisitante(Number(e.target.value))} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" min="0" />
                </div>
                <div className="sm:col-span-2">
                  <AsyncButton type="button" onClickAction={handleGuardarMarcador} className="w-full bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50" disabled={partidoActual.estado === 'finalizado'}>
                    {partidoActual.estado === 'finalizado' ? 'Partido ya está finalizado' : 'Guardar Marcador y Cerrar Partido'}
                  </AsyncButton>
                </div>
              </div>
            </div>
          )}

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

        {partidoActual?.estado !== 'finalizado' && equipoSeleccionado !== null && equipoSeleccionado !== 0 && (
          <div className="mt-4 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700">
            ⚠️ Debes cerrar el partido (Bloque 1) en estado "finalizado" antes de ingresar las estadísticas y sanciones individuales (Bloque 2).
          </div>
        )}

        {equipoSeleccionado !== null && equipoSeleccionado !== 0 && partidoActual?.estado === 'finalizado' && (
          <div className="mt-4 border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Bloque 2: Estadísticas Individuales</h3>
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
                      <th className="px-4 py-3 min-w-[150px]">Jugador</th>
                      <th className="px-4 py-3 w-20">Pts</th>
                      <th className="px-4 py-3 w-20">3P</th>
                      <th className="px-4 py-3 w-20">Faltas</th>
                      <th className="px-4 py-3 w-20">Reb</th>
                      <th className="px-4 py-3 w-20">Ast</th>
                      <th className="px-4 py-3 w-32">Sanción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((item, index) => (
                      <tr key={item.id} className="border-b bg-white hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {item.nombre}
                          <input type="hidden" value={item.id_jugador} {...register(`estadisticas_jugadores.${index}.id_jugador` as const)} />
                          <input type="hidden" value={item.nombre} {...register(`estadisticas_jugadores.${index}.nombre` as const)} />
                        </td>
                        <td className="px-2 py-2"><input type="number" {...register(`estadisticas_jugadores.${index}.puntos` as const, { valueAsNumber: true })} onBlur={e => handleEmptyNumber(index, 'puntos', e)} className="w-full border rounded px-2 py-1" /></td>
                        <td className="px-2 py-2"><input type="number" {...register(`estadisticas_jugadores.${index}.triples` as const, { valueAsNumber: true })} onBlur={e => handleEmptyNumber(index, 'triples', e)} className="w-full border rounded px-2 py-1" /></td>
                        <td className="px-2 py-2"><input type="number" {...register(`estadisticas_jugadores.${index}.faltas` as const, { valueAsNumber: true })} onBlur={e => handleEmptyNumber(index, 'faltas', e)} className="w-full border rounded px-2 py-1" max="6" /></td>
                        <td className="px-2 py-2"><input type="number" {...register(`estadisticas_jugadores.${index}.rebotes` as const, { valueAsNumber: true })} onBlur={e => handleEmptyNumber(index, 'rebotes', e)} className="w-full border rounded px-2 py-1" /></td>
                        <td className="px-2 py-2"><input type="number" {...register(`estadisticas_jugadores.${index}.asistencias` as const, { valueAsNumber: true })} onBlur={e => handleEmptyNumber(index, 'asistencias', e)} className="w-full border rounded px-2 py-1" /></td>
                        <td className="px-2 py-2">
                          <select {...register(`estadisticas_jugadores.${index}.sancion_tipo` as const)} className="w-full border rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-primary-500">
                            <option value="">Ninguna</option>
                            <option value="tecnica">Técnica</option>
                            <option value="antideportiva">Antideport.</option>
                            <option value="descalificante">Descalific.</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Haz clic en "Cargar Plantilla" para llenar la tabla.</p>
            )}
            
            <div className="mt-6 border-t border-gray-100 pt-5">
              <AsyncButton 
                onClickAction={handleSubmit(onSubmit, (errors) => {
                  console.error('Errores de validación:', errors);
                  toast.error('Corrige los errores en el formulario antes de enviar');
                })} 
                className="w-full bg-primary-600 py-2.5 text-white transition-colors hover:bg-primary-700"
              >
                Confirmar e Ingresar Bulk
              </AsyncButton>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
