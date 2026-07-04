import { useState, useMemo, useEffect } from 'react';
import { X, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../api/axios.config';
import { postEstadisticasBulk } from '../../estadisticas/api/estadisticas.api';

// ── Tipos ─────────────────────────────────────────────────────────
interface JugadorPlantilla {
  id_jugador: number;
  id_plantilla?: number;
  jugador?: { id_jugador?: number; nombres: string; apellidos: string };
  nombres?: string;
  apellidos?: string;
  numero_camiseta?: number;
}

interface StatRow {
  id_jugador: number;
  nombre: string;
  dorsal: number;
  puntos: number;
  triples: number;
  faltas: number;
  rebotes: number;
  asistencias: number;
}

interface Props {
  idPartido: number;
  idEquipo: number;
  nombreEquipo: string;
  marcadorOficial: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function GenerarEstadisticasModal({
  idPartido,
  idEquipo,
  nombreEquipo,
  marcadorOficial,
  onClose,
  onSuccess,
}: Props) {
  const [rows, setRows] = useState<StatRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Carga jugadores de la plantilla del equipo en este contexto de partido
  const { data: queryData, isLoading } = useQuery({
    queryKey: ['plantilla-stats', idEquipo, idPartido],
    queryFn: async () => {
      const res = await axiosInstance.get('/plantillas', {
        params: { id_equipo: idEquipo, estado: 'activo', per_page: 100 }
      });
      return res.data;
    }
  });

  useEffect(() => {
    if (queryData?.data) {
      const plantilla: JugadorPlantilla[] = queryData.data;
      const initialRows: StatRow[] = plantilla.map((p) => ({
        // Fix de mapeo: el ID viaja dentro del objeto anidado en el PublicSchema
        id_jugador: p.jugador?.id_jugador || p.id_jugador,
        nombre: p.jugador
          ? `${p.jugador.nombres} ${p.jugador.apellidos}`
          : `${p.nombres || ''} ${p.apellidos || ''}`.trim(),
        dorsal: p.numero_camiseta || 0,
        puntos: 0,
        triples: 0,
        faltas: 0,
        rebotes: 0,
        asistencias: 0,
      }));
      // Solo inicializa si la tabla está vacía para no borrar lo que el Admin esté tipeando
      setRows((prev) => (prev.length === 0 ? initialRows : prev));
    }
  }, [queryData]);

  // Suma reactiva de puntos en tiempo real
  const totalPuntos = useMemo(() => rows.reduce((sum, r) => sum + (r.puntos || 0), 0), [rows]);
  const isBalanced = totalPuntos === marcadorOficial;

  const updateRow = (idx: number, field: keyof StatRow, value: number) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
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
          faltas: r.faltas,
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

  const STAT_COLS = ['puntos', 'triples', 'faltas', 'rebotes', 'asistencias'] as const;
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
          {isLoading ? (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
