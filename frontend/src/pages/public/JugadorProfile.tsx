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

  // Cálculo de páginas y slice activo
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
        jugador.participaciones.map((p) => [String(p.id_torneo), p])
      ).values()
    );
  }, [jugador?.participaciones]);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex flex-col pb-12">
        <div className="w-full bg-primary-900 h-44 sm:h-56" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full -mt-16 sm:-mt-20 z-10 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col items-center">
              <Skeleton className="w-44 h-44 rounded-2xl" />
              <Skeleton className="w-48 h-8 mt-4" />
            </div>
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
              <Skeleton className="w-full h-48 rounded-2xl" />
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
            <Skeleton className="w-full h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !jugador) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Jugador no encontrado</h2>
          <p className="text-sm text-gray-600 mb-6">
            No pudimos encontrar la información del deportista solicitado.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700 transition-colors w-full"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
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
      <div className="relative w-full h-44 sm:h-56 bg-gradient-to-r from-primary-950 via-primary-900 to-primary-800 overflow-hidden shadow-inner">
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
            className="inline-flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-50 text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 px-4 py-2 rounded-xl border border-gray-200/40 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" /> Inicio
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest text-primary-300">
            Ficha Oficial de Jugador
          </span>
        </div>
      </div>

      {/* Contenedor Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 relative z-10 space-y-8">
        {/* ═══════════════════════════════════════════════════════════════
            FILA SUPERIOR: FOTO & NOMBRE (Izquierda) + ESTADÍSTICAS (Derecha)
           ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA IZQUIERDA: Foto + Nombre en Mayúsculas + Ficha Técnica Admin */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-200 text-center flex flex-col items-center">
              {/* Foto de Perfil */}
              <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-md border-4 border-white bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                {jugador.url_foto ? (
                  <img
                    src={jugador.url_foto}
                    alt={nombreCompletoUpper}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl font-black text-gray-400 tracking-wider">
                    {iniciales || 'J'}
                  </span>
                )}
              </div>

              {/* Nombre Completo en MAYÚSCULAS */}
              <h1 className="mt-5 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight uppercase break-words leading-tight">
                {nombreCompletoUpper}
              </h1>
            </div>

            {/* Ficha Técnica Privada (Solo Super Admin / Delegados) */}
            {puedeVerDatosPrivados && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100">
                  <Lock className="w-4 h-4 text-primary-600" />
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Ficha Técnica (Admin)
                  </h2>
                </div>

                <dl className="space-y-3.5 text-sm">
                  {jugador.documento_identificacion && (
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-gray-400" /> Cédula/DNI:
                      </dt>
                      <dd className="font-mono font-bold text-gray-900">
                        {jugador.documento_identificacion}
                      </dd>
                    </div>
                  )}

                  {jugador.fecha_nacimiento && (
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" /> Nacimiento:
                      </dt>
                      <dd className="font-medium text-gray-900">
                        {jugador.fecha_nacimiento} {edad !== null && `(${edad} años)`}
                      </dd>
                    </div>
                  )}

                  {jugador.genero && (
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" /> Género:
                      </dt>
                      <dd className="font-medium capitalize text-gray-900">
                        {jugador.genero}
                      </dd>
                    </div>
                  )}

                  {jugador.correo && (
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400" /> Correo:
                      </dt>
                      <dd className="font-medium text-gray-900 truncate max-w-[160px]" title={jugador.correo}>
                        {jugador.correo}
                      </dd>
                    </div>
                  )}

                  {jugador.telefono && (
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" /> Teléfono:
                      </dt>
                      <dd className="font-medium text-gray-900">
                        {jugador.telefono}
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Enlaces a Documentos PDF/Imágenes si existen */}
                {(jugador.url_cedula || jugador.url_acta_bachiller) && (
                  <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col gap-2">
                    {jugador.url_cedula && (
                      <a
                        href={jugador.url_cedula}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-primary-600" /> Ver Documento Cédula
                      </a>
                    )}
                    {jugador.url_acta_bachiller && (
                      <a
                        href={jugador.url_acta_bachiller}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-primary-600" /> Ver Acta de Bachiller
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: Rendimiento y Estadísticas con Selector */}
          <div className="lg:col-span-8">
            <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary-600" /> Estadísticas de Juego
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Métricas acumuladas del deportista en competiciones oficiales
                  </p>
                </div>

                {/* Selector de Torneo / Filtro */}
                {torneosConEstadisticas.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="filtro-torneo" className="text-xs font-bold text-gray-500 uppercase">
                      Ver:
                    </label>
                    <select
                      id="filtro-torneo"
                      value={torneoSeleccionado}
                      onChange={(e) => setTorneoSeleccionado(e.target.value)}
                      className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-800 shadow-2xs focus:border-primary-500 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="global">Carrera Completa (Global)</option>
                      {torneosConEstadisticas.map((t) => (
                        <option key={t.id_torneo} value={String(t.id_torneo)}>
                          {t.nombre_torneo} {t.nombre_categoria ? `(${t.nombre_categoria})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Bento Grid de Estadísticas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {/* Partidos */}
                <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-100 flex flex-col items-center justify-center text-center transition-all hover:bg-white hover:shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center mb-2.5">
                    <Target className="w-4 h-4" />
                  </div>
                  <p className="text-2xs font-bold text-gray-500 uppercase tracking-wider">Partidos</p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                    {statsMostradas.partidos_jugados}
                  </p>
                </div>

                {/* Puntos */}
                <div className="bg-orange-50/60 rounded-2xl p-4 sm:p-5 border border-orange-100 flex flex-col items-center justify-center text-center transition-all hover:bg-white hover:shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-2.5">
                    <Goal className="w-4 h-4" />
                  </div>
                  <p className="text-2xs font-bold text-orange-700 uppercase tracking-wider">Puntos</p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                    {statsMostradas.puntos_totales}
                  </p>
                </div>

                {/* Promedio PTS */}
                <div className="bg-red-50/60 rounded-2xl p-4 sm:p-5 border border-red-100 flex flex-col items-center justify-center text-center transition-all hover:bg-white hover:shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-2.5">
                    <Activity className="w-4 h-4" />
                  </div>
                  <p className="text-2xs font-bold text-red-700 uppercase tracking-wider">PTS/PJ</p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                    {statsMostradas.promedio_puntos}
                  </p>
                </div>

                {/* Rebotes */}
                <div className="bg-blue-50/60 rounded-2xl p-4 sm:p-5 border border-blue-100 flex flex-col items-center justify-center text-center transition-all hover:bg-white hover:shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2.5">
                    <ArrowUp className="w-4 h-4" />
                  </div>
                  <p className="text-2xs font-bold text-blue-700 uppercase tracking-wider">Rebotes</p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                    {statsMostradas.rebotes_totales}
                  </p>
                </div>

                {/* Asistencias */}
                <div className="bg-green-50/60 rounded-2xl p-4 sm:p-5 border border-green-100 flex flex-col items-center justify-center text-center transition-all hover:bg-white hover:shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-2.5">
                    <Hand className="w-4 h-4" />
                  </div>
                  <p className="text-2xs font-bold text-green-700 uppercase tracking-wider">Asistencias</p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                    {statsMostradas.asistencias_totales}
                  </p>
                </div>

                {/* Triples */}
                <div className="bg-purple-50/60 rounded-2xl p-4 sm:p-5 border border-purple-100 flex flex-col items-center justify-center text-center transition-all hover:bg-white hover:shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-2.5 font-black text-xs">
                    3PT
                  </div>
                  <p className="text-2xs font-bold text-purple-700 uppercase tracking-wider">Triples</p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                    {statsMostradas.triples_totales}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            FILA INFERIOR: PARTICIPACIONES PAGINADAS (4 A LA VEZ)
           ═══════════════════════════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-700">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                  Equipos y Categorías
                </h2>
                <p className="text-xs font-semibold text-gray-500">
                  Historial de participaciones ordenadas cronológicamente (más recientes primero)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
                {participacionesOrdenadas.length}{' '}
                {participacionesOrdenadas.length === 1 ? 'Participación' : 'Participaciones'}
              </span>

              {/* Controles de Paginación */}
              {totalPaginas > 1 && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                  <button
                    type="button"
                    onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
                    disabled={paginaValida === 1}
                    aria-label="Página anterior"
                    className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-700 shadow-2xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-gray-600 px-1.5">
                    {paginaValida} / {totalPaginas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
                    disabled={paginaValida === totalPaginas}
                    aria-label="Página siguiente"
                    className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-700 shadow-2xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {participacionesOrdenadas.length === 0 ? (
            <div className="text-center py-10 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Shield className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600">
                Actualmente no registra equipos activos asignados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {participacionesPaginadas.map((part, idx) => (
                <div
                  key={`part-${part.id_plantilla}-${part.id_categoria || '0'}-${part.id_torneo}-${indiceInicio + idx}`}
                  className="group flex flex-col justify-between p-5 rounded-2xl border border-gray-200 bg-white hover:border-primary-300 hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Logo del Equipo */}
                      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        {part.url_logo ? (
                          <img
                            src={part.url_logo}
                            alt={part.nombre_equipo}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Shield className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          to={`/equipos/${part.id_equipo}`}
                          className="font-bold text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-1 block"
                        >
                          {part.nombre_equipo}
                        </Link>
                        <Link
                          to={`/torneos/${part.id_torneo}`}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1 line-clamp-1 mt-0.5"
                        >
                          <Trophy className="w-3 h-3 text-amber-500 shrink-0" />{' '}
                          <span className="truncate">{part.nombre_torneo}</span>
                        </Link>
                      </div>
                    </div>

                    {/* Número de Camiseta asignado */}
                    {part.numero_camiseta !== null && part.numero_camiseta !== undefined && (
                      <span className="shrink-0 inline-flex items-center justify-center font-black text-sm bg-primary-50 text-primary-800 px-2.5 py-1 rounded-lg border border-primary-200/60 shadow-xs">
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

