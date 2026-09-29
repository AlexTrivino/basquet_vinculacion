import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, Search, Users } from 'lucide-react';
import { getTorneos } from '../../features/torneos/api/torneos.api';
import { getInscripcionesPublicas } from '../../features/equipos/api/equipos.api';
import { buscarJugadores, type FiltrosVisor, type JugadorVisor } from '../../features/visor/api/visor.api';
import { Escudo } from '../../features/torneos/components/PartidosList';

const EDADES = [
  { valor: '', texto: 'Todas las edades' },
  { valor: '-20', texto: 'Hasta 20 años' },
  { valor: '21-30', texto: '21 a 30 años' },
  { valor: '31-40', texto: '31 a 40 años' },
  { valor: '41-', texto: 'Más de 40 años' },
];
const ORDENES = [
  { valor: '', texto: 'Nombre (A-Z)' },
  { valor: 'puntos', texto: 'Más puntos' },
  { valor: 'promedio', texto: 'Mejor promedio' },
];
const CLAVES = ['q', 'id_torneo', 'id_categoria', 'id_equipo', 'genero', 'edad_min', 'edad_max', 'orden'] as const;

const selectCls =
  'block w-full cursor-pointer appearance-none rounded-lg border border-white/15 bg-marino-claro py-2.5 pl-3 pr-9 text-sm font-semibold text-crema transition-colors hover:border-oro/50 disabled:cursor-not-allowed disabled:opacity-50';

function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('');
}

function Selector({ id, label, value, onChange, disabled, children }: {
  id: string; label: string; value: string; onChange: (v: string) => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</label>
      <div className="relative">
        <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={selectCls}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-oro" aria-hidden="true" />
      </div>
    </div>
  );
}

// Escenario: el jugador activo en grande, como el cartel de la referencia (retrato y nombre enorme).
// En escritorio queda fijo junto a la grilla, así el hover se ve desde cualquier fila.
function Escenario({ jugador }: { jugador: JugadorVisor }) {
  const dato = (rotulo: string, valor: React.ReactNode) =>
    valor !== null && valor !== undefined && valor !== '' ? (
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{rotulo}</dt>
        <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-crema">{valor}</dd>
      </div>
    ) : null;
  const largo = jugador.nombre.length > 18;

  return (
    <aside
      aria-label="Jugador seleccionado"
      className="sticky top-20 hidden h-[calc(100dvh-6.5rem)] min-h-[34rem] overflow-hidden rounded-xl border border-oro/30 bg-marino-claro shadow-2xl shadow-black/40 lg:block"
    >
      <div key={jugador.id_jugador} className="aparecer absolute inset-0">
        {jugador.url_foto ? (
          <img src={jugador.url_foto} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="flex h-full items-start justify-center pt-16">
            <span className="font-display text-[11rem] font-black leading-none text-oro/20">{iniciales(jugador.nombre)}</span>
          </div>
        )}
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-marino via-marino/60 via-45% to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-7">
        {jugador.equipo && (
          <p className="flex items-center gap-2 text-sm font-semibold text-oro">
            <Escudo url={jugador.equipo.url_logo} className="h-7 w-7" />
            {jugador.equipo.nombre_equipo}
          </p>
        )}
        <h2
          key={jugador.id_jugador}
          className={`aparecer mt-3 text-balance break-words font-display font-black leading-[0.95] text-crema ${largo ? 'text-4xl' : 'text-5xl'}`}
        >
          {jugador.nombre}
        </h2>
        <dl className="mt-6 grid grid-cols-3 gap-x-4 gap-y-4">
          {dato('Edad', jugador.edad)}
          {dato('Camiseta', jugador.numero_camiseta != null ? `#${jugador.numero_camiseta}` : null)}
          {dato('Partidos', jugador.partidos_jugados)}
          {dato('Puntos', jugador.puntos_totales)}
          {dato('Promedio', jugador.partidos_jugados ? jugador.promedio_puntos.toLocaleString('es-EC') : null)}
        </dl>
        {jugador.categoria && <p className="mt-4 text-sm text-slate-300">{jugador.categoria.nombre_categoria} ({jugador.categoria.genero_categoria})</p>}
        <Link
          to={`/jugadores/${jugador.id_jugador}`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-celeste px-5 py-3 text-sm font-semibold text-marino transition-colors hover:bg-white"
        >
          Ver ficha completa <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}

export default function BuscadorJugadores() {
  const [params, setParams] = useSearchParams();
  const filtros = useMemo(() => {
    const f: FiltrosVisor = {};
    CLAVES.forEach((k) => {
      const v = params.get(k);
      if (v) f[k] = v;
    });
    return f;
  }, [params]);

  // Cambia varias claves de la URL a la vez; al cambiar de torneo se limpian categoría y equipo
  const fijar = (cambios: FiltrosVisor) =>
    setParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if ('id_torneo' in cambios) ['id_categoria', 'id_equipo'].forEach((k) => n.delete(k));
        Object.entries(cambios).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
        return n;
      },
      { replace: true }
    );

  // El texto espera 300 ms antes de buscar
  const [texto, setTexto] = useState(params.get('q') ?? '');
  useEffect(() => {
    const t = setTimeout(() => {
      if (texto.trim() !== (params.get('q') ?? '')) fijar({ q: texto.trim() });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const { data: torneosRes } = useQuery({ queryKey: ['torneos', 'public'], queryFn: () => getTorneos(1, 100) });
  const torneos = torneosRes?.data ?? [];
  const torneo = torneos.find((t) => String(t.id_torneo) === filtros.id_torneo);

  const { data: inscRes } = useQuery({
    queryKey: ['inscripciones-publicas', Number(filtros.id_torneo)],
    queryFn: () => getInscripcionesPublicas(Number(filtros.id_torneo)),
    enabled: !!filtros.id_torneo,
  });
  const equipos = useMemo(() => {
    const vistos = new Map<number, string>();
    (inscRes?.data ?? [])
      .filter((i) => i.estado_inscripcion === 'aprobado' && (!filtros.id_categoria || String(i.categoria?.id_categoria) === filtros.id_categoria))
      .forEach((i) => i.equipo?.id_equipo && vistos.set(i.equipo.id_equipo, i.equipo.nombre_equipo ?? ''));
    return [...vistos].sort((a, b) => a[1].localeCompare(b[1]));
  }, [inscRes, filtros.id_categoria]);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['visor', 'jugadores', filtros],
    queryFn: ({ pageParam }) => buscarJugadores(filtros, pageParam),
    initialPageParam: 1,
    getNextPageParam: (ultima) => {
      const p = ultima.pagination;
      return p && p.page < p.pages ? p.page + 1 : undefined;
    },
  });
  const jugadores = data?.pages.flatMap((p) => p.data ?? []) ?? [];
  const total = data?.pages[0]?.pagination?.total ?? jugadores.length;

  const [activoId, setActivoId] = useState<number | null>(null);
  const activo = jugadores.find((j) => j.id_jugador === activoId) ?? jugadores[0];

  const edad = filtros.edad_min || filtros.edad_max ? `${filtros.edad_min ?? ''}-${filtros.edad_max ?? ''}` : '';
  const hayFiltros = Object.keys(filtros).some((k) => k !== 'orden');
  const bloque = 'rounded-lg bg-white/10 motion-safe:animate-pulse';

  return (
    <main className="tema-cartel relative isolate min-h-[100dvh] overflow-x-clip bg-marino pb-24 text-slate-100">
      <div aria-hidden="true" className="fondo-logo" />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-8">
      {activo ? <Escenario jugador={activo} /> : <div className="hidden lg:block" />}

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl font-bold text-crema sm:text-4xl">Jugadores</h1>
          {!isLoading && !isError && (
            <p className="text-sm tabular-nums text-slate-400">
              {total.toLocaleString('es-EC')} {total === 1 ? 'jugador' : 'jugadores'}
            </p>
          )}
        </div>

        {/* Buscador y filtros */}
        <div className="mt-6 grid gap-4">
          <div className="relative">
            <label htmlFor="buscar-jugador" className="sr-only">Buscar jugador por nombre</label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-oro" aria-hidden="true" />
            <input
              id="buscar-jugador"
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar jugador por nombre"
              autoComplete="off"
              className="w-full rounded-lg border border-white/15 bg-marino-claro py-3.5 pl-12 pr-4 text-base text-crema placeholder:text-slate-500 transition-colors hover:border-oro/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Selector id="f-torneo" label="Torneo" value={filtros.id_torneo ?? ''} onChange={(v) => fijar({ id_torneo: v })}>
              <option value="">Todos los torneos</option>
              {torneos.map((t) => (
                <option key={t.id_torneo} value={t.id_torneo}>{t.nombre}</option>
              ))}
            </Selector>
            <Selector
              id="f-categoria"
              label="Categoría"
              value={filtros.id_categoria ?? ''}
              disabled={!torneo}
              onChange={(v) => fijar({ id_categoria: v, id_equipo: '' })}
            >
              <option value="">{torneo ? 'Todas' : 'Elige un torneo'}</option>
              {(torneo?.categorias ?? []).map((c) => (
                <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria} ({c.genero_categoria})</option>
              ))}
            </Selector>
            <Selector id="f-equipo" label="Equipo" value={filtros.id_equipo ?? ''} disabled={!torneo} onChange={(v) => fijar({ id_equipo: v })}>
              <option value="">{torneo ? 'Todos' : 'Elige un torneo'}</option>
              {equipos.map(([id, nombre]) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </Selector>
            <Selector id="f-genero" label="Género" value={filtros.genero ?? ''} onChange={(v) => fijar({ genero: v })}>
              <option value="">Todos</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
            </Selector>
            <Selector
              id="f-edad"
              label="Edad"
              value={edad}
              onChange={(v) => {
                const [min, max] = v ? v.split('-') : ['', ''];
                fijar({ edad_min: min, edad_max: max });
              }}
            >
              {EDADES.map((e) => (
                <option key={e.valor} value={e.valor}>{e.texto}</option>
              ))}
            </Selector>
            <Selector id="f-orden" label="Ordenar por" value={filtros.orden ?? ''} onChange={(v) => fijar({ orden: v })}>
              {ORDENES.map((o) => (
                <option key={o.valor} value={o.valor}>{o.texto}</option>
              ))}
            </Selector>
          </div>
        </div>

        {/* Grilla de retratos: el hover o el foco llevan al jugador al escenario; el clic abre su ficha */}
        <div className="mt-10">
          {isError ? (
            <p className="py-12 text-center text-red-300">No pudimos cargar los jugadores. Intenta de nuevo en un momento.</p>
          ) : isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i}>
                  <div className={`aspect-[3/4] ${bloque}`} />
                  <div className={`mt-2 h-4 w-3/4 ${bloque}`} />
                </div>
              ))}
            </div>
          ) : jugadores.length === 0 ? (
            <div className="rounded-xl border border-dashed border-oro/30 px-6 py-16 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-oro/70" aria-hidden="true" />
              <h3 className="font-display text-xl font-bold text-crema">Ningún jugador coincide</h3>
              <p className="mt-2 text-slate-400">Prueba con otro nombre o quita algún filtro.</p>
              {hayFiltros && (
                <button
                  type="button"
                  onClick={() => {
                    setTexto('');
                    setParams({}, { replace: true });
                  }}
                  className="mt-6 rounded-lg border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {jugadores.map((j) => {
                  const esActivo = activo?.id_jugador === j.id_jugador;
                  return (
                    <li key={j.id_jugador}>
                      <Link
                        to={`/jugadores/${j.id_jugador}`}
                        onMouseEnter={() => setActivoId(j.id_jugador)}
                        onFocus={() => setActivoId(j.id_jugador)}
                        className="group block"
                      >
                        <div
                          className={`relative aspect-[3/4] overflow-hidden rounded-lg bg-marino-claro ring-1 transition duration-300 group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-oro/80 ${
                            esActivo ? 'ring-white/10 lg:ring-2 lg:ring-oro/80' : 'ring-white/10'
                          }`}
                        >
                          {j.url_foto ? (
                            <img
                              src={j.url_foto}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-110"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-b from-marino-claro to-marino">
                              <span className="font-display text-4xl font-black text-oro/60">{iniciales(j.nombre)}</span>
                            </div>
                          )}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-bold uppercase leading-snug text-crema transition-colors group-hover:text-white">
                          {j.nombre}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {[j.numero_camiseta != null ? `#${j.numero_camiseta}` : null, j.equipo?.nombre_equipo].filter(Boolean).join(' ') || 'Sin equipo'}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {hasNextPage && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="rounded-lg border border-oro/50 px-6 py-3 text-sm font-semibold text-oro transition-colors hover:bg-oro hover:text-marino disabled:opacity-60"
                  >
                    {isFetchingNextPage ? 'Cargando…' : 'Cargar más jugadores'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      </div>
    </main>
  );
}
