import { useRef, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Camera,
  Calendar,
  Trophy,
  Users,
  Trash2,
  ShieldAlert,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
  Activity,
  MapPin,
  Clock,
  ArrowRight,
  User,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../context/AuthContext';
import {
  getEquipoById,
  uploadLogoEquipo,
  uploadBannerEquipo,
  deleteLogoEquipo,
  deleteBannerEquipo,
  getInscripcionesPublicas,
} from '../../features/equipos/api/equipos.api';
import { getPartidosByEquipo } from '../../features/partidos/api/partidos.api';
import { getPlantillas } from '../../features/plantillas/api/plantillas.api';
import axiosInstance from '../../api/axios.config';

import { Skeleton } from '../../components/Skeleton';
import { DesactivarEquipoModal } from '../../features/equipos/components/DesactivarEquipoModal';

// 🚩 FEATURE FLAG: Subida de imágenes de equipo por delegados.
const TEAM_UPLOADS_ENABLED = true;

const MAX_LOGO_SIZE = 2 * 1024 * 1024;   // 2 MB
const MAX_BANNER_SIZE = 5 * 1024 * 1024; // 5 MB
const ITEMS_POR_PAGINA_PARTICIPACIONES = 3;

export default function EquipoProfile({ teamId, dashboardStatus }: { teamId?: number, dashboardStatus?: string }) {
  const { id } = useParams<{ id: string }>();
  const idEquipo = teamId || Number(id);
  const { isAuthenticated, userRole } = useAuth();
  const queryClient = useQueryClient();

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [torneoRosterFiltro, setTorneoRosterFiltro] = useState<string>('todos');
  const [paginaParticipaciones, setPaginaParticipaciones] = useState<number>(1);

  // Queries
  const { data: equipoRes, isLoading: loadingEquipo } = useQuery({
    queryKey: ['equipo', idEquipo],
    queryFn: () => getEquipoById(idEquipo),
    enabled: !!idEquipo,
  });
  const equipo = equipoRes?.data;

  const { data: plantillasRes, isLoading: loadingPlantilla } = useQuery({
    queryKey: ['plantillas', idEquipo],
    queryFn: () => getPlantillas(idEquipo, 1, 100),
    enabled: !!idEquipo,
  });
  const plantillas = plantillasRes?.data || [];

  const { data: partidosRes, isLoading: loadingPartidos } = useQuery({
    queryKey: ['partidos', idEquipo],
    queryFn: () => getPartidosByEquipo(idEquipo),
    enabled: !!idEquipo,
  });
  const partidos = partidosRes?.data || [];

  const { data: inscRes, isLoading: loadingInscripciones } = useQuery({
    queryKey: ['inscripciones-publicas', idEquipo],
    queryFn: () => getInscripcionesPublicas(undefined, idEquipo),
    enabled: !!idEquipo,
  });
  const inscripciones = inscRes?.data || [];

  const { data: userMe } = useQuery({
    queryKey: ['usuario-me'],
    queryFn: async () => {
      const res = await axiosInstance.get('/usuarios/me');
      return res.data?.data;
    },
    enabled: isAuthenticated,
  });

  // Check if owner
  const isOwner =
    userRole === 'super_admin' ||
    (userRole === 'delegado' && equipo?.id_usuario === userMe?.id_usuario);

  // Mutations
  const uploadLogo = useMutation({
    mutationFn: (file: File) => uploadLogoEquipo(idEquipo, file),
    onSuccess: () => {
      toast.success('Logo actualizado');
      queryClient.invalidateQueries({ queryKey: ['equipo', idEquipo] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '';
      toast.error(
        message.toLowerCase().includes('tamaño') || message.toLowerCase().includes('size')
          ? 'El logo excede el tamaño máximo permitido (2 MB).'
          : 'Error al subir el logo'
      );
    },
  });

  const deleteLogo = useMutation({
    mutationFn: () => deleteLogoEquipo(idEquipo),
    onSuccess: () => {
      toast.success('Logo eliminado');
      queryClient.invalidateQueries({ queryKey: ['equipo', idEquipo] });
    },
    onError: () => toast.error('Error al eliminar el logo'),
  });

  const uploadBanner = useMutation({
    mutationFn: (file: File) => uploadBannerEquipo(idEquipo, file),
    onSuccess: () => {
      toast.success('Banner actualizado');
      queryClient.invalidateQueries({ queryKey: ['equipo', idEquipo] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '';
      toast.error(
        message.toLowerCase().includes('tamaño') || message.toLowerCase().includes('size')
          ? 'El banner excede el tamaño máximo permitido (5 MB).'
          : 'Error al subir el banner'
      );
    },
  });

  const deleteBanner = useMutation({
    mutationFn: () => deleteBannerEquipo(idEquipo),
    onSuccess: () => {
      toast.success('Banner eliminado');
      queryClient.invalidateQueries({ queryKey: ['equipo', idEquipo] });
    },
    onError: () => toast.error('Error al eliminar el banner'),
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('El logo excede el tamaño máximo permitido (2 MB).');
      if (logoInputRef.current) logoInputRef.current.value = '';
      return;
    }
    uploadLogo.mutate(file);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BANNER_SIZE) {
      toast.error('El banner excede el tamaño máximo permitido (5 MB).');
      if (bannerInputRef.current) bannerInputRef.current.value = '';
      return;
    }
    uploadBanner.mutate(file);
  };

  // ── Partidos procesados ─────────────────────────────────────────
  const { programados, ultimoPartido, resultadoUltimoPartido } = useMemo(() => {
    const fin = (partidos || [])
      .filter((p) => p.estado === 'finalizado' || p.estado === 'finalizado_wo')
      .sort((a, b) => {
        const dateA = new Date(`${a.fecha}T${a.hora || '00:00'}`).getTime();
        const dateB = new Date(`${b.fecha}T${b.hora || '00:00'}`).getTime();
        return dateB - dateA;
      });

    const prog = (partidos || [])
      .filter((p) => p.estado === 'programado')
      .sort((a, b) => {
        const dateA = new Date(`${a.fecha}T${a.hora || '00:00'}`).getTime();
        const dateB = new Date(`${b.fecha}T${b.hora || '00:00'}`).getTime();
        return dateA - dateB;
      });

    const ult = fin[0] || null;
    let resUlt: 'victoria' | 'derrota' | 'empate' | null = null;

    if (ult) {
      const esLocal =
        (ult as any).id_equipo_local === idEquipo || ult.equipo_local?.id_equipo === idEquipo;
      const misPuntos = esLocal ? (ult.marcador_local ?? 0) : (ult.marcador_visitante ?? 0);
      const rivalPuntos = esLocal ? (ult.marcador_visitante ?? 0) : (ult.marcador_local ?? 0);

      if (misPuntos > rivalPuntos) resUlt = 'victoria';
      else if (misPuntos < rivalPuntos) resUlt = 'derrota';
      else resUlt = 'empate';
    }

    return {
      finalizados: fin,
      programados: prog,
      ultimoPartido: ult,
      resultadoUltimoPartido: resUlt,
    };
  }, [partidos, idEquipo]);

  // ── Participaciones procesadas y deduplicadas ────────────────────
  const participacionesOrdenadas = useMemo(() => {
    const mapa = new Map<string, (typeof inscripciones)[0] & { anio?: number }>();

    inscripciones.forEach((ins) => {
      // Considerar inscripciones aprobadas o activas
      const estado = ins.estado_inscripcion || ins.estado;
      if (estado !== 'aprobado') return;

      const clave = `${ins.id_torneo}-${ins.id_categoria}`;
      if (!mapa.has(clave)) {
        let anio = 0;
        if (ins.torneo?.fecha_inicio) {
          const parsedYear = new Date(ins.torneo.fecha_inicio).getFullYear();
          if (!isNaN(parsedYear)) anio = parsedYear;
        } else if (ins.torneo?.nombre) {
          const match = ins.torneo.nombre.match(/\b(20\d{2})\b/);
          if (match) anio = parseInt(match[1], 10);
        }

        mapa.set(clave, {
          ...ins,
          anio: anio > 0 ? anio : undefined,
        });
      }
    });

    return Array.from(mapa.values()).sort((a, b) => {
      const yearA = a.anio || 0;
      const yearB = b.anio || 0;
      if (yearB !== yearA) return yearB - yearA;
      return (b.id_torneo || 0) - (a.id_torneo || 0);
    });
  }, [inscripciones]);

  // ── Paginación de Participaciones ───────────────────────────────
  const totalPaginasParticipaciones = Math.max(
    1,
    Math.ceil(participacionesOrdenadas.length / ITEMS_POR_PAGINA_PARTICIPACIONES)
  );
  const paginaValidaParticipaciones = Math.min(
    Math.max(1, paginaParticipaciones),
    totalPaginasParticipaciones
  );
  const indiceInicioParticipaciones =
    (paginaValidaParticipaciones - 1) * ITEMS_POR_PAGINA_PARTICIPACIONES;
  const participacionesPaginadas = participacionesOrdenadas.slice(
    indiceInicioParticipaciones,
    indiceInicioParticipaciones + ITEMS_POR_PAGINA_PARTICIPACIONES
  );

  // ── Opciones de Torneo para Filtro de Roster ────────────────────
  const torneosDisponiblesRoster = useMemo(() => {
    const torneosMap = new Map<number, string>();
    plantillas.forEach((p) => {
      if (p.id_torneo) {
        torneosMap.set(p.id_torneo, `Torneo #${p.id_torneo}`);
      }
    });
    inscripciones.forEach((i) => {
      if (i.id_torneo && i.torneo?.nombre) {
        torneosMap.set(i.id_torneo, i.torneo.nombre);
      }
    });
    return Array.from(torneosMap.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [plantillas, inscripciones]);

  // ── Plantillas filtradas para Roster ────────────────────────────
  const plantillasFiltradas = useMemo(() => {
    let list = plantillas;
    if (torneoRosterFiltro !== 'todos') {
      list = list.filter((p) => String(p.id_torneo) === String(torneoRosterFiltro));
    }

    // Deduplicar jugadores si está en 'todos'
    const vistos = new Set<number>();
    return list.filter((p) => {
      const jId = p.jugador?.id_jugador || p.id_jugador;
      if (!jId) return true;
      if (torneoRosterFiltro === 'todos') {
        if (vistos.has(jId)) return false;
        vistos.add(jId);
      }
      return true;
    });
  }, [plantillas, torneoRosterFiltro]);

  // ── Torneos Activos ───────────────────────────────────────────────
  const torneosActivos = useMemo(() => {
    return participacionesOrdenadas.filter((p) => {
      const estadoTorneo = p.torneo?.estado;
      return estadoTorneo === 'programado' || estadoTorneo === 'en_curso';
    });
  }, [participacionesOrdenadas]);

  if (loadingEquipo) {
    return (
      <div className="w-full bg-gray-50 flex flex-col pb-16">
        <Skeleton className="w-full aspect-[21/9] sm:aspect-[21/6]" />
        <div className="max-w-7xl mx-auto px-4 w-full -mt-16 sm:-mt-24 z-10">
          <Skeleton className="w-32 h-32 sm:w-44 sm:h-44 rounded-2xl border-4 border-white" />
        </div>
      </div>
    );
  }

  if (!equipo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center bg-white p-8 rounded-3xl border border-gray-200 shadow-sm max-w-md w-full">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Equipo no encontrado</h2>
          <p className="text-gray-500 text-sm mb-6">
            El equipo solicitado no existe o ha sido deshabilitado del sistema.
          </p>
          <Link
            to="/directorio-equipos"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-sm transition-all"
          >
            Volver al Directorio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 pb-16">
      {/* Banner Section */}
      <div className="relative aspect-[21/9] sm:aspect-[21/6] w-full overflow-hidden group bg-slate-900">
        {equipo.url_foto_equipo ? (
          <img
            src={equipo.url_foto_equipo}
            alt={`Banner de ${equipo.nombre_equipo}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-600/20 via-transparent to-transparent" />
          </div>
        )}

        {isOwner && TEAM_UPLOADS_ENABLED && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col items-center justify-center gap-3">
            <input
              type="file"
              className="hidden"
              ref={bannerInputRef}
              accept="image/*"
              onChange={handleBannerChange}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => bannerInputRef.current?.click()}
                className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2.5 rounded-full font-semibold hover:bg-gray-100 shadow-xl transition-transform hover:scale-105 text-sm cursor-pointer"
                title="Cambiar portada"
              >
                <Camera className="w-4 h-4 text-gray-700" />
                <span>Cambiar portada</span>
              </button>
              {equipo.url_foto_equipo && (
                <button
                  onClick={() => deleteBanner.mutate()}
                  className="bg-red-500 text-white p-2.5 rounded-full hover:bg-red-600 shadow-xl transition-transform hover:scale-105 cursor-pointer"
                  title="Eliminar portada"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <span className="text-white/90 text-xs font-medium drop-shadow-md bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
              Máximo: 5 MB (JPG, PNG, WebP)
            </span>
          </div>
        )}
      </div>

      {/* Banner de Advertencia si está Inactivo */}
      {equipo.estado === 'inactivo' && (
        <div className="w-full bg-amber-500 text-slate-950 text-center py-2.5 px-4 text-sm font-black shadow-xs tracking-wide flex items-center justify-center gap-2">
          <ShieldAlert className="w-5 h-5" /> Este equipo se encuentra actualmente inactivo en la liga.
        </div>
      )}

      {/* Main Container */}
      <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Content: Avatar + Name + Quick Stats */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative -mt-16 sm:-mt-24 pb-8 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-6 text-center sm:text-left">
            {/* Logo Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-3xl bg-white border-4 border-white shadow-xl overflow-hidden relative group flex items-center justify-center p-1">
                {equipo.url_logo ? (
                  <img
                    src={equipo.url_logo}
                    alt={`Logo de ${equipo.nombre_equipo}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-50 text-primary-700 text-4xl sm:text-5xl font-black rounded-2xl">
                    {equipo.nombre_equipo?.substring(0, 2).toUpperCase() || 'EQ'}
                  </div>
                )}

                {isOwner && TEAM_UPLOADS_ENABLED && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <input
                      type="file"
                      className="hidden"
                      ref={logoInputRef}
                      accept="image/*"
                      onChange={handleLogoChange}
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="bg-white text-gray-900 p-2.5 rounded-full hover:bg-gray-100 shadow-md cursor-pointer transition-transform hover:scale-105"
                      title="Cambiar escudo"
                    >
                      <Camera className="w-5 h-5 text-gray-700" />
                    </button>
                    {equipo.url_logo && (
                      <button
                        onClick={() => deleteLogo.mutate()}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-md cursor-pointer"
                        title="Eliminar escudo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Info Info */}
            <div className="min-w-0 pb-1">

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight uppercase flex flex-wrap items-center gap-3 break-words">
                {equipo.nombre_equipo}
                {dashboardStatus && (
                  <StatusBadge status={dashboardStatus} />
                )}
              </h1>

              {equipo.usuario?.nombre && (
                <p className="text-xs sm:text-sm font-semibold text-gray-500 mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                  <User className="w-4 h-4 text-gray-400" /> Delegado:{' '}
                  <span className="text-gray-800 font-bold">{equipo.usuario.nombre}</span>
                </p>
              )}
            </div>
          </div>

          {/* Quick Metrics & Admin Controls */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-end gap-3 shrink-0">
            <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-2xs text-center min-w-[90px]">
              <span className="block text-2xl font-black text-primary-700 leading-none">
                {participacionesOrdenadas.length}
              </span>
              <span className="text-2xs sm:text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5 block">
                Ediciones
              </span>
            </div>

            <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-2xs text-center min-w-[90px]">
              <span className="block text-2xl font-black text-gray-900 leading-none">
                {partidos.length}
              </span>
              <span className="text-2xs sm:text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5 block">
                Partidos
              </span>
            </div>

            <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-2xs text-center min-w-[90px]">
              <span className="block text-2xl font-black text-gray-900 leading-none">
                {plantillas.length}
              </span>
              <span className="text-2xs sm:text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5 block">
                Roster
              </span>
            </div>

            {isOwner && equipo.estado === 'activo' && userRole === 'super_admin' && (
              <button
                onClick={() => setIsDeactivateModalOpen(true)}
                className="flex items-center gap-1.5 bg-red-50 text-red-600 hover:bg-red-100 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-colors border border-red-200 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" /> Desactivar
              </button>
            )}
            
          </div>
        </div>

        <DesactivarEquipoModal
          isOpen={isDeactivateModalOpen}
          onClose={() => setIsDeactivateModalOpen(false)}
          idEquipo={idEquipo}
        />

        {/* ── SECCIÓN 2: CALENDARIO & RESULTADOS (2 COLUMNAS) ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
          {/* Columna Izquierda: Último Partido Destacado (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            
            {/* Tarjeta de Torneos Activos */}
            {torneosActivos.length > 0 && (
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary-600" /> Torneos Activos
                  </h2>
                </div>
                <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs p-5 space-y-3">
                  {torneosActivos.map((participacion) => (
                    <div key={participacion.id_inscripcion} className="flex flex-wrap items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:border-primary-200 transition-colors gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">{participacion.torneo?.nombre || participacion.torneo?.nombre_torneo}</p>
                          <p className="text-xs text-gray-500 font-medium">Categoría: {participacion.categoria?.nombre_categoria || participacion.categoria?.nombre}</p>
                        </div>
                      </div>
                      <StatusBadge status={participacion.torneo?.estado || 'programado'} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Último Resultado */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary-600" /> Último Resultado
                </h2>
              </div>

            {loadingPartidos ? (
              <Skeleton className="h-56 rounded-3xl" />
            ) : ultimoPartido ? (
              <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs p-6 flex flex-col justify-between flex-1 relative overflow-hidden group hover:border-primary-200 transition-all">
                {/* Header del Partido */}
                <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-500 font-semibold truncate">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{ultimoPartido.fecha}</span>
                    {ultimoPartido.hora && <span>• {ultimoPartido.hora}</span>}
                  </div>

                  {resultadoUltimoPartido === 'victoria' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Victoria
                    </span>
                  )}
                  {resultadoUltimoPartido === 'derrota' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircle className="w-3.5 h-3.5" /> Derrota
                    </span>
                  )}
                  {resultadoUltimoPartido === 'empate' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-gray-100 text-gray-700">
                      Empate
                    </span>
                  )}
                </div>

                {/* Marcador Central */}
                <div className="flex items-center justify-between gap-4 my-auto py-2">
                  {/* Local */}
                  <div className="flex-1 text-center min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-2 overflow-hidden">
                      {ultimoPartido.equipo_local?.url_logo ? (
                        <img
                          src={ultimoPartido.equipo_local.url_logo}
                          alt={ultimoPartido.equipo_local.nombre_equipo}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <Shield className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <p
                      className={`text-sm font-black truncate uppercase ${
                        ultimoPartido.equipo_local?.id_equipo === idEquipo
                          ? 'text-primary-700'
                          : 'text-gray-900'
                      }`}
                    >
                      {ultimoPartido.equipo_local?.nombre_equipo || 'Local'}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="shrink-0 flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl shadow-sm">
                    <span className="font-black text-2xl sm:text-3xl tracking-tight">
                      {ultimoPartido.marcador_local ?? 0}
                    </span>
                    <span className="text-gray-500 font-bold text-lg">-</span>
                    <span className="font-black text-2xl sm:text-3xl tracking-tight">
                      {ultimoPartido.marcador_visitante ?? 0}
                    </span>
                  </div>

                  {/* Visitante */}
                  <div className="flex-1 text-center min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-2 overflow-hidden">
                      {ultimoPartido.equipo_visitante?.url_logo ? (
                        <img
                          src={ultimoPartido.equipo_visitante.url_logo}
                          alt={ultimoPartido.equipo_visitante.nombre_equipo}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <Shield className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <p
                      className={`text-sm font-black truncate uppercase ${
                        ultimoPartido.equipo_visitante?.id_equipo === idEquipo
                          ? 'text-primary-700'
                          : 'text-gray-900'
                      }`}
                    >
                      {ultimoPartido.equipo_visitante?.nombre_equipo || 'Visitante'}
                    </p>
                  </div>
                </div>

                {/* Footer Info: Torneo & Sede */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                  <span className="font-bold text-gray-700 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    {ultimoPartido.torneo?.nombre || 'Torneo Oficial'}
                  </span>
                  {ultimoPartido.ubicacion && (
                    <span className="flex items-center gap-1 text-gray-500 truncate max-w-[200px]">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {ultimoPartido.ubicacion}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-8 text-center flex flex-col items-center justify-center flex-1">
                <Trophy className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-600">Sin partidos finalizados</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Los resultados oficiales aparecerán aquí tras finalizar los encuentros.
                </p>
              </div>
            )}
            </div>
          </div>

          {/* Columna Derecha: Cola de Próximos Partidos (7 cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" /> Próximos Encuentros
              </h2>
              {programados.length > 0 && (
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  {programados.length} en agenda
                </span>
              )}
            </div>

            {loadingPartidos ? (
              <Skeleton className="h-56 rounded-3xl" />
            ) : programados.length > 0 ? (
              <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs divide-y divide-gray-100 overflow-hidden flex-1 flex flex-col justify-between">
                {programados.slice(0, 3).map((p) => {
                  const esLocal =
                    (p as any).id_equipo_local === idEquipo || p.equipo_local?.id_equipo === idEquipo;
                  const rival = esLocal ? p.equipo_visitante : p.equipo_local;

                  return (
                    <div
                      key={p.id_partido}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-gray-50/80 transition-colors"
                    >
                      {/* Fecha y Hora */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-indigo-700 shrink-0">
                          <span className="text-xs font-black uppercase leading-none">
                            {p.fecha ? new Date(p.fecha + 'T00:00').toLocaleDateString('es-ES', { month: 'short' }) : 'FECH'}
                          </span>
                          <span className="text-base font-black leading-tight">
                            {p.fecha ? new Date(p.fecha + 'T00:00').getDate() : '--'}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-500" /> {p.hora || 'Por definir'}
                            </span>
                            <span className="text-2xs font-semibold text-gray-500 truncate">
                              {p.fase || 'Fase Regular'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {p.ubicacion || 'Coliseo Principal'}
                          </p>
                        </div>
                      </div>

                      {/* Enfrentamiento vs Rival */}
                      <div className="flex items-center justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <div className="text-right">
                          <span className="text-2xs uppercase font-bold text-gray-400 block">
                            Rival
                          </span>
                          <span className="text-sm font-black text-gray-900 uppercase truncate max-w-[140px] block">
                            {rival?.nombre_equipo || 'Por confirmar'}
                          </span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          {rival?.url_logo ? (
                            <img
                              src={rival.url_logo}
                              alt={rival.nombre_equipo}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Shield className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-8 text-center flex flex-col items-center justify-center flex-1">
                <Calendar className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-600">Sin compromisos programados</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  El calendario se actualizará cuando se confirmen nuevas fechas oficiales.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── SECCIÓN 3: ROSTER OFICIAL (CON FILTRO) ──────────────────────── */}
        <div className="mt-14">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" /> Roster Oficial
              </h2>
              <p className="text-xs font-semibold text-gray-500 mt-0.5">
                Plantilla deportiva y nómina de jugadores habilitados.
              </p>
            </div>

            {/* Selector de Torneo / Edición */}
            {torneosDisponiblesRoster.length > 1 && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={torneoRosterFiltro}
                  onChange={(e) => setTorneoRosterFiltro(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-800 text-xs font-bold rounded-xl px-3 py-2 shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                >
                  <option value="todos">Todos los Torneos (Histórico)</option>
                  {torneosDisponiblesRoster.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loadingPlantilla ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : plantillasFiltradas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {plantillasFiltradas.map((item) => {
                const j = item.jugador;
                const dorsal = item.numero_camiseta;

                return (
                  <Link
                    key={item.id_plantilla || `${item.id_jugador}-${item.id_torneo}`}
                    to={j?.id_jugador ? `/jugadores/${j.id_jugador}` : '#'}
                    className="group bg-white p-4 rounded-2xl border border-gray-200 hover:border-primary-300 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between gap-3.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar o Foto */}
                      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-primary-200 transition-colors">
                        {j?.url_foto ? (
                          <img
                            src={j.url_foto}
                            alt={j.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary-50 text-primary-700 flex items-center justify-center font-black text-sm uppercase">
                            {j?.nombre?.substring(0, 2) || 'JG'}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <span className="font-black text-sm text-gray-900 group-hover:text-primary-700 uppercase truncate block transition-colors">
                          {j?.nombre || 'Jugador Registrado'}
                        </span>
                        <span className="text-2xs font-semibold text-gray-400 mt-0.5 block truncate">
                          Habilitado en nómina
                        </span>
                      </div>
                    </div>

                    {/* Dorsal */}
                    {dorsal !== null && dorsal !== undefined ? (
                      <span className="shrink-0 font-black text-sm bg-primary-50 text-primary-800 px-2.5 py-1 rounded-lg border border-primary-200/60 shadow-2xs">
                        #{dorsal}
                      </span>
                    ) : (
                      <span className="shrink-0 text-2xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                        S/N
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-8 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-600">Nómina en preparación</p>
              <p className="text-xs text-gray-400 mt-0.5">
                No hay jugadores registrados en el filtro seleccionado.
              </p>
            </div>
          )}
        </div>

        {/* ── SECCIÓN 4: HISTORIAL DE PARTICIPACIONES (3 CARDS PAGINADAS) ──── */}
        <div className="mt-14 pt-10 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> Historial de Participaciones
              </h2>
              <p className="text-xs font-semibold text-gray-500 mt-0.5">
                Competiciones y categorías oficiales disputadas por el equipo.
              </p>
            </div>

            {/* Controles de Paginación */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200">
                {participacionesOrdenadas.length} {participacionesOrdenadas.length === 1 ? 'Edición' : 'Ediciones'}
              </span>

              {totalPaginasParticipaciones > 1 && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                  <button
                    type="button"
                    onClick={() =>
                      setPaginaParticipaciones((prev) => Math.max(1, prev - 1))
                    }
                    disabled={paginaValidaParticipaciones === 1}
                    aria-label="Página anterior"
                    className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-700 shadow-2xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-gray-600 px-1.5">
                    {paginaValidaParticipaciones} / {totalPaginasParticipaciones}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPaginaParticipaciones((prev) =>
                        Math.min(totalPaginasParticipaciones, prev + 1)
                      )
                    }
                    disabled={
                      paginaValidaParticipaciones === totalPaginasParticipaciones
                    }
                    aria-label="Página siguiente"
                    className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-700 shadow-2xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {loadingInscripciones ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-3xl" />
              ))}
            </div>
          ) : participacionesOrdenadas.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-3xl border border-dashed border-gray-200">
              <Shield className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-600">
                Aún no registra participaciones oficiales aprobadas.
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Las inscripciones aprobadas en torneos se listarán automáticamente en este espacio.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {participacionesPaginadas.map((ins, idx) => {
                const uniqueKey = `part-${ins.id_torneo}-${ins.id_categoria}-${indiceInicioParticipaciones + idx}`;

                return (
                  <div
                    key={uniqueKey}
                    className="group flex flex-col justify-between p-6 rounded-3xl border border-gray-200 bg-white hover:border-primary-300 hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden"
                  >
                    <div>
                      {/* Header con Año y Estado */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                          <Trophy className="w-5 h-5" />
                        </div>
                        {ins.anio && (
                          <span className="font-black text-sm text-primary-700 bg-primary-50 px-2.5 py-1 rounded-xl border border-primary-100">
                            {ins.anio}
                          </span>
                        )}
                      </div>

                      {/* Nombre del Torneo */}
                      <h3 className="font-black text-base text-gray-900 uppercase group-hover:text-primary-700 transition-colors line-clamp-1">
                        {ins.torneo?.nombre || `Torneo Oficial #${ins.id_torneo}`}
                      </h3>

                      {/* Categoría */}
                      <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-100/60">
                        <Layers className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {ins.categoria?.nombre_categoria || 'Categoría Principal'}{' '}
                          {ins.categoria?.genero_categoria && `(${ins.categoria.genero_categoria})`}
                        </span>
                      </div>
                    </div>

                    {/* Footer con Enlace al Torneo */}
                    <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" /> Aprobado
                      </span>

                      <Link
                        to={`/torneos/${ins.id_torneo}`}
                        className="font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                      >
                        <span>Ver Torneo</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

