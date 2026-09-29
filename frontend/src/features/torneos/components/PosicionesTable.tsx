import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { getPosicionesByTorneo } from '../api/torneos.api';
import { Escudo } from './PartidosList';

interface PosicionesTableProps {
  torneoId: string;
  idCategoria?: number;
}

const DIAGONAL = '[clip-path:polygon(1.5%_0,100%_0,98.5%_100%,0_100%)]';

// Escalera de posiciones: un peldaño por equipo, el líder más alto y en oro
export function PosicionesTable({ torneoId, idCategoria }: PosicionesTableProps) {
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['torneos', torneoId, 'posiciones', idCategoria],
    queryFn: () => getPosicionesByTorneo(torneoId, idCategoria),
  });
  const posiciones = response?.data || [];

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

  return (
    <div className="mx-auto max-w-4xl">
      {/* Encabezado de columnas, solo donde hay espacio para ellas */}
      <div className="hidden grid-cols-[3.5rem_3rem_minmax(0,1fr)_repeat(5,3rem)_4.5rem] gap-3 px-5 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500 md:grid">
        <span className="col-span-3">Equipo</span>
        <span className="text-center">PJ</span>
        <span className="text-center">PG</span>
        <span className="text-center">PP</span>
        <span className="text-center">PF</span>
        <span className="text-center">PC</span>
        <span className="text-right">Pts</span>
      </div>

      <ol className="flex flex-col gap-2.5" aria-label="Tabla de posiciones">
        {posiciones.map((fila, i) => {
          const lider = i === 0;
          const dif = `${fila.DIF > 0 ? '+' : ''}${fila.DIF}`;
          return (
            <li key={fila.id_equipo} className={`${DIAGONAL} p-px ${lider ? 'bg-oro/70' : 'bg-white/10'}`}>
              <Link
                to={`/equipos/${fila.id_equipo}`}
                className={`${DIAGONAL} group grid grid-cols-[2.75rem_2.75rem_minmax(0,1fr)_auto] items-center gap-3 px-5 transition-colors md:grid-cols-[3.5rem_3rem_minmax(0,1fr)_repeat(5,3rem)_4.5rem] ${
                  lider
                    ? 'bg-marino-claro bg-gradient-to-r from-oro/20 to-transparent to-60% py-5'
                    : 'bg-marino-claro/85 py-3.5 hover:bg-marino-claro'
                }`}
              >
                <span
                  className={`text-center font-display font-black leading-none ${
                    lider ? 'text-5xl text-oro' : 'text-4xl text-transparent [-webkit-text-stroke:1.2px_rgb(214_179_106/0.8)]'
                  }`}
                >
                  {i + 1}
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
                <span
                  className={`text-right font-display font-black leading-none tabular-nums text-oro ${
                    lider ? 'cifra-brillo text-4xl' : 'text-3xl'
                  }`}
                >
                  {fila.puntos}
                  <span className="sr-only"> puntos</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
