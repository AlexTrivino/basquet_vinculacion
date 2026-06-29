import { useQuery } from '@tanstack/react-query';
import { getPartidosByTorneo } from '../api/torneos.api';
import { Skeleton } from '../../../components/Skeleton';
import { EmptyState } from '../../../components/EmptyState';
import { Calendar } from 'lucide-react';

interface PartidosListProps {
  torneoId: string;
}

export function PartidosList({ torneoId }: PartidosListProps) {
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['torneos', torneoId, 'partidos'],
    queryFn: () => getPartidosByTorneo(torneoId),
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
      <div className="mt-6">
        <EmptyState
          title="Calendario no disponible"
          description="El calendario de partidos se generará próximamente."
          icon={<Calendar className="mx-auto h-12 w-12 text-gray-400" />}
        />
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {partidos.map((partido) => (
        <div key={partido.id} className="flex flex-col sm:flex-row items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex-1 flex justify-end text-right">
            <span className="font-semibold text-gray-900 text-lg sm:text-base">{partido.equipo_local?.nombre || `Equipo ${partido.id_equipo_local}`}</span>
          </div>
          
          <div className="px-6 flex flex-col items-center justify-center py-4 sm:py-0">
            <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">{partido.estado.replace('_', ' ')}</div>
            <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 min-w-[120px] text-center">
              {partido.estado.includes('finalizado') ? (
                <span className="text-2xl font-bold text-gray-900 tracking-widest">{partido.marcador_local} - {partido.marcador_visitante}</span>
              ) : (
                <span className="text-sm font-medium text-gray-600">{new Date(partido.fecha_hora).toLocaleDateString()}</span>
              )}
            </div>
            {partido.estado === 'programado' && (
              <span className="text-xs text-gray-400 mt-1">{new Date(partido.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
          
          <div className="flex-1 flex justify-start text-left">
            <span className="font-semibold text-gray-900 text-lg sm:text-base">{partido.equipo_visitante?.nombre || `Equipo ${partido.id_equipo_visitante}`}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
