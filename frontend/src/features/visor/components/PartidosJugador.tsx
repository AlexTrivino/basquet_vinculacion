import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { getPartidosJugador } from '../api/visor.api';

const COLUMNAS = [
  ['puntos', 'PTS'],
  ['rebotes', 'REB'],
  ['asistencias', 'AST'],
  ['triples', '3P'],
  ['tiros_libres', 'TL'],
  ['tapones', 'TAP'],
  ['robos', 'ROB'],
  ['faltas', 'FAL'],
  ['valoracion', 'VAL'],
] as const;

// Partidos jugados con la línea estadística del jugador (solo visor y super_admin)
export function PartidosJugador({ idJugador }: { idJugador: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['visor', 'partidos-jugador', idJugador],
    queryFn: () => getPartidosJugador(idJugador),
  });
  const partidos = data?.data ?? [];

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="mb-5 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary-600" aria-hidden="true" />
        <h2 className="text-lg font-black tracking-tight text-gray-900">Partidos jugados</h2>
        {!isLoading && partidos.length > 0 && <span className="text-sm text-gray-500">({partidos.length})</span>}
      </div>

      {isError ? (
        <p className="text-sm text-red-600">No pudimos cargar los partidos del jugador.</p>
      ) : isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-gray-100 motion-safe:animate-pulse" />
          ))}
        </div>
      ) : partidos.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no hay planillas cargadas con estadísticas de este jugador.</p>
      ) : (
        <div className="-mx-6 overflow-x-auto px-6 sm:-mx-7 sm:px-7">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Partido</th>
                <th className="py-2 pr-3 text-center">Resultado</th>
                {COLUMNAS.map(([, abrev]) => (
                  <th key={abrev} className="px-1.5 py-2 text-center">{abrev}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partidos.map((p) => {
                const propio = p.lado === 'visitante' ? p.equipo_visitante : p.equipo_local;
                const rival = p.lado === 'visitante' ? p.equipo_local : p.equipo_visitante;
                const [mios, suyos] = p.lado === 'visitante' ? [p.marcador_visitante, p.marcador_local] : [p.marcador_local, p.marcador_visitante];
                const gano = p.lado && p.estado.startsWith('finalizado') ? mios > suyos : null;
                return (
                  <tr key={p.id_partido} className="border-b border-gray-100 last:border-0">
                    <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums text-gray-600">
                      {p.fecha ? new Date(`${p.fecha}T12:00:00`).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="font-semibold text-gray-900">
                        {propio?.nombre_equipo ?? 'Equipo'} vs{' '}
                        {rival ? (
                          <Link to={`/equipos/${rival.id_equipo}`} className="hover:text-primary-700 hover:underline">{rival.nombre_equipo}</Link>
                        ) : 'Rival'}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {p.torneo.nombre}{p.categoria ? `, ${p.categoria}` : ''}{p.fase ? `, ${p.fase}` : ''}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-center tabular-nums">
                      {gano !== null && (
                        <span className={`mr-1.5 font-bold ${gano ? 'text-green-700' : 'text-red-700'}`}>{gano ? 'G' : 'P'}</span>
                      )}
                      <span className="text-gray-900">{mios} - {suyos}</span>
                    </td>
                    {COLUMNAS.map(([clave]) => (
                      <td key={clave} className={`px-1.5 py-2.5 text-center tabular-nums ${clave === 'puntos' ? 'font-black text-primary-700' : 'text-gray-700'}`}>
                        {p.linea[clave]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
