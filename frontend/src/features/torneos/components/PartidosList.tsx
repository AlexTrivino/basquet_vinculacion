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

  const rawPartidos = response?.data || [];

  // Sort matches: Programados first (ascending date), then Finalizados (descending date)
  const partidos = [...rawPartidos].sort((a: any, b: any) => {
    const isAProgramado = a.estado === 'programado';
    const isBProgramado = b.estado === 'programado';

    if (isAProgramado && !isBProgramado) return -1;
    if (!isAProgramado && isBProgramado) return 1;

    const dateA = new Date(`${a.fecha}T${a.hora || '00:00'}`).getTime();
    const dateB = new Date(`${b.fecha}T${b.hora || '00:00'}`).getTime();

    if (isAProgramado) {
      return dateA - dateB; // Próximos (más cercanos) primero
    } else {
      return dateB - dateA; // Finalizados (más recientes) primero
    }
  });

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
      <div className="flex flex-col gap-5">
        {partidos.map((partido) => {
          const isFinalizado = partido.estado.includes('finalizado');
          return (
            <div
              key={partido.id_partido || partido.id}
              className={`flex flex-col rounded-2xl border bg-white overflow-hidden transition-all duration-300 ${
                isFinalizado 
                  ? 'border-gray-200 shadow-sm hover:shadow-md' 
                  : 'border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] ring-1 ring-emerald-50 relative'
              }`}
            >
              {/* Encabezado del partido (Fase y Estado) */}
              <div className={`flex items-center justify-between px-4 sm:px-6 py-2.5 ${isFinalizado ? 'bg-gray-50 border-b border-gray-100' : 'bg-emerald-50/50 border-b border-emerald-100'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${isFinalizado ? 'text-gray-500' : 'text-emerald-700'}`}>
                    {partido.fase || 'Fase Regular'}
                  </span>
                  {partido.ubicacion && (
                    <>
                      <span className={isFinalizado ? 'text-gray-300' : 'text-emerald-200'}>•</span>
                      <span className={`text-[10px] sm:text-xs font-medium truncate max-w-[120px] sm:max-w-none ${isFinalizado ? 'text-gray-500' : 'text-emerald-600'}`}>
                        {partido.ubicacion}
                      </span>
                    </>
                  )}
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isFinalizado ? 'bg-gray-200 text-gray-700' : 'bg-emerald-500 text-white shadow-sm'
                }`}>
                  {!isFinalizado && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-100 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                  )}
                  {partido.estado.replace('_', ' ')}
                </div>
              </div>

              {/* Cuerpo del partido (Equipos y Marcador/Fecha) */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 gap-4 sm:gap-6">
                
                {/* Equipo Local */}
                <div className="flex-1 flex flex-col sm:items-end w-full text-center sm:text-right">
                  <span className="font-extrabold text-gray-900 text-lg sm:text-xl line-clamp-2">
                    {partido.equipo_local?.nombre || partido.equipo_local?.nombre_equipo || 'Equipo Local'}
                  </span>
                </div>

                {/* Centro: Marcador o Fecha */}
                <div className="flex flex-col items-center justify-center shrink-0 w-full sm:w-auto z-10">
                  <div className={`flex flex-col items-center justify-center px-6 py-3 rounded-xl border min-w-[140px] sm:min-w-[160px] transition-transform ${
                    isFinalizado ? 'bg-gray-50 border-gray-200' : 'bg-white border-emerald-200 shadow-md transform hover:scale-105'
                  }`}>
                    {isFinalizado ? (
                      <span className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tighter">
                        {partido.marcador_local} <span className="text-gray-300 font-light px-1">-</span> {partido.marcador_visitante}
                      </span>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-gray-900">
                          {partido.fecha_hora ? new Date(partido.fecha_hora).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : partido.fecha}
                        </span>
                        <span className="text-xl font-black text-emerald-600 mt-0.5">
                          {partido.fecha_hora ? new Date(partido.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : partido.hora?.slice(0, 5)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Botones de acción */}
                  {isFinalizado && (partido.id_partido || partido.id) && (
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                      <button
                        onClick={() => setSelectedMatch(partido)}
                        className="flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-white transition-colors bg-primary-50 hover:bg-primary-600 px-3.5 py-1.5 rounded-lg border border-primary-100 hover:border-primary-600"
                        title="Ver Estadísticas del Partido"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        Estadísticas
                      </button>
                      {partido.url_planilla_fiba && (
                        <a
                          href={partido.url_planilla_fiba}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-white transition-colors bg-gray-50 hover:bg-gray-800 px-3.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-800"
                          title="Ver Acta Oficial FIBA"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Acta FIBA
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Equipo Visitante */}
                <div className="flex-1 flex flex-col sm:items-start w-full text-center sm:text-left">
                  <span className="font-extrabold text-gray-900 text-lg sm:text-xl line-clamp-2">
                    {partido.equipo_visitante?.nombre || partido.equipo_visitante?.nombre_equipo || 'Equipo Visitante'}
                  </span>
                </div>

              </div>
            </div>
          );
        })}
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
