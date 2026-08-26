import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Users, Calendar, Trophy, FileWarning, FileText, ClipboardList, Activity, ArrowRight, BarChart3, AlertCircle, Award } from 'lucide-react';
import { getDashboardStats, getActividadReciente } from '../../features/estadisticas/api/estadisticas.api';
import { getPartidos } from '../../features/partidos/api/partidos.api';
import { Skeleton } from '../../components/Skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  useAuth(); // Consumo obligatorio de contexto
  const navigate = useNavigate();

  const { data: statsResponse, isLoading: isLoadingStats, isError: isErrorStats } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: getDashboardStats,
  });

  const { data: actividadResponse, isLoading: isLoadingActividad } = useQuery({
    queryKey: ['dashboard_actividad_reciente'],
    queryFn: getActividadReciente,
  });

  const { data: partidosResponse, isLoading: isLoadingPartidos } = useQuery({
    queryKey: ['partidos', 'pendientes_stats'],
    queryFn: () => getPartidos({ pendientes_stats: true, limit: 5 }),
  });

  const stats = statsResponse?.data;
  const actividades = actividadResponse?.data || [];
  const partidosPendientes = partidosResponse?.data || [];

  const cards = [
    { 
      name: 'Inscripciones Pendientes', 
      value: stats?.inscripciones_pendientes ?? '0', 
      icon: FileWarning, to: '/admin/auditoria', color: 'text-yellow-600', bg: 'bg-yellow-50' 
    },
    { 
      name: 'Partidos Activos', 
      value: stats?.partidos_hoy ?? '0', 
      icon: Calendar, to: '/admin/partidos', color: 'text-blue-600', bg: 'bg-blue-50' 
    },
    { 
      name: 'Equipos Inscritos', 
      value: stats?.equipos_totales ?? '0', 
      icon: Users, to: '/admin/equipos', color: 'text-green-600', bg: 'bg-green-50' 
    },
  ];

  const quickLinks = [
    { name: 'Programar Partido', icon: Calendar, to: '/admin/partidos', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: 'Auditar Inscripciones', icon: ClipboardList, to: '/admin/auditoria', color: 'text-orange-600', bg: 'bg-orange-50' },
    { name: 'Gestión de Equipos', icon: Users, to: '/admin/equipos', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Directorio Jugadores', icon: Activity, to: '/admin/jugadores', color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { name: 'Auspiciantes', icon: Award, to: '/admin/patrocinadores', color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard de Administración</h1>
        <p className="mt-2 text-gray-600">Resumen global y centro de operaciones de la plataforma.</p>
      </div>

      {isErrorStats && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          No se pudieron cargar las estadísticas. Revisa tu conexión.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-3 mb-8">
        {cards.map((card) => (
          <div key={card.name} className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-3 ${card.bg}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.name}</p>
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  )}
                </div>
              </div>
            </div>
            {card.to !== '#' && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <Link to={card.to} className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                  Ver detalles <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Partidos Pendientes Stats */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-500" />
                Partidos Pendientes de Estadísticas
                {stats?.partidos_sin_estadisticas && stats.partidos_sin_estadisticas > 0 ? (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {stats.partidos_sin_estadisticas} pendientes
                  </span>
                ) : null}
              </h3>
            </div>
            <div className="p-0">
              {isLoadingPartidos ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : partidosPendientes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Trophy className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p>Todos los partidos finalizados tienen sus estadísticas al día.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {partidosPendientes.map((partido) => (
                    <li key={partido.id_partido} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {partido.equipo_local?.nombre} vs {partido.equipo_visitante?.nombre}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {partido.fecha && format(new Date(partido.fecha), "d 'de' MMMM, yyyy", { locale: es })}
                          {' • '}{partido.fase}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/admin/partidos?upload_stats=${partido.id_partido}&id_torneo=${partido.id_torneo}`)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Cargar Estadísticas
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {partidosPendientes.length > 0 && (
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <Link to="/admin/partidos" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                  Ver todos los partidos →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          {/* Quick Links */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">Accesos Rápidos</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.to}
                  className="flex flex-col items-center justify-center p-4 text-center rounded-lg border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all group"
                >
                  <div className={`p-2 rounded-full ${link.bg} group-hover:scale-110 transition-transform`}>
                    <link.icon className={`w-5 h-5 ${link.color}`} />
                  </div>
                  <span className="mt-2 text-xs font-medium text-gray-700">{link.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
              <h3 className="text-lg font-medium text-gray-900">Actividad Reciente</h3>
            </div>
            <div className="p-6 overflow-y-auto grow">
              {isLoadingActividad ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : actividades.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No hay actividad reciente.</p>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {actividades.map((event, eventIdx) => (
                      <li key={eventIdx}>
                        <div className="relative pb-8">
                          {eventIdx !== actividades.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                                ${event.tipo === 'inscripcion' ? 'bg-blue-500' : 'bg-green-500'}`}>
                                {event.tipo === 'inscripcion' ? (
                                  <FileText className="h-4 w-4 text-white" aria-hidden="true" />
                                ) : (
                                  <Trophy className="h-4 w-4 text-white" aria-hidden="true" />
                                )}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-900 font-medium">
                                  {event.titulo}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {event.descripcion}
                                </p>
                              </div>
                              <div className="text-right text-xs whitespace-nowrap text-gray-500">
                                {event.fecha ? format(new Date(event.fecha), "d MMM, HH:mm", { locale: es }) : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
