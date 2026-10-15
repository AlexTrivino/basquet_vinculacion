import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, ArrowRight, FileText, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDashboardStats, getActividadReciente } from '../../features/estadisticas/api/estadisticas.api';
import { getPartidos } from '../../features/partidos/api/partidos.api';
import { EstudioFlyers } from '../../features/flyers/components/EstudioFlyers';
import { Skeleton } from '../../components/Skeleton';
import type { Partido } from '../../types/api.types';

const PANEL = 'rounded-xl border border-oro/25 bg-marino-claro/80 shadow-[0_20px_25px_-5px_rgb(0_0_0/0.3)]';
const fechaPartido = (f?: string) => (f ? format(new Date(`${f}T12:00:00`), "d 'de' MMMM", { locale: es }) : '');

// Cifra de conjunto dentro de la frase: Inter 600 crema, y lleva a la pantalla donde se atiende
function Cifra({ n, a }: { n?: number; a: string }) {
  return (
    <Link to={a} className="font-semibold tabular-nums text-crema underline decoration-oro/50 underline-offset-4 transition-colors hover:text-celeste">
      {n ?? '…'}
    </Link>
  );
}

function Pendiente({ partido, motivo, accion, primaria }: { partido: Partido; motivo: string; accion: string; primaria?: boolean }) {
  const navigate = useNavigate();
  return (
    <li className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${primaria ? 'bg-rose-500/15 text-rose-100' : 'bg-amber-400/15 text-amber-100'}`}>
          {motivo}
        </span>
        <p className="mt-1.5 truncate text-sm font-semibold text-crema">
          {partido.equipo_local?.nombre_equipo || 'Local'} vs {partido.equipo_visitante?.nombre_equipo || 'Visitante'}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-slate-400">
          {[fechaPartido(partido.fecha), partido.hora?.slice(0, 5), partido.fase].filter(Boolean).join(' · ')}
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate(`/admin/partidos?id_torneo=${partido.id_torneo}&search=${partido.equipo_local?.nombre_equipo ?? ''}`)}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
          primaria ? 'bg-celeste text-marino hover:bg-white' : 'border border-white/25 text-white hover:bg-white/10'
        }`}
      >
        {accion}
      </button>
    </li>
  );
}

export default function Dashboard() {
  useAuth(); // Consumo obligatorio de contexto

  const { data: statsResponse, isError: isErrorStats } = useQuery({ queryKey: ['dashboard_stats'], queryFn: getDashboardStats });
  const { data: actividadResponse, isLoading: isLoadingActividad } = useQuery({
    queryKey: ['dashboard_actividad_reciente'],
    queryFn: getActividadReciente,
  });
  const { data: partidosResponse, isLoading: isLoadingPartidos } = useQuery({
    queryKey: ['partidos', 'pendientes_stats'],
    queryFn: () => getPartidos({ pendientes_stats: true, per_page: 5 }),
  });
  const { data: programadosRes, isLoading: isLoadingProgramados } = useQuery({
    queryKey: ['partidos', 'programados'],
    queryFn: () => getPartidos({ estados: 'programado', per_page: 50 }),
  });

  const stats = statsResponse?.data;
  const actividades = actividadResponse?.data || [];
  const partidosSinStats = partidosResponse?.data || [];
  // Programados que empezaron hace más de 3 horas y siguen sin finalizar
  const partidosPendientesFinalizar = (programadosRes?.data || []).filter((p) => {
    if (!p.fecha || !p.hora) return false;
    return Date.now() > new Date(`${p.fecha}T${p.hora}`).getTime() + 3 * 60 * 60 * 1000;
  });
  const totalPendientes = partidosSinStats.length + partidosPendientesFinalizar.length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-crema sm:text-4xl">Panel de administración</h1>
        {isErrorStats ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-rose-100">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            No se pudieron cargar los conteos. Revisa tu conexión.
          </p>
        ) : (
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-300">
            Hay <Cifra n={stats?.inscripciones_pendientes} a="/admin/auditoria" /> inscripciones por revisar,{' '}
            <Cifra n={stats?.partidos_hoy} a="/admin/partidos" /> partidos programados y <Cifra n={stats?.equipos_totales} a="/admin/equipos" /> equipos
            registrados.
          </p>
        )}
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <EstudioFlyers />

        <div className="space-y-6">
          <section aria-labelledby="titulo-pendientes" className={PANEL}>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <h2 id="titulo-pendientes" className="font-display text-xl font-bold text-crema">Atención requerida</h2>
              {totalPendientes > 0 && (
                <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-rose-100">{totalPendientes}</span>
              )}
            </div>
            {isLoadingPartidos || isLoadingProgramados ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : totalPendientes === 0 ? (
              <div className="px-5 py-8 text-center">
                <Trophy className="mx-auto h-8 w-8 text-oro" aria-hidden="true" />
                <p className="mt-3 font-semibold text-crema">Todo al día</p>
                <p className="mt-1 text-sm text-slate-400">No hay partidos por finalizar ni sin estadísticas.</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/10">
                {partidosPendientesFinalizar.map((p) => (
                  <Pendiente key={`fin-${p.id_partido}`} partido={p} motivo="Pasaron 3 h sin finalizar" accion="Ir al partido" />
                ))}
                {partidosSinStats.map((p) => (
                  <Pendiente key={`stats-${p.id_partido}`} partido={p} motivo="Finalizado sin estadísticas" accion="Cargar resultados" primaria />
                ))}
              </ul>
            )}
            {totalPendientes > 0 && (
              <Link
                to="/admin/partidos"
                className="flex items-center gap-1.5 border-t border-white/10 px-5 py-3 text-sm font-semibold text-celeste transition-colors hover:text-white"
              >
                Ir al gestor de partidos <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </section>

          <section aria-labelledby="titulo-actividad" className={PANEL}>
            <h2 id="titulo-actividad" className="border-b border-white/10 px-5 py-4 font-display text-xl font-bold text-crema">
              Actividad reciente
            </h2>
            {isLoadingActividad ? (
              <div className="space-y-4 p-5">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : actividades.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-400">No hay actividad reciente.</p>
            ) : (
              <ul className="max-h-[26rem] divide-y divide-white/10 overflow-y-auto">
                {actividades.map((evento, i) => (
                  <li key={i} className="flex gap-3 px-5 py-3.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 ring-1 ring-oro/30">
                      {evento.tipo === 'inscripcion' ? (
                        <FileText className="h-4 w-4 text-oro" aria-hidden="true" />
                      ) : (
                        <Trophy className="h-4 w-4 text-oro" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-crema">{evento.titulo}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{evento.descripcion}</p>
                    </div>
                    <time className="shrink-0 text-xs tabular-nums text-slate-400">
                      {evento.fecha ? format(new Date(evento.fecha), 'd MMM, HH:mm', { locale: es }) : ''}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
