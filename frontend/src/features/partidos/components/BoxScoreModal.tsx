import { useQuery } from '@tanstack/react-query';
import { X, Activity } from 'lucide-react';
import { getBoxScore } from '../api/partidos.api';
import { Skeleton } from '../../../components/Skeleton';
import { DataGridTable, type Column } from '../../../components/DataGridTable';

interface BoxScoreModalProps {
  idPartido: number;
  equipoLocal: string;
  equipoVisitante: string;
  onClose: () => void;
}

const columns: Column<any>[] = [
  {
    key: 'jugador',
    header: 'Jugador',
    render: (row) => (
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs font-mono w-6">{row.dorsal}</span>
        <span className="font-semibold text-gray-900">{row.nombre_jugador} {row.apellido_jugador}</span>
      </div>
    )
  },
  {
    key: 'puntos_anotados',
    header: 'Pts',
    render: (row) => <span className="font-bold text-gray-900">{row.puntos_anotados}</span>
  },
  {
    key: 'triples_anotados',
    header: '3P',
    render: (row) => <span className="text-gray-700">{row.triples_anotados}</span>
  },
  {
    key: 'asistencias',
    header: 'Ast',
    render: (row) => <span className="text-gray-700">{row.asistencias}</span>
  },
  {
    key: 'faltas_cometidas',
    header: 'Faltas',
    render: (row) => <span className="text-gray-700">{row.faltas_cometidas}</span>
  }
];

export function BoxScoreModal({ idPartido, equipoLocal, equipoVisitante, onClose }: BoxScoreModalProps) {
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['partido', idPartido, 'box-score'],
    queryFn: () => getBoxScore(idPartido),
  });

  const stats = response?.data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
        <div className="bg-primary-900 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Activity className="w-5 h-5" />
            <h3 className="text-lg font-bold">Estadísticas Oficiales</h3>
          </div>
          <button onClick={onClose} className="text-primary-200 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {equipoLocal} <span className="text-gray-400 font-medium mx-2">vs</span> {equipoVisitante}
            </h2>
          </div>

          {isError ? (
            <div className="text-center text-red-500 py-8">Error al cargar las estadísticas.</div>
          ) : isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Local */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-bold text-gray-800 uppercase tracking-wider text-sm">{equipoLocal}</h4>
                </div>
                <div className="p-0">
                  <DataGridTable
                    columns={columns}
                    data={stats?.local || []}
                    ariaLabel={`Estadísticas de ${equipoLocal}`}
                  />
                </div>
              </div>

              {/* Visitante */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-bold text-gray-800 uppercase tracking-wider text-sm">{equipoVisitante}</h4>
                </div>
                <div className="p-0">
                  <DataGridTable
                    columns={columns}
                    data={stats?.visitante || []}
                    ariaLabel={`Estadísticas de ${equipoVisitante}`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white px-6 py-4 border-t border-gray-200 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
