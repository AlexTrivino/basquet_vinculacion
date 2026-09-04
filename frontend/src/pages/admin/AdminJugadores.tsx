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
            <div className="relative w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
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
              <div className="font-bold text-slate-900 text-sm hover:text-orange-600 transition-colors">
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
        <div className="space-y-0.5 text-xs text-slate-600">
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
            <div className="font-bold text-slate-800">
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
                className="inline-flex items-center justify-between gap-1.5 px-2 py-0.5 rounded-md text-[11px] bg-orange-50/80 text-orange-950 border border-orange-200/80"
                title={`${p.nombre_equipo} — ${p.nombre_torneo || 'Torneo'}`}
              >
                <div className="flex items-center gap-1 min-w-0">
                  <Trophy className="w-2.5 h-2.5 text-orange-600 shrink-0" />
                  <span className="font-semibold truncate max-w-[110px]">
                    {p.nombre_equipo}
                  </span>
                  {p.numero_camiseta !== null && p.numero_camiseta !== undefined && (
                    <span className="text-orange-700 font-bold shrink-0">#{p.numero_camiseta}</span>
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
                className="text-[10px] font-semibold text-orange-600 hover:underline cursor-pointer"
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
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            F
          </span>
          <span
            title={row.url_cedula ? 'Cédula subida' : 'Sin cédula'}
            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
              row.url_cedula
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            C
          </span>
          <span
            title={row.url_acta_bachiller ? 'Acta subida' : 'Sin acta'}
            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
              row.url_acta_bachiller
                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
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
              className="p-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-orange-200 transition-colors"
              title="Editar datos del jugador"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>

            {idJugador && (
              <Link
                to={`/jugadores/${idJugador}`}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-200 transition-colors"
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
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center border border-orange-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Gestión de Jugadores
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                {totalJugadores} registros
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Búsqueda por nombre o cédula, filtros por torneo/equipo y edición de información.
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors self-start sm:self-center disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-orange-600' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Filter className="w-4 h-4 text-orange-600" />
            <span>Filtros y Búsqueda</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline"
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
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
            />
          </div>

          {/* Torneo Selector */}
          <div>
            <select
              value={selectedTorneo || ''}
              onChange={(e) =>
                handleTorneoChange(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
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
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
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
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
            >
              <option value="todos">Todos los Estados</option>
              <option value="activo">Solo Activos</option>
              <option value="inactivo">Solo Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <DataGridTable
          columns={columns}
          data={jugadoresResponse?.data || []}
          isLoading={isLoading}
          compact={true}
          emptyMessage="No se encontraron jugadores que coincidan con los criterios de búsqueda."
        />

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
            <div className="text-xs text-slate-500">
              Página <span className="font-bold text-slate-900">{page}</span> de{' '}
              <span className="font-bold text-slate-900">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
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
