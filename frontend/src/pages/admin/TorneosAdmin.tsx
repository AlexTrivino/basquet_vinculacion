import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Trophy, Plus, X, Edit, Trash2, Search, Filter, RefreshCw, FileSpreadsheet } from 'lucide-react';

import { DataGridTable, type Column } from '../../components/DataGridTable';
import { AsyncButton } from '../../components/AsyncButton';
import { FileUploadButton } from '../../components/FileUploadButton';
import { getTorneosAdmin, createTorneo, updateTorneo, anularTorneo, addCategoria, deleteCategoria, uploadCalendario } from '../../features/torneos/api/torneos.api';
import type { Torneo } from '../../types/api.types';

const torneoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
  fecha_fin: z.string().min(1, 'La fecha de fin es obligatoria'),
  categorias: z.array(z.object({
    id_categoria: z.number().optional(),
    nombre_categoria: z.string().min(1, 'Obligatorio'),
    genero_categoria: z.string().min(1, 'Obligatorio'),
    edad_minima: z.number().min(0, 'Mínimo 0'),
    edad_maxima: z.number().nullable().optional(),
  })).optional(),
  estado: z.string().optional(),
}).refine((data) => new Date(data.fecha_fin) >= new Date(data.fecha_inicio), {
  message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
  path: ['fecha_fin'],
});

type TorneoFormValues = z.infer<typeof torneoSchema>;

export default function TorneosAdmin() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTorneo, setEditingTorneo] = useState<Torneo | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['torneos_admin'],
    queryFn: () => getTorneosAdmin(1, 100),
  });

  const torneos = response?.data || [];

  const [categoriasList, setCategoriasList] = useState<any[]>([]);
  const [newCatNombre, setNewCatNombre] = useState('');
  const [newCatGenero, setNewCatGenero] = useState('masculino');
  const [newCatMin, setNewCatMin] = useState<number>(0);
  const [newCatMax, setNewCatMax] = useState<number | ''>('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TorneoFormValues>({
    resolver: zodResolver(torneoSchema),
  });

  const openModal = (torneo?: Torneo) => {
    if (torneo) {
      setEditingTorneo(torneo);
      setValue('nombre', torneo.nombre || torneo.nombre_torneo || '');
      setValue('fecha_inicio', torneo.fecha_inicio ? new Date(torneo.fecha_inicio).toISOString().split('T')[0] : '');
      setValue('fecha_fin', torneo.fecha_fin ? new Date(torneo.fecha_fin).toISOString().split('T')[0] : '');
      setValue('estado', torneo.estado);
      setCategoriasList(torneo.categorias || []);
    } else {
      setEditingTorneo(null);
      reset({ nombre: '', fecha_inicio: '', fecha_fin: '', categorias: [], estado: 'programado' });
      setCategoriasList([]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTorneo(null);
    setCategoriasList([]);
    reset();
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleAddCategoria = async () => {
    if (!newCatNombre.trim() || !newCatGenero || newCatMin < 0) {
      toast.error('Verifica los datos de la categoría.');
      return;
    }
    const nuevaCategoria = {
      nombre_categoria: newCatNombre.trim(),
      genero_categoria: newCatGenero,
      edad_minima: newCatMin,
      edad_maxima: newCatMax === '' ? null : Number(newCatMax),
    };

    if (editingTorneo) {
      try {
        const idTorneo = editingTorneo.id_torneo || editingTorneo.id;
        const res = await addCategoria(idTorneo as number, nuevaCategoria);
        toast.success('Categoría agregada al torneo');
        setCategoriasList([...categoriasList, res.data]);
        queryClient.invalidateQueries({ queryKey: ['torneos_admin'] });
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Error al agregar categoría');
      }
    } else {
      setCategoriasList([...categoriasList, nuevaCategoria]);
      setValue('categorias', [...categoriasList, nuevaCategoria]);
    }

    setNewCatNombre('');
    setNewCatMin(0);
    setNewCatMax('');
  };

  const handleRemoveCategoria = async (index: number, idCat?: number) => {
    if (editingTorneo && idCat) {
      if (!confirm('¿Seguro de eliminar esta categoría? Si hay equipos inscritos, fallará.')) return;
      try {
        await deleteCategoria(idCat);
        toast.success('Categoría eliminada');
        setCategoriasList(categoriasList.filter((c) => c.id_categoria !== idCat && c.id !== idCat));
        queryClient.invalidateQueries({ queryKey: ['torneos_admin'] });
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Error al eliminar categoría');
      }
    } else {
      const newList = categoriasList.filter((_, i) => i !== index);
      setCategoriasList(newList);
      setValue('categorias', newList);
    }
  };

  const handleUploadCalendario = async (file: File) => {
    if (!editingTorneo) return;
    const idTorneo = editingTorneo.id_torneo || editingTorneo.id;
    if (!idTorneo) return;
    
    setIsUploading(true);
    try {
      const res = await uploadCalendario(idTorneo, file);
      toast.success('Calendario subido exitosamente');
      setEditingTorneo({ ...editingTorneo, url_calendario_excel: res.data?.url });
      queryClient.invalidateQueries({ queryKey: ['torneos_admin'] });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al subir calendario');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveCalendario = async () => {
    if (!editingTorneo) return;
    const idTorneo = editingTorneo.id_torneo || editingTorneo.id;
    if (!idTorneo) return;
    
    try {
      await updateTorneo(idTorneo, { url_calendario_excel: undefined } as any);
      toast.success('Calendario eliminado');
      setEditingTorneo({ ...editingTorneo, url_calendario_excel: undefined });
      queryClient.invalidateQueries({ queryKey: ['torneos_admin'] });
    } catch {
      toast.error('Error al eliminar calendario');
    }
  };

  const mutationCreate = useMutation({
    mutationFn: createTorneo,
    onSuccess: () => {
      toast.success('Torneo creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['torneos_admin'] });
      queryClient.invalidateQueries({ queryKey: ['torneos'] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear el torneo');
    },
  });

  const mutationUpdate = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Torneo> }) => updateTorneo(id, payload),
    onSuccess: () => {
      toast.success('Torneo actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['torneos_admin'] });
      queryClient.invalidateQueries({ queryKey: ['torneos'] });
      closeModal();
    },
    onError: () => {
      toast.error('Error al editar el torneo');
    },
  });

  const mutationAnular = useMutation({
    mutationFn: anularTorneo,
    onSuccess: () => {
      toast.success('Torneo anulado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['torneos_admin'] });
      queryClient.invalidateQueries({ queryKey: ['torneos'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al anular el torneo');
    },
  });

  const onSubmit = async (data: TorneoFormValues) => {
    if (editingTorneo) {
      const id = editingTorneo.id_torneo || editingTorneo.id;
      if (id) {
        // Exclude categorias when updating a torneo, because we manage them individually now
        const payload = { ...data };
        delete payload.categorias;
        await mutationUpdate.mutateAsync({ id, payload: payload as any });
      }
    } else {
      await mutationCreate.mutateAsync(data as any);
    }
  };

  const handleAnular = async (torneo: Torneo) => {
    const id = torneo.id_torneo || torneo.id;
    if (!id) return;
    if (confirm(`¿Estás seguro de ANULAR el torneo "${torneo.nombre || torneo.nombre_torneo}"?\n\nEsta acción lo ocultará del público, pero mantendrá el historial. No se puede revertir.`)) {
      await mutationAnular.mutateAsync(id);
    }
  };

  const columns: Column<Torneo>[] = [
    {
      key: 'nombre',
      header: 'Nombre del Torneo',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-crema">{row.nombre || row.nombre_torneo}</span>
          {row.categorias && row.categorias.length > 0 ? (
             <span className="text-xs text-slate-500 font-medium">{row.categorias.length} categorías</span>
          ) : (
             <span className="text-xs text-orange-400 font-medium">Sin categorías</span>
          )}
        </div>
      ),
    },
    {
      key: 'fechas',
      header: 'Período',
      render: (row) => (
        <div className="flex flex-col text-sm text-slate-300 font-medium">
          <span><span className="text-slate-400">Del:</span> {row.fecha_inicio ? new Date(row.fecha_inicio).toLocaleDateString() : 'N/A'}</span>
          <span><span className="text-slate-400">Al:</span> {row.fecha_fin ? new Date(row.fecha_fin).toLocaleDateString() : 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'calendario',
      header: 'Calendario',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.url_calendario_excel ? (
            <a
              href={row.url_calendario_excel}
              target="_blank"
              rel="noopener noreferrer"
              title="Ver Calendario Oficial"
              className="h-7 px-3 rounded-md flex items-center justify-center gap-1.5 text-xs font-bold transition-colors bg-emerald-500/15 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-500/30 w-[68px]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ver</span>
            </a>
          ) : (
            <span
              title="Sin calendario"
              className="h-7 px-3 rounded-md flex items-center justify-center text-xs font-bold transition-colors bg-white/10 text-slate-400 border border-white/10 w-[68px]"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => {
        let colors = 'bg-white/10 text-crema border-white/10';
        if (row.estado === 'programado') colors = 'bg-blue-500/15 text-blue-200 border-blue-400/30';
        else if (row.estado === 'en_curso') colors = 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30';
        else if (row.estado === 'finalizado') colors = 'bg-purple-500/15 text-purple-200 border-purple-400/30';
        else if (row.estado === 'anulado') colors = 'bg-rose-500/15 text-rose-200 border-rose-400/30';

        return (
          <span className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border ${colors}`}>
            {(row.estado || 'programado').replace('_', ' ')}
          </span>
        );
      },
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openModal(row)}
            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-400/30 transition-colors"
            title="Editar Torneo"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>
          
          <button
            onClick={() => handleAnular(row)}
            disabled={row.estado === 'anulado'}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors ${
              row.estado === 'anulado'
                ? 'bg-white/5 text-slate-400 border-white/10 cursor-not-allowed opacity-60'
                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 border-rose-400/30'
            }`}
            title="Anular Torneo"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const [searchInput, setSearchInput] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');

  const filteredTorneos = torneos.filter((t: Torneo) => {
    const nombre = (t.nombre || t.nombre_torneo || '').toLowerCase();
    const searchMatch = nombre.includes(searchInput.toLowerCase());
    const estadoMatch = selectedEstado ? t.estado === selectedEstado : true;
    return searchMatch && estadoMatch;
  });

  const totalTorneos = torneos.length;
  const hasActiveFilters = searchInput || selectedEstado;

  const handleResetFilters = () => {
    setSearchInput('');
    setSelectedEstado('');
  };

  return (
    <div className="space-y-6 w-full px-[10%] py-8">
      {/* Cabecera idéntica a Jugadores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-marino-claro p-6 rounded-2xl border border-white/10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-oro/10 text-oro flex items-center justify-center border border-oro/30">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-display text-2xl font-black text-crema tracking-tight">
                Gestión de Torneos
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-white/10 text-slate-300 rounded-full border border-white/10">
                {totalTorneos} registros
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Administra los torneos, configuración de categorías y calendario de juegos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['torneos_admin'] })}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-300' : ''}`} />
            <span>Actualizar</span>
          </button>
          
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-celeste hover:bg-white text-marino rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Torneo</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-marino-claro p-5 rounded-2xl border border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-crema">
            <Filter className="w-4 h-4 text-blue-300" />
            <span>Filtros y Búsqueda</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-blue-300 hover:text-blue-200 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar torneo por nombre..."
              className="w-full pl-9 pr-4 py-2 border border-white/15 rounded-xl text-sm focus:ring-2 focus:ring-celeste focus:border-celeste bg-marino-claro"
            />
          </div>

          <div>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full px-3 py-2 border border-white/15 rounded-xl text-sm focus:ring-2 focus:ring-celeste focus:border-celeste bg-marino-claro"
            >
              <option value="">Todos los Estados</option>
              <option value="programado">Programado</option>
              <option value="en_curso">En Curso</option>
              <option value="finalizado">Finalizado</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-marino-claro rounded-2xl border border-white/10 shadow-sm overflow-hidden">
        <DataGridTable
          columns={columns}
          data={filteredTorneos}
          isLoading={isLoading}
          emptyMessage="No se encontraron torneos con los filtros seleccionados."
        />
      </div>

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl bg-marino-claro shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-xl font-bold text-crema">
                {editingTorneo ? 'Editar Torneo' : 'Crear Nuevo Torneo'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-300 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit as any)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Nombre del Torneo *</label>
                <input
                  type="text"
                  {...register('nombre')}
                  className="mt-1 block w-full rounded-md border-white/15 shadow-sm focus:border-celeste focus:ring-celeste sm:text-sm px-3 py-2 border"
                  placeholder="Ej: Torneo Clausura 2026"
                />
                {errors.nombre && <p className="mt-1 text-sm text-red-300">{errors.nombre.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Fecha Inicio *</label>
                  <input
                    type="date"
                    {...register('fecha_inicio')}
                    className="mt-1 block w-full rounded-md border-white/15 shadow-sm focus:border-celeste focus:ring-celeste sm:text-sm px-3 py-2 border"
                  />
                  {errors.fecha_inicio && <p className="mt-1 text-sm text-red-300">{errors.fecha_inicio.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Fecha Fin *</label>
                  <input
                    type="date"
                    {...register('fecha_fin')}
                    className="mt-1 block w-full rounded-md border-white/15 shadow-sm focus:border-celeste focus:ring-celeste sm:text-sm px-3 py-2 border"
                  />
                  {errors.fecha_fin && <p className="mt-1 text-sm text-red-300">{errors.fecha_fin.message}</p>}
                </div>
              </div>

              {editingTorneo && (
                <div>
                  <label className="block text-sm font-medium text-slate-300">Estado del Torneo</label>
                  <select
                    {...register('estado')}
                    className="mt-1 block w-full rounded-md border-white/15 shadow-sm focus:border-celeste focus:ring-celeste sm:text-sm px-3 py-2 border bg-marino-claro"
                  >
                    <option value="programado">Programado</option>
                    <option value="en_curso">En Curso</option>
                    <option value="finalizado">Finalizado</option>
                    <option value="anulado">Anulado</option>
                  </select>
                </div>
              )}

              {/* Calendario Excel */}
              {editingTorneo && (
                <div className="border-t border-white/10 pt-4 mt-4">
                  <h3 className="text-sm font-bold text-crema mb-2">Calendario de Juegos (Excel)</h3>
                  <FileUploadButton
                    onFileSelect={handleUploadCalendario}
                    accept=".xlsx,.xls"
                    maxSizeMB={5}
                    label="Subir Calendario Excel"
                    isLoading={isUploading}
                    currentFileUrl={editingTorneo.url_calendario_excel}
                    onRemove={handleRemoveCalendario}
                  />
                </div>
              )}

              {/* Sección de Categorías */}
              <div className="border-t border-white/10 pt-4 mt-4">
                <h3 className="text-sm font-bold text-crema mb-3">Categorías del Torneo</h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end mb-4 bg-white/5 p-3 rounded-lg border border-white/10">
                    <div className="col-span-2 sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-300">Nombre</label>
                      <input 
                        type="text" 
                        value={newCatNombre} 
                        onChange={e => setNewCatNombre(e.target.value)}
                        placeholder="Ej: Sub-18" 
                        className="mt-1 block w-full rounded-md border-white/15 shadow-sm focus:border-celeste focus:ring-celeste text-sm px-2 py-1.5 border"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300">Género</label>
                      <select 
                        value={newCatGenero} 
                        onChange={e => setNewCatGenero(e.target.value)}
                        className="mt-1 block w-full rounded-md border-white/15 shadow-sm focus:border-celeste focus:ring-celeste text-sm px-2 py-1.5 border bg-marino-claro"
                      >
                        <option value="masculino">Masculino</option>
                        <option value="femenino">Femenino</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300">Ed. Mín.</label>
                      <input 
                        type="number" 
                        value={newCatMin} 
                        onChange={e => setNewCatMin(Number(e.target.value))}
                        className="mt-1 block w-full rounded-md border-white/15 shadow-sm focus:border-celeste focus:ring-celeste text-sm px-2 py-1.5 border"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300">Ed. Máx.</label>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          value={newCatMax} 
                          onChange={e => setNewCatMax(e.target.value ? Number(e.target.value) : '')}
                          placeholder="Sin lim."
                          className="mt-1 block w-full rounded-md border-white/15 shadow-sm focus:border-celeste focus:ring-celeste text-sm px-2 py-1.5 border"
                        />
                        <button
                          type="button"
                          onClick={handleAddCategoria}
                          className="mt-1 flex items-center justify-center rounded-md bg-marino px-2 py-1.5 text-white hover:bg-marino transition-colors"
                          title="Añadir Categoría"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {categoriasList.length > 0 ? (
                    <ul className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {categoriasList.map((cat, index) => (
                        <li key={index} className="flex items-center justify-between bg-marino-claro border border-white/10 rounded-md p-2 shadow-sm">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-crema">{cat.nombre_categoria} <span className="text-xs font-normal text-slate-400 capitalize">({cat.genero_categoria})</span></span>
                            <span className="text-xs text-slate-400">
                              Edad: {cat.edad_minima} - {cat.edad_maxima ? cat.edad_maxima : 'Sin límite'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCategoria(index, cat.id_categoria || cat.id)}
                            className="p-1.5 text-red-300 hover:bg-red-500/15 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 text-center italic py-2">No has agregado categorías a este torneo.</p>
                  )}
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 border border-white/15 transition-colors"
                >
                  Cancelar
                </button>
                <AsyncButton
                  onClickAction={handleSubmit(onSubmit as any)}
                  className="rounded-lg bg-celeste px-4 py-2 text-sm font-semibold text-marino hover:bg-white transition-colors"
                >
                  {editingTorneo ? 'Guardar Cambios' : 'Crear Torneo'}
                </AsyncButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
