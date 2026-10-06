import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { X, Activity } from 'lucide-react';
import { getBoxScore } from '../api/partidos.api';

interface BoxScoreModalProps {
  idPartido: number;
  equipoLocal: string;
  equipoVisitante: string;
  marcadorLocal?: number;
  marcadorVisitante?: number;
  onClose: () => void;
}

const COLUMNAS = [
  ['puntos_anotados', 'PTS', 'Puntos'],
  ['triples_anotados', '3P', 'Triples'],
  ['tiros_libres_anotados', 'TL', 'Tiros libres'],
  ['rebotes', 'REB', 'Rebotes'],
  ['asistencias', 'AST', 'Asistencias'],
  ['tapones', 'TAP', 'Tapones'],
] as const;

// Box score de un equipo: una fila por jugador y la fila de totales al pie
function TablaEquipo({ nombre, filas, gano }: { nombre: string; filas: any[]; gano: boolean }) {
  const totales = COLUMNAS.map(([clave]) => filas.reduce((suma, f) => suma + (f[clave] ?? 0), 0));
  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-marino-claro/80">
      <h3 className={`border-b border-white/10 px-5 py-3 font-display text-lg font-bold ${gano ? 'text-oro' : 'text-crema'}`}>
        {nombre}
      </h3>
      {filas.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">Este equipo aún no tiene estadísticas cargadas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm" aria-label={`Estadísticas de ${nombre}`}>
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <th scope="col" className="w-12 py-2.5 pl-5 pr-2 text-left">#</th>
                <th scope="col" className="py-2.5 pr-3 text-left">Jugador</th>
                {COLUMNAS.map(([, abrev, titulo]) => (
                  <th key={abrev} scope="col" className="px-2 py-2.5 text-center last:pr-5">
                    <abbr title={titulo} className="no-underline">{abrev}</abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id_jugador} className="border-t border-white/5">
                  <td className="py-2.5 pl-5 pr-2 font-semibold tabular-nums text-slate-500">{f.dorsal ?? '-'}</td>
                  <td className="py-2.5 pr-3">
                    <Link to={`/jugadores/${f.id_jugador}`} className="font-semibold uppercase text-crema transition-colors hover:text-celeste">
                      {f.nombre_jugador}
                    </Link>
                  </td>
                  {COLUMNAS.map(([clave]) => (
                    <td
                      key={clave}
                      className={`px-2 py-2.5 text-center tabular-nums last:pr-5 ${
                        clave === 'puntos_anotados' ? 'font-display text-base font-black text-oro' : 'text-slate-300'
                      }`}
                    >
                      {f[clave] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-oro/30 bg-marino/60 font-semibold">
                <td />
                <th scope="row" className="py-2.5 pr-3 text-left text-[11px] uppercase tracking-widest text-slate-400">Totales</th>
                {totales.map((t, i) => (
                  <td key={COLUMNAS[i][0]} className="px-2 py-2.5 text-center tabular-nums text-crema last:pr-5">{t}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

export function BoxScoreModal({ idPartido, equipoLocal, equipoVisitante, marcadorLocal, marcadorVisitante, onClose }: BoxScoreModalProps) {
  const titulo = useId();
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['partido', idPartido, 'box-score'],
    queryFn: () => getBoxScore(idPartido),
  });
  const stats = response?.data;
  const hayMarcador = marcadorLocal !== undefined && marcadorVisitante !== undefined;

  // Escape cierra la ventana
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [onClose]);

  // Portal al body: así ninguna barra fija de la página queda por encima de la ventana
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulo}
        className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-oro/30 bg-marino text-slate-100 shadow-2xl shadow-black/60"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-oro">
            <Activity className="h-4 w-4" aria-hidden="true" /> Estadísticas del partido
          </p>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h2 id={titulo} className="mb-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center font-display text-2xl font-bold text-crema sm:text-3xl">
            <span>{equipoLocal}</span>
            {hayMarcador ? (
              <span className="font-black tabular-nums text-oro">
                {marcadorLocal} <span className="text-slate-600">-</span> {marcadorVisitante}
              </span>
            ) : (
              <span className="text-base font-medium text-slate-500">vs</span>
            )}
            <span>{equipoVisitante}</span>
          </h2>

          {isError ? (
            <p className="py-8 text-center text-red-300">No pudimos cargar las estadísticas.</p>
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="h-56 rounded-xl bg-white/10 motion-safe:animate-pulse" />
              <div className="h-56 rounded-xl bg-white/10 motion-safe:animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TablaEquipo nombre={equipoLocal} filas={stats?.local || []} gano={hayMarcador && marcadorLocal! > marcadorVisitante!} />
              <TablaEquipo nombre={equipoVisitante} filas={stats?.visitante || []} gano={hayMarcador && marcadorVisitante! > marcadorLocal!} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
