import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import type { Partido } from '../../types/api.types';

export default function AdminPartidos() {
  const [searchParams, setSearchParams] = useSearchParams();
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
    torneos.map(t => ({ value: (t.id_torneo || t.id) as number, label: (t.nombre || t.nombre_torneo) as string })),
  [torneos]);

  const categoriaOptions: Option[] = useMemo(() => {
    if (!selectedTorneo) return [];
    const torneo = torneos.find(t => (t.id_torneo || t.id) === selectedTorneo);
    if (!torneo?.categorias) return [];
    return torneo.categorias.map((c: any) => ({
      value: c.id_categoria as number,
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
    placeholderData: (prev: any) => prev
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
      render: (row) => <span className="font-medium text-crema">{row.fecha} {row.hora}</span> 
    },
    { 
      key: 'fase', 
      header: 'Fase/Categoría', 
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-crema text-sm">{row.fase || 'Regular'}</span>
          <span className="text-slate-400 text-xs">{row.categoria?.nombre_categoria}</span>
        </div>
      ) 
    },
    { 
      key: 'encuentro', 
      header: 'Encuentro', 
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-crema">{row.equipo_local?.nombre_equipo || 'Local'}</span>
          <span className="text-slate-400 text-xs">vs</span>
          <span className="font-semibold text-crema">{row.equipo_visitante?.nombre_equipo || 'Visitante'}</span>
        </div>
      ) 
    },
    { 
      key: 'marcador', 
      header: 'Marcador', 
      render: (row) => (
        <span className="font-bold text-slate-300 bg-white/10 px-2 py-1 rounded">
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
            textOverride={row.estado === 'anulado' ? 'Anulado' : undefined}
          />
          {isPendienteFinalizar(row) && (
            <span className="text-[10px] font-bold text-amber-200 bg-amber-500/15 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Pendiente Finalizar
            </span>
          )}
          {row.estado === 'finalizado' && (!row.stats_local_procesadas || !row.stats_visitante_procesadas) && (
            <span className="text-[10px] font-bold text-amber-200 bg-amber-500/15 px-1.5 py-0.5 rounded">
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
              className="bg-celeste hover:bg-white text-marino shadow-sm px-3 py-1.5 rounded text-xs font-semibold transition-colors"
            >
              Editar
            </button>
          )}
          {row.estado !== 'anulado' && row.estado !== 'suspendido' && (
            <button 
              onClick={() => setFinalizarPartido(row)}
              className="bg-green-500/20 hover:bg-green-500/30 text-green-100 shadow-sm px-3 py-1.5 rounded text-xs font-semibold transition-colors"
            >
              Resultados
            </button>
          )}
          {row.estado === 'anulado' ? (
            <button 
              onClick={() => handleRestaurar(row.id_partido!)}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 shadow-sm px-3 py-1.5 rounded text-xs font-semibold transition-colors"
            >
              Restaurar
            </button>
          ) : (
            <button 
              onClick={() => handleAnular(row.id_partido!)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-100 shadow-sm px-3 py-1.5 rounded text-xs font-semibold transition-colors"
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-marino-claro p-6 rounded-xl border border-white/10 shadow-sm">
        <div>
          <h1 className="font-display text-2xl font-bold text-crema flex items-center gap-3">
            <Calendar className="w-8 h-8 text-oro" />
            Gestión de Partidos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Administra el calendario, resultados y estadísticas de los encuentros.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['partidos'] })}
            className="flex items-center justify-center p-2 rounded-lg border border-white/15 text-slate-300 hover:bg-white/5 transition-colors"
            title="Actualizar tabla"
          >
            <RotateCcw className={`w-5 h-5 ${isFetching ? 'animate-spin text-celeste' : ''}`} />
          </button>
          <button 
            onClick={() => setIsCrearOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-celeste px-4 py-2 text-sm font-medium text-marino rounded-lg shadow-sm hover:bg-white transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nuevo Partido
          </button>
        </div>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-marino-claro rounded-xl border border-white/10 shadow-sm overflow-visible">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-crema font-semibold">
            <Filter className="w-5 h-5 text-slate-400" />
            Filtros y Búsqueda
          </div>
          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="text-xs font-medium text-red-300 hover:text-red-200 hover:bg-red-500/15 px-2 py-1 rounded transition-colors"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
        
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar torneo o equipo..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-white/15 rounded-md focus:outline-none focus:ring-1 focus:ring-celeste"
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
            className="w-full border border-white/15 rounded-md px-3 py-2 text-sm bg-marino-claro focus:outline-none focus:ring-1 focus:ring-celeste"
          >
            <option value="desc">Más Recientes Primero</option>
            <option value="asc">Más Antiguos Primero</option>
          </select>
        </div>

        {/* Checkboxes de Estado */}
        <div className="px-5 pb-5 pt-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Estados</p>
          <div className="flex flex-wrap gap-3">
            {['programado', 'en_curso', 'finalizado', 'finalizado_wo', 'suspendido', 'anulado'].map((estado) => (
              <label key={estado} className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedEstados.includes(estado)}
                  onChange={() => toggleEstado(estado)}
                  className="rounded text-celeste focus:ring-celeste"
                />
                <span className="text-sm font-medium text-slate-300 capitalize">
                  {estado === 'finalizado_wo' ? 'Finalizado W.O.' : estado}
                </span>
              </label>
            ))}
            
            <div className="w-px h-6 bg-white/20 mx-1"></div>
            
            <label className="flex items-center gap-2 cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-400/30 transition-colors">
              <input
                type="checkbox"
                checked={pendientesStats}
                onChange={(e) => { setPendientesStats(e.target.checked); setPage(1); }}
                className="rounded text-amber-300 focus:ring-celeste"
              />
              <span className="text-sm font-bold text-amber-200">Sin Estadísticas</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-marino-claro rounded-xl border border-white/10 shadow-sm p-6">
        {loadingPartidos ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : partidos.length === 0 ? (
          <EmptyState
            title="No se encontraron partidos"
            description={hasActiveFilters ? "Intenta ajustar los filtros para ver más resultados." : "Aún no hay partidos programados en el sistema."}
            icon={<Calendar className="mx-auto h-12 w-12 text-slate-400" />}
          />
        ) : (
          <>
            <DataGridTable 
              columns={columns} 
              data={partidos} 
              ariaLabel="Tabla de Partidos" 
            />
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-4 py-3 sm:px-6 rounded-b-xl">
                <div className="text-sm text-slate-400">
                  Página <span className="font-bold text-crema">{pagination.page}</span> de <span className="font-bold text-crema">{pagination.pages}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1.5 rounded-lg border border-white/15 bg-marino-claro text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-1.5 rounded-lg border border-white/15 bg-marino-claro text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
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
