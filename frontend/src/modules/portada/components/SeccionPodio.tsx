import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, Trophy } from 'lucide-react';
import { fechaCorta, getPodios, partidoClave, type PodioDeCategoria, type PuestoDelPodio } from '@/modules/partidos';
import { Escudo } from '@/shared/ui/Escudo';
import { Esquinas } from '@/shared/ui/Esquinas';

type Lugar = 1 | 2 | 3;
const CURVA = 'ease-[cubic-bezier(0.32,0.72,0,1)]';

// Cada puesto con su metal (solo en la cinta, el anillo del medallón y el número del escalón), su columna en el
// podio 2 · 1 · 3 y el alto de su escalón. Al entrar, los escalones suben del 3.º al 1.º.
const PUESTOS = {
  1: {
    nombre: 'Campeón', columna: 1, orden: 'order-2', retraso: 300,
    escalon: 'h-36 sm:h-52', medallon: 'h-20 w-20 sm:h-32 sm:w-32',
    cinta: 'bg-oro text-marino', anillo: 'bg-oro', numero: 'text-oro', trazo: '[-webkit-text-stroke:1.5px_rgb(214_179_106/0.55)]',
  },
  2: {
    nombre: 'Vicecampeón', columna: 0, orden: 'order-1', retraso: 150,
    escalon: 'h-24 sm:h-36', medallon: 'h-16 w-16 sm:h-24 sm:w-24',
    cinta: 'bg-slate-300 text-marino', anillo: 'bg-slate-300', numero: 'text-slate-300', trazo: '[-webkit-text-stroke:1.5px_rgb(203_213_225/0.55)]',
  },
  3: {
    nombre: 'Tercer lugar', columna: 2, orden: 'order-3', retraso: 0,
    escalon: 'h-16 sm:h-28', medallon: 'h-16 w-16 sm:h-24 sm:w-24',
    cinta: 'bg-[#C98552] text-marino', anillo: 'bg-[#C98552]', numero: 'text-[#C98552]', trazo: '[-webkit-text-stroke:1.5px_rgb(201_133_82/0.55)]',
  },
} as const;

const SELLOS = { invicto: 'Invicto', mas_puntos: 'Mejor ataque' } as const;

function fechas(inicio: string, fin: string) {
  return `${fechaCorta(inicio)} – ${format(parseISO(fin), "d MMM yyyy", { locale: es })}`;
}

// Una columna del podio: el medallón con su anillo de metal, el nombre y el escalón con el número grabado.
// Pasar el cursor, enfocarla o tocarla la pone bajo el foco.
function Escalon({ puesto, lugar, activo, alElegir }: { puesto?: PuestoDelPodio; lugar: Lugar; activo: boolean; alElegir: (l: Lugar) => void }) {
  const m = PUESTOS[lugar];
  const retraso = { '--retraso': `${m.retraso}ms` } as CSSProperties;
  const contenido = (
    <>
      <div className="medallon-cae podio-entra flex w-full flex-col items-center px-1" style={retraso}>
        <span
          className={`rounded-full p-[3px] transition-[transform,background-color,filter,opacity] duration-500 ${CURVA} ${
            activo ? `${m.anillo} -translate-y-2 scale-105` : 'bg-white/10 opacity-70 grayscale-[60%]'
          }`}
        >
          {puesto ? (
            <Escudo url={puesto.equipo.url_logo} className={m.medallon} />
          ) : (
            <span className={`flex items-center justify-center rounded-full border-2 border-dashed border-white/25 ${m.medallon}`} />
          )}
        </span>
        <p
          className={`mt-3 line-clamp-2 min-h-[2.5em] text-balance text-center font-display text-xs font-bold leading-tight transition-colors duration-500 sm:text-base ${
            activo ? 'text-crema' : 'text-crema/55'
          }`}
        >
          {puesto ? puesto.equipo.nombre_equipo : 'Por definir'}
        </p>
      </div>
      <div className="mt-3 w-full overflow-hidden">
        <div
          className={`escalon podio-entra relative w-full overflow-hidden border-t-2 bg-gradient-to-b from-marino-claro to-marino shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] transition-colors duration-500 ${m.escalon} ${
            activo ? 'border-oro' : 'border-oro/25'
          }`}
          style={retraso}
        >
          <span
            aria-hidden="true"
            className={`absolute inset-x-0 top-3 text-center font-display text-4xl font-bold leading-none transition-colors duration-500 sm:top-5 sm:text-7xl ${
              activo ? m.numero : `text-transparent ${m.trazo}`
            }`}
          >
            {lugar}
          </span>
          {/* Brillo de lámina, como el cromo: cruza el escalón al pasar el cursor */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-[160%] skew-x-[-16deg] bg-gradient-to-r from-transparent via-crema/15 to-transparent motion-safe:group-hover:translate-x-[260%] motion-safe:group-hover:transition-transform motion-safe:group-hover:duration-1000 ${CURVA}`}
          />
        </div>
      </div>
    </>
  );

  const clase = `group flex flex-col items-center justify-end ${m.orden}`;
  if (!puesto) return <div className={clase}>{contenido}</div>;
  return (
    <button
      type="button"
      aria-pressed={activo}
      aria-label={`${m.nombre}: ${puesto.equipo.nombre_equipo}`}
      onPointerEnter={(e) => e.pointerType === 'mouse' && alElegir(lugar)}
      onFocus={() => alElegir(lugar)}
      onClick={() => alElegir(lugar)}
      className={`${clase} rounded-t-lg`}
    >
      {contenido}
    </button>
  );
}

// La franja del cartel con el puesto bajo el foco: cinta, nombre y sellos · totales · el partido que lo definió
function Ficha({ puesto, idTorneo }: { puesto: PuestoDelPodio; idTorneo?: number }) {
  const m = PUESTOS[puesto.lugar];
  const [etiqueta, texto] = partidoClave(puesto);
  const totales = [
    ['Ganados', puesto.PG],
    ['Perdidos', puesto.PP],
    ['A favor', puesto.PF],
    ['En contra', puesto.PC],
  ] as const;
  return (
    <div className="aparecer grid items-center gap-6 lg:grid-cols-[1.3fr_1fr_1fr] lg:gap-10">
      <div className="min-w-0 text-center lg:text-left">
        <span className={`inline-block rounded px-2.5 py-0.5 font-display text-xs font-bold uppercase ${m.cinta}`}>{m.nombre}</span>
        <p className="mt-2 text-balance font-display text-2xl font-bold leading-tight text-crema sm:text-3xl">{puesto.equipo.nombre_equipo}</p>
        {puesto.sellos.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-2 lg:justify-start">
            {puesto.sellos.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full border border-oro/40 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-oro">
                {s === 'invicto' && <Trophy className="h-3 w-3" aria-hidden="true" />}
                {SELLOS[s]}
              </span>
            ))}
          </div>
        )}
      </div>
      <dl className="grid grid-cols-4 gap-2 text-center">
        {totales.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{k}</dt>
            <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-crema">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="text-center lg:text-right">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-oro/80">{etiqueta}</p>
        <p className="mt-1 text-base text-crema sm:text-lg">{texto}</p>
        {idTorneo && (
          <Link to={`/torneos/${idTorneo}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-celeste hover:text-white">
            Ver el torneo <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}

function Podio({ podio, idTorneo }: { podio: PodioDeCategoria; idTorneo?: number }) {
  const [lugar, setLugar] = useState<Lugar>(1);
  const escena = useRef<HTMLDivElement>(null);
  const [visto, setVisto] = useState(false);
  const puestos = new Map(podio.puestos.map((p) => [p.lugar, p]));
  const activo = puestos.get(lugar) ?? podio.puestos[0];

  // Los escalones suben una sola vez, al llegar a la sección (sin IntersectionObserver, de una)
  useEffect(() => {
    const el = escena.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setVisto(true);
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisto(true);
          obs.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-oro/25 bg-marino-claro/70 shadow-xl shadow-black/30">
      <Esquinas />
      <div
        ref={escena}
        data-podio={visto ? 'visto' : 'pendiente'}
        className="relative bg-[radial-gradient(ellipse_at_50%_0%,rgba(41,169,225,0.14),transparent_60%)] px-3 pt-14 sm:px-8 sm:pt-20"
      >
        <div role="group" aria-label={`Podio de ${podio.categoria.nombre_categoria}`} className="relative mx-auto max-w-3xl">
          {/* El foco: un cono de luz y su reflejo en el piso que siguen al escalón elegido */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 w-1/3 transition-transform duration-700 ${CURVA}`}
            style={{ transform: `translateX(${PUESTOS[activo.lugar].columna * 100}%)` }}
          >
            <div className="absolute -inset-x-1/2 -top-20 bottom-0 bg-[conic-gradient(at_50%_0%,transparent_152deg,rgb(241_231_208/0.07)_164deg,rgb(241_231_208/0.2)_180deg,rgb(241_231_208/0.07)_196deg,transparent_208deg)]" />
            <div className="absolute -top-[5.25rem] left-1/2 h-3 w-16 -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(241_231_208/0.55),transparent)]" />
            <div className="absolute -inset-x-1/4 bottom-0 h-16 translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(214_179_106/0.14),transparent)]" />
          </div>
          <div className="relative grid grid-cols-3 items-end">
            {([1, 2, 3] as const).map((l) => (
              <Escalon key={l} lugar={l} puesto={puestos.get(l)} activo={activo.lugar === l} alElegir={setLugar} />
            ))}
          </div>
        </div>
      </div>
      <div aria-live="polite" className="relative border-t border-oro/20 bg-black/35 px-5 py-6 sm:px-8">
        <Ficha key={activo.lugar} puesto={activo} idTorneo={idTorneo} />
      </div>
    </div>
  );
}

export function SeccionPodio() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['landing', 'podios'], queryFn: getPodios });
  const torneo = data?.data?.torneo ?? null;
  const podios = data?.data?.podios ?? [];
  const [indice, setIndice] = useState(0);
  const podio = podios[Math.min(indice, podios.length - 1)];
  const nombreCategoria = (p: PodioDeCategoria) => `${p.categoria.nombre_categoria} (${p.categoria.genero_categoria})`;

  return (
    <section id="podio" className="relative z-10 scroll-mt-16 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="text-center">
          <h2 className="font-display text-4xl font-bold tracking-wide text-crema sm:text-6xl">
            PODIO <span className="text-oro">DEL TORNEO</span>
          </h2>
          {torneo && (
            <>
              <p className="mx-auto mt-4 max-w-xl text-balance font-display text-sm uppercase tracking-[0.15em] text-slate-400">{torneo.nombre}</p>
              <p className="mt-2 text-balance font-display text-sm uppercase tracking-[0.15em] text-oro">
                {podios.length === 1 && `${nombreCategoria(podios[0])} · `}
                <span className="whitespace-nowrap">{fechas(torneo.fecha_inicio, torneo.fecha_fin)}</span>
              </p>
            </>
          )}
        </header>

        {podios.length > 1 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {podios.map((p, i) => (
              <button
                key={p.categoria.id_categoria}
                type="button"
                aria-pressed={p === podio}
                onClick={() => setIndice(i)}
                className={`rounded-full px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition-colors ${
                  p === podio ? 'bg-oro text-marino' : 'border border-white/20 text-slate-300 hover:bg-white/10'
                }`}
              >
                {nombreCategoria(p)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-12">
          {isLoading ? (
            <div aria-busy="true" className="h-[30rem] rounded-xl bg-white/5 motion-safe:animate-pulse" />
          ) : isError ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
              <p>No pudimos cargar el podio. Revisa tu conexión e inténtalo de nuevo.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Reintentar
              </button>
            </div>
          ) : !podio ? (
            <p className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
              El podio aparece cuando se juega la final de una categoría.
            </p>
          ) : (
            // Con otra categoría el podio se arma de nuevo: vuelve al campeón y los escalones suben otra vez
            <Podio key={podio.categoria.id_categoria} podio={podio} idTorneo={torneo?.id_torneo} />
          )}
        </div>
      </div>
    </section>
  );
}
