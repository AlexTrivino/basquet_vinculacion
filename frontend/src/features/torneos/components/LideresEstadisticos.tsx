import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { getLideresEstadisticos } from '../api/torneos.api';

type StatTab = 'puntos' | 'triples' | 'rebotes' | 'asistencias' | 'tapones' | 'tiros_libres';

const TABS: { id: StatTab; label: string }[] = [
  { id: 'puntos', label: 'Puntos' },
  { id: 'triples', label: 'Triples' },
  { id: 'rebotes', label: 'Rebotes' },
  { id: 'asistencias', label: 'Asistencias' },
  { id: 'tapones', label: 'Tapones' },
  { id: 'tiros_libres', label: 'Tiros libres' },
];

interface LideresEstadisticosProps {
  torneoId: string;
  idCategoria?: number;
}

export function LideresEstadisticos({ torneoId, idCategoria }: LideresEstadisticosProps) {
  const [activeTab, setActiveTab] = useState<StatTab>('puntos');

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['torneos', torneoId, 'lideres', idCategoria],
    queryFn: () => getLideresEstadisticos(torneoId, idCategoria),
  });

  if (isError) return <p className="py-8 text-center text-red-300">No pudimos cargar las estadísticas.</p>;

  const lideres: any[] = response?.data?.[activeTab] || [];
  const etiqueta = TABS.find((t) => t.id === activeTab)?.label ?? '';

  return (
    <div className="mx-auto max-w-4xl">
      <div className="-mx-4 mb-6 overflow-x-auto px-4">
        <div className="flex w-max gap-1 rounded-lg bg-white/5 p-1" role="group" aria-label="Estadística">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id ? 'bg-oro text-marino' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/10 motion-safe:animate-pulse" />
          ))}
        </div>
      ) : lideres.length === 0 ? (
        <div className="rounded-xl border border-dashed border-oro/30 px-6 py-16 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10 text-oro/70" aria-hidden="true" />
          <h3 className="font-display text-xl font-bold text-crema">Sin líderes en {etiqueta.toLowerCase()}</h3>
          <p className="mt-2 text-slate-400">Aparecen cuando se carguen las planillas de los partidos jugados.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_3rem_3.5rem_3.5rem] gap-3 px-4 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            <span className="col-span-2">Jugador</span>
            <span className="text-center">PJ</span>
            <span className="text-center">Total</span>
            <span className="text-right">Prom.</span>
          </div>
          <ol className="flex flex-col gap-2" aria-label={`Líderes en ${etiqueta.toLowerCase()}`}>
            {lideres.map((jugador, i) => {
              const total = jugador[activeTab] || 0;
              const pj = jugador.partidos_jugados || 1;
              const lider = i === 0;
              return (
                <li
                  key={jugador.id_jugador}
                  className={`grid grid-cols-[2.5rem_minmax(0,1fr)_3rem_3.5rem_3.5rem] items-center gap-3 rounded-xl border px-4 py-3 ${
                    lider ? 'border-oro/60 bg-gradient-to-r from-oro/15 to-marino-claro' : 'border-white/10 bg-marino-claro/80'
                  }`}
                >
                  <span className={`text-center font-display text-2xl font-black ${lider ? 'text-oro' : 'text-slate-400'}`}>{i + 1}</span>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-oro/40">
                      {jugador.url_foto ? (
                        <img src={jugador.url_foto} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-slate-300">{jugador.nombre.substring(0, 2).toUpperCase()}</span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <Link
                        to={`/jugadores/${jugador.id_jugador}`}
                        className="block truncate font-bold uppercase text-crema transition-colors hover:text-celeste"
                      >
                        {jugador.nombre}
                      </Link>
                      <span className="block truncate text-xs text-slate-400">{jugador.nombre_equipo}</span>
                    </span>
                  </span>
                  <span className="text-center tabular-nums text-slate-300">{pj}</span>
                  <span className="text-center font-bold tabular-nums text-crema">{total}</span>
                  <span className="text-right font-display text-lg font-black tabular-nums text-oro">{(total / pj).toFixed(1)}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
