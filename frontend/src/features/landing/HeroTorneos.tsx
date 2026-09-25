import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, CalendarDays, Pause, Play } from 'lucide-react';
import { getTorneos } from '../torneos/api/torneos.api';
import type { Torneo } from '../../types/api.types';

const MAX_TORNEOS = 8;
const ESTADOS: Record<string, string> = {
  en_curso: 'En curso',
  programado: 'Próximamente',
  finalizado: 'Finalizado',
};
// Diagonal de la card (paralelogramo)
const DIAGONAL = '[clip-path:polygon(6%_0,100%_0,94%_100%,0_100%)]';

function rangoFechas(torneo: Torneo): string {
  if (!torneo.fecha_inicio || !torneo.fecha_fin) return 'Fechas por confirmar';
  const inicio = parseISO(torneo.fecha_inicio);
  const fin = parseISO(torneo.fecha_fin);
  const formatoInicio = inicio.getFullYear() === fin.getFullYear() ? 'd MMM' : 'd MMM yyyy';
  return `${format(inicio, formatoInicio, { locale: es })} – ${format(fin, 'd MMM yyyy', { locale: es })}`;
}

function SlideTorneo({ torneo }: { torneo: Torneo }) {
  const categorias = torneo.categorias ?? [];

  return (
    <article className="aparecer">
      {/* Cinta dorada del cartel, igual que la fecha de las tarjetas de partido */}
      <span className="inline-block rounded bg-oro px-2 py-0.5 font-display text-xs font-bold uppercase text-marino">
        {ESTADOS[torneo.estado] ?? torneo.estado}
      </span>

      <h2 className="mt-6 text-balance font-display text-3xl font-bold leading-tight text-crema sm:text-4xl">
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

  return (
    <section id="inicio" className="relative z-10 isolate scroll-mt-16 overflow-hidden">
      {/* Fondo: foto del coliseo con zoom lento infinito y blur sutil */}
      {/* La máscara funde la foto con la página, así el logo del fondo aparece sin corte */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_calc(100%-10rem),transparent)]"
      >
        <img src="/img/hero-coliseo.jpg" alt="" className="hero-zoom h-full w-full object-cover blur-[3px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-marino via-marino/80 to-marino/35" />
      </div>

      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.3fr] lg:px-8">
        <div className="max-w-xl">
          <h1 className="text-balance font-display text-4xl font-bold leading-tight text-crema sm:text-6xl">
            Torneos Baloncesto Manta
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            Los torneos de los Exalumnos Salesianos de Manta. Desde 2019 reactivando el baloncesto de la ciudad.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#partidos"
              className="rounded-lg bg-celeste px-5 py-3 text-sm font-semibold text-marino transition-colors hover:bg-white"
            >
              Ver partidos
            </a>
            <a
              href="#conocenos"
              className="rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Conócenos
            </a>
          </div>
        </div>

        {/* Carrusel de torneos: card diagonal que cambia cada 10 s */}
        <div aria-roledescription="carrusel" aria-label="Torneos">
          <div className={`${DIAGONAL} bg-oro/55 p-px`}>
            <div
              className={`${DIAGONAL} min-h-[22rem] bg-marino-claro/90 px-12 py-10 sm:px-16 sm:py-12`}
              aria-live={pausado ? 'polite' : 'off'}
            >
              {isLoading ? (
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
              ) : actual ? (
                <SlideTorneo key={indice % total} torneo={actual} />
              ) : (
                <p className="text-slate-300">Aún no hay torneos publicados.</p>
              )}
            </div>
          </div>

          {total > 1 && (
            <div className="mt-6 flex items-center gap-4 px-8">
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
