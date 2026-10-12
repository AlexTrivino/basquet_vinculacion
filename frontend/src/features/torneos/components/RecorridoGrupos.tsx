import { useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRecorrido } from '../api/torneos.api';
import { Escudo } from './PartidosList';
import { COLORES_LINEA, SITUACION, fechaCorta } from './faseFinal';
import type { Recorrido } from '../../../types/api.types';

// Sigla para rotular cada línea: iniciales de hasta dos palabras ("5 DE JUNIO" → "5J")
const sigla = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter((w) => !['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'EL'].includes(w.toUpperCase()))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

// En pantallas angostas el lienzo se estrecha para que los rótulos no se achiquen al escalar
const consulta = () => window.matchMedia('(max-width: 639px)');
const useAngosto = () =>
  useSyncExternalStore(
    (avisar) => { const m = consulta(); m.addEventListener('change', avisar); return () => m.removeEventListener('change', avisar); },
    () => consulta().matches,
    () => false
  );

// Gráfico de posiciones por fecha: una línea por equipo, la línea de clasificación punteada en oro
function Grafico({ grupo, fechas, cupos }: { grupo: Recorrido['grupos'][number]; fechas: string[]; cupos: number | null }) {
  const n = grupo.equipos.length;
  const W = useAngosto() ? 340 : 600, H = 60 + n * 38, izq = 36, der = 64, arriba = 18, abajo = 34;
  const x = (j: number) => (fechas.length > 1 ? izq + (j * (W - izq - der)) / (fechas.length - 1) : (izq + W - der) / 2);
  const y = (p: number) => arriba + ((p - 1) * (H - arriba - abajo)) / Math.max(1, n - 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Posición de cada equipo después de cada fecha${grupo.grupo ? `, grupo ${grupo.grupo}` : ''}`}>
      {Array.from({ length: n }, (_, i) => i + 1).map((p) => (
        <g key={p}>
          <line x1={izq} y1={y(p)} x2={W - der + 8} y2={y(p)} stroke="rgba(255,255,255,0.08)" />
          <text x={izq - 10} y={y(p) + 4} textAnchor="end" fontFamily="Cinzel, Georgia, serif" fontWeight="700" fontSize="13" fill={cupos && p > cupos ? '#64748B' : '#D6B36A'}>
            {p}
          </text>
        </g>
      ))}
      {cupos && cupos < n && (
        <line x1={izq} y1={(y(cupos) + y(cupos + 1)) / 2} x2={W - der + 8} y2={(y(cupos) + y(cupos + 1)) / 2} stroke="rgba(214,179,106,0.55)" strokeDasharray="4 4" />
      )}
      {fechas.map((f, j) => (
        <text key={f} x={x(j)} y={H - 10} textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="11" fill="#CBD5E1">
          {fechaCorta(f)}
        </text>
      ))}
      {grupo.equipos.map((e, k) => {
        const color = COLORES_LINEA[k % COLORES_LINEA.length];
        const puntos = e.posiciones.map((p, j) => (p ? `${x(j).toFixed(1)},${y(p).toFixed(1)}` : null)).filter(Boolean);
        const ultima = e.posiciones.map((p, j) => [p, j] as const).filter(([p]) => p).pop();
        return (
          <g key={e.id_equipo}>
            <polyline points={puntos.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {e.posiciones.map((p, j) => p && <circle key={j} cx={x(j)} cy={y(p)} r="4" fill="#0E1D3D" stroke={color} strokeWidth="2" />)}
            {ultima && (
              <text x={x(ultima[1]) + 10} y={y(ultima[0]!) + 4} fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="11" fill={color}>
                {sigla(e.nombre_equipo)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Recorrido de cada grupo: el gráfico y la situación de cada equipo
export function RecorridoGrupos({ torneoId, idCategoria }: { torneoId: string; idCategoria: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['torneos', torneoId, 'recorrido', idCategoria],
    queryFn: () => getRecorrido(torneoId, idCategoria),
  });
  const recorrido = data?.data;

  if (isError) return <p className="py-8 text-center text-red-300">No pudimos cargar el recorrido.</p>;
  if (isLoading || !recorrido) {
    return (
      <div className="grid gap-8 xl:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-72 rounded-xl bg-white/10 motion-safe:animate-pulse" />
        ))}
      </div>
    );
  }
  if (recorrido.fechas.length === 0) {
    return <p className="rounded-xl border border-dashed border-oro/30 px-6 py-12 text-center text-slate-400">El recorrido aparece cuando se juegue la primera fecha.</p>;
  }

  const conGrupos = recorrido.grupos.length > 1;
  return (
    <div className={conGrupos ? 'grid gap-10 xl:grid-cols-2 xl:gap-8' : 'mx-auto max-w-4xl'}>
      {recorrido.grupos.map((g) => (
        <section key={g.grupo ?? 'unico'} aria-label={g.grupo ? `Recorrido del grupo ${g.grupo}` : 'Recorrido'}>
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h3 className="font-display text-2xl font-bold text-crema">{g.grupo ? `Grupo ${g.grupo}` : 'Recorrido'}</h3>
            <span className="text-sm text-slate-400">
              {g.terminado ? 'Fase de grupos finalizada' : `Jornada ${recorrido.fechas.length}`}
            </span>
          </div>
          <div className="rounded-xl border border-oro/25 bg-marino-claro/80 px-4 pb-2 pt-4">
            <Grafico grupo={g} fechas={recorrido.fechas} cupos={recorrido.cupos} />
          </div>
          <ol className="mt-3 flex flex-col gap-1.5">
            {g.equipos.map((e, k) => {
              const s = SITUACION[e.situacion];
              return (
                <li key={e.id_equipo} className="grid grid-cols-[14px_2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-marino-claro/60 px-3 py-2">
                  <span aria-hidden="true" className="block h-1 w-3.5 rounded-sm" style={{ background: COLORES_LINEA[k % COLORES_LINEA.length] }} />
                  <Escudo url={e.url_logo} className="h-9 w-9" />
                  <span className="min-w-0">
                    <Link to={`/equipos/${e.id_equipo}`} className="block truncate text-sm font-bold uppercase text-crema transition-colors hover:text-celeste">
                      {e.nombre_equipo}
                    </Link>
                    <span className="block text-xs tabular-nums text-slate-400">
                      {e.PG}-{e.PP}
                      {e.restantes > 0 ? ` · le ${e.restantes === 1 ? 'queda 1 partido' : `quedan ${e.restantes} partidos`}` : ' · terminó sus partidos'}
                    </span>
                  </span>
                  <span className={`rounded-full px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[0.12em] ${s.clase}`}>{s.texto}</span>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
