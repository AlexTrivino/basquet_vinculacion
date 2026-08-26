import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Shield, X, Edit, Trash2, Search, Filter, RefreshCw, Eye, Users } from 'lucide-react';

import { getEquiposAdmin, updateEquipo, uploadLogoEquipo, uploadBannerEquipo, deleteLogoEquipo, deleteBannerEquipo, reactivarEquipo } from '../../features/equipos/api/equipos.api';
import { getTorneos } from '../../features/torneos/api/torneos.api';
import { getCategorias } from '../../features/categorias/api/categorias.api';
import { getPlantillas } from '../../features/plantillas/api/plantillas.api';
import { DataGridTable, type Column } from '../../components/DataGridTable';
import { AsyncButton } from '../../components/AsyncButton';
import { FileUploadButton } from '../../components/FileUploadButton';
import { DesactivarEquipoModal } from '../../features/equipos/components/DesactivarEquipoModal';
import type { Equipo } from '../../types/api.types';

const equipoSchema = z.object({
  nombre_equipo: z.string().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres'),
  estado: z.string(),
});
type EquipoFormValues = z.infer<typeof equipoSchema>;

export default function AdminEquipos() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const perPage = 15;

  const [selectedTorneo, setSelectedTorneo] = useState<number | ''>('');
  const [selectedCategoria, setSelectedCategoria] = useState<number | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');

  // Modals state
  const [equipoToDeactivate, setEquipoToDeactivate] = useState<number | null>(null);
  const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null);
  const [viewingPlantilla, setViewingPlantilla] = useState<Equipo | null>(null);

  // Filtros de Torneos
  const { data: torneosRes } = useQuery({
    queryKey: ['torneos', 'admin-filter'],
    queryFn: () => getTorneos(1, 100),
  });
  const torneos = useMemo(() => {
    return (torneosRes?.data || []).sort((a: any, b: any) => {
      const anioA = a.anio || (a.fecha_inicio ? new Date(a.fecha_inicio).getFullYear() : 0);
      const anioB = b.anio || (b.fecha_inicio ? new Date(b.fecha_inicio).getFullYear() : 0);
      if (anioB !== anioA) return anioB - anioA;
      return (b.id_torneo || 0) - (a.id_torneo || 0);
    });
  }, [torneosRes]);

  // Filtros de Categorías
  const { data: categoriasRes } = useQuery({
    queryKey: ['categorias', selectedTorneo],
    queryFn: () => getCategorias(1, 100, Number(selectedTorneo)),
    enabled: selectedTorneo !== '',
  });
  const categorias = categoriasRes?.data || [];

  // Datos de Tabla
  const { data: response, isLoading } = useQuery({
    queryKey: ['admin-equipos', page, selectedTorneo, selectedCategoria, searchInput, selectedEstado],
    queryFn: () =>
      getEquiposAdmin(
        page,
        perPage,
        selectedTorneo ? Number(selectedTorneo) : undefined,
        selectedCategoria ? Number(selectedCategoria) : undefined,
        searchInput,
        selectedEstado
      ),
  });
  const equipos = response?.data || [];

  const handleResetFilters = () => {
    setSearchInput('');
    setSelectedEstado('');
    setSelectedTorneo('');
    setSelectedCategoria('');
    setPage(1);
  };

  const hasActiveFilters = searchInput || selectedEstado || selectedTorneo || selectedCategoria;

  // Reactivar
  const reactivarMutation = useMutation({
    mutationFn: reactivarEquipo,
    onSuccess: () => {
      toast.success('Equipo reactivado exitosamente.');
      queryClient.invalidateQueries({ queryKey: ['admin-equipos'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al reactivar el equipo');
    },
  });

  // Editar Equipo Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EquipoFormValues>({
    resolver: zodResolver(equipoSchema),
  });

  const openEditModal = (equipo: Equipo) => {
    setEditingEquipo(equipo);
    setValue('nombre_equipo', equipo.nombre_equipo || '');
    setValue('estado', equipo.estado || 'activo');
  };

  const closeEditModal = () => {
    setEditingEquipo(null);
    reset();
  };

  const mutationUpdate = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Equipo> }) => updateEquipo(id, payload),
    onSuccess: () => {
      toast.success('Equipo actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['admin-equipos'] });
      closeEditModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar el equipo');
    },
  });

  const onEditSubmit = async (data: EquipoFormValues) => {
    if (!editingEquipo) return;
    const id = editingEquipo.id_equipo || editingEquipo.id;
    if (id) {
      await mutationUpdate.mutateAsync({ id: Number(id), payload: data as any });
    }
  };

  // Upload Handlers
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const handleUploadLogo = async (file: File) => {
    if (!editingEquipo) return;
    const id = editingEquipo.id_equipo || editingEquipo.id;
    if (!id) return;
    setIsUploadingLogo(true);
    try {
      const res = await uploadLogoEquipo(Number(id), file);
      setEditingEquipo({ ...editingEquipo, url_logo: res.data?.url });
      queryClient.invalidateQueries({ queryKey: ['admin-equipos'] });
      toast.success('Logo actualizado');
    } catch {
      toast.error('Error al subir logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleUploadBanner = async (file: File) => {
    if (!editingEquipo) return;
    const id = editingEquipo.id_equipo || editingEquipo.id;
    if (!id) return;
    setIsUploadingBanner(true);
    try {
      const res = await uploadBannerEquipo(Number(id), file);
      setEditingEquipo({ ...editingEquipo, url_foto_equipo: res.data?.url });
      queryClient.invalidateQueries({ queryKey: ['admin-equipos'] });
      toast.success('Banner actualizado');
    } catch {
      toast.error('Error al subir banner');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!editingEquipo) return;
    const id = editingEquipo.id_equipo || editingEquipo.id;
    if (!id) return;
    try {
      await deleteLogoEquipo(Number(id));
      setEditingEquipo({ ...editingEquipo, url_logo: undefined });
      queryClient.invalidateQueries({ queryKey: ['admin-equipos'] });
      toast.success('Logo eliminado');
    } catch {
      toast.error('Error al eliminar logo');
    }
  };

  const handleRemoveBanner = async () => {
    if (!editingEquipo) return;
    const id = editingEquipo.id_equipo || editingEquipo.id;
    if (!id) return;
    try {
      await deleteBannerEquipo(Number(id));
      setEditingEquipo({ ...editingEquipo, url_foto_equipo: undefined });
      queryClient.invalidateQueries({ queryKey: ['admin-equipos'] });
      toast.success('Banner eliminado');
    } catch {
      toast.error('Error al eliminar banner');
    }
  };

  // Columnas
  const columns: Column<any>[] = [
    {
      key: 'equipo',
      header: 'Equipo',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.url_logo ? (
            <img src={row.url_logo} alt="Logo" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <Shield className="w-4 h-4" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">{row.nombre_equipo}</span>
            <span className="text-[11px] text-slate-500 font-medium">ID: {row.id_equipo}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'delegado',
      header: 'Delegado',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{row.usuario?.nombre || 'Desconocido'}</span>
          <span className="text-xs text-slate-500">{row.usuario?.correo || 'Sin correo'}</span>
        </div>
      )
    },
    {
      key: 'inscripciones',
      header: 'Inscripciones (Categorías)',
      render: (row) => {
        const cats = row.inscripciones?.map((i: any) => i.categoria ? `${i.categoria.nombre_categoria} (${i.categoria.genero_categoria})` : null).filter(Boolean);
        if (!cats || cats.length === 0) return <span className="text-slate-400 text-xs italic">Ninguna</span>;
        return <span className="text-xs text-slate-600 capitalize">{Array.from(new Set(cats)).join(', ')}</span>;
      }
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => {
        let colors = 'bg-slate-100 text-slate-800 border-slate-200';
        if (row.estado === 'activo' || row.estado === 'aprobado') colors = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        else if (row.estado === 'inactivo' || row.estado === 'rechazado') colors = 'bg-rose-100 text-rose-800 border-rose-200';
        else if (row.estado === 'pendiente') colors = 'bg-amber-100 text-amber-800 border-amber-200';

        return (
          <span className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border ${colors}`}>
            {row.estado || 'desconocido'}
          </span>
        );
      }
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewingPlantilla(row)}
            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-indigo-200 transition-colors"
            title="Ver Plantilla Rápida"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-200 transition-colors"
            title="Editar Equipo"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          
          {row.estado === 'activo' ? (
            <button
              onClick={() => setEquipoToDeactivate(row.id_equipo)}
              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 transition-colors"
              title="Desactivar Equipo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => reactivarMutation.mutate(row.id_equipo)}
              disabled={reactivarMutation.isPending}
              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors"
              title="Reactivar Equipo"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reactivarMutation.isPending ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 w-full px-[10%] py-8">
      {/* Cabecera idéntica a Jugadores y Torneos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center border border-indigo-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Gestión de Equipos
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                {response?.pagination?.total || 0} registros
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Panel administrativo para control del estado de los equipos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <button
            onClick={() => { setPage(1); queryClient.invalidateQueries({ queryKey: ['admin-equipos'] }); }}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Filtros y Búsqueda</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre de equipo..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>

          <div>
            <select
              value={selectedTorneo}
              onChange={(e) => {
                setSelectedTorneo(e.target.value ? Number(e.target.value) : '');
                setSelectedCategoria('');
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="">Todos los torneos</option>
              {torneos.map((t: any) => (
                <option key={t.id_torneo} value={t.id_torneo}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedCategoria}
              onChange={(e) => {
                setSelectedCategoria(e.target.value ? Number(e.target.value) : '');
                setPage(1);
              }}
              disabled={!selectedTorneo || categorias.length === 0}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white capitalize disabled:opacity-50"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c: any) => (
                <option key={c.id_categoria} value={c.id_categoria}>
                  {c.nombre_categoria} ({c.genero_categoria})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="">Todos los Estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="pendiente">Pendiente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <DataGridTable
          columns={columns}
          data={equipos}
          isLoading={isLoading}
          emptyMessage="No se encontraron equipos registrados."
        />
        
        {/* Paginación */}
        {response?.pagination && response.pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:justify-end gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(response.pagination.pages, p + 1))}
                disabled={page === response.pagination.pages}
                className="relative inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <DesactivarEquipoModal
        isOpen={equipoToDeactivate !== null}
        onClose={() => setEquipoToDeactivate(null)}
        idEquipo={equipoToDeactivate || 0}
        isAdmin={true}
      />

      {/* Modal Editar Equipo */}
      {editingEquipo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                Editar Equipo
              </h2>
              <button onClick={closeEditModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onEditSubmit)} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Equipo *</label>
                <input
                  type="text"
                  {...register('nombre_equipo')}
                  className="block w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2.5 border"
                  placeholder="Ej: Delfines BC"
                />
                {errors.nombre_equipo && <p className="mt-1 text-sm text-red-600">{errors.nombre_equipo.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Estado del Equipo</label>
                <select
                  {...register('estado')}
                  className="block w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2.5 border bg-white"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Logo del Equipo</label>
                  <FileUploadButton
                    onFileSelect={handleUploadLogo}
                    accept="image/*"
                    maxSizeMB={2}
                    label="Subir Logo"
                    isLoading={isUploadingLogo}
                    currentFileUrl={editingEquipo.url_logo}
                    onRemove={handleRemoveLogo}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Banner del Equipo</label>
                  <FileUploadButton
                    onFileSelect={handleUploadBanner}
                    accept="image/*"
                    maxSizeMB={4}
                    label="Subir Banner"
                    isLoading={isUploadingBanner}
                    currentFileUrl={editingEquipo.url_foto_equipo}
                    onRemove={handleRemoveBanner}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 border border-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <AsyncButton
                  onClickAction={handleSubmit(onEditSubmit)}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Guardar Cambios
                </AsyncButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Plantilla Rápida */}
      {viewingPlantilla && (
        <PlantillaRapidaModal 
          equipo={viewingPlantilla} 
          onClose={() => setViewingPlantilla(null)} 
        />
      )}
    </div>
  );
}

function PlantillaRapidaModal({ equipo, onClose }: { equipo: Equipo, onClose: () => void }) {
  const [page, setPage] = useState(1);
  const { data: res, isLoading } = useQuery({
    queryKey: ['plantillas-rapidas', equipo.id_equipo || equipo.id, page],
    queryFn: () => getPlantillas(equipo.id_equipo || equipo.id as number, page, 10),
  });

  const plantillas = res?.data || [];
  const pagination = res?.pagination;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Plantilla Inscrita</h2>
              <p className="text-xs text-slate-500 font-medium">{equipo.nombre_equipo}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-200/50 hover:bg-slate-200 p-1.5 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-start gap-2">
          <div className="text-blue-600 mt-0.5"><Shield className="w-4 h-4" /></div>
          <p className="text-xs text-blue-800 font-medium leading-relaxed">
            Aquí se muestran todos los jugadores que en algún momento han sido inscritos por este equipo. Si deseas alterar la información de algún jugador, debes hacerlo en la sección de <strong>Gestión de Jugadores</strong>.
          </p>
        </div>

        <div className="p-0 overflow-auto flex-1 bg-slate-50/50">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-300" />
            </div>
          ) : plantillas.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900">Sin Jugadores</h3>
              <p className="text-sm text-slate-500 mt-1">Este equipo no tiene jugadores registrados en ninguna plantilla todavía.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Jugador</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-center">Camiseta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {plantillas.map((p: any) => (
                  <tr key={p.id_plantilla} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {p.jugador?.url_foto ? (
                          <img src={p.jugador.url_foto} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs uppercase">
                            {p.jugador?.nombre?.substring(0, 2)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-slate-900">{p.jugador?.nombre}</p>
                          <p className="text-xs text-slate-500 font-medium">{p.jugador?.documento_identificacion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-slate-100 text-slate-700 font-bold text-sm border border-slate-200">
                        {p.numero_camiseta || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Paginación */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
            <span className="text-sm text-slate-500">
              Mostrando página <span className="font-medium text-slate-900">{pagination.page}</span> de <span className="font-medium text-slate-900">{pagination.pages}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
