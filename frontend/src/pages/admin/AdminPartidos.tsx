import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Filter, Search, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { getTorneos } from '../../features/torneos/api/torneos.api';
import { getPartidos, anularPartido, restaurarPartido } from '../../features/partidos/api/partidos.api';
import { SearchableSelect, type Option } from '../../components/SearchableSelect';
import { DataGridTable, type Column } from '../../components/DataGridTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { ModalCrearPartido } from '../../features/partidos/components/ModalCrearPartido';
import { ModalEditarPartido } from '../../features/partidos/components/ModalEditarPartido';
import { ModalFinalizarPartido } from '../../features/partidos/components/ModalFinalizarPartido';
import type { Partido, Torneo } from '../../types/api.types';

export default function AdminPartidos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Estados de Filtros
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedTorneo, setSelectedTorneo] = useState<number | ''>(
    searchParams.get('id_torneo') ? Number(searchParams.get('id_torneo')) : ''
  );
  const [selectedCategoria, setSelectedCategoria] = useState<number | ''>(
    searchParams.get('id_categoria') ? Number(searchParams.get('id_categoria')) : ''
  );
  const [selectedEquipo, setSelectedEquipo] = useState<number | ''>(
    searchParams.get('id_equipo') ? Number(searchParams.get('id_equipo')) : ''
  );
  const [selectedEstados, setSelectedEstados] = useState<string[]>(
    searchParams.get('estados') ? searchParams.get('estados')!.split(',') : []
  );
  const [pendientesStats, setPendientesStats] = useState(
    searchParams.get('pendientes_stats') === 'true'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc'
  );
  
  // Estados para Modales
  const [isCrearOpen, setIsCrearOpen] = useState(false);
  const [editarPartido, setEditarPartido] = useState<Partido | null>(null);
  const [finalizarPartido, setFinalizarPartido] = useState<Partido | null>(null);

  // Paginación
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Carga de Torneos (para los selectores)
  const { data: torneosRes, isLoading: loadingTorneos } = useQuery({
    queryKey: ['torneos', 'all'],
    queryFn: () => getTorneos(1, 100)
  });
  const torneos = torneosRes?.data || [];

  // Opciones de Selectores
  const torneoOptions: Option[] = useMemo(() => 
    torneos.map(t => ({ value: t.id_torneo || t.id, label: t.nombre || t.nombre_torneo })),
  [torneos]);

  const categoriaOptions: Option[] = useMemo(() => {
    if (!selectedTorneo) return [];
    const torneo = torneos.find(t => (t.id_torneo || t.id) === selectedTorneo);
    if (!torneo?.categorias) return [];
    return torneo.categorias.map(c => ({
      value: c.id_categoria,
      label: `${c.nombre_categoria} (${c.genero_categoria})`
    }));
  }, [torneos, selectedTorneo]);

  // Sincronizar filtros con URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedTorneo) params.set('id_torneo', selectedTorneo.toString());
    if (selectedCategoria) params.set('id_categoria', selectedCategoria.toString());
    if (selectedEquipo) params.set('id_equipo', selectedEquipo.toString());
    if (selectedEstados.length > 0) params.set('estados', selectedEstados.join(','));
    if (pendientesStats) params.set('pendientes_stats', 'true');
    params.set('sort_order', sortOrder);
    
    setSearchParams(params, { replace: true });
  }, [searchTerm, selectedTorneo, selectedCategoria, selectedEquipo, selectedEstados, pendientesStats, sortOrder, setSearchParams]);

  // Resetear categoría y equipo si cambia el torneo
  useEffect(() => {
    if (!selectedTorneo) {
      setSelectedCategoria('');
      setSelectedEquipo('');
    }
  }, [selectedTorneo]);

  // Limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTorneo('');
    setSelectedCategoria('');
    setSelectedEquipo('');
    setSelectedEstados([]);
    setPendientesStats(false);
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = searchTerm || selectedTorneo || selectedCategoria || selectedEquipo || selectedEstados.length > 0 || pendientesStats;

  // Manejo de Checkboxes de Estado
  const toggleEstado = (estado: string) => {
    setSelectedEstados(prev => 
      prev.includes(estado) ? prev.filter(e => e !== estado) : [...prev, estado]
    );
    setPage(1);
  };

  // Carga de Partidos
  const { data: partidosRes, isLoading: loadingPartidos, isFetching } = useQuery({
    queryKey: ['partidos', page, selectedTorneo, selectedCategoria, selectedEquipo, selectedEstados, pendientesStats, searchTerm, sortOrder],
    queryFn: () => getPartidos({
      page,
      per_page: perPage,
      id_torneo: selectedTorneo || undefined,
      id_categoria: selectedCategoria || undefined,
      id_equipo: selectedEquipo || undefined,
      estados: selectedEstados.length > 0 ? selectedEstados.join(',') : undefined,
      pendientes_stats: pendientesStats ? true : undefined,
      search: searchTerm || undefined,
      sort_order: sortOrder
    }),
    keepPreviousData: true
  });

  const partidos = partidosRes?.data || [];
  const pagination = partidosRes?.pagination;

  // Lógica para detectar partidos pendientes de finalizar (3h pasaron)
  // Manejo de Acciones
  const handleAnular = async (id: number) => {
    if (!window.confirm('¿Estás seguro de anular/rechazar este partido?')) return;
    try {
      await anularPartido(id);
      toast.success('Partido anulado');
      queryClient.invalidateQueries({ queryKey: ['partidos'] });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al anular');
    }
  };

  const handleRestaurar = async (id: number) => {
    if (!window.confirm('¿Estás seguro de restaurar este partido? Volverá al estado Programado.')) return;
    try {
      await restaurarPartido(id);
      toast.success('Partido restaurado');
      queryClient.invalidateQueries({ queryKey: ['partidos'] });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al restaurar');
    }
  };

  const isPendienteFinalizar = (partido: Partido) => {
    if (partido.estado !== 'programado' || !partido.fecha || !partido.hora) return false;
    const partidoDateStr = `${partido.fecha}T${partido.hora}`;
    const partidoDate = new Date(partidoDateStr);
    const tresHorasEnMs = 3 * 60 * 60 * 1000;
    return Date.now() > (partidoDate.getTime() + tresHorasEnMs);
  };

  const columns: Column<Partido>[] = [
    { 
      key: 'fecha', 
      header: 'Fecha y Hora', 
      render: (row) => <span className="font-medium text-gray-900">{row.fecha} {row.hora}</span> 
    },
    { 
      key: 'fase', 
      header: 'Fase/Categoría', 
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-800 text-sm">{row.fase || 'Regular'}</span>
          <span className="text-gray-500 text-xs">{row.categoria?.nombre_categoria}</span>
        </div>
      ) 
    },
    { 
      key: 'encuentro', 
      header: 'Encuentro', 
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{row.equipo_local?.nombre_equipo || 'Local'}</span>
          <span className="text-gray-400 text-xs">vs</span>
          <span className="font-semibold text-gray-900">{row.equipo_visitante?.nombre_equipo || 'Visitante'}</span>
        </div>
      ) 
    },
    { 
      key: 'marcador', 
      header: 'Marcador', 
      render: (row) => (
        <span className="font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
          {row.marcador_local} - {row.marcador_visitante}
        </span>
      ) 
    },
    { 
      key: 'estado', 
      header: 'Estado', 
      render: (row) => (
        <div className="flex flex-col gap-1 items-start">
          <StatusBadge 
            status={
              row.estado === 'programado' ? 'Programado' : 
              row.estado === 'en_curso' ? 'En Curso' : 
              row.estado === 'finalizado' ? 'Finalizado' : 
              row.estado === 'finalizado_wo' ? 'Finalizado W.O.' : 
              row.estado === 'anulado' ? 'Rechazado' : 'Suspendido' // Reusing rechzado color for anulado
            }
            customText={row.estado === 'anulado' ? 'Anulado' : undefined}
          />
          {isPendienteFinalizar(row) && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Pendiente Finalizar
            </span>
          )}
          {row.estado === 'finalizado' && (!row.stats_local_procesadas || !row.stats_visitante_procesadas) && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
              Sin Estadísticas
            </span>
          )}
        </div>
      ) 
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="flex gap-2 items-center flex-wrap">
          {row.estado !== 'anulado' && (
            <button 
              onClick={() => setEditarPartido(row)}
              className="bg-primary-600 hover:bg-primary-700 text-white shadow-sm px-3 py-1.5 rounded text-xs font-semibold transition-colors"
            >
              Editar
            </button>
          )}
          {row.estado !== 'anulado' && row.estado !== 'suspendido' && (
            <button 
              onClick={() => setFinalizarPartido(row)}
              className="bg-green-600 hover:bg-green-700 text-white shadow-sm px-3 py-1.5 rounded text-xs font-semibold transition-colors"
            >
              Resultados
            </button>
          )}
          {row.estado === 'anulado' ? (
            <button 
              onClick={() => handleRestaurar(row.id_partido!)}
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm px-3 py-1.5 rounded text-xs font-semibold transition-colors"
            >
              Restaurar
            </button>
          ) : (
            <button 
              onClick={() => handleAnular(row.id_partido!)}
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm px-3 py-1.5 rounded text-xs font-semibold transition-colors"
            >
              Anular
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary-600" />
            Gestión de Partidos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra el calendario, resultados y estadísticas de los encuentros.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['partidos'] })}
            className="flex items-center justify-center p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            title="Actualizar tabla"
          >
            <RotateCcw className={`w-5 h-5 ${isFetching ? 'animate-spin text-primary-600' : ''}`} />
          </button>
          <button 
            onClick={() => setIsCrearOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary-600 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nuevo Partido
          </button>
        </div>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-visible">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-800 font-semibold">
            <Filter className="w-5 h-5 text-gray-400" />
            Filtros y Búsqueda
          </div>
          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
        
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar torneo o equipo..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Selectores */}
          <SearchableSelect
            options={torneoOptions}
            value={selectedTorneo}
            onChange={(v) => { setSelectedTorneo(v as number); setPage(1); }}
            placeholder="Todos los Torneos"
            disabled={loadingTorneos}
          />
          
          <SearchableSelect
            options={categoriaOptions}
            value={selectedCategoria}
            onChange={(v) => { setSelectedCategoria(v as number); setPage(1); }}
            placeholder="Todas las Categorías"
            disabled={!selectedTorneo || categoriaOptions.length === 0}
          />

          <select 
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value as 'asc'|'desc'); setPage(1); }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="desc">Más Recientes Primero</option>
            <option value="asc">Más Antiguos Primero</option>
          </select>
        </div>

        {/* Checkboxes de Estado */}
        <div className="px-5 pb-5 pt-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Estados</p>
          <div className="flex flex-wrap gap-3">
            {['programado', 'en_curso', 'finalizado', 'finalizado_wo', 'suspendido', 'anulado'].map((estado) => (
              <label key={estado} className="flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedEstados.includes(estado)}
                  onChange={() => toggleEstado(estado)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {estado === 'finalizado_wo' ? 'Finalizado W.O.' : estado}
                </span>
              </label>
            ))}
            
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            
            <label className="flex items-center gap-2 cursor-pointer bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full border border-amber-200 transition-colors">
              <input
                type="checkbox"
                checked={pendientesStats}
                onChange={(e) => { setPendientesStats(e.target.checked); setPage(1); }}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm font-bold text-amber-700">Sin Estadísticas</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {loadingPartidos ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : partidos.length === 0 ? (
          <EmptyState
            title="No se encontraron partidos"
            description={hasActiveFilters ? "Intenta ajustar los filtros para ver más resultados." : "Aún no hay partidos programados en el sistema."}
            icon={<Calendar className="mx-auto h-12 w-12 text-gray-400" />}
          />
        ) : (
          <DataGridTable 
            columns={columns} 
            data={partidos} 
            ariaLabel="Tabla de Partidos" 
            pagination={{
              currentPage: pagination?.page || 1,
              totalPages: pagination?.pages || 1,
              totalItems: pagination?.total || 0,
              onPageChange: (p) => setPage(p)
            }}
          />
        )}
      </div>

      {/* Modales */}
      {isCrearOpen && (
        <ModalCrearPartido 
          onClose={() => setIsCrearOpen(false)} 
          defaultTorneo={selectedTorneo} 
        />
      )}
      
      {editarPartido && (
        <ModalEditarPartido 
          partido={editarPartido} 
          onClose={() => setEditarPartido(null)} 
        />
      )}

      {finalizarPartido && (
        <ModalFinalizarPartido 
          partido={finalizarPartido} 
          onClose={() => setFinalizarPartido(null)} 
        />
      )}
    </div>
  );
}
