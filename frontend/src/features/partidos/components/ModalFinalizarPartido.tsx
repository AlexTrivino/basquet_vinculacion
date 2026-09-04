import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Trophy, FileText, BarChart2, AlertTriangle, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { actualizarPartido, subirActaPartido, getBoxScore } from '../api/partidos.api';
import { postEstadisticasBulk } from '../../estadisticas/api/estadisticas.api';
import { AsyncButton } from '../../../components/AsyncButton';
import type { Partido } from '../../../types/api.types';

// Esquema Zod
const statRowSchema = z.object({
  id_jugador: z.number(),
  nombre: z.string(),
  dorsal: z.number(),
  puntos: z.number().min(0),
  triples: z.number().min(0),
  rebotes: z.number().min(0),
  asistencias: z.number().min(0),
  tapones: z.number().min(0),
  tiros_libres_anotados: z.number().min(0),
});

const finalizarSchema = z.object({
  estado: z.string(),
  marcador_local: z.number().min(0),
  marcador_visitante: z.number().min(0),
  stats_local: z.array(statRowSchema),
  stats_visitante: z.array(statRowSchema),
});

type FinalizarValues = z.infer<typeof finalizarSchema>;

interface ModalFinalizarPartidoProps {
  partido: Partido;
  onClose: () => void;
}

export function ModalFinalizarPartido({ partido, onClose }: ModalFinalizarPartidoProps) {
  const queryClient = useQueryClient();
  const [actaFile, setActaFile] = useState<File | null>(null);
  const [showStats, setShowStats] = useState(false);

  // Obtener box score
  const { data: boxScoreRes, isLoading: loadingBoxScore } = useQuery({
    queryKey: ['partido-stats', partido.id_partido],
    queryFn: () => getBoxScore(partido.id_partido!),
    enabled: !!partido.id_partido
  });

  const { register, control, handleSubmit, watch, reset, formState: { errors } } = useForm<FinalizarValues>({
    resolver: zodResolver(finalizarSchema),
    defaultValues: {
      estado: partido.estado === 'programado' ? 'finalizado' : partido.estado,
      marcador_local: partido.marcador_local || 0,
      marcador_visitante: partido.marcador_visitante || 0,
      stats_local: [],
      stats_visitante: [],
    }
  });

  const { fields: fieldsLocal, replace: replaceLocal } = useFieldArray({ control, name: 'stats_local' });
  const { fields: fieldsVisitante, replace: replaceVisitante } = useFieldArray({ control, name: 'stats_visitante' });

  // Inicializar filas cuando lleguen los datos
  useEffect(() => {
    if (boxScoreRes?.data) {
      const mapStats = (players: any[]) => players.map(p => ({
        id_jugador: p.id_jugador,
        nombre: [p.nombre_jugador || p.nombre, p.apellido_jugador].filter(Boolean).join(' ').trim(),
        dorsal: p.numero_camiseta || 0,
        puntos: p.puntos_anotados || 0,
        triples: p.triples_anotados || 0,
        rebotes: p.rebotes || 0,
        asistencias: p.asistencias || 0,
        tapones: p.tapones || 0,
        tiros_libres_anotados: p.tiros_libres_anotados || 0,
      }));

      replaceLocal(mapStats(boxScoreRes.data.local || []));
      replaceVisitante(mapStats(boxScoreRes.data.visitante || []));
    }
  }, [boxScoreRes, replaceLocal, replaceVisitante]);

  const watchStatsLocal = watch('stats_local');
  const watchStatsVisitante = watch('stats_visitante');
  const watchMarcadorLocal = watch('marcador_local');
  const watchMarcadorVisitante = watch('marcador_visitante');

  // Cálculos de balance
  const totalPuntosLocal = useMemo(() => watchStatsLocal.reduce((sum, r) => sum + (r.puntos || 0) + ((r.triples || 0) * 3), 0), [watchStatsLocal]);
  const totalPuntosVisitante = useMemo(() => watchStatsVisitante.reduce((sum, r) => sum + (r.puntos || 0) + ((r.triples || 0) * 3), 0), [watchStatsVisitante]);
  
  const isBalancedLocal = totalPuntosLocal === (watchMarcadorLocal || 0);
  const isBalancedVisitante = totalPuntosVisitante === (watchMarcadorVisitante || 0);

  const onSubmit = async (data: FinalizarValues) => {
    if (showStats) {
      if (!isBalancedLocal) {
        toast.error('Las estadísticas del equipo Local no coinciden con su marcador oficial');
        return;
      }
      if (!isBalancedVisitante) {
        toast.error('Las estadísticas del equipo Visitante no coinciden con su marcador oficial');
        return;
      }
    }

    try {
      // 1. Actualizar estado y marcadores
      await actualizarPartido(partido.id_partido!, {
        estado: data.estado,
        marcador_local: data.marcador_local,
        marcador_visitante: data.marcador_visitante,
      });

      // 2. Subir Acta si hay una nueva
      if (actaFile) {
        await subirActaPartido(partido.id_partido!, actaFile);
      }

      // 3. Guardar Estadísticas Local
      if (showStats && data.stats_local.length > 0) {
        await postEstadisticasBulk({
          id_partido: partido.id_partido!,
          id_equipo: partido.id_equipo_local!,
          estadisticas_jugadores: data.stats_local.map(r => ({
            id_jugador: r.id_jugador,
            puntos: r.puntos,
            triples: r.triples,
            faltas: 0, // Faltas fue ocultado a petición del usuario
            rebotes: r.rebotes,
            asistencias: r.asistencias,
            tapones: r.tapones,
            tiros_libres_anotados: r.tiros_libres_anotados,
          }))
        });
      }

      // 4. Guardar Estadísticas Visitante
      if (showStats && data.stats_visitante.length > 0) {
        await postEstadisticasBulk({
          id_partido: partido.id_partido!,
          id_equipo: partido.id_equipo_visitante!,
          estadisticas_jugadores: data.stats_visitante.map(r => ({
            id_jugador: r.id_jugador,
            puntos: r.puntos,
            triples: r.triples,
            faltas: 0,
            rebotes: r.rebotes,
            asistencias: r.asistencias,
            tapones: r.tapones,
            tiros_libres_anotados: r.tiros_libres_anotados,
          }))
        });
      }

      toast.success('Partido finalizado y estadísticas guardadas');
      queryClient.invalidateQueries({ queryKey: ['partidos'] });
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al procesar la finalización del partido');
    }
  };

  const STAT_COLS = ['puntos', 'triples', 'rebotes', 'asistencias', 'tapones', 'tiros_libres_anotados'] as const;
  
  const handleLimpiarLocal = () => replaceLocal(watchStatsLocal.map(r => ({ ...r, puntos: 0, triples: 0, rebotes: 0, asistencias: 0, tapones: 0, tiros_libres_anotados: 0 })));
  const handleLimpiarVisitante = () => replaceVisitante(watchStatsVisitante.map(r => ({ ...r, puntos: 0, triples: 0, rebotes: 0, asistencias: 0, tapones: 0, tiros_libres_anotados: 0 })));

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!/[0-9]/.test(e.key) && !['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-100 rounded-xl shadow-2xl w-full max-w-[1600px] max-h-[95vh] flex flex-col overflow-hidden relative animate-fade-in-up">
        {/* Header */}
        <div className="bg-primary-900 px-6 py-4 flex items-center justify-between shrink-0 shadow-md z-10">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-primary-300" />
            <h3 className="text-xl font-bold text-white">
              Gestor de Estadísticas y Resultados
            </h3>
          </div>
          <button onClick={onClose} className="text-primary-300 hover:text-white transition-colors bg-white/10 p-2 rounded-full hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto">
          {loadingBoxScore ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form id="finalizarForm" onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-6">
              
              {/* Sección Top: Estado y Marcadores */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex flex-col items-center md:items-start w-full md:w-1/3">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Estado del Partido</span>
                  <select {...register('estado')} className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-md font-medium text-gray-800 bg-gray-50 focus:border-primary-500 focus:outline-none">
                    <option value="programado">Programado</option>
                    <option value="en_curso">En Curso</option>
                    <option value="finalizado">Finalizado</option>
                    <option value="finalizado_wo">Finalizado W.O.</option>
                    <option value="suspendido">Suspendido</option>
                  </select>
                </div>

                <div className="flex items-center gap-6 md:gap-12 w-full md:w-auto justify-center bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-gray-800 text-lg mb-3 max-w-[150px] truncate text-center" title={partido.equipo_local?.nombre_equipo}>
                      {partido.equipo_local?.nombre_equipo || 'Local'}
                    </span>
                    <input type="number" min="0" onKeyDown={handleNumericKeyDown} {...register('marcador_local', { valueAsNumber: true })} className="w-28 text-center rounded-lg border-2 border-gray-300 px-3 py-3 text-4xl font-black text-primary-700 bg-white focus:border-primary-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  </div>
                  <span className="text-3xl font-black text-gray-300 px-2 mt-8">-</span>
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-gray-800 text-lg mb-3 max-w-[150px] truncate text-center" title={partido.equipo_visitante?.nombre_equipo}>
                      {partido.equipo_visitante?.nombre_equipo || 'Visitante'}
                    </span>
                    <input type="number" min="0" onKeyDown={handleNumericKeyDown} {...register('marcador_visitante', { valueAsNumber: true })} className="w-28 text-center rounded-lg border-2 border-gray-300 px-3 py-3 text-4xl font-black text-primary-700 bg-white focus:border-primary-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  </div>
                </div>
                
                <div className="w-full md:w-1/3 flex justify-end">
                   {/* Espacio para balance visual general si se requiere */}
                </div>
              </div>

              <div className="flex justify-center py-2">
                <button 
                  type="button" 
                  onClick={() => setShowStats(!showStats)}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  {showStats ? (
                    <>
                      <X className="w-5 h-5" />
                      Ocultar estadísticas individuales
                    </>
                  ) : (
                    <>
                      <BarChart2 className="w-5 h-5" />
                      Desplegar estadísticas individuales
                    </>
                  )}
                </button>
              </div>

              {/* Grid 2 Columnas: Plantillas Local y Visitante */}
              {showStats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up">
                
                {/* Equipo Local */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                  <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <h4 className="font-bold text-blue-900">{partido.equipo_local?.nombre_equipo} (Local)</h4>
                    </div>
                    <button type="button" onClick={handleLimpiarLocal} className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded transition-colors">Limpiar</button>
                  </div>
                  
                  <div className="overflow-x-auto p-0">
                    {fieldsLocal.length === 0 ? (
                      <p className="text-center text-gray-500 py-8 text-sm italic">No hay jugadores activos.</p>
                    ) : (
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 font-semibold">#</th>
                            <th className="px-3 py-2 font-semibold">Jugador</th>
                            <th className="px-2 py-2 text-center" title="Puntos (Dobles/Libres)">Puntos</th>
                            <th className="px-2 py-2 text-center" title="Triples">Triples</th>
                            <th className="px-2 py-2 text-center" title="Tiros Libres Anotados">Tiros Libres</th>
                            <th className="px-2 py-2 text-center" title="Rebotes">Rebotes</th>
                            <th className="px-2 py-2 text-center" title="Asistencias">Asistencias</th>
                            <th className="px-2 py-2 text-center" title="Tapones">Tapones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {fieldsLocal.map((field, idx) => (
                            <tr key={field.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-1.5 font-medium text-gray-500">{field.dorsal}</td>
                              <td className="px-3 py-1.5 font-semibold text-gray-800 truncate max-w-[120px]" title={field.nombre}>{field.nombre}</td>
                              <td className="px-1 py-1.5 text-center"><input type="number" min="0" onKeyDown={handleNumericKeyDown} {...register(`stats_local.${idx}.puntos`, { valueAsNumber: true })} className="w-12 text-center rounded border border-gray-300 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></td>
                              <td className="px-1 py-1.5 text-center"><input type="number" min="0" onKeyDown={handleNumericKeyDown} {...register(`stats_local.${idx}.triples`, { valueAsNumber: true })} className="w-12 text-center rounded border border-gray-300 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></td>
                              <td className="px-1 py-1.5 text-center"><input type="number" min="0" onKeyDown={handleNumericKeyDown} {...register(`stats_local.${idx}.tiros_libres_anotados`, { valueAsNumber: true })} className="w-12 text-center rounded border border-gray-300 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></td>
                              <td className="px-1 py-1.5 text-center"><input type="number" min="0" onKeyDown={handleNumericKeyDown} {...register(`stats_local.${idx}.rebotes`, { valueAsNumber: true })} className="w-12 text-center rounded border border-gray-300 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></td>
                              <td className="px-1 py-1.5 text-center"><input type="number" min="0" onKeyDown={handleNumericKeyDown} {...register(`stats_local.${idx}.asistencias`, { valueAsNumber: true })} className="w-12 text-center rounded border border-gray-300 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></td>
                              <td className="px-1 py-1.5 text-center"><input type="number" min="0" onKeyDown={handleNumericKeyDown} {...register(`stats_local.${idx}.tapones`, { valueAsNumber: true })} className="w-12 text-center rounded border border-gray-300 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  
                  {/* Balance Local */}
                  <div className={`p-3 border-t flex items-center justify-between text-sm ${isBalancedLocal ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <span className="font-medium">Total PTS + Triples: <strong>{totalPuntosLocal}</strong></span>
                    {isBalancedLocal ? (
                      <span className="font-bold flex items-center gap-1">¡Balance Correcto!</span>
                    ) : (
                      <span className="font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> No coincide con {watchMarcadorLocal || 0}</span>
                    )}
                  </div>
                </div>

                {/* Equipo Visitante */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                  <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <h4 className="font-bold text-amber-900">{partido.equipo_visitante?.nombre_equipo} (Visitante)</h4>
                    </div>
                    <button type="button" onClick={handleLimpiarVisitante} className="text-xs font-semibold text-amber-600 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition-colors">Limpiar</button>
                  </div>
                  
                  <div className="overflow-x-auto p-0">
                    {fieldsVisitante.length === 0 ? (
                      <p className="text-center text-gray-500 py-8 text-sm italic">No hay jugadores activos.</p>
                    ) : (
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 font-semibold">#</th>
                            <th className="px-3 py-2 font-semibold">Jugador</th>
                            <th className="px-2 py-2 text-center" title="Puntos (Dobles/Libres)">Puntos</th>
                            <th className="px-2 py-2 text-center" title="Triples">Triples</th>
                            <th className="px-2 py-2 text-center" title="Tiros Libres Anotados">Tiros Libres</th>
                            <th className="px-2 py-2 text-center" title="Rebotes">Rebotes</th>
                            <th className="px-2 py-2 text-center" title="Asistencias">Asistencias</th>
                            <th className="px-2 py-2 text-center" title="Tapones">Tapones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {fieldsVisitante.map((field, idx) => (
                            <tr key={field.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-1.5 font-medium text-gray-500">{field.dorsal}</td>
                              <td className="px-3 py-1.5 font-semibold text-gray-800 truncate max-w-[120px]" title={field.nombre}>{field.nombre}</td>
                              <td className="px-1 py-1.5 text-center"><input type="number" min="0" onKeyDown={handleNumericKeyDown} {...register(`stats_visitante.${idx}.puntos`, { valueAsNumber: true })} className="w-12 text-center rounded border border-gray-300 py-1 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></td>
                              <td className="px-1 py-1.5 text-center"><input type="number" min="0" onKeyDown={handleNumericKeyDown} {...register(`stats_visitante.${idx}.triples`, { valueAsNumber: true })} className="w-12 text-center rounded border border-gray-300 py-1 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></td>
                              <td className="px-1 py-1.5 text-center"><input type="number" min="0" onKeyDown={handleNumericKeyDown} {...register(`stats_visitante.${idx}.tiros_libres_anotados`, { valueAsNumber: true })} className="w-12 text-center rounded border border-gray-300 py-1 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></td>
                              <td className="px-1 py-1.5 text-center"><input type="number" min="0" onKeyDown={handleNumericKeyDown} {...register(`stats_visitante.${idx}.rebotes`, { valueAsNumber: true })} className="w-12 text-center rounded border border-gray-300 py-1 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></td>
                              <td className="px-1 py-1.5 text-center"><input type="number" min="0" onKeyDown={handleNumericKeyDown} {...register(`stats_visitante.${idx}.asistencias`, { valueAsNumber: true })} className="w-12 text-center rounded border border-gray-300 py-1 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></td>
                              <td className="px-1 py-1.5 text-center"><input type="number" min="0" onKeyDown={handleNumericKeyDown} {...register(`stats_visitante.${idx}.tapones`, { valueAsNumber: true })} className="w-12 text-center rounded border border-gray-300 py-1 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  
                  {/* Balance Visitante */}
                  <div className={`p-3 border-t flex items-center justify-between text-sm ${isBalancedVisitante ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <span className="font-medium">Total PTS + Triples: <strong>{totalPuntosVisitante}</strong></span>
                    {isBalancedVisitante ? (
                      <span className="font-bold flex items-center gap-1">¡Balance Correcto!</span>
                    ) : (
                      <span className="font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> No coincide con {watchMarcadorVisitante || 0}</span>
                    )}
                  </div>
                </div>

              </div>
              )}

              {/* Sección Acta FIBA */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  Acta FIBA Oficial (Opcional)
                </h4>
                
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="flex-1 w-full relative">
                    <input 
                      type="file" 
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={(e) => setActaFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer border border-gray-300 rounded-md focus:outline-none bg-gray-50" 
                    />
                  </div>
                  
                  {partido.url_planilla_fiba && !actaFile && (
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2.5 rounded-md border border-green-200 text-sm font-medium whitespace-nowrap">
                      <FileText className="w-4 h-4" />
                      Acta actual subida
                      <a href={partido.url_planilla_fiba} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary-600 hover:underline">Ver</a>
                    </div>
                  )}
                  {actaFile && (
                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2.5 rounded-md border border-blue-200 text-sm font-medium whitespace-nowrap">
                      <Upload className="w-4 h-4" />
                      Lista para subir: {actaFile.name}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Formatos permitidos: PDF, JPG, PNG. Tamaño máximo: 5MB.</p>
              </div>

            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-10">
          <div className="text-sm text-gray-500 font-medium">
            {showStats ? 'Por favor, verifica que los balances coincidan antes de guardar.' : 'Guarda el resultado oficial del encuentro.'}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancelar
            </button>
            <AsyncButton 
              onClickAction={handleSubmit(onSubmit)} 
              disabled={showStats && (!isBalancedLocal || !isBalancedVisitante)}
              className="bg-primary-600 text-white px-8 py-2.5 rounded-lg shadow-md hover:bg-primary-700 hover:shadow-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md flex items-center gap-2"
            >
              Guardar y Finalizar
            </AsyncButton>
          </div>
        </div>
      </div>
    </div>
  );
}
