import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Shield, Trophy } from 'lucide-react';
import { getPartidos } from '../partidos/api/partidos.api';
import type { Equipo, Partido } from '../../types/api.types';

const TOTAL_TARJETAS = 4;
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
                –
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

export function SeccionPartidos() {
  const proximos = useQuery({
    queryKey: ['landing', 'partidos', 'proximos'],
    queryFn: () => getPartidos({ estados: 'programado', sort_order: 'asc', per_page: 20 }),
  });
  const resultados = useQuery({
    queryKey: ['landing', 'partidos', 'resultados'],
    queryFn: () => getPartidos({ estados: 'finalizado,finalizado_wo', sort_order: 'desc', per_page: TOTAL_TARJETAS }),
  });

  // ponytail: el API no filtra por fecha; los programados ya pasados se descartan aquí
  const hoy = format(new Date(), 'yyyy-MM-dd');
  const listaProximos = (proximos.data?.data ?? []).filter((p) => (p.fecha ?? '') >= hoy);
  const listaResultados = resultados.data?.data ?? [];
  // Dos próximos y dos resultados; si un lado no alcanza, el otro completa las cuatro tarjetas
  const cuantosProximos = Math.min(listaProximos.length, Math.max(2, TOTAL_TARJETAS - listaResultados.length));
  const lista = [
    ...listaProximos.slice(0, cuantosProximos),
    ...listaResultados.slice(0, TOTAL_TARJETAS - cuantosProximos),
  ];

  const cargando = proximos.isLoading || resultados.isLoading;
  const fallo = (proximos.isError || resultados.isError) && lista.length === 0;

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
          ) : lista.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
              Todavía no hay partidos programados ni resultados publicados.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {lista.map((partido, i) => (
                <TarjetaPartido key={partido.id_partido ?? partido.id ?? i} partido={partido} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
