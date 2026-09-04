import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLideresEstadisticos } from '../api/torneos.api';
import { Skeleton } from '../../../components/Skeleton';
import { EmptyState } from '../../../components/EmptyState';
import { Trophy, ArrowUpRight } from 'lucide-react';

type StatTab = 'puntos' | 'triples' | 'rebotes' | 'asistencias' | 'tapones' | 'tiros_libres';

const TABS: { id: StatTab; label: string; metricKey: string }[] = [
  { id: 'puntos', label: 'Puntos', metricKey: 'puntos' },
  { id: 'triples', label: 'Triples', metricKey: 'triples' },
  { id: 'rebotes', label: 'Rebotes', metricKey: 'rebotes' },
  { id: 'asistencias', label: 'Asistencias', metricKey: 'asistencias' },
  { id: 'tapones', label: 'Tapones', metricKey: 'tapones' },
  { id: 'tiros_libres', label: 'Tiros Libres', metricKey: 'tiros_libres' },
];

interface LideresEstadisticosProps {
  torneoId: string;
  idCategoria?: number;
}

export function LideresEstadisticos({ torneoId, idCategoria }: LideresEstadisticosProps) {
  const [activeTab, setActiveTab] = useState<StatTab>('puntos');

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['torneos', torneoId, 'lideres', idCategoria],
    queryFn: () => getLideresEstadisticos(torneoId, idCategoria),
  });

  const lideresData = response?.data;

  if (isError) {
    return <div className="text-center text-red-500 py-8">Error al cargar las estadísticas.</div>;
  }

  const currentLeaders = lideresData?.[activeTab] || [];
  const currentMetricKey = TABS.find(t => t.id === activeTab)?.metricKey || 'puntos';

  return (
    <div className="mt-6 px-2 sm:px-[5%]">
      {/* Sub-tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Estadísticas">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-bold transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : currentLeaders.length === 0 ? (
        <EmptyState
          title={`Sin estadísticas de ${TABS.find(t => t.id === activeTab)?.label}`}
          description="Aún no hay jugadores que destaquen en esta estadística."
          icon={<Trophy className="mx-auto h-12 w-12 text-gray-400" />}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap border-separate border-spacing-y-2">
            <thead>
              <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50">
                <th className="rounded-l-xl px-4 py-3 w-16 text-center">#</th>
                <th className="px-4 py-3">Jugador</th>
                <th className="px-4 py-3 text-center">PJ</th>
                <th className="px-4 py-3 text-center text-primary-700">TOT.</th>
                <th className="rounded-r-xl px-4 py-3 text-center text-primary-700">MED.</th>
              </tr>
            </thead>
            <tbody>
              {currentLeaders.map((jugador: any, index: number) => {
                const total = jugador[currentMetricKey] || 0;
                const pj = jugador.partidos_jugados || 1;
                const prom = (total / pj).toFixed(1);
                
                return (
                  <tr key={jugador.id_jugador} className="bg-white hover:bg-gray-50 transition-colors shadow-xs rounded-xl group relative">
                    <td className="px-4 py-3 text-center font-bold text-gray-900 border-y border-l border-gray-100 rounded-l-xl">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 border-y border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center">
                          {jugador.url_foto ? (
                            <img src={jugador.url_foto} alt={jugador.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-500 font-bold text-xs">
                              {jugador.nombre.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <Link 
                            to={`/jugador/${jugador.id_jugador}`} 
                            className="font-bold text-primary-700 hover:text-primary-800 uppercase flex items-center gap-1 group/link transition-colors"
                          >
                            {jugador.nombre}
                            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </Link>
                          <p className="text-xs text-gray-500 truncate max-w-[150px] sm:max-w-[200px]">{jugador.nombre_equipo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-gray-600 border-y border-gray-100">
                      {pj}
                    </td>
                    <td className="px-4 py-3 text-center font-black text-gray-900 border-y border-gray-100">
                      {total}
                    </td>
                    <td className="px-4 py-3 text-center font-black text-primary-600 border-y border-r border-gray-100 rounded-r-xl">
                      {prom}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
