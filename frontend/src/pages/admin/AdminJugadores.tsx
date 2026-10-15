import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  User,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Edit2,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Users,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

import type { Jugador, Torneo, Equipo, Inscripcion } from '../../types/api.types';
import {
  getJugadoresAdmin,
  updateJugador,
  deleteJugador,
} from '../../features/jugadores/api/jugadores.api';
import { getTorneos } from '../../features/torneos/api/torneos.api';
import { getEquipos, getInscripciones } from '../../features/equipos/api/equipos.api';
import { DataGridTable, type Column } from '../../components/DataGridTable';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { ModalEditarJugadorAdmin } from '../../features/jugadores/components/ModalEditarJugadorAdmin';
import { ModalCrearJugador } from '../../features/jugadores/components/ModalCrearJugador';

export default function AdminJugadores() {
  const queryClient = useQueryClient();

  // Pagination state
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Filter states
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTorneo, setSelectedTorneo] = useState<number | undefined>(undefined);
  const [selectedEquipo, setSelectedEquipo] = useState<number | undefined>(undefined);
  const [selectedCategoria, setSelectedCategoria] = useState<number | undefined>(undefined);
  const [selectedGenero, setSelectedGenero] = useState<string>('todos');
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');

  // Modal states
  const [editingJugador, setEditingJugador] = useState<Jugador | null>(null);
  const [jugadorToToggle, setJugadorToToggle] = useState<{
    id: number;
    nombre: string;
    nuevoEstado: 'activo' | 'inactivo';
  } | null>(null);
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Query: Torneos for filter dropdown
  const { data: torneosData } = useQuery({
    queryKey: ['filter-torneos'],
    queryFn: () => getTorneos(1, 100),
  });

  // Query: Equipos (either all or filtered by tournament inscriptions)
  const { data: allEquiposData } = useQuery({
    queryKey: ['filter-all-equipos'],
    queryFn: () => getEquipos(1, 100),
    enabled: !selectedTorneo,
  });

  const { data: inscripcionesTorneoData } = useQuery({
    queryKey: ['filter-inscripciones-torneo', selectedTorneo],
    queryFn: () => getInscripciones(1, 100, selectedTorneo),
    enabled: !!selectedTorneo,
  });

  // Compute available teams based on selected tournament
  const availableEquipos = useMemo(() => {
    if (selectedTorneo && inscripcionesTorneoData?.data) {
      const eqMap = new Map<number, { id: number; nombre: string }>();
      inscripcionesTorneoData.data.forEach((insc: Inscripcion) => {
        const idEq = insc.id_equipo || insc.equipo?.id_equipo || insc.equipo?.id;
        const nom = insc.equipo?.nombre_equipo || insc.equipo?.nombre || `Equipo #${idEq}`;
        if (idEq) eqMap.set(idEq, { id: idEq, nombre: nom });
      });
      return Array.from(eqMap.values());
    }

    if (allEquiposData?.data) {
      return allEquiposData.data.map((eq: Equipo) => ({
        id: eq.id_equipo || eq.id || 0,
        nombre: eq.nombre_equipo || eq.nombre || `Equipo #${eq.id}`,
      }));
    }

    return [];
  }, [selectedTorneo, inscripcionesTorneoData, allEquiposData]);

  // Handle tournament filter change (resets team and category if not valid for tournament)
  const handleTorneoChange = (idTorneo: number | undefined) => {
    setSelectedTorneo(idTorneo);
    setSelectedEquipo(undefined);
    setSelectedCategoria(undefined);
    setPage(1);
  };

  // Compute available categories based on selected tournament
  const availableCategorias = useMemo(() => {
    if (selectedTorneo && torneosData?.data) {
      const torneo = torneosData.data.find((t: Torneo) => (t.id_torneo || t.id) === selectedTorneo);
      if (torneo && torneo.categorias) {
        return torneo.categorias;
      }
    }
    return [];
  }, [selectedTorneo, torneosData]);

  // Query: Jugadores Admin List
  const {
    data: jugadoresResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      'admin-jugadores',
      page,
      debouncedSearch,
      selectedTorneo,
      selectedEquipo,
      selectedCategoria,
      selectedGenero,
      selectedEstado,
    ],
    queryFn: () =>
      getJugadoresAdmin({
        search: debouncedSearch,
        id_torneo: selectedTorneo,
        id_equipo: selectedEquipo,
        id_categoria: selectedCategoria,
        genero: selectedGenero,
        estado: selectedEstado,
        page,
        per_page: perPage,
      }),
  });

  // Mutation: Toggle Estado (Activar / Inactivar)
  const toggleEstadoMutation = useMutation({
    mutationFn: async ({
      id,
      nuevoEstado,
    }: {
      id: number;
      nuevoEstado: 'activo' | 'inactivo';
    }) => {
      if (nuevoEstado === 'inactivo') {
        return deleteJugador(id);
      } else {
        return updateJugador(id, { estado: 'activo' });
      }
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.nuevoEstado === 'activo'
          ? 'Jugador reactivado exitosamente.'
          : 'Jugador desactivado exitosamente.'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-jugadores'] });
      setJugadorToToggle(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al cambiar estado del jugador.');
    },
  });

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedTorneo(undefined);
    setSelectedEquipo(undefined);
    setSelectedGenero('todos');
    setSelectedEstado('todos');
    setPage(1);
  };

  const hasActiveFilters =
    debouncedSearch !== '' ||
    selectedTorneo !== undefined ||
    selectedEquipo !== undefined ||
    selectedGenero !== 'todos' ||
    selectedEstado !== 'todos';

  // Helper: calcular edad
  const calcularEdad = (fechaStr: string) => {
    if (!fechaStr) return null;
    const dob = new Date(fechaStr);
    if (isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  // Columns definition
  const columns: Column<Jugador>[] = [
    {
      key: 'jugador',
      header: 'Jugador',
      render: (row) => (
        <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
              {row.url_foto ? (
                <img
                  src={row.url_foto}
                  alt={row.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div>
              <div className="font-bold text-crema text-sm hover:text-orange-300 transition-colors">
                {row.nombre}
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                <CreditCard className="w-3 h-3 text-slate-400" />
                {row.documento_identificacion}
              </div>
            </div>
          </div>
        ),
    },
    {
      key: 'contacto',
      header: 'Contacto',
      render: (row) => (
        <div className="space-y-0.5 text-xs text-slate-300">
          {row.telefono ? (
            <div className="flex items-center gap-1.5 font-mono">
              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{row.telefono}</span>
            </div>
          ) : (
            <span className="text-slate-400 italic">Sin teléfono</span>
          )}
          {row.correo ? (
            <div className="flex items-center gap-1.5 truncate max-w-[180px]" title={row.correo}>
              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{row.correo}</span>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'edad',
      header: 'Edad / Nacimiento',
      render: (row) => {
        const edad = calcularEdad(row.fecha_nacimiento);
        return (
          <div className="text-xs">
            <div className="font-bold text-crema">
              {edad !== null ? `${edad} años` : '—'}
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{row.fecha_nacimiento || '—'}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'equipos',
      header: 'Equipos y Torneos',
      render: (row) => {
        if (!row.plantillas || row.plantillas.length === 0) {
          return <span className="text-xs text-slate-400 italic">Sin equipo activo</span>;
        }
        const visiblePlantillas = row.plantillas.slice(0, 2);
        const remainingCount = row.plantillas.length - 2;

        return (
          <div className="flex flex-col gap-1 max-w-[240px]">
            {visiblePlantillas.map((p) => (
              <div
                key={p.id_plantilla}
                className="inline-flex items-center justify-between gap-1.5 px-2 py-0.5 rounded-md text-[11px] bg-orange-500/10 text-orange-100 border border-orange-400/30"
                title={`${p.nombre_equipo} — ${p.nombre_torneo || 'Torneo'}`}
              >
                <div className="flex items-center gap-1 min-w-0">
                  <Trophy className="w-2.5 h-2.5 text-orange-300 shrink-0" />
                  <span className="font-semibold truncate max-w-[110px]">
                    {p.nombre_equipo}
                  </span>
                  {p.numero_camiseta !== null && p.numero_camiseta !== undefined && (
                    <span className="text-orange-200 font-bold shrink-0">#{p.numero_camiseta}</span>
                  )}
                </div>
                {p.nombre_torneo && (
                  <span className="text-[10px] text-slate-500 font-normal truncate max-w-[90px]">
                    ({p.nombre_torneo})
                  </span>
                )}
              </div>
            ))}
            {remainingCount > 0 && (
              <span
                className="text-[10px] font-semibold text-orange-300 hover:underline cursor-pointer"
                title={row.plantillas.slice(2).map((p) => `${p.nombre_equipo} (${p.nombre_torneo || ''})`).join(', ')}
              >
                +{remainingCount} equipo(s) más...
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'documentos',
      header: 'Documentación',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span
            title={row.url_foto ? 'Foto subida' : 'Sin foto'}
            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
              row.url_foto
                ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/40'
                : 'bg-white/10 text-slate-400 border border-white/10'
            }`}
          >
            F
          </span>
          <span
            title={row.url_cedula ? 'Cédula subida' : 'Sin cédula'}
            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
              row.url_cedula
                ? 'bg-blue-500/15 text-blue-200 border border-blue-400/40'
                : 'bg-white/10 text-slate-400 border border-white/10'
            }`}
          >
            C
          </span>
          <span
            title={row.url_acta_bachiller ? 'Acta subida' : 'Sin acta'}
            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
              row.url_acta_bachiller
                ? 'bg-purple-500/15 text-purple-200 border border-purple-400/40'
                : 'bg-white/10 text-slate-400 border border-white/10'
            }`}
          >
            A
          </span>
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => (
        <StatusBadge status={row.estado === 'activo' ? 'Aprobado' : 'Rechazado'} />
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => {
        const idJugador = row.id_jugador || row.id;
        const esActivo = row.estado === 'activo';
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setEditingJugador(row)}
              className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-200 rounded-lg text-xs font-semibold flex items-center gap-1 border border-orange-400/30 transition-colors"
              title="Editar datos del jugador"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>

            {idJugador && (
              <Link
                to={`/jugadores/${idJugador}`}
                className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-white/10 transition-colors"
                title="Ver perfil público"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}

            <button
              onClick={() =>
                setJugadorToToggle({
                  id: idJugador || 0,
                  nombre: row.nombre,
                  nuevoEstado: esActivo ? 'inactivo' : 'activo',
                })
              }
              className={`p-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                esActivo
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 border-rose-400/30'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
              }`}
              title={esActivo ? 'Desactivar jugador' : 'Reactivar jugador'}
            >
              {esActivo ? (
                <ShieldAlert className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        );
      },
    },
  ];

  const totalJugadores = jugadoresResponse?.pagination?.total || 0;
  const totalPages = jugadoresResponse?.pagination?.pages || 1;

  return (
    <div className="space-y-6 w-full px-[10%] py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-marino-claro p-6 rounded-2xl border border-white/10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-oro/10 text-oro flex items-center justify-center border border-oro/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-display text-2xl font-black text-crema tracking-tight">
                Gestión de Jugadores
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-white/10 text-slate-300 rounded-full border border-white/10">
                {totalJugadores} registros
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Búsqueda por nombre o cédula, filtros por torneo/equipo y edición de información.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center justify-center p-2.5 text-slate-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCrearModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-celeste hover:bg-white text-marino font-semibold rounded-xl transition-colors shadow-sm"
          >
            <UserPlus className="w-5 h-5" />
            <span>Agregar Jugador</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-marino-claro p-5 rounded-2xl border border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-crema">
            <Filter className="w-4 h-4 text-orange-300" />
            <span>Filtros y Búsqueda</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-orange-300 hover:text-orange-200 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Buscador unificado */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por cédula o nombre..."
              className="w-full pl-9 pr-4 py-2 border border-white/15 rounded-xl text-sm focus:ring-2 focus:ring-celeste focus:border-celeste bg-marino-claro"
            />
          </div>

          {/* Torneo Selector */}
          <div>
            <select
              value={selectedTorneo || ''}
              onChange={(e) =>
                handleTorneoChange(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 border border-white/15 rounded-xl text-sm focus:ring-2 focus:ring-celeste focus:border-celeste bg-marino-claro"
            >
              <option value="">Todos los Torneos</option>
              {torneosData?.data?.map((t: Torneo) => {
                const idTor = t.id_torneo || t.id;
                return (
                  <option key={idTor} value={idTor}>
                    {t.nombre_torneo || t.nombre}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Categoria Selector */}
          <div>
            <select
              value={selectedCategoria || ''}
              onChange={(e) => {
                setSelectedCategoria(e.target.value ? Number(e.target.value) : undefined);
                setPage(1);
              }}
              disabled={!selectedTorneo}
              className="w-full px-3 py-2 border border-white/15 rounded-xl text-sm focus:ring-2 focus:ring-celeste focus:border-celeste bg-marino-claro disabled:opacity-50 disabled:bg-white/10 disabled:cursor-not-allowed"
            >
              <option value="">Todas las Categorías</option>
              {availableCategorias.map((cat: any) => {
                const idCat = cat.id_categoria || cat.id;
                return (
                  <option key={idCat} value={idCat}>
                    {cat.nombre_categoria || cat.nombre}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Equipo Selector */}
          <div>
            <select
              value={selectedEquipo || ''}
              onChange={(e) =>
                setSelectedEquipo(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 border border-white/15 rounded-xl text-sm focus:ring-2 focus:ring-celeste focus:border-celeste bg-marino-claro"
            >
              <option value="">
                {selectedTorneo ? 'Todos los Equipos del Torneo' : 'Todos los Equipos'}
              </option>
              {availableEquipos.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Estado Selector */}
          <div>
            <select
              value={selectedEstado}
              onChange={(e) => {
                setSelectedEstado(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-white/15 rounded-xl text-sm focus:ring-2 focus:ring-celeste focus:border-celeste bg-marino-claro"
            >
              <option value="todos">Todos los Estados</option>
              <option value="activo">Solo Activos</option>
              <option value="inactivo">Solo Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-marino-claro rounded-2xl border border-white/10 shadow-sm overflow-hidden">
        <DataGridTable
          columns={columns}
          data={jugadoresResponse?.data || []}
          isLoading={isLoading}
          compact={true}
          emptyMessage="No se encontraron jugadores que coincidan con los criterios de búsqueda."
        />

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-4 py-3 sm:px-6">
            <div className="text-xs text-slate-500">
              Página <span className="font-bold text-crema">{page}</span> de{' '}
              <span className="font-bold text-crema">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-white/15 bg-marino-claro text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-white/15 bg-marino-claro text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <ModalEditarJugadorAdmin
        isOpen={!!editingJugador}
        onClose={() => setEditingJugador(null)}
        jugador={editingJugador}
        onJugadorUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-jugadores'] });
        }}
      />

      {/* Create Modal */}
      <ModalCrearJugador
        isOpen={isCrearModalOpen}
        onClose={() => setIsCrearModalOpen(false)}
      />

      {/* Confirmation Modal for Toggle Status */}
      {jugadorToToggle && (
        <ConfirmationModal
          title={
            jugadorToToggle.nuevoEstado === 'inactivo'
              ? '¿Desactivar Jugador?'
              : '¿Reactivar Jugador?'
          }
          description={
            jugadorToToggle.nuevoEstado === 'inactivo'
              ? `¿Estás seguro de que deseas desactivar a ${jugadorToToggle.nombre}? No aparecerá en listados públicos de búsqueda.`
              : `¿Deseas reactivar a ${jugadorToToggle.nombre} para que pueda volver a ser convocado en torneos?`
          }
          isDangerous={jugadorToToggle.nuevoEstado === 'inactivo'}
          onConfirm={() =>
            toggleEstadoMutation.mutate({
              id: jugadorToToggle.id,
              nuevoEstado: jugadorToToggle.nuevoEstado,
            })
          }
          onCancel={() => setJugadorToToggle(null)}
        />
      )}
    </div>
  );
}
