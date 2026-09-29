import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft } from 'lucide-react';
import { getTorneoById, getPartidosByTorneo } from '../../features/torneos/api/torneos.api';
import { PosicionesTable } from '../../features/torneos/components/PosicionesTable';
import { PartidosList, colorCategoria } from '../../features/torneos/components/PartidosList';
import { LideresEstadisticos } from '../../features/torneos/components/LideresEstadisticos';

type Tab = 'calendario' | 'posiciones' | 'estadisticas';
const TABS: { id: Tab; texto: string }[] = [
  { id: 'calendario', texto: 'Calendario' },
  { id: 'posiciones', texto: 'Posiciones' },
  { id: 'estadisticas', texto: 'Estadísticas' },
];
const ESTADO: Record<string, string> = { en_curso: 'En curso', programado: 'Programado', finalizado: 'Finalizado' };
// Paralelogramo del cartel (mismo corte que las tarjetas del hero)
const DIAGONAL = '[clip-path:polygon(4%_0,100%_0,96%_100%,0_100%)]';

function rangoFechas(inicio?: string, fin?: string) {
  if (!inicio || !fin) return null;
  const a = parseISO(inicio), b = parseISO(fin);
  const fa = a.getFullYear() === b.getFullYear() ? 'd MMM' : 'd MMM yyyy';
  return `${format(a, fa, { locale: es })} - ${format(b, 'd MMM yyyy', { locale: es })}`;
}

export default function TorneoDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('calendario');
  const [activeCategoriaId, setActiveCategoriaId] = useState<number | undefined>(undefined);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['torneos', id],
    queryFn: () => getTorneoById(id as string),
    enabled: !!id,
  });
  // Misma clave que PartidosList: una sola petición alimenta el marcador y el calendario
  const { data: partidosRes } = useQuery({
    queryKey: ['torneos', id, 'partidos', undefined],
    queryFn: () => getPartidosByTorneo(id as string, 1, 1000),
    enabled: !!id,
  });

  const torneo = response?.data;
  const categorias = torneo?.categorias ?? [];
  const categoriaFiltro = activeCategoriaId ?? categorias[0]?.id_categoria;

  const marcador = useMemo(() => {
    const partidos = partidosRes?.data ?? [];
    const jugados = partidos.filter((p) => p.estado.startsWith('finalizado'));
    const puntos = jugados.reduce((s, p) => s + (p.marcador_local ?? 0) + (p.marcador_visitante ?? 0), 0);
    const porJugar = partidos.filter((p) => p.estado === 'programado' || p.estado === 'en_curso').length;
    return { total: partidos.length, jugados: jugados.length, porJugar, puntos };
  }, [partidosRes]);

  if (isError) {
    return (
      <main className="tema-cartel min-h-[100dvh] bg-marino px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-crema">No pudimos cargar el torneo</h1>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 font-semibold text-celeste hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al inicio
        </Link>
      </main>
    );
  }

  const fechas = rangoFechas(torneo?.fecha_inicio, torneo?.fecha_fin);
  const bloque = 'motion-safe:animate-pulse rounded bg-white/10';

  return (
    <main className="tema-cartel relative isolate min-h-[100dvh] overflow-x-clip bg-marino pb-24 text-slate-100">
      <div aria-hidden="true" className="fondo-logo" />

      {/* ─── Portada: foto del coliseo, nombre del torneo y marcador ─── */}
      <section className="relative z-10 overflow-hidden border-b border-oro/30">
        <img src="/img/hero-coliseo.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[center_40%]" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-marino/95 from-25% via-marino/60 to-marino/75" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-marino to-transparent to-60%" />

        <div className="relative mx-auto grid max-w-7xl items-end gap-8 px-4 pb-10 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:pb-12 lg:pt-12">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-celeste transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a torneos
            </Link>
            {isLoading ? (
              <div className="mt-8 space-y-4">
                <div className={`h-4 w-24 ${bloque}`} />
                <div className={`h-12 w-full max-w-xl ${bloque}`} />
                <div className={`h-5 w-64 ${bloque}`} />
              </div>
            ) : (
              <>
                <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-oro">
                  {ESTADO[torneo?.estado ?? ''] ?? torneo?.estado?.replace('_', ' ')}
                </p>
                <h1 className="mt-3 text-balance font-display text-3xl font-bold leading-tight text-crema sm:text-4xl lg:text-5xl">
                  {torneo?.nombre || torneo?.nombre_torneo}
                </h1>
                {torneo?.descripcion && <p className="mt-4 max-w-2xl leading-relaxed text-slate-300">{torneo.descripcion}</p>}
                <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-slate-300">
                  {fechas && <span className="font-semibold tabular-nums text-crema">{fechas}</span>}
                  {torneo?.ubicacion && <span>{torneo.ubicacion}</span>}
                  {categorias.length > 0 && (
                    <span>{categorias.length} {categorias.length === 1 ? 'categoría' : 'categorías'}</span>
                  )}
                </p>
              </>
            )}
          </div>

          {marcador.total > 0 && (
            <div className={`${DIAGONAL} bg-oro/45 p-px`}>
              <div className={`${DIAGONAL} bg-marino-claro px-8 py-6 sm:px-10`}>
                <dl className="grid grid-cols-3 gap-2">
                  {[
                    ['Jugados', marcador.jugados],
                    ['Por jugar', marcador.porJugar],
                    ['Puntos', marcador.puntos],
                  ].map(([rotulo, valor]) => (
                    <div key={rotulo} className="flex flex-col-reverse">
                      <dt className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{rotulo}</dt>
                      <dd className="cifra-brillo font-display text-4xl font-black leading-none text-oro tabular-nums sm:text-5xl">
                        {Number(valor).toLocaleString('es-EC')}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Barra de control: pestañas en paralelogramo y categorías ─── */}
      <div className="sticky top-16 z-30 border-b border-white/10 bg-marino/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <nav className="flex gap-1.5" aria-label="Secciones del torneo">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${DIAGONAL} flex-1 whitespace-nowrap px-6 py-2.5 text-sm font-bold transition-colors lg:flex-none lg:px-8 ${
                  activeTab === tab.id ? 'bg-oro text-marino' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.texto}
              </button>
            ))}
          </nav>

          {categorias.length > 0 && (
            <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
              {activeTab === 'calendario' ? (
                // En el calendario las categorías son la leyenda de los puntos de cada día
                <ul className="flex w-max gap-x-4 gap-y-1 text-xs text-slate-300 lg:flex-wrap lg:justify-end" aria-label="Categorías">
                  {categorias.map((c, i) => (
                    <li key={c.id_categoria} className="flex items-center gap-1.5 whitespace-nowrap">
                      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${colorCategoria(i).punto}`} />
                      {c.nombre_categoria}
                      <span className="text-slate-500">({c.genero_categoria})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex w-max gap-1 rounded-lg bg-white/5 p-1" role="group" aria-label="Categoría">
                  {categorias.map((c) => (
                    <button
                      key={c.id_categoria}
                      type="button"
                      aria-pressed={categoriaFiltro === c.id_categoria}
                      onClick={() => setActiveCategoriaId(c.id_categoria)}
                      className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        categoriaFiltro === c.id_categoria
                          ? 'bg-marino-claro text-crema ring-1 ring-inset ring-oro/60'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {c.nombre_categoria} <span className="font-normal opacity-70">({c.genero_categoria})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Contenido de la pestaña ─── */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        {!isLoading && categorias.length === 0 && (
          <p className="rounded-xl border border-dashed border-oro/30 px-6 py-16 text-center text-slate-400">
            Este torneo aún no tiene categorías registradas.
          </p>
        )}
        {id && activeTab === 'calendario' && (
          <PartidosList torneoId={id} urlCalendario={torneo?.url_calendario_excel} categorias={categorias} />
        )}
        {id && categoriaFiltro && activeTab === 'posiciones' && (
          <PosicionesTable torneoId={id} idCategoria={categoriaFiltro} />
        )}
        {id && categoriaFiltro && activeTab === 'estadisticas' && (
          <LideresEstadisticos torneoId={id} idCategoria={categoriaFiltro} />
        )}
      </section>
    </main>
  );
}
