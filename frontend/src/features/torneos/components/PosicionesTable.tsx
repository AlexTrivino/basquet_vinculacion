import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Trophy } from 'lucide-react';
import { getPosicionesByTorneo } from '../api/torneos.api';
import { Escudo } from './PartidosList';
import { RecorridoGrupos } from './RecorridoGrupos';
import { CUPOS, LEYENDA_CRUCES } from './faseFinal';
import type { FormatoFaseFinal, PosicionFIBA } from '../../../types/api.types';

interface PosicionesTableProps {
  torneoId: string;
  idCategoria?: number;
  formato?: FormatoFaseFinal | null;
  onVerLlaves?: () => void;
}

const DIAGONAL = '[clip-path:polygon(1.5%_0,100%_0,98.5%_100%,0_100%)]';
// Con dos grupos las columnas se estrechan para que ambas tablas quepan lado a lado
const GRID = {
  ancha: 'md:grid-cols-[3.5rem_3rem_minmax(0,1fr)_repeat(5,3rem)_4.5rem]',
  compacta: 'md:grid-cols-[3rem_3rem_minmax(0,1fr)_repeat(5,2.5rem)_3.5rem] md:gap-2',
};

function Fila({ fila, lider, fuera, compacta }: { fila: PosicionFIBA; lider: boolean; fuera: boolean; compacta: boolean }) {
  const dif = `${fila.DIF > 0 ? '+' : ''}${fila.DIF}`;
  return (
    <li className={`${DIAGONAL} p-px ${lider ? 'bg-oro/70' : 'bg-white/10'} ${fuera ? 'opacity-50' : ''}`}>
      <Link
        to={`/equipos/${fila.id_equipo}`}
        className={`${DIAGONAL} group grid grid-cols-[2.75rem_2.75rem_minmax(0,1fr)_auto] items-center gap-3 px-5 transition-colors ${compacta ? GRID.compacta : GRID.ancha} ${
          lider ? 'bg-marino-claro bg-gradient-to-r from-oro/20 to-transparent to-60% py-5' : 'bg-marino-claro/85 py-3.5 hover:bg-marino-claro'
        }`}
      >
        <span
          className={`text-center font-display font-black leading-none ${
            lider ? 'text-5xl text-oro' : 'text-4xl text-transparent [-webkit-text-stroke:1.2px_rgb(214_179_106/0.8)]'
          }`}
        >
          {fila.posicion}
        </span>
        <Escudo url={fila.url_logo} className={lider ? 'h-12 w-12' : 'h-11 w-11'} />
        <span className="min-w-0">
          <span className="line-clamp-2 font-bold uppercase leading-snug text-crema transition-colors group-hover:text-white">
            {fila.nombre_equipo}
          </span>
          {/* En móvil las columnas se resumen en una línea */}
          <span className="mt-1 block text-xs tabular-nums text-slate-400 md:hidden">
            {fila.PJ} PJ, {fila.PG} G, {fila.PP} P, {dif}
          </span>
          <span className="mt-1 hidden text-xs tabular-nums text-slate-400 md:block">Diferencia {dif}</span>
        </span>
        {[fila.PJ, fila.PG, fila.PP, fila.PF, fila.PC].map((v, k) => (
          <span key={k} className="hidden text-center tabular-nums text-slate-300 md:block">
            {v}
          </span>
        ))}
        <span className={`text-right font-display font-black leading-none tabular-nums text-oro ${lider ? 'cifra-brillo text-4xl' : 'text-3xl'}`}>
          {fila.puntos}
          <span className="sr-only"> puntos</span>
        </span>
      </Link>
    </li>
  );
}

// Una tabla (de un grupo o de la categoría entera) con la línea de clasificación
function Tabla({ filas, grupo, cupos, compacta }: { filas: PosicionFIBA[]; grupo: string | null; cupos?: number; compacta: boolean }) {
  const jugados = filas.reduce((s, f) => s + f.PJ, 0) / 2;
  const esperados = (filas.length * (filas.length - 1)) / 2;
  const hayCorte = cupos !== undefined && cupos < filas.length;
  return (
    <section aria-label={grupo ? `Grupo ${grupo}` : 'Tabla de posiciones'}>
      {grupo && (
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h3 className="font-display text-2xl font-bold text-crema">Grupo {grupo}</h3>
          <span className="text-sm text-slate-400">
            {jugados >= esperados ? 'Fase de grupos finalizada' : `${jugados} de ${esperados} partidos jugados`}
          </span>
        </div>
      )}
      <div className={`hidden grid-cols-[3.5rem_3rem_minmax(0,1fr)_repeat(5,3rem)_4.5rem] gap-3 px-5 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500 md:grid ${compacta ? GRID.compacta : ''}`}>
        <span className="col-span-3">Equipo</span>
        <span className="text-center">PJ</span>
        <span className="text-center">PG</span>
        <span className="text-center">PP</span>
        <span className="text-center">PF</span>
        <span className="text-center">PC</span>
        <span className="text-right">Pts</span>
      </div>
      <ol className="flex flex-col gap-2.5">
        {filas.map((fila, i) => (
          <Fragment key={fila.id_equipo}>
            {hayCorte && i === cupos && (
              <li aria-hidden="true" className="flex items-center gap-3 py-1">
                <span className="flex-1 border-t border-dashed border-oro/50" />
                <span className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-oro/85">Línea de clasificación</span>
                <span className="flex-1 border-t border-dashed border-oro/50" />
              </li>
            )}
            <Fila fila={fila} lider={i === 0} fuera={hayCorte && i >= cupos} compacta={compacta} />
          </Fragment>
        ))}
      </ol>
    </section>
  );
}

// Escalera de posiciones: un peldaño por equipo, el líder más alto y en oro
export function PosicionesTable({ torneoId, idCategoria, formato, onVerLlaves }: PosicionesTableProps) {
  const [vista, setVista] = useState<'tabla' | 'recorrido'>('tabla');
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['torneos', torneoId, 'posiciones', idCategoria],
    queryFn: () => getPosicionesByTorneo(torneoId, idCategoria),
  });
  const posiciones = response?.data || [];
  const cupos = formato ? CUPOS[formato] : undefined;

  if (isError) return <p className="py-8 text-center text-red-300">No pudimos cargar la tabla de posiciones.</p>;

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-white/10 motion-safe:animate-pulse" />
        ))}
      </div>
    );
  }

  if (posiciones.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-oro/30 px-6 py-16 text-center">
        <Trophy className="mx-auto mb-3 h-10 w-10 text-oro/70" aria-hidden="true" />
        <h3 className="font-display text-xl font-bold text-crema">Sin posiciones todavía</h3>
        <p className="mt-2 text-slate-400">La tabla aparece cuando se juegue el primer partido de esta categoría.</p>
      </div>
    );
  }

  // Las filas vienen ordenadas por grupo y posición; sin grupos, todas llevan grupo nulo
  const grupos = Array.from(new Set(posiciones.map((f) => f.grupo ?? null)));
  const conGrupos = grupos.length > 1 || grupos[0] !== null;
  const hayPartidos = posiciones.some((f) => f.PJ > 0);
  const segmento = (id: typeof vista, texto: string) => (
    <button
      type="button"
      aria-pressed={vista === id}
      onClick={() => setVista(id)}
      className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        vista === id ? 'bg-marino-claro text-crema ring-1 ring-inset ring-oro/60' : 'text-slate-400 hover:text-white'
      }`}
    >
      {texto}
    </button>
  );

  return (
    <div className={conGrupos ? '' : 'mx-auto max-w-4xl'}>
      {hayPartidos && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-slate-400">
            {vista === 'tabla' ? (
              <>
                {cupos && conGrupos ? <><b className="font-semibold text-crema">Clasifican los {cupos} primeros de cada grupo.</b> </> : null}
                {cupos && !conGrupos ? <><b className="font-semibold text-crema">Clasifican los {cupos} primeros.</b> </> : null}
                {!cupos && 'Tabla de posiciones.'}
              </>
            ) : (
              <><b className="font-semibold text-crema">Recorrido.</b> La posición de cada equipo después de cada fecha y lo que todavía puede pasar.</>
            )}
          </p>
          <div className="flex gap-1 rounded-lg bg-white/5 p-1" role="group" aria-label="Vista de posiciones">
            {segmento('tabla', 'Tabla')}
            {segmento('recorrido', 'Recorrido')}
          </div>
        </div>
      )}

      {vista === 'recorrido' && idCategoria ? (
        <RecorridoGrupos torneoId={torneoId} idCategoria={idCategoria} />
      ) : (
        <div className={conGrupos ? 'grid gap-10 xl:grid-cols-2 xl:gap-8' : ''}>
          {grupos.map((g) => (
            <Tabla key={g ?? 'unico'} grupo={g} filas={posiciones.filter((f) => (f.grupo ?? null) === g)} cupos={cupos} compacta={conGrupos} />
          ))}
        </div>
      )}

      {vista === 'tabla' && formato && LEYENDA_CRUCES[formato] && (
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-oro/25 bg-marino-claro/80 px-6 py-5">
          <p className="max-w-3xl text-slate-300">{LEYENDA_CRUCES[formato]}</p>
          {onVerLlaves && (
            <button type="button" onClick={onVerLlaves} className="inline-flex items-center gap-1.5 text-sm font-semibold text-celeste transition-colors hover:text-white">
              Ver llaves <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
