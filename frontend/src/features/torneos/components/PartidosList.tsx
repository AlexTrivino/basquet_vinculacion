import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getPartidosByTorneo } from '../api/torneos.api';
import { Calendar as CalendarIcon, FileText, Activity, ChevronLeft, ChevronRight, MapPin, Shield } from 'lucide-react';
import { BoxScoreModal } from '../../partidos/components/BoxScoreModal';
import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface PartidosListProps {
  torneoId: string;
  idCategoria?: number;
  urlCalendario?: string;
  categorias?: any[];
}

// Colores de categoría: puntos del calendario y su leyenda. Tonos claros que se leen sobre marino.
const COLORES = ['bg-red-300', 'bg-emerald-300', 'bg-sky-300', 'bg-amber-300', 'bg-purple-300', 'bg-pink-300', 'bg-cyan-300', 'bg-orange-300'];
export const colorCategoria = (indice: number) => ({ punto: COLORES[indice % COLORES.length] });

// Paralelogramo del cartel: boletos de partido
const DIAGONAL = '[clip-path:polygon(2.5%_0,100%_0,97.5%_100%,0_100%)]';
const nombre = (e: any, defecto: string) => e?.nombre || e?.nombre_equipo || defecto;

// Medallón claro para los escudos (los logos en silueta negra se leen sobre marino)
export function Escudo({ url, className = 'h-12 w-12' }: { url?: string | null; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-white to-slate-200 shadow-md shadow-black/40 ring-2 ring-oro/40 ${className}`}>
      {url ? (
        <img src={url} alt="" loading="lazy" className="h-[76%] w-[76%] object-contain" />
      ) : (
        <Shield className="h-1/2 w-1/2 text-slate-400" aria-hidden="true" />
      )}
    </span>
  );
}

function Equipo({ equipo, defecto, lado, atenuado }: { equipo: any; defecto: string; lado: 'local' | 'visitante'; atenuado: boolean }) {
  const posicion =
    lado === 'local'
      ? 'col-start-1 row-start-1 sm:justify-end sm:text-right'
      : 'col-start-1 row-start-2 sm:col-start-3 sm:row-start-1 sm:flex-row-reverse sm:justify-end sm:text-left';
  return (
    <Link to={`/equipos/${equipo?.id_equipo}`} className={`group flex min-w-0 items-center gap-3 ${posicion}`}>
      <Escudo url={equipo?.url_logo} className={`h-10 w-10 transition-transform duration-200 group-hover:scale-110 sm:h-12 sm:w-12 ${lado === 'local' ? 'sm:order-2' : ''}`} />
      <span
        className={`line-clamp-2 min-w-0 text-sm font-bold uppercase leading-snug transition-colors group-hover:text-white sm:text-base ${
          atenuado ? 'text-slate-400' : 'text-crema'
        }`}
      >
        {nombre(equipo, defecto)}
      </span>
    </Link>
  );
}

export function PartidosList({ torneoId, idCategoria, urlCalendario, categorias = [] }: PartidosListProps) {
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['torneos', torneoId, 'partidos', idCategoria],
    queryFn: () => getPartidosByTorneo(torneoId, 1, 1000, idCategoria),
  });

  const rawPartidos = response?.data || [];

  const indiceCategoria = useMemo(() => {
    const map = new Map<number, number>();
    categorias.forEach((cat, i) => map.set(cat.id_categoria || cat.id, i));
    return map;
  }, [categorias]);

  const partidosSorted = useMemo(
    () =>
      [...rawPartidos].sort(
        (a: any, b: any) => new Date(`${a.fecha}T${a.hora || '00:00'}`).getTime() - new Date(`${b.fecha}T${b.hora || '00:00'}`).getTime()
      ),
    [rawPartidos]
  );

  const partidosGrouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    partidosSorted.forEach((p) => (groups[p.fecha || 'Sin fecha'] ??= []).push(p));
    return groups;
  }, [partidosSorted]);

  // El próximo partido por jugar se destaca en oro
  const idProximo = useMemo(() => {
    const hoy = format(new Date(), 'yyyy-MM-dd');
    const p = partidosSorted.find((x: any) => (x.estado === 'programado' || x.estado === 'en_curso') && (x.fecha ?? '') >= hoy);
    return p ? p.id_partido || p.id : null;
  }, [partidosSorted]);

  // El calendario abre en el mes del próximo partido (o del último jugado), no en un mes vacío
  const mesInicial = useMemo(() => {
    const ref = partidosSorted.find((x: any) => (x.id_partido || x.id) === idProximo) ?? partidosSorted.at(-1);
    return ref?.fecha ? parseISO(ref.fecha) : new Date();
  }, [partidosSorted, idProximo]);
  const mes = currentMonth ?? mesInicial;

  const daysInMonth = useMemo(() => eachDayOfInterval({ start: startOfMonth(mes), end: endOfMonth(mes) }), [mes]);

  const enlaceCalendario = urlCalendario && (
    <a
      href={urlCalendario}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-oro/50 px-4 py-2.5 text-sm font-semibold text-oro transition-colors hover:bg-oro hover:text-marino"
    >
      <FileText className="h-4 w-4" aria-hidden="true" />
      Ver calendario (archivo)
    </a>
  );

  if (isError) {
    return <p className="py-8 text-center text-red-300">No pudimos cargar el calendario de partidos.</p>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 w-full rounded-xl bg-white/10 motion-safe:animate-pulse" />
        ))}
      </div>
    );
  }

  if (rawPartidos.length === 0) {
    return (
      <div>
        {enlaceCalendario && <div className="mb-6 flex justify-end">{enlaceCalendario}</div>}
        <div className="rounded-xl border border-dashed border-oro/30 px-6 py-16 text-center">
          <CalendarIcon className="mx-auto mb-3 h-10 w-10 text-oro/70" aria-hidden="true" />
          <h3 className="font-display text-xl font-bold text-crema">Calendario no disponible</h3>
          <p className="mt-2 text-slate-400">El calendario de partidos se publicará próximamente.</p>
        </div>
      </div>
    );
  }

  const claveSeleccion = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const datesToRender = claveSeleccion ? (partidosGrouped[claveSeleccion] ? [claveSeleccion] : []) : Object.keys(partidosGrouped);

  return (
    <div>
      {enlaceCalendario && <div className="mb-6 flex justify-end">{enlaceCalendario}</div>}

      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:gap-10">
        {/* ─── Calendario del mes (obligatorio): a la derecha en escritorio, arriba en móvil ─── */}
        <aside className="rounded-xl border border-oro/30 bg-marino-claro/80 p-4 shadow-xl shadow-black/30 backdrop-blur-sm sm:p-5 xl:sticky xl:top-40 xl:order-2">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold capitalize text-crema">{format(mes, 'MMMM yyyy', { locale: es })}</h3>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => setCurrentMonth(subMonths(mes, 1))}
                className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() => setCurrentMonth(addMonths(mes, 1))}
                className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
              <div key={d} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startOfMonth(mes).getDay() }).map((_, i) => (
              <div key={`vacio-${i}`} className="h-12 sm:h-14" />
            ))}
            {daysInMonth.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayMatches = partidosGrouped[dateStr] || [];
              const isSelected = !!selectedDate && isSameDay(day, selectedDate);
              const hoy = isToday(day);
              const dayCategories = Array.from(new Set(dayMatches.map((m) => m.id_categoria || m.categoria?.id_categoria))).filter(Boolean);

              return (
                <button
                  key={dateStr}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${format(day, "d 'de' MMMM", { locale: es })}${dayMatches.length ? `, ${dayMatches.length} partidos` : ''}`}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={`flex h-12 flex-col items-center justify-start rounded-lg pt-1.5 text-sm tabular-nums transition-colors sm:h-14 sm:pt-2 ${
                    isSelected
                      ? 'bg-oro font-bold text-marino'
                      : dayMatches.length
                        ? 'font-semibold text-crema hover:bg-white/10'
                        : 'text-slate-500 hover:bg-white/5'
                  } ${hoy && !isSelected ? 'ring-1 ring-inset ring-celeste' : ''}`}
                >
                  {format(day, 'd')}
                  <span className="mt-1 flex flex-wrap justify-center gap-0.5 px-0.5">
                    {dayCategories.slice(0, 4).map((catId) => (
                      <span
                        key={catId as number}
                        className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-marino' : colorCategoria(indiceCategoria.get(catId as number) ?? 0).punto}`}
                      />
                    ))}
                    {dayCategories.length > 4 && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-marino' : 'bg-slate-400'}`} />}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="mt-5 w-full rounded-lg border border-white/15 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
            >
              Ver todos los partidos
            </button>
          )}
        </aside>

        {/* ─── Partidos agrupados por día, como boletos del cartel ─── */}
        <div className="flex flex-col gap-10">
          {datesToRender.length === 0 ? (
            <div className="rounded-xl border border-dashed border-oro/30 px-6 py-12 text-center">
              <CalendarIcon className="mx-auto mb-3 h-10 w-10 text-oro/70" aria-hidden="true" />
              <p className="text-slate-400">No hay partidos programados para esta fecha.</p>
            </div>
          ) : (
            datesToRender.map((dateStr) => (
              <div key={dateStr}>
                <h4 className="mb-4 flex items-baseline gap-3">
                  <span className="font-display text-xl font-bold text-crema first-letter:uppercase">
                    {dateStr === 'Sin fecha' ? 'Sin fecha' : format(new Date(`${dateStr}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })}
                  </span>
                  <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-oro/60 to-transparent" />
                </h4>

                <div className="flex flex-col gap-3">
                  {partidosGrouped[dateStr].map((partido) => {
                    const idPartido = partido.id_partido || partido.id;
                    const finalizado = partido.estado.includes('finalizado');
                    const wo = partido.estado === 'finalizado_wo';
                    const proximo = idPartido === idProximo;
                    const ml = partido.marcador_local ?? 0;
                    const mv = partido.marcador_visitante ?? 0;
                    const catId = partido.id_categoria || partido.categoria?.id_categoria;
                    const hora = partido.fecha_hora
                      ? new Date(partido.fecha_hora).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
                      : partido.hora?.slice(0, 5);

                    return (
                      <article
                        key={idPartido}
                        className={`${DIAGONAL} p-px ${proximo ? 'bg-oro shadow-[0_0_28px_rgb(214_179_106/0.25)]' : 'bg-oro/40'}`}
                      >
                        <div className={`${DIAGONAL} bg-marino-claro px-7 py-4 sm:px-10 sm:py-5`}>
                          {/* Encabezado: fase, categoría, lugar y estado */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                            {proximo && <span className="font-bold uppercase tracking-[0.18em] text-oro">Próximo partido</span>}
                            <span className="font-semibold uppercase tracking-widest">{partido.fase || 'Fase regular'}</span>
                            {partido.categoria?.nombre_categoria && (
                              <span className="inline-flex items-center gap-1.5 text-slate-300">
                                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${colorCategoria(indiceCategoria.get(catId) ?? 0).punto}`} />
                                {partido.categoria.nombre_categoria}
                                {partido.categoria.genero_categoria ? ` (${partido.categoria.genero_categoria})` : ''}
                              </span>
                            )}
                            {partido.ubicacion && (
                              <span className="hidden items-center gap-1 sm:inline-flex">
                                <MapPin className="h-3.5 w-3.5 text-oro" aria-hidden="true" />
                                {partido.ubicacion}
                              </span>
                            )}
                            <span className={`ml-auto font-semibold uppercase tracking-wider ${finalizado ? 'text-slate-500' : 'text-celeste'}`}>
                              {wo ? 'Ganado por W.O.' : partido.estado.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Cuerpo: en móvil equipos en dos filas y marcador a la derecha; desde sm, local · marcador · visitante */}
                          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-x-6">
                            <Equipo equipo={partido.equipo_local} defecto="Equipo local" lado="local" atenuado={finalizado && ml < mv} />

                            <div className="col-start-2 row-span-2 row-start-1 flex flex-col items-center sm:row-span-1">
                              {finalizado ? (
                                <p className="flex flex-col items-center font-display text-2xl font-black leading-tight tabular-nums sm:flex-row sm:gap-3 sm:text-3xl">
                                  <span className={ml >= mv ? 'text-crema' : 'text-slate-500'}>{ml}</span>
                                  <span aria-hidden="true" className="hidden text-slate-600 sm:inline">-</span>
                                  <span className={mv >= ml ? 'text-crema' : 'text-slate-500'}>{mv}</span>
                                </p>
                              ) : (
                                <p className="font-display text-2xl font-black tabular-nums text-celeste sm:text-3xl">{hora || 'Por definir'}</p>
                              )}
                              {finalizado && idPartido && (
                                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedMatch(partido)}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-celeste transition-colors hover:bg-white/10 hover:text-white"
                                  >
                                    <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                                    Estadísticas
                                  </button>
                                  {partido.url_planilla_fiba && (
                                    <a
                                      href={partido.url_planilla_fiba}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                                    >
                                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                      Acta
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>

                            <Equipo equipo={partido.equipo_visitante} defecto="Equipo visitante" lado="visitante" atenuado={finalizado && mv < ml} />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedMatch && (
        <BoxScoreModal
          idPartido={(selectedMatch.id_partido || selectedMatch.id) as number}
          equipoLocal={nombre(selectedMatch.equipo_local, 'Local')}
          equipoVisitante={nombre(selectedMatch.equipo_visitante, 'Visitante')}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
