import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Shield, Trophy } from 'lucide-react';
import { getPartidos } from '../partidos/api/partidos.api';
import type { Equipo, Partido } from '../../types/api.types';

const INICIALES = 4; // tarjetas visibles antes de "Ver más"
const PASO = 4; // cuántas agrega cada "Ver más"
const POR_PAGINA = 50; // máximo que acepta el API
const MAX_PUNTOS = 8; // con más tarjetas, el carrusel móvil muestra "3 de 12" en vez de puntos
const COLUMNAS = 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-3';

function nombreEquipo(equipo?: Equipo): string {
  return equipo?.nombre_equipo || equipo?.nombre || 'Por definir';
}

// Esquinas en L del cartel (tarjetas de partido y CTA)
export function Esquinas() {
  const base = 'absolute h-4 w-4 border-oro/40';
  return (
    <>
      <span aria-hidden="true" className={`${base} left-3 top-3 border-l border-t`} />
      <span aria-hidden="true" className={`${base} right-3 top-3 border-r border-t`} />
      <span aria-hidden="true" className={`${base} bottom-3 left-3 border-b border-l`} />
      <span aria-hidden="true" className={`${base} bottom-3 right-3 border-b border-r`} />
    </>
  );
}

// Medallón claro: los logos en silueta negra se leen sobre el fondo oscuro. Se encoge con su columna.
function Medallon({ equipo }: { equipo?: Equipo }) {
  return (
    <div className="mx-auto flex aspect-square w-full max-w-[5.5rem] items-center justify-center rounded-full bg-gradient-to-b from-white to-slate-200 p-[14%] shadow-lg shadow-black/40 ring-2 ring-oro/40 sm:max-w-[8rem]">
      {equipo?.url_logo ? (
        <img src={equipo.url_logo} alt="" loading="lazy" className="h-full w-full object-contain" />
      ) : (
        <Shield className="h-1/2 w-1/2 text-slate-400" aria-hidden="true" />
      )}
    </div>
  );
}

// En un resultado ambos lados reservan el alto de la cinta GANADOR para que los nombres queden alineados
function NombreEquipo({ equipo, finalizado, gano }: { equipo?: Equipo; finalizado: boolean; gano: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 self-start text-center">
      {finalizado && (
        <span
          aria-hidden={!gano || undefined}
          className={`inline-flex items-center gap-1 rounded-full bg-oro px-2.5 py-0.5 font-display text-[10px] font-bold tracking-widest text-marino ${gano ? '' : 'invisible'}`}
        >
          <Trophy className="h-3 w-3" aria-hidden="true" />
          GANADOR
        </span>
      )}
      <p className="line-clamp-2 max-w-full text-balance break-words font-display text-base font-bold leading-snug text-crema sm:text-lg">
        {nombreEquipo(equipo)}
      </p>
    </div>
  );
}

function TarjetaPartido({ partido }: { partido: Partido }) {
  const finalizado = partido.estado === 'finalizado' || partido.estado === 'finalizado_wo';
  // Igual que la tabla de posiciones: con marcadores iguales gana el local
  const ganaLocal = partido.marcador_local >= partido.marcador_visitante;
  const ganador = ganaLocal ? partido.equipo_local : partido.equipo_visitante;
  const categoria = partido.categoria?.nombre_categoria;
  const fecha = partido.fecha ? format(parseISO(partido.fecha), 'EEE d MMM', { locale: es }) : 'Por confirmar';
  const hora = partido.hora?.slice(0, 5);
  const idTorneo = partido.torneo?.id_torneo ?? partido.id_torneo;
  const tanteo = (gana: boolean) => `text-[1.75rem] sm:text-4xl lg:text-5xl ${gana ? 'text-oro' : 'text-crema/55'}`;

  return (
    <Link
      to={idTorneo ? `/torneos/${idTorneo}` : '#partidos'}
      className="group flex flex-col overflow-hidden rounded-xl border border-oro/25 bg-marino-claro/70 shadow-xl shadow-black/30 transition-colors hover:border-oro/60"
    >
      {/* flex-1: en una fila de la grilla la tarjeta más baja estira esta parte y la franja inferior queda abajo */}
      <div className="relative flex-1 bg-[radial-gradient(ellipse_at_20%_30%,rgba(41,169,225,0.18),transparent_55%),radial-gradient(ellipse_at_80%_30%,rgba(214,179,106,0.14),transparent_55%)] px-4 pb-6 pt-12 sm:px-8">
        <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded bg-oro px-2 py-0.5 font-display text-xs font-bold uppercase tabular-nums text-marino">
          {fecha}
        </span>
        <Esquinas />

        {/* Fila 1: escudo · VS o marcador · escudo, sobre un mismo eje. Fila 2: nombres. */}
        <div className={`${COLUMNAS} items-center`}>
          <Medallon equipo={partido.equipo_local} />
          {finalizado ? (
            <p className="flex items-center gap-2 font-display font-bold leading-none tabular-nums">
              <span className={tanteo(ganaLocal)}>{partido.marcador_local}</span>
              <span aria-hidden="true" className="text-2xl text-crema/40 sm:text-3xl">
                -
              </span>
              <span className={tanteo(!ganaLocal)}>{partido.marcador_visitante}</span>
            </p>
          ) : (
            <div className="mx-2 flex h-14 w-14 rotate-45 items-center justify-center border border-oro/70 bg-marino sm:h-16 sm:w-16">
              <span className="-rotate-45 font-display text-lg font-bold text-oro sm:text-xl">VS</span>
            </div>
          )}
          <Medallon equipo={partido.equipo_visitante} />
        </div>
        <div className={`${COLUMNAS} mt-3`}>
          <NombreEquipo equipo={partido.equipo_local} finalizado={finalizado} gano={finalizado && ganaLocal} />
          <span aria-hidden="true" />
          <NombreEquipo equipo={partido.equipo_visitante} finalizado={finalizado} gano={finalizado && !ganaLocal} />
        </div>
      </div>

      <div className="border-t border-oro/20 bg-black/35 px-4 py-4 text-center">
        {finalizado ? (
          <>
            <p className="font-display text-xs font-semibold tracking-[0.25em] text-oro/80">
              GANADOR <span className="text-base tracking-normal text-crema sm:text-lg">{nombreEquipo(ganador)}</span>
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {[partido.estado === 'finalizado_wo' ? 'Victoria por W.O.' : partido.fase, categoria].filter(Boolean).join(' · ')}
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-xs font-semibold tracking-[0.25em] text-oro/80">
              PRÓXIMO PARTIDO
              {hora && <span className="text-base tabular-nums tracking-normal text-crema sm:text-lg"> {hora}</span>}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {[partido.fase, categoria, partido.ubicacion].filter(Boolean).join(' · ')}
            </p>
          </>
        )}
      </div>
    </Link>
  );
}

function usePartidos(estados: string, sort_order: 'asc' | 'desc') {
  return useInfiniteQuery({
    queryKey: ['landing', 'partidos', estados, sort_order],
    queryFn: ({ pageParam }) => getPartidos({ estados, sort_order, per_page: POR_PAGINA, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => {
      const p = ultima.pagination;
      return p && p.page < p.pages ? p.page + 1 : undefined;
    },
  });
}

const reducirMovimiento = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function SeccionPartidos() {
  const proximos = usePartidos('programado', 'asc');
  const resultados = usePartidos('finalizado,finalizado_wo', 'desc');
  const [visibles, setVisibles] = useState(INICIALES);
  const [activa, setActiva] = useState(0);
  const pista = useRef<HTMLDivElement>(null);

  // ponytail: el API no filtra por fecha; los programados ya pasados se descartan aquí
  const hoy = format(new Date(), 'yyyy-MM-dd');
  const listaProximos = (proximos.data?.pages ?? []).flatMap((p) => p.data ?? []).filter((p) => (p.fecha ?? '') >= hoy);
  const listaResultados = (resultados.data?.pages ?? []).flatMap((p) => p.data ?? []);

  // Primero 2 próximos y 2 resultados (si un lado no alcanza, el otro completa); luego el resto de
  // próximos y el resto de resultados. Así las 4 primeras tarjetas no cambian al pulsar "Ver más".
  // ponytail: si hay más de 50 próximos, las páginas siguientes se piden a demanda y se insertan antes
  // de los resultados restantes; paginar el orden combinado en el API si algún torneo llega a eso.
  const nProx = Math.min(listaProximos.length, Math.max(2, INICIALES - listaResultados.length));
  const nRes = Math.min(listaResultados.length, INICIALES - nProx);
  const todos = [
    ...listaProximos.slice(0, nProx),
    ...listaResultados.slice(0, nRes),
    ...listaProximos.slice(nProx),
    ...listaResultados.slice(nRes),
  ];
  const lista = todos.slice(0, visibles);
  const quedanEnServidor = proximos.hasNextPage || resultados.hasNextPage;
  const hayMas = visibles < todos.length || quedanEnServidor;
  const cargandoMas = proximos.isFetchingNextPage || resultados.isFetchingNextPage;

  const cargando = proximos.isLoading || resultados.isLoading;
  const fallo = (proximos.isError || resultados.isError) && todos.length === 0;

  const verMas = () => {
    const siguiente = visibles + PASO;
    setVisibles(siguiente);
    if (siguiente > todos.length) {
      if (proximos.hasNextPage) void proximos.fetchNextPage();
      if (resultados.hasNextPage) void resultados.fetchNextPage();
    }
  };

  const verMenos = () => {
    setVisibles(INICIALES);
    setActiva(0);
    if (pista.current) pista.current.scrollLeft = 0;
    document.getElementById('partidos')?.scrollIntoView({ behavior: reducirMovimiento() ? 'auto' : 'smooth' });
  };

  // Carrusel móvil: la tarjeta que ocupa la vista marca el punto activo (en escritorio es una grilla)
  useEffect(() => {
    const el = pista.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) setActiva(Number((e.target as HTMLElement).dataset.indice));
      },
      { root: el, threshold: 0.6 }
    );
    el.querySelectorAll('[data-indice]').forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [lista.length]);

  const irA = (i: number) => {
    const destino = pista.current?.querySelector<HTMLElement>(`[data-indice="${i}"]`);
    destino?.scrollIntoView({ behavior: reducirMovimiento() ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  };

  const flecha =
    'flex h-10 w-10 items-center justify-center rounded-full border border-oro/40 text-oro transition-colors hover:bg-oro/10 active:scale-95 disabled:opacity-30';

  return (
    <section id="partidos" className="relative z-10 scroll-mt-16 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="text-center">
          <h2 className="font-display text-4xl font-bold tracking-wide text-crema sm:text-6xl">PARTIDOS</h2>
          <p className="mx-auto mt-4 max-w-md font-display text-sm tracking-[0.15em] text-slate-400">
            PRÓXIMOS ENCUENTROS Y RESULTADOS DE NUESTROS TORNEOS
          </p>
        </header>

        <div className="mt-12">
          {cargando ? (
            <div className="grid gap-6 md:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-72 motion-safe:animate-pulse rounded-xl border border-white/10 bg-white/5" />
              ))}
            </div>
          ) : fallo ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
              <p>No pudimos cargar los partidos. Revisa tu conexión e inténtalo de nuevo.</p>
              <button
                type="button"
                onClick={() => {
                  void proximos.refetch();
                  void resultados.refetch();
                }}
                className="mt-4 rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Reintentar
              </button>
            </div>
          ) : todos.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
              Todavía no hay partidos programados ni resultados publicados.
            </p>
          ) : (
            <>
              {/* Móvil: carrusel horizontal con snap (deslizar o tocar puntos/flechas). md+: grilla de 2 columnas. */}
              <div
                ref={pista}
                role="region"
                aria-roledescription="carrusel"
                aria-label="Partidos"
                className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden"
              >
                {lista.map((partido, i) => (
                  <div
                    key={partido.id_partido ?? partido.id ?? i}
                    data-indice={i}
                    aria-label={`Partido ${i + 1} de ${lista.length}`}
                    className="flex w-[86%] shrink-0 snap-center md:w-auto [&>a]:w-full"
                  >
                    <TarjetaPartido partido={partido} />
                  </div>
                ))}
              </div>

              {lista.length > 1 && (
                <div className="mt-6 flex items-center justify-center gap-4 md:hidden">
                  <button type="button" onClick={() => irA(Math.max(0, activa - 1))} disabled={activa === 0} aria-label="Partido anterior" className={flecha}>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  {lista.length <= MAX_PUNTOS ? (
                    <div className="flex">
                      {lista.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => irA(i)}
                          aria-label={`Ver partido ${i + 1}`}
                          aria-current={i === activa}
                          className="flex h-6 items-center px-1"
                        >
                          <span className={`block h-2 rounded-full transition-all ${i === activa ? 'w-6 bg-oro' : 'w-2 bg-white/30'}`} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="min-w-16 text-center text-sm tabular-nums text-slate-300" aria-live="polite">
                      {activa + 1} de {lista.length}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => irA(Math.min(lista.length - 1, activa + 1))}
                    disabled={activa === lista.length - 1}
                    aria-label="Partido siguiente"
                    className={flecha}
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              )}

              {(hayMas || visibles > INICIALES) && (
                <div className="mt-10 flex flex-wrap justify-center gap-3">
                  {hayMas && (
                    <button
                      type="button"
                      onClick={verMas}
                      disabled={cargandoMas}
                      className="rounded-lg bg-celeste px-6 py-3 text-sm font-semibold text-marino transition-colors hover:bg-white active:scale-[0.98] disabled:opacity-60"
                    >
                      {cargandoMas ? 'Cargando…' : 'Ver más partidos'}
                    </button>
                  )}
                  {visibles > INICIALES && (
                    <button
                      type="button"
                      onClick={verMenos}
                      className="rounded-lg border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 active:scale-[0.98]"
                    >
                      Ver menos
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
