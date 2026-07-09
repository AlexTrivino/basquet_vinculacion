import { useState, useMemo, useEffect } from 'react';
import { X, BarChart2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../api/axios.config';
import { postEstadisticasBulk } from '../../estadisticas/api/estadisticas.api';
import { createSancion } from '../../sanciones/api/sanciones.api';

// ── Tipos ─────────────────────────────────────────────────────────
interface StatRow {
  id_jugador: number;
  nombre: string;
  dorsal: number;
  puntos: number;
  triples: number;
  faltas: number;
  rebotes: number;
  asistencias: number;
  sancion_activa?: boolean;
}

interface Props {
  idPartido: number;
  idEquipo: number;
  nombreEquipo: string;
  marcadorOficial: number;
  tipoEquipo: 'local' | 'visitante';
  onClose: () => void;
  onSuccess: () => void;
}

export function GenerarEstadisticasModal({
  idPartido,
  idEquipo,
  nombreEquipo,
  marcadorOficial,
  tipoEquipo,
  onClose,
  onSuccess,
}: Props) {
  const [rows, setRows] = useState<StatRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [jugadorAmonestar, setJugadorAmonestar] = useState<number | null>(null);
  const [motivoAmonestacion, setMotivoAmonestacion] = useState('');
  const [isAmonestando, setIsAmonestando] = useState(false);

  // Carga jugadores de la plantilla del equipo en este contexto de partido
  const { data: queryData, isLoading, isFetching } = useQuery({
    queryKey: ['partido-stats', idPartido, tipoEquipo],
    queryFn: async () => {
      const res = await axiosInstance.get('/partidos/' + idPartido + '/estadisticas');
      return res.data;
    }
  });

  useEffect(() => {
    if (queryData?.data) {
      const statsEquipo = queryData.data[tipoEquipo] || [];
      const initialRows: StatRow[] = statsEquipo.map((p: any) => ({
        id_jugador: p.id_jugador,
        nombre: `${p.nombre_jugador} ${p.apellido_jugador}`.trim(),
        dorsal: p.numero_camiseta || 0,
        puntos: p.puntos_anotados || 0,
        triples: p.triples_anotados || 0,
        faltas: p.faltas_cometidas || 0,
        rebotes: p.rebotes || 0,
        asistencias: p.asistencias || 0,
        sancion_activa: p.sancion_activa || false,
      }));
      // Siempre sobrescribir con datos frescos del backend al abrir
      setRows(initialRows);
    }
  }, [queryData, tipoEquipo]);

  // Suma reactiva de puntos en tiempo real (Puntos de 2/1 + Triples * 3)
  const totalPuntos = useMemo(() => rows.reduce((sum, r) => sum + (r.puntos || 0) + ((r.triples || 0) * 3), 0), [rows]);
  const isBalanced = totalPuntos === marcadorOficial;

  const updateRow = (idx: number, field: keyof StatRow, value: number) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleAmonestar = async () => {
    if (!jugadorAmonestar || !motivoAmonestacion.trim()) return toast.warning('Escribe el motivo');
    setIsAmonestando(true);
    try {
      await createSancion({ id_partido: idPartido, id_jugador: jugadorAmonestar, motivo: motivoAmonestacion, fecha: new Date().toISOString().split('T')[0] });
      toast.success('Amonestación registrada con éxito');
      setJugadorAmonestar(null);
      setMotivoAmonestacion('');
    } catch (error) { 
      toast.error('Error al amonestar jugador'); 
    } finally {
      setIsAmonestando(false);
    }
  };

  const handleLimpiar = () => {
    if (window.confirm("¿Seguro que deseas reiniciar todas las estadísticas a cero?")) {
      setRows((prev) => prev.map(r => ({ ...r, puntos: 0, triples: 0, faltas: 0, rebotes: 0, asistencias: 0 })));
    }
  };

  const handleSave = async () => {
    if (!isBalanced) return;
    setIsSaving(true);
    try {
      await postEstadisticasBulk({
        id_partido: idPartido,
        id_equipo: idEquipo,
        estadisticas_jugadores: rows.map((r) => ({
          id_jugador: r.id_jugador,
          puntos: r.puntos,
          triples: r.triples,
          faltas: 0,
          rebotes: r.rebotes,
          asistencias: r.asistencias,
        })),
      });
      toast.success('Estadísticas guardadas exitosamente');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar estadísticas');
    } finally {
      setIsSaving(false);
    }
  };

  const STAT_COLS = ['puntos', 'triples', 'rebotes', 'asistencias'] as const;
  type StatKey = typeof STAT_COLS[number];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden relative my-4">
        {/* Header */}
        <div className="bg-primary-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-primary-300" />
            <h3 className="text-lg font-bold text-white">Estadísticas — {nombreEquipo}</h3>
          </div>
          <button onClick={onClose} className="text-primary-300 hover:text-white" disabled={isSaving}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isLoading || isFetching ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay jugadores activos en la plantilla.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Jugador</th>
                      {STAT_COLS.map((col) => (
                        <th key={col} className="px-3 py-3 text-center font-semibold text-gray-700 capitalize">
                          {col}
                        </th>
                      ))}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row, idx) => (
                      <tr key={row.id_jugador} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-500">{row.dorsal}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{row.nombre}</td>
                        {STAT_COLS.map((col) => (
                          <td key={col} className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={row[col as StatKey]}
                              onChange={(e) => updateRow(idx, col as StatKey, Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center">
                          <button 
                            onClick={() => setJugadorAmonestar(row.id_jugador)} 
                            disabled={row.sancion_activa}
                            title={row.sancion_activa ? "Jugador ya sancionado en este partido" : "Amonestar Jugador"} 
                            className={`transition-colors ${row.sancion_activa ? 'text-red-500 fill-red-100 disabled:opacity-100' : 'text-gray-400 hover:text-yellow-500 disabled:opacity-50'}`}
                          >
                            <AlertTriangle className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {jugadorAmonestar && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col sm:flex-row gap-3 items-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <input type="text" placeholder="Motivo de la amonestación disciplinaria..." value={motivoAmonestacion} onChange={(e) => setMotivoAmonestacion(e.target.value)} className="flex-1 rounded-md border-gray-300 px-3 py-1.5 text-sm" disabled={isAmonestando} />
                  <button onClick={handleAmonestar} disabled={isAmonestando} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-1.5 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isAmonestando ? 'Aplicando...' : 'Aplicar Tarjeta'}
                  </button>
                  <button onClick={() => { setJugadorAmonestar(null); setMotivoAmonestacion(''); }} className="text-gray-500 hover:text-gray-700 px-2 py-1.5 text-sm font-semibold">Cancelar</button>
                </div>
              )}

              {/* Panel de control / Feedback predictivo */}
              <div className={`mt-6 rounded-lg border-2 p-4 flex items-center justify-between ${
                isBalanced ? 'border-green-500 bg-green-50' : 'border-amber-400 bg-amber-50'
              }`}>
                <div>
                  <p className={`text-sm font-semibold ${isBalanced ? 'text-green-700' : 'text-amber-700'}`}>
                    Puntos asignados: <span className="text-lg font-bold">{totalPuntos}</span>
                    {' '}/ Marcador oficial: <span className="text-lg font-bold">{marcadorOficial}</span>
                  </p>
                  {!isBalanced && (
                    <p className="text-xs text-amber-600 mt-1">
                      {totalPuntos < marcadorOficial
                        ? `Faltan ${marcadorOficial - totalPuntos} puntos por asignar.`
                        : `Hay ${totalPuntos - marcadorOficial} puntos de más.`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleLimpiar}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-md text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Limpiar Todo
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!isBalanced || isSaving}
                    className={`px-6 py-2 rounded-md text-sm font-semibold text-white transition-all ${
                      isBalanced && !isSaving
                        ? 'bg-primary-600 hover:bg-primary-700 shadow-sm'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Estadísticas'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
