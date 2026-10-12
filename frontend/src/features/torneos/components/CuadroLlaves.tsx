import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Trophy } from 'lucide-react';
import { getFaseFinal } from '../api/torneos.api';
import { Escudo } from './PartidosList';
import { fechaCorta } from './faseFinal';
import type { Llave } from '../../../types/api.types';

const PLACA = 'font-display text-xs font-semibold uppercase tracking-[0.25em] text-oro/80';

// Orden de las columnas del cuadro; el tercer puesto va debajo de la final
const ORDEN_RONDAS = ['Repechaje', 'Cuartos de final', 'Semifinal', 'Final'];
const PLURAL: Record<string, string> = { Semifinal: 'Semifinales' };
// Una columna por ronda desde lg; en móvil las rondas se apilan
const COLUMNAS: Record<number, string> = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3' };

function Equipo({ equipo, referencia, marcador, gano, perdio }: { equipo: Llave['local']; referencia: string; marcador?: number; gano?: boolean; perdio?: boolean }) {
  const tinta = perdio ? 'text-crema/55' : 'text-crema';
  return (
    <div className={`grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 ${equipo ? '' : 'text-slate-500'}`}>
      {equipo ? (
        <Escudo url={equipo.url_logo} className="h-9 w-9" />
      ) : (
        <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-white/25 text-xs text-slate-500">?</span>
      )}
      {equipo ? (
        <Link to={`/equipos/${equipo.id_equipo}`} className={`truncate text-sm font-bold uppercase transition-colors hover:text-celeste ${tinta}`}>
          {equipo.nombre_equipo}
        </Link>
      ) : (
        <span className="truncate text-sm font-semibold">{referencia}</span>
      )}
      <span className={`min-w-[2.5rem] text-right font-display text-2xl font-black tabular-nums ${gano ? 'text-oro' : perdio ? 'text-crema/55' : 'text-slate-500'}`}>
        {marcador ?? '–'}
      </span>
    </div>
  );
}

function Tarjeta({ llave }: { llave: Llave }) {
  const p = llave.partido;
  const finalizado = llave.estado === 'finalizado' && p;
  const ganaLocal = finalizado ? p!.marcador_local >= p!.marcador_visitante : false;
  const cuando =
    llave.estado === 'finalizado' ? 'Finalizado'
    : llave.estado === 'programado' && p ? `${p.fecha ? fechaCorta(p.fecha) : ''}${p.hora ? ` · ${p.hora.slice(0, 5)}` : ''}`
    : llave.estado === 'listo' ? 'Por programar'
    : 'Por definir';
  const esFinal = llave.codigo === 'F';
  return (
    <article className={`overflow-hidden rounded-xl border bg-marino-claro shadow-xl shadow-black/30 ${esFinal ? 'border-oro/60' : 'border-oro/25'}`}>
      <div className={`flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 ${esFinal ? 'bg-gradient-to-r from-oro/20 to-transparent to-70%' : 'bg-black/25'}`}>
        <p className="flex min-w-0 items-center gap-2.5">
          <b className="font-display text-sm text-oro">{esFinal ? 'FINAL' : llave.codigo}</b>
          <span className="truncate text-xs text-slate-400">{llave.cruce}</span>
        </p>
        <span className={`shrink-0 text-xs font-semibold ${llave.estado === 'programado' ? 'text-oro' : 'text-slate-300'}`}>{cuando}</span>
      </div>
      <Equipo equipo={llave.local} referencia={llave.ref_local} marcador={finalizado ? p!.marcador_local : undefined} gano={!!finalizado && ganaLocal} perdio={!!finalizado && !ganaLocal} />
      <div className="border-t border-white/[0.07]">
        <Equipo equipo={llave.visitante} referencia={llave.ref_visitante} marcador={finalizado ? p!.marcador_visitante : undefined} gano={!!finalizado && !ganaLocal} perdio={!!finalizado && ganaLocal} />
      </div>
    </article>
  );
}

// Cuadro de llaves de la fase final: una columna por ronda, el tercer puesto bajo la final
export function CuadroLlaves({ torneoId, idCategoria, onVerPosiciones }: { torneoId: string; idCategoria: number; onVerPosiciones?: () => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['torneos', torneoId, 'fase-final', idCategoria],
    queryFn: () => getFaseFinal(torneoId, idCategoria),
  });
  const fase = data?.data;

  if (isError) return <p className="py-8 text-center text-red-300">No pudimos cargar las llaves.</p>;
  if (isLoading || !fase) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-xl bg-white/10 motion-safe:animate-pulse" />
        ))}
      </div>
    );
  }
  if (!fase.formato) {
    return (
      <div className="rounded-xl border border-dashed border-oro/30 px-6 py-16 text-center">
        <Trophy className="mx-auto mb-3 h-10 w-10 text-oro/70" aria-hidden="true" />
        <h3 className="font-display text-xl font-bold text-crema">Esta categoría no tiene fase final</h3>
        <p className="mt-2 text-slate-400">El cuadro aparece cuando la organización define el formato de la categoría.</p>
      </div>
    );
  }

  const { jugados, esperados, terminada } = fase.fase_grupos;
  const rondas = ORDEN_RONDAS.filter((r) => fase.llaves.some((l) => l.ronda === r));
  const tercero = fase.llaves.find((l) => l.codigo === '3P');

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-crema">Fase final</h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            {terminada
              ? 'Los cruces salen de las posiciones de la fase de grupos. Cada resultado cargado habilita la siguiente ronda.'
              : `Los cruces se arman cuando termine la fase de grupos: ${jugados} de ${esperados} partidos jugados.`}
          </p>
        </div>
        {onVerPosiciones && (
          <button type="button" onClick={onVerPosiciones} className="inline-flex items-center gap-1.5 text-sm font-semibold text-celeste transition-colors hover:text-white">
            Ver posiciones <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className={`grid grid-cols-1 gap-8 lg:gap-10 ${COLUMNAS[rondas.length] ?? 'lg:grid-cols-3'}`}>
        {rondas.map((ronda) => (
          <section key={ronda} aria-label={PLURAL[ronda] ?? ronda} className="flex flex-col">
            <h3 className={`mb-4 ${PLACA}`}>{PLURAL[ronda] ?? ronda}</h3>
            <div className="flex flex-1 flex-col justify-around gap-5">
              {fase.llaves.filter((l) => l.ronda === ronda).map((l) => (
                <Tarjeta key={l.codigo} llave={l} />
              ))}
              {ronda === 'Final' && tercero && (
                <div>
                  <h3 className={`mb-3 ${PLACA}`}>Tercer puesto</h3>
                  <Tarjeta llave={tercero} />
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
