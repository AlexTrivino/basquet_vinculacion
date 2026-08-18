import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJugadorPerfil } from '../../features/jugadores/api/jugadores.api';
import { useAuth } from '../../context/AuthContext';
import { Skeleton } from '../../components/Skeleton';
import {
  Shield,
  Trophy,
  Activity,
  Target,
  ArrowUp,
  Hand,
  Goal,
  ArrowLeft,
  User,
  Calendar,
  Mail,
  Phone,
  FileText,
  Lock,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

function calcularEdad(fechaStr?: string | null): number | null {
  if (!fechaStr) return null;
  const birth = new Date(fechaStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

const ITEMS_POR_PAGINA = 3;

export default function JugadorProfile() {
  const { id } = useParams<{ id: string }>();
  const { userRole } = useAuth();
  const [torneoSeleccionado, setTorneoSeleccionado] = useState<string>('global');
  const [paginaActual, setPaginaActual] = useState<number>(1);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['jugador-perfil', id],
    queryFn: () => getJugadorPerfil(id!),
    enabled: !!id,
  });

  const jugador = response?.data;

  // Deduplicar y ordenar participaciones por año más reciente
  const participacionesOrdenadas = useMemo(() => {
    if (!jugador?.participaciones) return [];
    const mapa = new Map<string, (typeof jugador.participaciones)[0]>();
    for (const p of jugador.participaciones) {
      const key = `${p.id_plantilla}-${p.id_categoria || '0'}-${p.id_torneo}`;
      if (!mapa.has(key)) {
        mapa.set(key, p);
      }
    }
    return Array.from(mapa.values()).sort((a, b) => {
      const anioA = a.anio || 0;
      const anioB = b.anio || 0;
      if (anioB !== anioA) return anioB - anioA;
      return (b.id_torneo || 0) - (a.id_torneo || 0);
    });
  }, [jugador?.participaciones]);

  // Cálculo de páginas y slice activo (3 por vista)
  const totalPaginas = Math.max(1, Math.ceil(participacionesOrdenadas.length / ITEMS_POR_PAGINA));
  const paginaValida = Math.min(Math.max(paginaActual, 1), totalPaginas);
  const indiceInicio = (paginaValida - 1) * ITEMS_POR_PAGINA;
  const participacionesPaginadas = participacionesOrdenadas.slice(
    indiceInicio,
    indiceInicio + ITEMS_POR_PAGINA
  );

  // Opciones únicas de torneos para el selector de estadísticas
  const torneosConEstadisticas = useMemo(() => {
    if (!jugador?.participaciones) return [];
    return Array.from(
      new Map(
        jugador.participaciones.map((p: any) => [String(p.id_torneo), p])
      ).values()
    );
  }, [jugador?.participaciones]);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex flex-col pb-12">
        <div className="w-full bg-primary-900 h-44 sm:h-52" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full -mt-16 sm:-mt-20 z-10 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col items-center">
              <Skeleton className="w-32 h-32 rounded-2xl mb-4" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
              <Skeleton className="h-6 w-1/3 mb-4" />
              <div className="grid grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
              <Skeleton className="h-6 w-1/2 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
            <Skeleton className="h-6 w-1/4 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !jugador) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-gray-900 uppercase">Jugador no encontrado</h1>
          <p className="text-sm text-gray-500">
            El expediente del deportista que buscas no existe o fue deshabilitado temporalmente.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  const nombreCompletoUpper = (jugador.nombre || '').toUpperCase();
  const iniciales = (jugador.nombre || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w.charAt(0))
    .join('')
    .toUpperCase();

  const puedeVerDatosPrivados = userRole === 'super_admin' || userRole === 'delegado';
  const edad = calcularEdad(jugador.fecha_nacimiento);
  const participacionReciente = participacionesOrdenadas[0];

  // Estadísticas según el selector activo
  const statsMostradas =
    torneoSeleccionado === 'global'
      ? jugador.estadisticas
      : jugador.estadisticas_por_torneo?.[torneoSeleccionado] || {
          partidos_jugados: 0,
          puntos_totales: 0,
          promedio_puntos: 0,
          rebotes_totales: 0,
          asistencias_totales: 0,
          triples_totales: 0,
        };

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-16">
      {/* Banner de Cabecera Deportivo */}
      <div className="relative w-full h-44 sm:h-52 bg-gradient-to-r from-primary-950 via-primary-900 to-primary-800 overflow-hidden shadow-inner">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="profile-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#profile-grid)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-50 text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 px-4 py-2 rounded-xl border border-gray-200/40 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" /> Inicio
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest text-primary-300">
            Ficha Oficial de Jugador
          </span>
        </div>
      </div>

      {/* Contenedor Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 relative z-10 space-y-6">
        
        {/* ═══════════════════════════════════════════════════════════════
            FILA SUPERIOR: FICHA DUAL 3 COLUMNAS (Above the Fold)
            Col 1: Perfil Atleta / Foto
            Col 2: Estadísticas de Juego (6 Bento KPIs)
            Col 3: Ficha Técnica (Admin)
           ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* COLUMNA 1: Tarjeta Atleta / Foto */}
          <div className={`${puedeVerDatosPrivados ? 'lg:col-span-3' : 'lg:col-span-4'} bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col items-center text-center justify-between`}>
            <div className="w-full flex flex-col items-center">
              {/* Foto de Perfil */}
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-md border-4 border-white bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0 mb-3.5">
                {jugador.url_foto ? (
                  <img
                    src={jugador.url_foto}
                    alt={nombreCompletoUpper}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-black text-gray-400 tracking-wider">
                    {iniciales || 'J'}
                  </span>
                )}
              </div>

              {/* Badges de Estado y Dorsal */}
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <span className="text-2xs font-extrabold uppercase tracking-wider bg-primary-50 text-primary-700 border border-primary-200/60 px-2.5 py-0.5 rounded-full">
                  Deportista
                </span>
                {participacionReciente?.numero_camiseta !== null && participacionReciente?.numero_camiseta !== undefined && (
                  <span className="text-2xs font-black bg-gray-900 text-white px-2 py-0.5 rounded-full shadow-xs">
                    #{participacionReciente.numero_camiseta}
                  </span>
                )}
              </div>

              {/* Nombre en Mayúsculas */}
              <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight uppercase leading-snug break-words">
                {nombreCompletoUpper}
              </h1>
            </div>

            {/* Atributos: Edad, Género, Equipo */}
            <div className="w-full mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-gray-600">
              {edad !== null && (
                <span className="inline-flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" /> {edad} años
                </span>
              )}
              {jugador.genero && (
                <span className="inline-flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg capitalize">
                  <User className="w-3.5 h-3.5 text-gray-500" /> {jugador.genero}
                </span>
              )}
              {participacionReciente && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200/60 px-2.5 py-1 rounded-lg text-2xs font-bold truncate max-w-full">
                  <Trophy className="w-3 h-3 text-amber-600 shrink-0" /> {participacionReciente.nombre_equipo}
                </span>
              )}
            </div>
          </div>

          {/* COLUMNA 2: Estadísticas de Juego */}
          <div className={`${puedeVerDatosPrivados ? 'lg:col-span-5' : 'lg:col-span-8'} bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary-600" /> Estadísticas de Juego
                  </h2>
                  <p className="text-2xs text-gray-500 mt-0.5">
                    Métricas acumuladas en competiciones oficiales
                  </p>
                </div>

                {/* Selector de Torneo */}
                {torneosConEstadisticas.length > 0 && (
                  <select
                    id="filtro-torneo"
                    value={torneoSeleccionado}
                    onChange={(e) => setTorneoSeleccionado(e.target.value)}
                    className="rounded-xl border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-gray-800 shadow-2xs focus:border-primary-500 focus:bg-white focus:outline-hidden max-w-[170px] truncate cursor-pointer"
                  >
                    <option value="global">Carrera Completa</option>
                    {torneosConEstadisticas.map((t: any) => (
                      <option key={t.id_torneo} value={String(t.id_torneo)}>
                        {t.nombre_torneo} {t.nombre_categoria ? `(${t.nombre_categoria})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Bento Grid de 6 KPIs */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 my-auto">
                <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 flex flex-col items-center justify-center text-center transition-all hover:bg-white hover:shadow-xs">
                  <div className="w-7 h-7 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center mb-1.5">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-2xs font-bold text-gray-500 uppercase tracking-wider">Partidos</p>
                  <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{statsMostradas.partidos_jugados}</p>
                </div>
                <div className="bg-orange-50/60 rounded-2xl p-3 border border-orange-100 flex flex-col items-center justify-center text-center transition-all hover:bg-white hover:shadow-xs">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mb-1.5">
                    <Goal className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-2xs font-bold text-orange-700 uppercase tracking-wider">Puntos</p>
                  <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{statsMostradas.puntos_totales}</p>
                </div>
                <div className="bg-red-50/60 rounded-2xl p-3 border border-red-100 flex flex-col items-center justify-center text-center transition-all hover:bg-white hover:shadow-xs">
                  <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center mb-1.5">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-2xs font-bold text-red-700 uppercase tracking-wider">PTS/PJ</p>
                  <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{statsMostradas.promedio_puntos}</p>
                </div>
                <div className="bg-blue-50/60 rounded-2xl p-3 border border-blue-100 flex flex-col items-center justify-center text-center transition-all hover:bg-white hover:shadow-xs">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-1.5">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-2xs font-bold text-blue-700 uppercase tracking-wider">Rebotes</p>
                  <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{statsMostradas.rebotes_totales}</p>
                </div>
                <div className="bg-green-50/60 rounded-2xl p-3 border border-green-100 flex flex-col items-center justify-center text-center transition-all hover:bg-white hover:shadow-xs">
                  <div className="w-7 h-7 rounded-lg bg-green-100 text-green-600 flex items-center justify-center mb-1.5">
                    <Hand className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-2xs font-bold text-green-700 uppercase tracking-wider">Asistencias</p>
                  <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{statsMostradas.asistencias_totales}</p>
                </div>
                <div className="bg-purple-50/60 rounded-2xl p-3 border border-purple-100 flex flex-col items-center justify-center text-center transition-all hover:bg-white hover:shadow-xs">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-1.5 font-black text-xs">3PT</div>
                  <p className="text-2xs font-bold text-purple-700 uppercase tracking-wider">Triples</p>
                  <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{statsMostradas.triples_totales}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-2xs text-gray-400 font-medium">
              <span>* Datos actualizados post-partido</span>
              <span className="font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md">
                {statsMostradas.partidos_jugados > 0 ? 'En Actividad' : 'Sin Partidos'}
              </span>
            </div>
          </div>

          {/* COLUMNA 3: Ficha Técnica (Admin) */}
          {puedeVerDatosPrivados ? (
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 mb-3.5 border-b border-gray-100">
                  <Lock className="w-4 h-4 text-primary-600" />
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Ficha Técnica (Admin)</h2>
                </div>
                <dl className="space-y-2.5 text-xs">
                  {jugador.documento_identificacion && (
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-gray-400" /> Cédula/DNI:</dt>
                      <dd className="font-mono font-bold text-gray-900">{jugador.documento_identificacion}</dd>
                    </div>
                  )}
                  {jugador.fecha_nacimiento && (
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" /> Nacimiento:</dt>
                      <dd className="font-medium text-gray-900">{jugador.fecha_nacimiento}</dd>
                    </div>
                  )}
                  {jugador.genero && (
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-gray-400" /> Género:</dt>
                      <dd className="font-medium capitalize text-gray-900">{jugador.genero}</dd>
                    </div>
                  )}
                  {jugador.correo && (
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> Correo:</dt>
                      <dd className="font-medium text-gray-900 truncate max-w-[150px]" title={jugador.correo}>{jugador.correo}</dd>
                    </div>
                  )}
                  {jugador.telefono && (
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> Teléfono:</dt>
                      <dd className="font-medium text-gray-900">{jugador.telefono}</dd>
                    </div>
                  )}
                </dl>
              </div>
              {(jugador.url_cedula || jugador.url_acta_bachiller) && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
                  {jugador.url_cedula && (
                    <a href={jugador.url_cedula} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 transition-colors shadow-2xs">
                      <FileText className="w-3.5 h-3.5 text-primary-600" /> Ver Documento Cédula
                    </a>
                  )}
                  {jugador.url_acta_bachiller && (
                    <a href={jugador.url_acta_bachiller} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 transition-colors shadow-2xs">
                      <FileText className="w-3.5 h-3.5 text-primary-600" /> Ver Acta de Bachiller
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            FILA INFERIOR: HISTORIAL DE EQUIPOS Y CATEGORÍAS (3 por vista)
           ═══════════════════════════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-700">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 tracking-tight">Historial de Equipos y Categorías</h2>
                <p className="text-xs font-semibold text-gray-500">Nóminas y equipos registrados por orden cronológico</p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
                {participacionesOrdenadas.length} {participacionesOrdenadas.length === 1 ? 'Participación' : 'Participaciones'}
              </span>
              {totalPaginas > 1 && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                  <button type="button" onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))} disabled={paginaValida === 1} aria-label="Página anterior" className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-700 shadow-2xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-gray-600 px-1.5">{paginaValida} / {totalPaginas}</span>
                  <button type="button" onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))} disabled={paginaValida === totalPaginas} aria-label="Página siguiente" className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-700 shadow-2xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {participacionesOrdenadas.length === 0 ? (
            <div className="text-center py-10 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Shield className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600">Actualmente no registra equipos activos asignados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {participacionesPaginadas.map((part, idx) => (
                <div key={`part-${part.id_plantilla}-${part.id_categoria || '0'}-${part.id_torneo}-${indiceInicio + idx}`} className="group flex flex-col justify-between p-5 rounded-2xl border border-gray-200 bg-white hover:border-primary-300 hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        {part.url_logo ? (
                          <img src={part.url_logo} alt={part.nombre_equipo} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Shield className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link to={`/equipos/${part.id_equipo}`} className="font-bold text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-1 block text-sm">
                          {part.nombre_equipo}
                        </Link>
                        <Link to={`/torneos/${part.id_torneo}`} className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1 line-clamp-1 mt-0.5">
                          <Trophy className="w-3 h-3 text-amber-500 shrink-0" />{' '}
                          <span className="truncate">{part.nombre_torneo}</span>
                        </Link>
                      </div>
                    </div>
                    {part.numero_camiseta !== null && part.numero_camiseta !== undefined && (
                      <span className="shrink-0 inline-flex items-center justify-center font-black text-xs bg-primary-50 text-primary-800 px-2.5 py-1 rounded-lg border border-primary-200/60 shadow-xs">
                        #{part.numero_camiseta}
                      </span>
                    )}
                  </div>

                  {/* Categoría Badge y Año */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary-700 bg-primary-50/80 px-2.5 py-0.5 rounded-md flex items-center gap-1 truncate max-w-[70%]">
                      <Layers className="w-3 h-3 shrink-0" />{' '}
                      <span className="truncate">{part.nombre_categoria || 'Categoría General'}</span>
                    </span>
                    {part.anio && (
                      <span className="text-gray-400 font-bold shrink-0">{part.anio}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


