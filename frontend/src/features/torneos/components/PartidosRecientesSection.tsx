import { useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Activity, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import axiosInstance from '../../../api/axios.config';
import type { ApiResponse, Partido } from '../../../types/api.types';
import { Skeleton } from '../../../components/Skeleton';

function formatearFechaPartido(fechaStr?: string): string {
  if (!fechaStr) return '';
  try {
    const d = new Date(fechaStr + 'T00:00:00');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return fechaStr;
  }
}

export function PartidosRecientesSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { data: response, isLoading } = useQuery<ApiResponse<Partido[]>>({
    queryKey: ['partidos-recientes-home'],
    queryFn: async () => {
      const res = await axiosInstance.get('/partidos', {
        params: { page: 1, per_page: 12 },
      });
      return res.data;
    },
  });

  const partidos = response?.data || [];

  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);
      window.addEventListener('resize', updateScrollButtons);
      return () => {
        container.removeEventListener('scroll', updateScrollButtons);
        window.removeEventListener('resize', updateScrollButtons);
      };
    }
  }, [partidos]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mt-16">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-6 h-6 rounded-md" />
          <Skeleton className="w-64 h-8 rounded-lg" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-44 w-[300px] sm:w-[330px] shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (partidos.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 pt-12 border-t border-gray-200/80">
      {/* Cabecera con Título y Flechas de Navegación del Carrusel */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Próximos Partidos y Resultados Recientes
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-gray-500">
              Desliza horizontalmente para ver la actividad de los encuentros
            </p>
          </div>
        </div>

        {/* Controles de Navegación del Carrusel */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            aria-label="Desplazar partidos a la izquierda"
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            aria-label="Desplazar partidos a la derecha"
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Contenedor Carrusel Horizontal */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth focus:outline-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {partidos.map((partido) => {
          const partidoId = partido.id_partido || partido.id;
          const estado = partido.estado;
          const esFinalizado = estado === 'finalizado';
          const esEnCurso = estado === 'en_curso';

          const nomLocal = partido.equipo_local?.nombre_equipo || partido.equipo_local?.nombre || 'Equipo Local';
          const nomVisita = partido.equipo_visitante?.nombre_equipo || partido.equipo_visitante?.nombre || 'Equipo Visitante';

          const localGano = esFinalizado && partido.marcador_local > partido.marcador_visitante;
          const visitaGano = esFinalizado && partido.marcador_visitante > partido.marcador_local;

          return (
            <div
              key={partidoId}
              className="w-[290px] sm:w-[330px] shrink-0 snap-start relative flex flex-col justify-between rounded-2xl bg-white border border-gray-200/80 p-5 shadow-sm hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Header: Fase y Estado */}
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100 text-xs">
                <span className="font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-md truncate max-w-[60%]">
                  {partido.fase || 'Fase Regular'}
                </span>

                <div>
                  {esEnCurso && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-black text-[10px] bg-red-50 text-red-600 border border-red-200 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                      EN VIVO
                    </span>
                  )}
                  {esFinalizado && (
                    <span className="font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md text-[11px]">
                      Finalizado
                    </span>
                  )}
                  {!esEnCurso && !esFinalizado && (
                    <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-[11px]">
                      Programado
                    </span>
                  )}
                </div>
              </div>

              {/* Equipos y Marcadores */}
              <div className="space-y-3 my-1">
                {/* Equipo Local */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                      <Shield className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span className={`text-sm truncate ${localGano ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                      {nomLocal}
                    </span>
                  </div>
                  {esFinalizado || esEnCurso ? (
                    <span className={`text-lg font-black shrink-0 ${localGano ? 'text-primary-700 font-extrabold' : 'text-gray-600'}`}>
                      {partido.marcador_local}
                    </span>
                  ) : null}
                </div>

                {/* Equipo Visitante */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                      <Shield className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span className={`text-sm truncate ${visitaGano ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                      {nomVisita}
                    </span>
                  </div>
                  {esFinalizado || esEnCurso ? (
                    <span className={`text-lg font-black shrink-0 ${visitaGano ? 'text-primary-700 font-extrabold' : 'text-gray-600'}`}>
                      {partido.marcador_visitante}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Footer: Ubicación y Fecha */}
              <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-semibold text-gray-400">
                <div className="flex items-center gap-1 truncate max-w-[60%]">
                  <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="truncate">{partido.ubicacion || 'Coliseo Pablo Delgado'}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-gray-500">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  <span>{formatearFechaPartido(partido.fecha)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
