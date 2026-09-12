import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getPartidosByTorneo } from '../api/torneos.api';
import { Skeleton } from '../../../components/Skeleton';
import { EmptyState } from '../../../components/EmptyState';
import { Calendar as CalendarIcon, FileText, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { BoxScoreModal } from '../../partidos/components/BoxScoreModal';
import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface PartidosListProps {
  torneoId: string;
  idCategoria?: number;
  urlCalendario?: string;
  categorias?: any[];
}

const CATEGORY_COLORS = [
  { dot: 'bg-red-300', bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700' },
  { dot: 'bg-emerald-300', bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700' },
  { dot: 'bg-blue-300', bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-700' },
  { dot: 'bg-amber-300', bg: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-700' },
  { dot: 'bg-purple-300', bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-700' },
  { dot: 'bg-pink-300', bg: 'bg-pink-100', border: 'border-pink-200', text: 'text-pink-700' },
  { dot: 'bg-cyan-300', bg: 'bg-cyan-100', border: 'border-cyan-200', text: 'text-cyan-700' },
  { dot: 'bg-orange-300', bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' },
];

export function PartidosList({ torneoId, idCategoria, urlCalendario, categorias = [] }: PartidosListProps) {
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['torneos', torneoId, 'partidos', idCategoria],
    queryFn: () => getPartidosByTorneo(torneoId, 1, 1000, idCategoria),
  });

  const rawPartidos = response?.data || [];

  // Mapear categorías a colores
  const catColorMap = useMemo(() => {
    const map = new Map<number, any>();
    categorias.forEach((cat, index) => {
      map.set(cat.id_categoria || cat.id, CATEGORY_COLORS[index % CATEGORY_COLORS.length]);
    });
    return map;
  }, [categorias]);

  // Sort matches by date ascending
  const partidosSorted = useMemo(() => {
    return [...rawPartidos].sort((a: any, b: any) => {
      const dateA = new Date(`${a.fecha}T${a.hora || '00:00'}`).getTime();
      const dateB = new Date(`${b.fecha}T${b.hora || '00:00'}`).getTime();
      return dateA - dateB;
    });
  }, [rawPartidos]);

  // Group by date
  const partidosGrouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    partidosSorted.forEach(p => {
      const fecha = p.fecha || 'Sin fecha';
      if (!groups[fecha]) {
        groups[fecha] = [];
      }
      groups[fecha].push(p);
    });
    return groups;
  }, [partidosSorted]);

  // Calendar logic
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

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

  if (rawPartidos.length === 0) {
    return (
      <div className="mt-6 px-2">
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
          icon={<CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />}
        />
      </div>
    );
  }

  // Filter groups if a date is selected
  const filteredGroups = selectedDate 
    ? { [format(selectedDate, 'yyyy-MM-dd')]: partidosGrouped[format(selectedDate, 'yyyy-MM-dd')] || [] }
    : partidosGrouped;

  const datesToRender = Object.keys(filteredGroups).filter(date => filteredGroups[date].length > 0);

  return (
    <div className="mt-4">
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Lado Izquierdo: Calendario */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 sticky top-24">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base sm:text-lg font-black text-gray-900 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h3>
            <div className="flex gap-1">
              <button onClick={handlePrevMonth} className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={handleNextMonth} className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="text-center text-[10px] sm:text-xs font-bold text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-14 sm:h-20"></div>
            ))}
            
            {daysInMonth.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayMatches = partidosGrouped[dateStr] || [];
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              
              const dayCategories = Array.from(new Set(dayMatches.map(m => m.id_categoria || m.categoria?.id_categoria))).filter(Boolean);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={`
                    h-14 sm:h-20 flex flex-col items-center justify-start pt-2 sm:pt-3 rounded-xl transition-all relative
                    ${isSelected ? 'bg-primary-600 text-white shadow-md' : 'hover:bg-gray-50 text-gray-700'}
                    ${isCurrentDay && !isSelected ? 'text-primary-600 font-bold bg-primary-50/50' : ''}
                  `}
                >
                  <span className={`text-xs sm:text-sm ${isSelected ? 'font-bold' : 'font-medium'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* Dots */}
                  <div className="flex flex-wrap justify-center gap-1 mt-1.5 sm:mt-2 px-1 w-full max-w-full">
                    {dayCategories.slice(0, 4).map(catId => {
                      const color = catColorMap.get(catId as number) || { dot: 'bg-gray-400' };
                      return (
                        <div key={catId as number} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isSelected ? 'bg-white' : color.dot}`} />
                      )
                    })}
                    {dayCategories.length > 4 && (
                      <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-300'}`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          
          {selectedDate && (
            <button 
              onClick={() => setSelectedDate(null)}
              className="mt-6 w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-bold rounded-xl transition-colors border border-gray-200"
            >
              Ver todos los partidos
            </button>
          )}

        </div>

        {/* Lado Derecho: Lista de Partidos */}
        <div className="xl:col-span-7 flex flex-col gap-6 sm:gap-8">
          {datesToRender.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium px-4">No hay partidos programados para esta fecha.</p>
            </div>
          ) : (
            datesToRender.map(dateStr => {
              const dayPartidos = filteredGroups[dateStr];
              const dateObj = new Date(`${dateStr}T12:00:00`); 
              
              return (
                <div key={dateStr} className="flex flex-col gap-3 sm:gap-4">
                  <div className="sticky top-0 z-20 bg-gray-50/90 backdrop-blur-md py-2 px-1 border-b border-gray-200/50 shadow-sm rounded-lg sm:rounded-none sm:shadow-none sm:border-none sm:bg-transparent">
                    <h4 className="text-base sm:text-lg font-black text-gray-900 capitalize flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
                      {format(dateObj, "EEEE, d 'de' MMMM", { locale: es })}
                    </h4>
                  </div>
                  
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {dayPartidos.map((partido) => {
                      const isFinalizado = partido.estado.includes('finalizado');
                      const catId = partido.id_categoria || partido.categoria?.id_categoria;
                      const catColor = catColorMap.get(catId) || { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-700' };
                      
                      return (
                        <div
                          key={partido.id_partido || partido.id}
                          className={`flex flex-col rounded-2xl border bg-white overflow-hidden transition-all duration-300 ${
                            isFinalizado 
                              ? 'border-gray-200 shadow-sm hover:shadow-md' 
                              : 'border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] ring-1 ring-emerald-50 relative'
                          }`}
                        >
                          {/* Encabezado */}
                          <div className={`flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 sm:py-2.5 gap-2 sm:gap-0 ${isFinalizado ? 'bg-gray-50 border-b border-gray-100' : 'bg-emerald-50/50 border-b border-emerald-100'}`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${isFinalizado ? 'text-gray-500' : 'text-emerald-700'}`}>
                                {partido.fase || 'Fase Regular'}
                              </span>
                              
                              {partido.categoria?.nombre_categoria && (
                                <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${catColor.bg} ${catColor.border} ${catColor.text}`}>
                                  {partido.categoria.nombre_categoria}
                                </span>
                              )}

                              {partido.ubicacion && (
                                <>
                                  <span className={isFinalizado ? 'text-gray-300 hidden sm:inline' : 'text-emerald-200 hidden sm:inline'}>•</span>
                                  <span className={`text-[10px] sm:text-xs font-medium truncate max-w-[150px] sm:max-w-none ${isFinalizado ? 'text-gray-500' : 'text-emerald-600'}`}>
                                    📍 {partido.ubicacion}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className={`self-start sm:self-auto flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0 ${
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

                          {/* Cuerpo */}
                          <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 gap-4">
                            
                            {/* Equipo Local (Logo Izquierda, Nombre Derecha) */}
                            <Link 
                              to={`/equipos/${partido.equipo_local?.id_equipo}`}
                              className="group flex-1 flex flex-row items-center justify-start sm:justify-end w-full gap-3 text-left sm:text-right"
                            >
                              <div className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
                                {partido.equipo_local?.url_logo ? (
                                  <img src={partido.equipo_local.url_logo} alt="Logo Local" className="w-full h-full object-contain" />
                                ) : (
                                  <div className="w-full h-full bg-primary-50 text-primary-700 flex items-center justify-center font-black text-xs sm:text-sm uppercase rounded-full">
                                    {(partido.equipo_local?.nombre || partido.equipo_local?.nombre_equipo || 'L').substring(0, 2)}
                                  </div>
                                )}
                              </div>
                              <span className="font-extrabold text-gray-900 group-hover:text-primary-700 transition-colors duration-200 text-base sm:text-xl line-clamp-2 flex-1 sm:flex-none">
                                {partido.equipo_local?.nombre || partido.equipo_local?.nombre_equipo || 'Equipo Local'}
                              </span>
                            </Link>

                            {/* Centro: Marcador o Hora */}
                            <div className="flex flex-col items-center justify-center shrink-0 w-full sm:w-auto z-10 mx-0 sm:mx-2 my-2 sm:my-0">
                              <div className={`flex flex-col items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl min-w-[100px] sm:min-w-[120px] transition-transform ${
                                isFinalizado ? 'bg-gray-50 border border-gray-200' : 'bg-white border border-emerald-200 shadow-md transform hover:scale-105'
                              }`}>
                                {isFinalizado ? (
                                  <span className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter">
                                    {partido.marcador_local} <span className="text-gray-300 font-light px-1">-</span> {partido.marcador_visitante}
                                  </span>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <span className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider">Hora</span>
                                    <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
                                      {partido.fecha_hora ? new Date(partido.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : partido.hora?.slice(0, 5)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {isFinalizado && (partido.id_partido || partido.id) && (
                                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                                  <button
                                    onClick={() => setSelectedMatch(partido)}
                                    className="flex items-center gap-1 sm:gap-1.5 text-2xs sm:text-xs font-bold text-primary-700 hover:text-white transition-colors bg-primary-50 hover:bg-primary-600 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-primary-100 hover:border-primary-600"
                                  >
                                    <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    Estadísticas
                                  </button>
                                  {partido.url_planilla_fiba && (
                                    <a
                                      href={partido.url_planilla_fiba}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 sm:gap-1.5 text-2xs sm:text-xs font-bold text-gray-600 hover:text-white transition-colors bg-gray-50 hover:bg-gray-800 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-gray-200 hover:border-gray-800"
                                    >
                                      <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                      Acta
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Equipo Visitante (Nombre Izquierda, Logo Derecha) */}
                            <Link 
                              to={`/equipos/${partido.equipo_visitante?.id_equipo}`}
                              className="group flex-1 flex flex-row items-center justify-start w-full gap-3 text-left"
                            >
                              <span className="font-extrabold text-gray-900 group-hover:text-primary-700 transition-colors duration-200 text-base sm:text-xl line-clamp-2 flex-1 sm:flex-none">
                                {partido.equipo_visitante?.nombre || partido.equipo_visitante?.nombre_equipo || 'Equipo Visitante'}
                              </span>
                              <div className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
                                {partido.equipo_visitante?.url_logo ? (
                                  <img src={partido.equipo_visitante.url_logo} alt="Logo Visitante" className="w-full h-full object-contain" />
                                ) : (
                                  <div className="w-full h-full bg-primary-50 text-primary-700 flex items-center justify-center font-black text-xs sm:text-sm uppercase rounded-full">
                                    {(partido.equipo_visitante?.nombre || partido.equipo_visitante?.nombre_equipo || 'V').substring(0, 2)}
                                  </div>
                                )}
                              </div>
                            </Link>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
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
