import { Fragment, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { getFigurasEnCurso, type FiguraDelTorneo } from '@/modules/estadisticas';
import { Escudo } from '@/shared/ui/Escudo';
import { FotoJugador } from '@/shared/ui/FotoJugador';

const MAX_PUNTOS = 10; // con más figuras, en vez de puntos se dice "3 de 12"
const DESLIZAR = 40; // px de arrastre horizontal para pasar de figura
const CURVA = 'ease-[cubic-bezier(0.32,0.72,0,1)]'; // la del álbum de cromos
const cifra = new Intl.NumberFormat('es-EC');

const reducirMovimiento = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Distancia de la figura i a la del centro, entre -n/2 y n/2: el carrusel da la vuelta
function distancia(i: number, activa: number, n: number) {
  return ((((i - activa) % n) + n + Math.floor(n / 2)) % n) - Math.floor(n / 2);
}

// Coverflow: más chica, más atrás y girada hacia el centro cuanto más lejos está; de la tercera en adelante, oculta
function posicion(d: number) {
  const lejos = Math.min(Math.abs(d), 3);
  const lado = Math.sign(d);
  return {
    transform: `translateX(${lado * [0, 62, 112, 150][lejos]}%) translateZ(${-150 * lejos}px) rotateY(${-lado * [0, 24, 32, 36][lejos]}deg) scale(${[1, 0.86, 0.74, 0.7][lejos]})`,
    zIndex: 30 - lejos * 10,
    opacity: lejos > 2 ? 0 : 1,
  };
}

// Los totales en una frase, sin los que están en 0: "18 puntos, 6 rebotes y 3 asistencias en 2 partidos"
function Totales({ figura }: { figura: FiguraDelTorneo }) {
  const datos = (
    [
      [figura.linea.puntos, 'punto', 'puntos'],
      [figura.linea.rebotes, 'rebote', 'rebotes'],
      [figura.linea.asistencias, 'asistencia', 'asistencias'],
    ] as const
  ).filter(([n]) => n > 0);
  const numero = (n: number) => <span className="font-semibold tabular-nums text-crema">{cifra.format(n)}</span>;
  return (
    <p className="text-sm leading-snug text-slate-400">
      {datos.map(([n, uno, varios], i) => (
        <Fragment key={uno}>
          {i > 0 && (i === datos.length - 1 ? ' y ' : ', ')}
          {numero(n)} {n === 1 ? uno : varios}
        </Fragment>
      ))}
      {datos.length > 0 && ' '}en {numero(figura.partidos)} {figura.partidos === 1 ? 'partido' : 'partidos'}
    </p>
  );
}

// El cromo de la figura: doble bisel, retrato 3:4 con la cinta de la categoría y el dorsal, nombre, equipo y totales
function TarjetaFigura({ figura }: { figura: FiguraDelTorneo }) {
  const { jugador, equipo } = figura;
  return (
    <div className="rounded-2xl bg-white/[0.04] p-1.5 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.7)] ring-1 ring-oro/40 transition-shadow group-hover:ring-oro/70">
      <div className="overflow-hidden rounded-[0.625rem] bg-marino-claro shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
        <div className="relative aspect-[3/4] overflow-hidden">
          <FotoJugador url={jugador.url_foto} alt="" draggable={false} className="h-full w-full object-cover object-[center_20%]" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-marino-claro to-transparent" />
          {figura.categoria && (
            <span className="absolute left-1/2 top-3 max-w-[85%] -translate-x-1/2 truncate rounded bg-oro px-2 py-0.5 font-display text-xs font-bold uppercase text-marino">
              {figura.categoria}
            </span>
          )}
          {jugador.numero_camiseta != null && (
            <span
              aria-hidden="true"
              className="absolute bottom-1.5 left-3 font-display text-5xl font-bold leading-none text-transparent [-webkit-text-stroke:1.5px_var(--color-oro)] sm:text-6xl"
            >
              {jugador.numero_camiseta}
            </span>
          )}
        </div>
        <div className="px-4 pb-4 pt-2 text-center">
          <p className="line-clamp-2 flex min-h-[3.1rem] items-center justify-center text-balance font-display text-lg font-bold leading-snug text-crema">
            {jugador.nombre}
          </p>
          <p className="mt-1 flex items-center justify-center gap-2 text-sm text-slate-300">
            <Escudo url={equipo?.url_logo} className="h-6 w-6" />
            <span className="truncate">{equipo?.nombre_equipo ?? 'Sin equipo'}</span>
          </p>
          <div className="mt-3 flex min-h-[2.5rem] items-center justify-center">
            <Totales figura={figura} />
          </div>
        </div>
        <div className="border-t border-oro/20 bg-black/35 px-4 py-3 text-center">
          <p className="font-display text-xs font-semibold tracking-[0.25em] text-oro/80">
            VALORACIÓN <span className="text-base tabular-nums tracking-normal text-crema">{cifra.format(figura.valoracion)}</span>
          </p>
          <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-widest text-slate-400">{figura.torneo.nombre}</p>
        </div>
      </div>
    </div>
  );
}

function Carrusel({ figuras }: { figuras: FiguraDelTorneo[] }) {
  const n = figuras.length;
  const [activa, setActiva] = useState(0);
  // Con "reducir movimiento" arranca en pausa (como el de torneos); el botón permite reanudarlo
  const [pausado, setPausado] = useState(reducirMovimiento);
  // El cursor encima o el foco adentro también detienen la barra, sin cambiar el botón
  const [encima, setEncima] = useState(false);
  const [enfocado, setEnfocado] = useState(false);
  const inicio = useRef<number | null>(null);
  const deslizo = useRef(false);

  const irA = (i: number) => setActiva(((i % n) + n) % n);
  const anterior = () => irA(activa - 1);
  const siguiente = () => irA(activa + 1);

  const alPresionar = (e: PointerEvent) => {
    inicio.current = e.clientX;
    deslizo.current = false;
  };
  const alSoltar = (e: PointerEvent) => {
    if (inicio.current === null) return;
    const dx = e.clientX - inicio.current;
    inicio.current = null;
    if (Math.abs(dx) < DESLIZAR) return;
    deslizo.current = true; // el clic que sigue al arrastre no abre la tarjeta
    if (dx < 0) siguiente();
    else anterior();
  };
  // Las flechas del teclado mueven el carrusel desde sus controles (no desde la tarjeta: perdería el foco al cambiar)
  const alTeclear = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('[aria-roledescription="diapositiva"]')) return;
    if (e.key === 'ArrowLeft') anterior();
    if (e.key === 'ArrowRight') siguiente();
  };

  const flecha =
    'absolute top-[40%] z-40 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-oro/40 bg-marino/80 text-oro shadow-lg shadow-black/40 transition-colors hover:bg-marino hover:text-crema active:scale-95 sm:flex';

  return (
    <div
      role="region"
      aria-roledescription="carrusel"
      aria-label="Figuras del torneo"
      onKeyDown={alTeclear}
      onFocus={() => setEnfocado(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEnfocado(false);
      }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setEncima(true)}
      onPointerLeave={() => setEncima(false)}
      className="mt-12"
    >
      {/* Todas las tarjetas comparten la celda de la grilla: la más alta da el alto y el transform las reparte */}
      <div
        onPointerDown={alPresionar}
        onPointerUp={alSoltar}
        onPointerCancel={() => (inicio.current = null)}
        onClickCapture={(e) => {
          if (deslizo.current) {
            e.preventDefault();
            e.stopPropagation();
            deslizo.current = false;
          }
        }}
        className="relative grid touch-pan-y select-none overflow-x-clip py-4 [--ancho:15rem] [perspective:1400px] sm:[--ancho:17rem] lg:[--ancho:18rem]"
        aria-live={pausado ? 'polite' : 'off'}
      >
        {figuras.map((figura, i) => {
          const d = distancia(i, activa, n);
          const centro = d === 0;
          const etiqueta = `${figura.jugador.nombre}, figura de ${figura.categoria ?? 'su categoría'}`;
          return (
            <div
              key={`${figura.torneo.id_torneo}-${figura.categoria}-${figura.jugador.id_jugador}`}
              role="group"
              aria-roledescription="diapositiva"
              aria-label={`${i + 1} de ${n}`}
              aria-hidden={!centro || undefined}
              style={posicion(d)}
              className={`relative col-start-1 row-start-1 w-[var(--ancho)] justify-self-center motion-safe:transition-[transform,opacity] motion-safe:duration-700 ${CURVA} ${
                Math.abs(d) > 2 ? 'pointer-events-none' : ''
              }`}
            >
              {centro ? (
                <Link to={`/jugadores/${figura.jugador.id_jugador}`} aria-label={`Ver a ${etiqueta}`} draggable={false} className="group block rounded-2xl">
                  <TarjetaFigura figura={figura} />
                </Link>
              ) : (
                // Una vecina se trae al centro con el mouse; el teclado usa las flechas y los puntos
                <div onClick={() => irA(i)} className="cursor-pointer">
                  <TarjetaFigura figura={figura} />
                  <span aria-hidden="true" className="absolute inset-0 rounded-2xl bg-marino/55" />
                </div>
              )}
            </div>
          );
        })}

        {n > 1 && (
          <>
            <button type="button" onClick={anterior} aria-label="Figura anterior" className={`${flecha} left-[calc(50%_-_var(--ancho)/2_-_1.375rem)]`}>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={siguiente} aria-label="Figura siguiente" className={`${flecha} right-[calc(50%_-_var(--ancho)/2_-_1.375rem)]`}>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPausado((p) => !p)}
              aria-label={pausado ? 'Reanudar carrusel' : 'Pausar carrusel'}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-slate-200 transition-colors hover:bg-white/10"
            >
              {pausado ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
            <button type="button" onClick={anterior} aria-label="Figura anterior" className="flex h-8 w-8 items-center justify-center rounded-full border border-oro/40 text-oro sm:hidden">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            {n <= MAX_PUNTOS ? (
              <div className="flex">
                {figuras.map((figura, i) => (
                  // El botón da un área táctil de 24 px; el punto visible va dentro
                  <button
                    key={i}
                    type="button"
                    onClick={() => irA(i)}
                    aria-label={`Ver figura de ${figura.categoria ?? figura.jugador.nombre}`}
                    aria-current={i === activa}
                    className="group flex h-6 items-center px-1"
                  >
                    <span className={`block h-2 rounded-full transition-all ${i === activa ? 'w-8 bg-celeste' : 'w-2 bg-white/30 group-hover:bg-white/60'}`} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="min-w-16 text-center text-sm tabular-nums text-slate-300">
                {activa + 1} de {n}
              </p>
            )}
            <button type="button" onClick={siguiente} aria-label="Figura siguiente" className="flex h-8 w-8 items-center justify-center rounded-full border border-oro/40 text-oro sm:hidden">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {/* La barra marca los 5 s y, al terminar, pasa a la figura siguiente */}
          <div className="h-0.5 w-40 overflow-hidden rounded bg-white/10">
            <span
              key={activa}
              data-testid="progreso-figuras"
              onAnimationEnd={siguiente}
              className="block h-full origin-left bg-celeste [animation:progreso-slide_5s_linear_both]"
              style={{ animationPlayState: pausado || encima || enfocado ? 'paused' : 'running' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function SeccionFiguras() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['landing', 'figuras'], queryFn: getFigurasEnCurso });
  const figuras = data?.data ?? [];
  // Sin torneos en curso o sin estadísticas cargadas todavía, la sección no aparece
  if (!isLoading && !isError && figuras.length === 0) return null;

  return (
    <section id="figuras" className="relative z-10 scroll-mt-16 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="text-center">
          <h2 className="font-display text-4xl font-bold tracking-wide text-crema sm:text-6xl">
            FIGURAS <span className="text-oro">DEL TORNEO</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md font-display text-sm tracking-[0.15em] text-slate-400">
            LOS MEJORES DE CADA CATEGORÍA HASTA HOY
          </p>
        </header>

        {isLoading ? (
          <div aria-busy="true" className="mx-auto mt-16 h-[34rem] w-[15rem] rounded-2xl bg-white/5 motion-safe:animate-pulse sm:w-[17rem] lg:w-[18rem]" />
        ) : isError ? (
          <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
            <p>No pudimos cargar las figuras. Revisa tu conexión e inténtalo de nuevo.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <Carrusel figuras={figuras} />
            <p className="mx-auto mt-6 max-w-md text-center text-xs leading-relaxed text-slate-400">
              La figura es la mayor valoración acumulada en el torneo: puntos + rebotes + asistencias + tapones.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
