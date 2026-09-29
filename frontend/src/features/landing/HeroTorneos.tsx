import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, CalendarDays, Pause, Play } from 'lucide-react';
import { getTorneos } from '../torneos/api/torneos.api';
import type { Torneo } from '../../types/api.types';

const MAX_TORNEOS = 8;
// Diagonal de la card (paralelogramo); en móvil el ticket usa una diagonal más corta
const DIAGONAL = '[clip-path:polygon(6%_0,100%_0,94%_100%,0_100%)]';
const DIAGONAL_TICKET = '[clip-path:polygon(4%_0,100%_0,96%_100%,0_100%)]';

function rangoFechas(torneo: Torneo): string {
  if (!torneo.fecha_inicio || !torneo.fecha_fin) return 'Fechas por confirmar';
  const inicio = parseISO(torneo.fecha_inicio);
  const fin = parseISO(torneo.fecha_fin);
  const formatoInicio = inicio.getFullYear() === fin.getFullYear() ? 'd MMM' : 'd MMM yyyy';
  return `${format(inicio, formatoInicio, { locale: es })} - ${format(fin, 'd MMM yyyy', { locale: es })}`;
}

function SlideTorneo({ torneo }: { torneo: Torneo }) {
  const categorias = torneo.categorias ?? [];

  return (
    <article className="aparecer">
      <h2 className="text-balance font-display text-3xl font-bold leading-tight text-crema sm:text-4xl">
        {torneo.nombre || torneo.nombre_torneo}
      </h2>
      <p className="mt-4 flex items-center gap-2 tabular-nums text-slate-300">
        <CalendarDays className="h-4 w-4 text-oro" aria-hidden="true" />
        {rangoFechas(torneo)}
      </p>

      {categorias.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Categorías">
          {categorias.map((c) => (
            <li
              key={c.id_categoria ?? c.nombre_categoria}
              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200"
            >
              {c.nombre_categoria || c.nombre}
            </li>
          ))}
        </ul>
      )}

      <Link
        to={`/torneos/${torneo.id_torneo ?? torneo.id}`}
        className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-celeste transition-colors hover:text-white"
      >
        Ver torneo <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

// Móvil: ticket compacto del torneo. El carril deja ver el siguiente para invitar a deslizar.
function TicketTorneo({ torneo, indice }: { torneo: Torneo; indice: number }) {
  return (
    <Link
      to={`/torneos/${torneo.id_torneo ?? torneo.id}`}
      data-ticket={indice}
      className={`${DIAGONAL_TICKET} flex w-[84%] shrink-0 snap-center bg-oro/55 p-px`}
    >
      <div className={`${DIAGONAL_TICKET} flex min-h-[8.5rem] w-full flex-col bg-marino-claro px-7 py-4`}>
        <p className="line-clamp-2 font-display text-xl font-bold leading-tight text-crema">
          {torneo.nombre || torneo.nombre_torneo}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-[13px]">
          <span className="tabular-nums text-slate-300">{rangoFechas(torneo)}</span>
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-celeste">
            Ver torneo <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function HeroTorneos() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['torneos', 'public', 'todos'],
    queryFn: () => getTorneos(1, 50),
  });
  const torneos = (data?.data ?? []).slice(0, MAX_TORNEOS);
  const total = torneos.length;

  const [indice, setIndice] = useState(0);
  // Con "reducir movimiento" el carrusel arranca en pausa; el botón permite reanudarlo
  const [pausado, setPausado] = useState(
    () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const actual = total > 0 ? torneos[indice % total] : undefined;

  // Carril móvil: al cambiar el torneo activo (10 s, puntos) se desplaza solo en horizontal, sin mover la página.
  // Mientras ese desplazamiento ocurre se ignora al observador, que si no marcaría los tickets intermedios.
  const carril = useRef<HTMLDivElement>(null);
  const desplazando = useRef(false);
  useEffect(() => {
    const el = carril.current;
    const ticket = el?.querySelector<HTMLElement>(`[data-ticket="${indice % Math.max(total, 1)}"]`);
    if (!el || !ticket) return;
    desplazando.current = true;
    el.scrollLeft = ticket.offsetLeft - el.offsetLeft - 16; // 16 px = padding del carril (scroll-smooth vía CSS)
    const t = window.setTimeout(() => (desplazando.current = false), 700);
    return () => window.clearTimeout(t);
  }, [indice, total]);

  useEffect(() => {
    const el = carril.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (desplazando.current) return;
        for (const e of entradas) if (e.isIntersecting) setIndice(Number((e.target as HTMLElement).dataset.ticket));
      },
      { root: el, threshold: 0.75 }
    );
    el.querySelectorAll('[data-ticket]').forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [total]);

  const estado: ReactNode = isLoading ? (
    <div className="space-y-4" aria-busy="true">
      <div className="h-6 w-28 motion-safe:animate-pulse rounded-full bg-white/10" />
      <div className="h-10 w-3/4 motion-safe:animate-pulse rounded bg-white/10" />
      <div className="h-5 w-1/2 motion-safe:animate-pulse rounded bg-white/10" />
    </div>
  ) : isError ? (
    <div className="text-slate-300">
      <p>No pudimos cargar los torneos. Revisa tu conexión e inténtalo de nuevo.</p>
      <button
        type="button"
        onClick={() => refetch()}
        className="mt-4 rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
      >
        Reintentar
      </button>
    </div>
  ) : total === 0 ? (
    <p className="text-slate-300">Aún no hay torneos publicados.</p>
  ) : null;

  return (
    <section id="inicio" className="relative z-10 isolate scroll-mt-16 overflow-hidden">
      {/* Fondo: foto del coliseo con zoom lento infinito y blur sutil.
          Móvil: la foto ocupa la parte alta y se funde hacia abajo. lg+: a sangre con velo lateral y máscara inferior. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[27rem] overflow-hidden lg:inset-0 lg:h-auto lg:[mask-image:linear-gradient(to_bottom,black_calc(100%-10rem),transparent)]"
      >
        <img
          src="/img/hero-coliseo.jpg"
          alt=""
          className="hero-zoom h-full w-full object-cover object-[62%_55%] blur-[1px] lg:object-center lg:blur-[3px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-marino/15 via-marino/40 to-marino lg:hidden" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-marino via-marino/80 to-marino/35 lg:block" />
      </div>

      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl content-start gap-8 px-4 pb-12 pt-[clamp(8rem,24svh,12rem)] sm:px-6 lg:grid-cols-[1fr_1.3fr] lg:content-center lg:items-center lg:gap-12 lg:px-8 lg:py-20">
        <div className="max-w-xl">
          <h1 className="text-balance font-display text-[2.4rem] font-bold leading-[1.02] text-crema [text-shadow:0_2px_12px_rgb(0_0_0/0.45)] sm:text-6xl lg:leading-tight lg:[text-shadow:none]">
            Torneos Baloncesto Manta
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300 lg:mt-5 lg:text-lg">
            <span className="hidden lg:inline">La comunidad de baloncesto que reúne a exalumnos de todo Manabí. </span>
            Desde 2019 reactivando el baloncesto de la ciudad.
          </p>
          <div className="mt-5 flex items-center gap-5 lg:mt-8 lg:flex-wrap lg:gap-3">
            <a
              href="#partidos"
              className="flex-1 rounded-lg bg-celeste px-5 py-3.5 text-center text-sm font-semibold text-marino transition-colors hover:bg-white active:scale-[0.98] lg:flex-none lg:py-3"
            >
              Ver partidos
            </a>
            <a
              href="#conocenos"
              className="border-b border-oro/60 pb-0.5 text-sm font-semibold text-crema transition-colors hover:text-white lg:rounded-lg lg:border lg:border-white/25 lg:px-5 lg:py-3 lg:text-white lg:hover:bg-white/10"
            >
              Conócenos
            </a>
          </div>
        </div>

        {/* Carrusel de torneos: card diagonal que cambia cada 10 s (lg+) o carril de tickets deslizables (móvil) */}
        <div aria-roledescription="carrusel" aria-label="Torneos" className="min-w-0">
          <div className={`${DIAGONAL} hidden bg-oro/55 p-px lg:block`}>
            <div
              className={`${DIAGONAL} min-h-[22rem] bg-marino-claro/90 px-12 py-10 sm:px-16 sm:py-12`}
              aria-live={pausado ? 'polite' : 'off'}
            >
              {estado ?? (actual && <SlideTorneo key={indice % total} torneo={actual} />)}
            </div>
          </div>

          {estado ? (
            <div className="rounded-lg border border-oro/40 bg-marino-claro p-6 lg:hidden">{estado}</div>
          ) : (
            <div
              ref={carril}
              className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 motion-safe:scroll-smooth [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden [&::-webkit-scrollbar]:hidden"
            >
              {torneos.map((t, i) => (
                <TicketTorneo key={t.id_torneo ?? t.id ?? i} torneo={t} indice={i} />
              ))}
            </div>
          )}

          {total > 1 && (
            <div className="mt-5 flex items-center gap-4 lg:mt-6 lg:px-8">
              <button
                type="button"
                onClick={() => setPausado((p) => !p)}
                aria-label={pausado ? 'Reanudar carrusel' : 'Pausar carrusel'}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-slate-200 transition-colors hover:bg-white/10"
              >
                {pausado ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
              <div className="flex">
                {torneos.map((t, i) => (
                  // El botón da un área táctil de 24 px; el punto visible va dentro
                  <button
                    key={t.id_torneo ?? t.id ?? i}
                    type="button"
                    onClick={() => setIndice(i)}
                    aria-label={`Ver ${t.nombre || t.nombre_torneo}`}
                    aria-current={i === indice % total}
                    className="group flex h-6 items-center px-1"
                  >
                    <span
                      className={`block h-2 rounded-full transition-all ${
                        i === indice % total ? 'w-8 bg-celeste' : 'w-2 bg-white/30 group-hover:bg-white/60'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {/* La barra marca los 10 s y, al terminar, pasa al siguiente torneo */}
              <div className="h-0.5 flex-1 overflow-hidden rounded bg-white/10">
                <span
                  key={indice}
                  data-testid="progreso-carrusel"
                  onAnimationEnd={() => setIndice((i) => (i + 1) % total)}
                  className="block h-full origin-left bg-celeste [animation:progreso-slide_10s_linear_both]"
                  style={{ animationPlayState: pausado ? 'paused' : 'running' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
