import { useQuery } from '@tanstack/react-query';
import { getPartidosByTorneo } from '../api/torneos.api';
import { Skeleton } from '../../../components/Skeleton';
import { EmptyState } from '../../../components/EmptyState';
import { Calendar, FileText, Activity } from 'lucide-react';
import { BoxScoreModal } from '../../partidos/components/BoxScoreModal';
import { useState } from 'react';

interface PartidosListProps {
  torneoId: string;
  idCategoria?: number;
  urlCalendario?: string;
}

export function PartidosList({ torneoId, idCategoria, urlCalendario }: PartidosListProps) {
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);


  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['torneos', torneoId, 'partidos', idCategoria],
    queryFn: () => getPartidosByTorneo(torneoId, 1, 100, idCategoria),
  });

  const partidos = response?.data || [];

  if (isError) {
    return <div className="text-center text-red-500 py-8">Error al cargar el calendario de partidos.</div>;
  }

  if (isLoading) {
    return (
      <div className="mt-6 flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (partidos.length === 0) {
    return (
      <div className="mt-6 px-2 sm:px-[8%]">
        {urlCalendario && (
          <div className="mb-6 flex justify-end">
            <a
              href={urlCalendario}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-4 w-4 text-primary-600" />
              Ver calendario (Archivo)
            </a>
          </div>
        )}
        <EmptyState
          title="Calendario no disponible"
          description="El calendario de partidos se generará próximamente."
          icon={<Calendar className="mx-auto h-12 w-12 text-gray-400" />}
        />
      </div>
    );
  }

  return (
    <div className="mt-6 px-2 sm:px-[8%]">
      {urlCalendario && (
        <div className="mb-6 flex justify-end">
          <a
            href={urlCalendario}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-4 w-4 text-primary-600" />
            Ver calendario (Archivo)
          </a>
        </div>
      )}
      <div className="flex flex-col gap-4">
      {partidos.map((partido) => (
        <div key={partido.id} className="flex flex-col sm:flex-row items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex-1 flex justify-end text-right">
            <span className="font-semibold text-gray-900 text-lg sm:text-base">{partido.equipo_local?.nombre || partido.equipo_local?.nombre_equipo || `Equipo Local`}</span>
          </div>

          <div className="px-6 flex flex-col items-center justify-center py-4 sm:py-0">
            <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">{partido.estado.replace('_', ' ')}</div>
            <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 min-w-[120px] text-center">
              {partido.estado.includes('finalizado') ? (
                <span className="text-2xl font-bold text-gray-900 tracking-widest">{partido.marcador_local} - {partido.marcador_visitante}</span>
              ) : (
                <span className="text-sm font-medium text-gray-600">{partido.fecha_hora ? new Date(partido.fecha_hora).toLocaleDateString() : partido.fecha}</span>
              )}
            </div>
            {partido.estado === 'programado' && (
              <span className="text-xs text-gray-400 mt-1">{partido.fecha_hora ? new Date(partido.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : partido.hora}</span>
            )}
            
            {(partido.estado === 'finalizado' || partido.estado === 'finalizado_wo') && (partido.id_partido || partido.id) && (
              <div className="flex flex-col items-center gap-1 mt-2">
                <button
                  onClick={() => setSelectedMatch(partido)}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 transition-colors font-medium bg-primary-50 px-3 py-1.5 rounded-md"
                  title="Ver Estadísticas"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Estadísticas
                </button>
                {partido.url_planilla_fiba && (
                  <a
                    href={partido.url_planilla_fiba}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors py-1"
                    title="Ver Acta FIBA"
                  >
                    <FileText className="w-3 h-3" />
                    Acta Oficial
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 flex justify-start text-left">
            <span className="font-semibold text-gray-900 text-lg sm:text-base">{partido.equipo_visitante?.nombre || partido.equipo_visitante?.nombre_equipo || `Equipo Visitante`}</span>
          </div>
        </div>
      ))}
      </div>
      
      {selectedMatch && (
        <BoxScoreModal
          idPartido={(selectedMatch.id_partido || selectedMatch.id) as number}
          equipoLocal={selectedMatch.equipo_local?.nombre || selectedMatch.equipo_local?.nombre_equipo || 'Local'}
          equipoVisitante={selectedMatch.equipo_visitante?.nombre || selectedMatch.equipo_visitante?.nombre_equipo || 'Visitante'}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
