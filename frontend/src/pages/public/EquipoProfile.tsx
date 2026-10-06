import { useRef, useState, useMemo, useEffect, useLayoutEffect, type RefObject } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Camera, ChevronLeft, ChevronRight, MapPin, ShieldAlert, Trash2 } from 'lucide-react';
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
import { Escudo } from '../../features/torneos/components/PartidosList';
import { Esquinas } from '../../features/landing/SeccionPartidos';
import axiosInstance from '../../api/axios.config';
import { DesactivarEquipoModal } from '../../features/equipos/components/DesactivarEquipoModal';
import type { Partido, Plantilla } from '../../types/api.types';

// 🚩 FEATURE FLAG: Subida de imágenes de equipo por delegados.
const TEAM_UPLOADS_ENABLED = true;

const MAX_LOGO_SIZE = 2 * 1024 * 1024;   // 2 MB
const MAX_BANNER_SIZE = 5 * 1024 * 1024; // 5 MB
const ITEMS_POR_PAGINA_PARTICIPACIONES = 3;

// Doble bisel, solo para el cromo: bandeja con filete oro y núcleo marino claro con su propia luz interior
const BANDEJA = 'rounded-2xl bg-white/[0.04] p-1.5 ring-1 ring-oro/40 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.7)]';
const NUCLEO = 'relative rounded-[0.625rem] bg-marino-claro shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]';
// Panel del sistema (DESIGN.md): marino claro, filete oro y sombra de panel
const PANEL = 'rounded-xl border border-oro/25 bg-marino-claro/80 shadow-xl shadow-black/30';
const CURVA = 'ease-[cubic-bezier(0.32,0.72,0,1)]';
const PLACA = 'font-display text-xs font-semibold uppercase tracking-[0.25em] text-oro/80';
const TITULO = 'font-display text-3xl font-bold text-crema sm:text-4xl';
const BOTON_PORTADA =
  'inline-flex items-center gap-2 rounded-lg border border-white/25 bg-marino/70 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-wait disabled:opacity-60';
const SELECT =
  'min-w-0 flex-1 cursor-pointer truncate rounded-lg border border-white/15 bg-marino py-2 pl-3 pr-8 text-sm font-semibold text-crema transition-colors hover:border-oro/50 sm:w-56 sm:flex-none';
const ESTADO_TORNEO: Record<string, string> = { en_curso: 'En curso', programado: 'Próximamente' };
const ESTADO_INSCRIPCION: Record<string, string> = {
  aprobado: 'Inscripción aprobada',
  pendiente: 'Inscripción en revisión',
  borrador: 'Inscripción en borrador',
  rechazado: 'Inscripción rechazada',
  retirado: 'Equipo retirado',
};
const PARTICULAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'SAN', 'SANTA', 'Y']);

// Partido.fecha llega como AAAA-MM-DD; el mediodía evita que la zona horaria cambie el día
const fecha = (f: string | undefined, opciones: Intl.DateTimeFormatOptions) =>
  f ? new Date(`${f}T12:00:00`).toLocaleDateString('es-EC', opciones).replace('.', '') : '';

// Como en un cromo: apellidos arriba y nombres debajo.
// ponytail: asume el orden nombres + apellidos (1 y 1, 1 y 2 o 2 y 2); con partículas u otro largo muestra el nombre completo.
function partirNombre(nombre: string) {
  const p = nombre.split(/\s+/);
  if (p.length >= 2 && p.length <= 4 && !p.some((w) => PARTICULAS.has(w.toUpperCase()))) {
    const corte = p.length === 4 ? 2 : 1;
    return { apellidos: p.slice(corte).join(' '), nombres: p.slice(0, corte).join(' ') };
  }
  return { apellidos: nombre, nombres: '' };
}

// El partido visto desde este equipo: rival y marcador propio primero
function desdeEquipo(p: Partido, idEquipo: number) {
  const local = p.id_equipo_local === idEquipo || p.equipo_local?.id_equipo === idEquipo;
  return {
    rival: local ? p.equipo_visitante : p.equipo_local,
    propios: (local ? p.marcador_local : p.marcador_visitante) ?? 0,
    ajenos: (local ? p.marcador_visitante : p.marcador_local) ?? 0,
  };
}

// Entradas al hacer scroll: el marcado nace visible; antes de pintar se ocultan los pendientes
// y cada uno aparece una sola vez al entrar en pantalla (animaciones en index.css)
function useRevelar(raiz: RefObject<HTMLElement | null>, deps: unknown[]) {
  useLayoutEffect(() => {
    const els = raiz.current?.querySelectorAll<HTMLElement>('[data-revelar]:not([data-revelar="visto"])');
    if (!els?.length || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        let orden = 0;
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.style.setProperty('--retraso', `${orden++ * 70}ms`); // lo que entra junto se reparte en orden
          el.dataset.revelar = 'visto';
          obs.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => {
      el.dataset.revelar = 'pendiente';
      obs.observe(el);
    });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function Cifra({ n, uno, varios }: { n: number; uno: string; varios: string }) {
  return (
    <>
      <strong className="font-semibold tabular-nums text-crema">{n}</strong> {n === 1 ? uno : varios}
    </>
  );
}

function RomboVS() {
  return (
    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 rotate-45 items-center justify-center border border-oro/70 bg-marino sm:h-12 sm:w-12">
      <span className="-rotate-45 font-display text-xs font-bold text-oro">VS</span>
    </span>
  );
}

// Cromo del álbum: retrato 3:4, dorsal contorneado en oro y el nombre en dos niveles
function Cromo({ item }: { item: Plantilla }) {
  const j = item.jugador;
  const nombre = (j?.nombre || 'Jugador registrado').trim();
  const { apellidos, nombres } = partirNombre(nombre);
  const dorsal = item.numero_camiseta;
  const tieneDorsal = dorsal !== null && dorsal !== undefined;
  const iniciales = nombre.split(/\s+/).slice(0, 2).map((w) => w[0]).join('');

  return (
    <li data-revelar="" className="cromo">
      <Link
        to={j?.id_jugador ? `/jugadores/${j.id_jugador}` : '#'}
        aria-label={tieneDorsal ? `${nombre}, dorsal ${dorsal}` : nombre}
        className={`group flex h-full flex-col ${BANDEJA} hover:ring-oro/70 motion-safe:transition motion-safe:duration-500 ${CURVA} motion-safe:hover:-translate-y-1.5 motion-safe:hover:shadow-[0_32px_56px_-24px_rgb(0_0_0/0.85)]`}
      >
        <div className={`${NUCLEO} aspect-[3/4] overflow-hidden`}>
          {j?.url_foto ? (
            <img
              src={j.url_foto}
              alt=""
              loading="lazy"
              className={`h-full w-full object-cover object-[center_20%] motion-safe:transition-transform motion-safe:duration-700 ${CURVA} motion-safe:group-hover:scale-[1.04]`}
            />
          ) : (
            <span aria-hidden="true" className="flex h-full items-center justify-center pb-12 font-display text-5xl font-bold text-oro/30">
              {iniciales}
            </span>
          )}
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-marino via-marino/50 to-transparent" />
          {tieneDorsal && (
            <span
              aria-hidden="true"
              className="absolute bottom-1.5 left-3 font-display text-5xl font-bold leading-none text-transparent [-webkit-text-stroke:1.5px_var(--color-oro)] sm:text-6xl"
            >
              {dorsal}
            </span>
          )}
          {/* Brillo de lámina: cruza el cromo al pasar el cursor */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-[160%] skew-x-[-16deg] bg-gradient-to-r from-transparent via-crema/30 to-transparent motion-safe:group-hover:translate-x-[260%] motion-safe:group-hover:transition-transform motion-safe:group-hover:duration-1000 ${CURVA}`}
          />
        </div>
        <div className="flex-1 px-2 pb-2 pt-3">
          <p className="text-balance break-words font-display text-[0.95rem] font-bold leading-snug text-crema transition-colors group-hover:text-white">
            {apellidos}
          </p>
          {nombres && <p className="mt-1 text-xs capitalize text-slate-400">{nombres.toLowerCase()}</p>}
        </div>
      </Link>
    </li>
  );
}

// Boleto del próximo partido: talón con la fecha, el cruce al centro y la hora a la derecha
function Boleto({ partido, logoPropio, idEquipo }: { partido?: Partido; logoPropio?: string; idEquipo: number }) {
  if (!partido) {
    return (
      <div className={`${PANEL} px-6 py-5 sm:px-8`}>
        <h2 className="font-semibold text-crema">Sin partidos programados</h2>
        <p className="mt-0.5 text-sm text-slate-400">El calendario se actualizará cuando se confirmen nuevas fechas.</p>
      </div>
    );
  }

  const { rival } = desdeEquipo(partido, idEquipo);
  const idTorneo = partido.id_torneo ?? partido.torneo?.id_torneo;
  const detalle = [partido.fase, partido.categoria?.nombre_categoria].filter(Boolean).join(' · ');

  return (
    <article
      aria-label="Próximo partido"
      className="relative grid overflow-hidden rounded-xl border border-oro/25 bg-marino-claro shadow-xl shadow-black/30 md:grid-cols-[auto_minmax(0,1fr)_auto]"
    >
      <div className="hidden md:contents">
        <Esquinas />
      </div>
      <p className="flex items-baseline gap-3 border-b border-dashed border-oro/30 px-6 py-4 md:flex-col md:items-center md:justify-center md:gap-0 md:border-b-0 md:border-r md:px-9 md:py-6">
        <span className={PLACA}>{fecha(partido.fecha, { weekday: 'short' })}</span>
        <span className="font-display text-4xl font-bold leading-none tabular-nums text-crema md:my-1.5 md:text-5xl">
          {fecha(partido.fecha, { day: 'numeric' })}
        </span>
        <span className={PLACA}>{fecha(partido.fecha, { month: 'short' })}</span>
      </p>

      {/* Campo con la luz de estadio del cartel de partido: celeste a la izquierda y oro a la derecha */}
      <div className="flex min-w-0 flex-col gap-4 bg-[radial-gradient(ellipse_at_20%_30%,rgba(41,169,225,0.18),transparent_55%),radial-gradient(ellipse_at_80%_30%,rgba(214,179,106,0.14),transparent_55%)] px-6 py-5 sm:flex-row sm:items-center sm:gap-6 md:px-8">
        <div className="flex shrink-0 items-center gap-3">
          <Escudo url={logoPropio} className="h-12 w-12 sm:h-14 sm:w-14" />
          <RomboVS />
          <Escudo url={rival?.url_logo} className="h-12 w-12 sm:h-14 sm:w-14" />
        </div>
        <div className="min-w-0">
          <h2 className="text-balance font-display text-xl font-bold leading-tight text-crema sm:text-2xl">
            vs{' '}
            {rival?.id_equipo ? (
              <Link to={`/equipos/${rival.id_equipo}`} className="transition-colors hover:text-celeste">
                {rival.nombre_equipo}
              </Link>
            ) : (
              'Rival por confirmar'
            )}
          </h2>
          {detalle && <p className="mt-1 text-sm text-slate-400">{detalle}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-2 border-t border-white/10 px-6 py-4 md:flex-col md:items-end md:justify-center md:border-l md:border-t-0 md:py-7 md:pl-8 md:pr-11 md:text-right">
        <p>
          <span className={`block ${PLACA}`}>Próximo partido</span>
          <span className="mt-1.5 block font-display text-3xl font-bold leading-none tabular-nums text-crema">{partido.hora?.slice(0, 5) || 'Por definir'}</span>
        </p>
        {partido.ubicacion && (
          <p className="flex items-center gap-1.5 text-sm text-slate-400">
            <MapPin className="h-4 w-4 shrink-0 text-oro/80" strokeWidth={1.75} aria-hidden="true" />
            {partido.ubicacion}
          </p>
        )}
        {idTorneo && (
          <Link to={`/torneos/${idTorneo}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-celeste transition-colors hover:text-white">
            Ver torneo <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}

export default function EquipoProfile({ teamId, dashboardStatus }: { teamId?: number, dashboardStatus?: string }) {
  const { id } = useParams<{ id: string }>();
  const idEquipo = teamId || Number(id);
  const { isAuthenticated, userRole } = useAuth();
  const queryClient = useQueryClient();

  const raiz = useRef<HTMLElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [torneoRosterFiltro, setTorneoRosterFiltro] = useState<string>('todos');
  const [categoriaRosterFiltro, setCategoriaRosterFiltro] = useState<string>('todas');
  const [hasSetDefaultRoster, setHasSetDefaultRoster] = useState<boolean>(false);
  const [paginaParticipaciones, setPaginaParticipaciones] = useState<number>(1);

  // Queries
  const { data: equipoRes, isLoading: loadingEquipo } = useQuery({
    queryKey: ['equipo', idEquipo],
    queryFn: () => getEquipoById(idEquipo),
    enabled: !!idEquipo,
  });
  const equipo = equipoRes?.data;

  const { data: plantillasRes, isLoading: loadingPlantilla } = useQuery({
    queryKey: ['plantillas', idEquipo, torneoRosterFiltro, categoriaRosterFiltro],
    queryFn: () => getPlantillas(
      idEquipo,
      1,
      200,
      torneoRosterFiltro !== 'todos' ? Number(torneoRosterFiltro) : undefined,
      categoriaRosterFiltro !== 'todas' ? Number(categoriaRosterFiltro) : undefined
    ),
    enabled: !!idEquipo && hasSetDefaultRoster,
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

  // ── Partidos vistos desde el equipo ─────────────────────────────
  const { finalizados, programados } = useMemo(() => {
    const momento = (p: Partido) => new Date(`${p.fecha}T${p.hora || '00:00'}`).getTime();
    return {
      finalizados: partidos
        .filter((p) => p.estado === 'finalizado' || p.estado === 'finalizado_wo')
        .map((p) => ({ ...p, ...desdeEquipo(p, idEquipo) }))
        .sort((a, b) => momento(b) - momento(a)),
      programados: partidos.filter((p) => p.estado === 'programado').sort((a, b) => momento(a) - momento(b)),
    };
  }, [partidos, idEquipo]);
  const victorias = finalizados.filter((p) => p.propios > p.ajenos).length;
  const derrotas = finalizados.filter((p) => p.propios < p.ajenos).length;

  // ── Participaciones procesadas y deduplicadas ────────────────────
  const participacionesOrdenadas = useMemo(() => {
    const mapa = new Map<string, (typeof inscripciones)[0] & { anio?: number }>();

    inscripciones.forEach((ins) => {
      // Considerar inscripciones aprobadas o activas
      const estado = ins.estado_inscripcion || ins.estado;
      if (estado !== 'aprobado') return;

      const tId = ins.id_torneo || ins.torneo?.id_torneo;
      const cId = ins.id_categoria || ins.categoria?.id_categoria;
      const clave = `${tId}-${cId}`;
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
          id_torneo: tId!,
          id_categoria: cId!,
          anio: anio > 0 ? anio : undefined,
        });
      }
    });

    return Array.from(mapa.values()).sort((a, b) => {
      const yearA = a.anio || 0;
      const yearB = b.anio || 0;
      if (yearB !== yearA) return yearB - yearA;
      return (b.id_torneo || b.torneo?.id_torneo || 0) - (a.id_torneo || a.torneo?.id_torneo || 0);
    });
  }, [inscripciones]);

  // ── Auto-seleccionar torneo más reciente y categoría alfabética ──
  useEffect(() => {
    if (participacionesOrdenadas.length > 0 && !hasSetDefaultRoster) {
      const mostRecent = participacionesOrdenadas[0];
      const tId = mostRecent.id_torneo || mostRecent.torneo?.id_torneo;

      if (tId) {
        setTorneoRosterFiltro(String(tId));

        const categoriasParaTorneo = participacionesOrdenadas
          .filter(p => String(p.id_torneo || p.torneo?.id_torneo) === String(tId))
          .map(p => ({
            id: p.id_categoria || p.categoria?.id_categoria,
            nombre: p.categoria?.nombre_categoria || p.categoria?.nombre || ''
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));

        if (categoriasParaTorneo.length > 0 && categoriasParaTorneo[0].id) {
          setCategoriaRosterFiltro(String(categoriasParaTorneo[0].id));
        }
      }
      setHasSetDefaultRoster(true);
    } else if (!loadingInscripciones && participacionesOrdenadas.length === 0 && !hasSetDefaultRoster) {
      setHasSetDefaultRoster(true);
    }
  }, [participacionesOrdenadas, hasSetDefaultRoster, loadingInscripciones]);

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

  // ── Opciones de Torneo y Categoría para Filtro de Roster ────────────────────
  const torneosDisponiblesRoster = useMemo(() => {
    const torneosMap = new Map<number, string>();
    participacionesOrdenadas.forEach((p) => {
      const tId = p.id_torneo || p.torneo?.id_torneo;
      if (tId && (p.torneo?.nombre || p.torneo?.nombre_torneo)) {
        torneosMap.set(tId, p.torneo.nombre || p.torneo.nombre_torneo || 'Torneo');
      }
    });
    return Array.from(torneosMap.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [participacionesOrdenadas]);

  const categoriasDisponiblesRoster = useMemo(() => {
    if (torneoRosterFiltro === 'todos') return [];

    const categoriasMap = new Map<number, string>();
    participacionesOrdenadas.forEach((p) => {
      const tId = p.id_torneo || p.torneo?.id_torneo;
      const cId = p.id_categoria || p.categoria?.id_categoria;
      if (String(tId) === String(torneoRosterFiltro) && cId && (p.categoria?.nombre_categoria || p.categoria?.nombre)) {
        categoriasMap.set(cId, p.categoria.nombre_categoria || p.categoria.nombre || 'Categoría');
      }
    });
    return Array.from(categoriasMap.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [participacionesOrdenadas, torneoRosterFiltro]);

  // ── Plantillas filtradas para Roster ────────────────────────────
  const plantillasFiltradas = useMemo(() => {
    // Ya vienen filtradas desde el servidor. Solo aplicamos deduplicación si estamos en vista global "histórica"
    const vistos = new Set<number>();
    return plantillas.filter((p) => {
      const jId = p.jugador?.id_jugador || p.id_jugador;
      if (!jId) return true;
      if (torneoRosterFiltro === 'todos' || categoriaRosterFiltro === 'todas') {
        if (vistos.has(jId)) return false;
        vistos.add(jId);
      }
      return true;
    });
  }, [plantillas, torneoRosterFiltro, categoriaRosterFiltro]);

  // ── Torneos Activos Agrupados ───────────────────────────────────────────────
  const torneosActivosAgrupados = useMemo(() => {
    const torneosMap = new Map<number, any>();

    participacionesOrdenadas.forEach((p) => {
      const estadoTorneo = p.torneo?.estado;
      if (estadoTorneo === 'programado' || estadoTorneo === 'en_curso') {
        const tId = p.id_torneo;
        if (!torneosMap.has(tId)) {
          torneosMap.set(tId, {
            id_torneo: tId,
            torneo: p.torneo,
            estado: estadoTorneo,
            categorias: []
          });
        }
        const catNombre = p.categoria?.nombre_categoria || p.categoria?.nombre;
        if (catNombre && !torneosMap.get(tId).categorias.includes(catNombre)) {
          torneosMap.get(tId).categorias.push(catNombre);
        }
      }
    });

    return Array.from(torneosMap.values());
  }, [participacionesOrdenadas]);

  useRevelar(raiz, [loadingEquipo, plantillasFiltradas, finalizados, programados, participacionesOrdenadas, paginaValidaParticipaciones]);

  if (loadingEquipo) {
    const bloque = 'bg-white/10 motion-safe:animate-pulse';
    return (
      <main aria-busy="true" className="tema-cartel min-h-[100dvh] bg-marino pb-24">
        <div className={`h-[24rem] border-b border-oro/20 sm:h-[28rem] ${bloque}`} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={`-mt-8 h-32 rounded-2xl ${bloque}`} />
          <div className="mt-24 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={`aspect-[3/4] rounded-2xl ${bloque}`} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!equipo) {
    return (
      <main className="tema-cartel flex min-h-[100dvh] items-center justify-center bg-marino px-4 text-slate-100">
        <div className={`${PANEL} w-full max-w-md`}>
          <div className="px-8 py-10 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-oro/70" strokeWidth={1.5} aria-hidden="true" />
            <h1 className="mt-4 font-display text-2xl font-bold text-crema">Equipo no encontrado</h1>
            <p className="mt-2 text-sm text-slate-400">El equipo solicitado no existe o fue deshabilitado del sistema.</p>
            <Link
              to="/equipos"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-celeste px-5 py-2.5 text-sm font-semibold text-marino transition-colors hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al directorio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const nombreEquipo = equipo.nombre_equipo?.trim() || 'Equipo';
  const puedeEditar = isOwner && TEAM_UPLOADS_ENABLED;
  const proximo = programados[0];
  const agenda = programados.slice(1, 4);
  const torneoPlantilla = torneosDisponiblesRoster.find((t) => String(t.id) === torneoRosterFiltro)?.nombre;
  const categoriaPlantilla = categoriasDisponiblesRoster.find((c) => String(c.id) === categoriaRosterFiltro)?.nombre;
  const contextoPlantilla = torneoPlantilla
    ? `${categoriaPlantilla ?? 'Todas las categorías'} · ${torneoPlantilla}`
    : 'Todos los torneos';

  return (
    <main ref={raiz} className="tema-cartel relative isolate min-h-[100dvh] overflow-x-clip bg-marino pb-24 text-slate-100">
      <div aria-hidden="true" className="fondo-logo" />

      {equipo.estado === 'inactivo' && (
        <p className="relative z-20 flex items-center justify-center gap-2 border-b border-oro/40 bg-marino-claro px-4 py-2.5 text-center text-sm font-semibold text-crema">
          <ShieldAlert className="h-4 w-4 shrink-0 text-oro" strokeWidth={1.75} aria-hidden="true" />
          Este equipo se encuentra actualmente inactivo en la liga.
        </p>
      )}

      {/* ─── Portada: la foto del equipo (o la del coliseo), escudo y nombre ─── */}
      <section className="relative z-10 overflow-hidden border-b border-oro/30">
        <img
          src={equipo.url_foto_equipo || '/img/hero-coliseo.jpg'}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${equipo.url_foto_equipo ? 'object-[center_30%]' : 'hero-zoom object-[center_40%] blur-[3px]'}`}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-marino/95 from-15% via-marino/60 to-marino/30" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-marino via-marino/40 to-transparent to-70%" />

        <div className="relative mx-auto flex min-h-[24rem] max-w-7xl flex-col px-4 pb-16 pt-6 sm:min-h-[28rem] sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {!teamId ? (
              <Link to="/equipos" className="inline-flex items-center gap-2 text-sm font-semibold text-celeste transition-colors hover:text-white">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Equipos
              </Link>
            ) : (
              <span />
            )}

            {(puedeEditar || userRole === 'super_admin') && (
              <div className="flex flex-wrap items-center gap-2">
                {puedeEditar && (
                  <>
                    <input type="file" className="hidden" ref={bannerInputRef} accept="image/*" onChange={handleBannerChange} />
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={uploadBanner.isPending}
                      title="Máximo 5 MB (JPG, PNG o WebP)"
                      className={BOTON_PORTADA}
                    >
                      <Camera className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                      {uploadBanner.isPending ? 'Subiendo…' : 'Cambiar portada'}
                    </button>
                    {equipo.url_foto_equipo && (
                      <button
                        type="button"
                        onClick={() => deleteBanner.mutate()}
                        aria-label="Quitar portada"
                        title="Quitar portada"
                        className={`${BOTON_PORTADA} px-2.5 hover:bg-rose-500/20 hover:text-rose-100`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    )}
                  </>
                )}
                {userRole === 'super_admin' && equipo.estado === 'activo' && (
                  <button
                    type="button"
                    onClick={() => setIsDeactivateModalOpen(true)}
                    className={`${BOTON_PORTADA} border-rose-300/40 text-rose-100 hover:bg-rose-500/20`}
                  >
                    <ShieldAlert className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" /> Desactivar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="aparecer mt-auto flex flex-col gap-5 pt-12 sm:flex-row sm:items-end sm:gap-7">
            <div className="relative w-fit shrink-0">
              <Escudo url={equipo.url_logo} className="h-24 w-24 sm:h-36 sm:w-36" />
              {puedeEditar && (
                <div className="absolute -bottom-1 -right-2 flex gap-1.5">
                  <input type="file" className="hidden" ref={logoInputRef} accept="image/*" onChange={handleLogoChange} />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadLogo.isPending}
                    aria-label="Cambiar escudo"
                    title="Cambiar escudo (máximo 2 MB)"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-marino text-oro ring-2 ring-oro/60 transition-colors hover:bg-oro hover:text-marino disabled:cursor-wait disabled:opacity-60"
                  >
                    <Camera className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  {equipo.url_logo && (
                    <button
                      type="button"
                      onClick={() => deleteLogo.mutate()}
                      aria-label="Quitar escudo"
                      title="Quitar escudo"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-marino text-slate-300 ring-2 ring-white/25 transition-colors hover:bg-rose-500/30 hover:text-rose-100"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="min-w-0 pb-1">
              <h1 className="text-balance break-words font-display text-4xl font-bold leading-[1.05] text-crema sm:text-5xl lg:text-6xl">
                {nombreEquipo}
              </h1>
              {(dashboardStatus || torneosActivosAgrupados.length > 0) && (
                <div className="mt-3 space-y-1.5 text-slate-300">
                  {dashboardStatus && (
                    <p
                      title={dashboardStatus === 'pendiente' ? 'La administración revisará la inscripción y luego la aprobará' : undefined}
                      className={`w-fit rounded-md border px-2.5 py-1 text-xs font-semibold ${
                        dashboardStatus === 'rechazado' || dashboardStatus === 'retirado'
                          ? 'border-rose-300/40 bg-rose-500/10 text-rose-100'
                          : 'border-white/10 bg-white/5 text-slate-200'
                      }`}
                    >
                      {ESTADO_INSCRIPCION[dashboardStatus] ?? dashboardStatus.replace(/_/g, ' ')}
                    </p>
                  )}
                  {torneosActivosAgrupados.map((grupo) => (
                    <p key={grupo.id_torneo} className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="rounded-sm bg-oro px-2 py-0.5 font-display text-xs font-bold uppercase text-marino">
                        {ESTADO_TORNEO[grupo.estado]}
                      </span>
                      <span className="font-semibold text-crema">{grupo.categorias.join(', ')}</span>
                      <span aria-hidden="true" className="hidden text-oro/60 sm:inline">·</span>
                      <Link to={`/torneos/${grupo.id_torneo}`} className="basis-full transition-colors hover:text-white sm:basis-auto">
                        {grupo.torneo?.nombre || grupo.torneo?.nombre_torneo}
                      </Link>
                    </p>
                  ))}
                </div>
              )}
              {!loadingPartidos && !loadingInscripciones && (
                <p className="mt-2 text-sm text-slate-400">
                  {finalizados.length > 0 ? (
                    <>
                      <Cifra n={finalizados.length} uno="partido jugado" varios="partidos jugados" />:{' '}
                      <Cifra n={victorias} uno="victoria" varios="victorias" /> y{' '}
                      <Cifra n={derrotas} uno="derrota" varios="derrotas" />
                    </>
                  ) : (
                    'Todavía sin partidos jugados'
                  )}
                  <span className="whitespace-nowrap">
                    <span aria-hidden="true" className="mx-2 text-oro/60">·</span>
                    <Cifra n={participacionesOrdenadas.length} uno="edición" varios="ediciones" />
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <DesactivarEquipoModal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        idEquipo={idEquipo}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ─── Boleto del próximo partido, montado sobre el borde de la portada ─── */}
        <div data-revelar="" className="bloque -mt-8">
          {loadingPartidos ? (
            <div className="h-32 rounded-2xl bg-white/10 motion-safe:animate-pulse" />
          ) : (
            <Boleto partido={proximo} logoPropio={equipo.url_logo} idEquipo={idEquipo} />
          )}
        </div>

        {/* ─── Plantilla: el álbum de cromos ─── */}
        <section aria-labelledby="titulo-plantilla" className="pt-20 sm:pt-24">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="titulo-plantilla" className={TITULO}>Plantilla</h2>
              <p className="mt-2 text-slate-400">
                {!loadingPlantilla && (
                  <>
                    <Cifra n={plantillasFiltradas.length} uno="jugador" varios="jugadores" />
                    <span aria-hidden="true" className="mx-2 text-oro/60">·</span>
                  </>
                )}
                {contextoPlantilla}
              </p>
            </div>

            {torneosDisponiblesRoster.length > 0 && (
              <div className="flex gap-2">
                <select
                  aria-label="Torneo de la plantilla"
                  value={torneoRosterFiltro}
                  onChange={(e) => {
                    setTorneoRosterFiltro(e.target.value);
                    setCategoriaRosterFiltro('todas');
                  }}
                  className={SELECT}
                >
                  <option value="todos">Todos los torneos (histórico)</option>
                  {torneosDisponiblesRoster.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
                {torneoRosterFiltro !== 'todos' && categoriasDisponiblesRoster.length > 0 && (
                  <select
                    aria-label="Categoría de la plantilla"
                    value={categoriaRosterFiltro}
                    onChange={(e) => setCategoriaRosterFiltro(e.target.value)}
                    className={SELECT}
                  >
                    <option value="todas">Todas las categorías</option>
                    {categoriasDisponiblesRoster.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {loadingPlantilla ? (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-6">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-white/10 motion-safe:animate-pulse" />
              ))}
            </div>
          ) : plantillasFiltradas.length > 0 ? (
            <ul role="list" className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-6">
              {plantillasFiltradas.map((item) => (
                <Cromo key={item.id_plantilla || `${item.id_jugador}-${item.id_torneo}`} item={item} />
              ))}
            </ul>
          ) : (
            <div className={`mt-8 ${PANEL} overflow-hidden`}>
              <div className="px-6 py-10 text-center">
                <p className="font-semibold text-crema">Nómina en preparación</p>
                <p className="mt-1 text-sm text-slate-400">No hay jugadores registrados en el filtro seleccionado.</p>
              </div>
            </div>
          )}
        </section>

        {/* ─── Partidos e historial ─── */}
        <div className="grid grid-cols-1 gap-16 pt-20 sm:pt-24 xl:grid-cols-12 xl:gap-10">
          <section aria-labelledby="titulo-resultados" data-revelar="" className="bloque xl:col-span-7">
            <h2 id="titulo-resultados" className={TITULO}>Resultados</h2>
            {loadingPartidos ? (
              <div className="mt-6 h-48 rounded-2xl bg-white/10 motion-safe:animate-pulse" />
            ) : finalizados.length === 0 ? (
              <div className={`mt-6 ${PANEL} overflow-hidden`}>
                <div className="px-6 py-8 text-center">
                  <p className="font-semibold text-crema">Sin partidos finalizados</p>
                  <p className="mt-1 text-sm text-slate-400">Los resultados oficiales aparecerán aquí al terminar cada partido.</p>
                </div>
              </div>
            ) : (
              <div className={`mt-6 ${PANEL} overflow-hidden`}>
                <ol className="divide-y divide-white/10">
                  {finalizados.slice(0, 6).map((p) => {
                    const resultado = p.propios > p.ajenos ? 'Victoria' : p.propios < p.ajenos ? 'Derrota' : 'Empate';
                    return (
                      <li key={p.id_partido} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6">
                        <span
                          className={`w-fit rounded-full px-2.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest ${
                            resultado === 'Victoria' ? 'bg-oro text-marino' : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {resultado}
                        </span>
                        <div className="col-start-1 flex min-w-0 items-center gap-3 sm:col-start-2 sm:row-start-1">
                          <Escudo url={p.rival?.url_logo} className="h-9 w-9" />
                          <div className="min-w-0">
                            <p className="line-clamp-2 font-display font-bold leading-snug text-crema sm:line-clamp-1">
                              vs{' '}
                              {p.rival?.id_equipo ? (
                                <Link to={`/equipos/${p.rival.id_equipo}`} className="transition-colors hover:text-celeste">
                                  {p.rival.nombre_equipo}
                                </Link>
                              ) : (
                                'Rival'
                              )}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {[fecha(p.fecha, { day: 'numeric', month: 'short' }), p.fase, p.estado === 'finalizado_wo' && 'W.O.']
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                        </div>
                        <p className="col-start-2 row-span-2 row-start-1 font-display text-2xl font-bold leading-none tabular-nums sm:col-start-3 sm:row-span-1">
                          <span className={resultado === 'Victoria' ? 'text-oro' : 'text-crema/55'}>{p.propios}</span>
                          <span className="mx-1.5 text-crema/40">-</span>
                          <span className={resultado === 'Derrota' ? 'text-oro' : 'text-crema/55'}>{p.ajenos}</span>
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {agenda.length > 0 && (
              <>
                <h3 className="mt-10 font-display text-xl font-bold text-crema">Próximas fechas</h3>
                <div className={`mt-4 ${PANEL} overflow-hidden`}>
                  <ol className="divide-y divide-white/10">
                    {agenda.map((p) => {
                      const { rival } = desdeEquipo(p, idEquipo);
                      return (
                        <li key={p.id_partido} className="flex items-center gap-3 px-5 py-3.5 sm:gap-4 sm:px-6">
                          <Escudo url={rival?.url_logo} className="h-9 w-9" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display font-bold text-crema">vs {rival?.nombre_equipo || 'Rival por confirmar'}</p>
                            <p className="truncate text-xs text-slate-400">
                              {[fecha(p.fecha, { weekday: 'short', day: 'numeric', month: 'short' }), p.fase].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <span className="font-display text-lg font-bold tabular-nums text-crema/80">{p.hora?.slice(0, 5) || 'Por definir'}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </>
            )}
          </section>

          <section aria-labelledby="titulo-historial" data-revelar="" className="bloque xl:col-span-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="titulo-historial" className={TITULO}>Historial</h2>
                {!loadingInscripciones && participacionesOrdenadas.length > 0 && (
                  <p className="mt-2 text-slate-400">
                    <Cifra n={participacionesOrdenadas.length} uno="edición disputada" varios="ediciones disputadas" />
                  </p>
                )}
              </div>
              {totalPaginasParticipaciones > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaginaParticipaciones((prev) => Math.max(1, prev - 1))}
                    disabled={paginaValidaParticipaciones === 1}
                    aria-label="Página anterior"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-crema transition-colors hover:border-oro/50 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="px-1.5 text-sm font-semibold tabular-nums text-slate-300">
                    {paginaValidaParticipaciones} / {totalPaginasParticipaciones}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPaginaParticipaciones((prev) => Math.min(totalPaginasParticipaciones, prev + 1))}
                    disabled={paginaValidaParticipaciones === totalPaginasParticipaciones}
                    aria-label="Página siguiente"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-crema transition-colors hover:border-oro/50 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            {loadingInscripciones ? (
              <div className="mt-6 h-48 rounded-2xl bg-white/10 motion-safe:animate-pulse" />
            ) : participacionesOrdenadas.length === 0 ? (
              <div className={`mt-6 ${PANEL} overflow-hidden`}>
                <div className="px-6 py-8 text-center">
                  <p className="font-semibold text-crema">Aún no registra participaciones oficiales aprobadas.</p>
                  <p className="mt-1 text-sm text-slate-400">Las inscripciones aprobadas aparecerán aquí automáticamente.</p>
                </div>
              </div>
            ) : (
              <div className={`mt-6 ${PANEL} overflow-hidden`}>
                <ul className="divide-y divide-white/10">
                  {participacionesPaginadas.map((ins, idx) => (
                    <li
                      key={`part-${ins.id_torneo}-${ins.id_categoria}-${indiceInicioParticipaciones + idx}`}
                      className="flex items-center gap-5 px-5 py-4 sm:px-6"
                    >
                      <span className="w-14 shrink-0 font-display text-2xl font-bold tabular-nums text-oro">{ins.anio ?? '-'}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display font-bold leading-snug text-crema">
                          {ins.torneo?.nombre || `Torneo oficial #${ins.id_torneo}`}
                        </h3>
                        <p className="mt-0.5 text-sm text-slate-400">
                          {ins.categoria?.nombre_categoria || 'Categoría principal'}
                          {ins.categoria?.genero_categoria && ` (${ins.categoria.genero_categoria})`}
                        </p>
                      </div>
                      <Link
                        to={`/torneos/${ins.id_torneo}`}
                        aria-label={`Ver ${ins.torneo?.nombre || 'torneo'}`}
                        className="-mr-2 inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 px-2 text-sm font-semibold text-celeste transition-colors hover:text-white"
                      >
                        <span className="hidden sm:inline">Ver torneo</span> <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
