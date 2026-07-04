import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJugadorPerfil } from '../../features/jugadores/api/jugadores.api';
import { Skeleton } from '../../components/Skeleton';
import { Shield, Trophy, Activity, Target, ArrowUp, Hand, Goal, ArrowLeft } from 'lucide-react';

export default function JugadorProfile() {
  const { id } = useParams<{ id: string }>();

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['jugador-perfil', id],
    queryFn: () => getJugadorPerfil(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex flex-col pb-12">
        <div className="w-full bg-primary-900 h-48 sm:h-64" />
        <div className="max-w-4xl mx-auto px-4 w-full -mt-16 sm:-mt-24 z-10">
          <div className="flex flex-col items-center">
            <Skeleton className="w-32 h-32 rounded-full border-4 border-white" />
            <Skeleton className="w-48 h-8 mt-4" />
            <Skeleton className="w-32 h-6 mt-2" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !response?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Jugador no encontrado</h2>
          <Link to="/" className="text-primary-600 hover:underline flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const jugador = response.data;
  const iniciales = `${jugador.nombres.charAt(0)}${jugador.apellidos.charAt(0)}`.toUpperCase();

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-12">
      {/* Abstract Banner */}
      <div className="relative w-full h-48 sm:h-64 overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      {/* Header Info */}
      <div className="max-w-4xl mx-auto px-4 w-full -mt-16 sm:-mt-24 relative z-10">
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full shadow-2xl bg-white border-4 border-white overflow-hidden flex items-center justify-center">
            {jugador.url_foto ? (
              <img src={jugador.url_foto} alt={`${jugador.nombres} ${jugador.apellidos}`} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-black text-gray-400">{iniciales}</span>
            )}
          </div>
          
          <div className="mt-4 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight capitalize">
              {jugador.nombres.toLowerCase()} {jugador.apellidos.toLowerCase()}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              {(jugador.equipo_actual || jugador.torneo_actual) && (
                <div className="mt-6 flex bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden w-full max-w-2xl mx-auto sm:mx-0 divide-x divide-gray-200">
                  {/* Mitad: Equipo */}
                  {jugador.equipo_actual && jugador.id_equipo_actual ? (
                    <Link 
                      to={`/equipos/${jugador.id_equipo_actual}`} 
                      className="flex-1 p-4 flex flex-col items-center justify-center text-center hover:bg-primary-50 transition-colors group cursor-pointer"
                    >
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Equipo Actual
                      </span>
                      <span className="text-lg font-bold text-gray-900 group-hover:text-primary-700 transition-colors">
                        {jugador.equipo_actual}
                      </span>
                    </Link>
                  ) : jugador.equipo_actual ? (
                    <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Equipo Actual
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {jugador.equipo_actual}
                      </span>
                    </div>
                  ) : null}

                  {/* Mitad: Torneo */}
                  {jugador.torneo_actual && jugador.id_torneo_actual ? (
                    <Link 
                      to={`/torneos/${jugador.id_torneo_actual}`} 
                      className="flex-1 p-4 flex flex-col items-center justify-center text-center hover:bg-primary-50 transition-colors group cursor-pointer"
                    >
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Torneo Actual
                      </span>
                      <span className="text-lg font-bold text-gray-900 group-hover:text-primary-700 transition-colors">
                        {jugador.torneo_actual}
                      </span>
                    </Link>
                  ) : jugador.torneo_actual ? (
                    <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Torneo Actual
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {jugador.torneo_actual}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bento Grid Stats */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-600" /> Rendimiento Promedio
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* Partidos Jugados */}
            <div className="col-span-2 md:col-span-1 lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 mb-3">
                <Target className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">Partidos Jugados</p>
              <p className="text-3xl font-black text-gray-900">{jugador.estadisticas.partidos_jugados}</p>
            </div>

            {/* Promedio Puntos */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 mb-3">
                <Goal className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">PTS / Partido</p>
              <p className="text-3xl font-black text-gray-900">{jugador.estadisticas.promedio_puntos}</p>
            </div>

            {/* Promedio Rebotes */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                <ArrowUp className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">REB / Partido</p>
              <p className="text-3xl font-black text-gray-900">{jugador.estadisticas.promedio_rebotes}</p>
            </div>

            {/* Promedio Asistencias */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-3">
                <Hand className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">AST / Partido</p>
              <p className="text-3xl font-black text-gray-900">{jugador.estadisticas.promedio_asistencias}</p>
            </div>

            {/* Promedio Triples */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mb-3">
                <span className="font-bold">3PT</span>
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">3P / Partido</p>
              <p className="text-3xl font-black text-gray-900">{jugador.estadisticas.promedio_triples}</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
