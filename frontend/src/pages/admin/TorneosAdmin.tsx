import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Trophy, Plus, X, Edit, Trash2 } from 'lucide-react';

import { DataGridTable, type Column } from '../../components/DataGridTable';
import { AsyncButton } from '../../components/AsyncButton';
import { getTorneos, createTorneo, updateTorneo, deleteTorneo } from '../../features/torneos/api/torneos.api';
import type { Torneo } from '../../types/api.types';

const torneoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
  fecha_fin: z.string().min(1, 'La fecha de fin es obligatoria'),
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
    queryFn: () => getTorneos(1, 100),
  });

  const torneos = response?.data || [];

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
      setValue('fecha_inicio', new Date(torneo.fecha_inicio).toISOString().split('T')[0]);
      setValue('fecha_fin', new Date(torneo.fecha_fin).toISOString().split('T')[0]);
    } else {
      setEditingTorneo(null);
      reset({ nombre: '', fecha_inicio: '', fecha_fin: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTorneo(null);
    reset();
  };

  const mutationCreate = useMutation({
    mutationFn: createTorneo,
    onSuccess: () => {
      toast.success('Torneo creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['torneos_admin'] });
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
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar el torneo');
    },
  });

  const mutationDelete = useMutation({
    mutationFn: deleteTorneo,
    onSuccess: () => {
      toast.success('Torneo inactivado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['torneos_admin'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al inactivar el torneo');
    },
  });

  const onSubmit = async (data: TorneoFormValues) => {
    if (editingTorneo) {
      const id = editingTorneo.id_torneo || editingTorneo.id;
      if (id) {
        await mutationUpdate.mutateAsync({ id, payload: data });
      }
    } else {
      await mutationCreate.mutateAsync(data);
    }
  };

  const handleInactivar = async (torneo: Torneo) => {
    const id = torneo.id_torneo || torneo.id;
    if (!id) return;
    if (confirm(`¿Estás seguro de inactivar el torneo "${torneo.nombre || torneo.nombre_torneo}"?`)) {
      await mutationDelete.mutateAsync(id);
    }
  };

  const columns: Column<Torneo>[] = [
    {
      key: 'nombre',
      header: 'Nombre del Torneo',
      render: (row) => <span className="font-medium text-gray-900">{row.nombre || row.nombre_torneo}</span>,
    },
    {
      key: 'fecha_inicio',
      header: 'Fecha Inicio',
      render: (row) => new Date(row.fecha_inicio).toLocaleDateString(),
    },
    {
      key: 'fecha_fin',
      header: 'Fecha Fin',
      render: (row) => new Date(row.fecha_fin).toLocaleDateString(),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize
          ${row.estado === 'programado' ? 'bg-blue-100 text-blue-800' : ''}
          ${row.estado === 'en_curso' ? 'bg-green-100 text-green-800' : ''}
          ${row.estado === 'finalizado' ? 'bg-gray-100 text-gray-800' : ''}
          ${row.estado === 'inactivo' ? 'bg-red-100 text-red-800' : ''}
        `}>
          {row.estado.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => openModal(row)}
            className="rounded p-1.5 text-primary-600 hover:bg-primary-50 transition-colors"
            title="Editar Torneo"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleInactivar(row)}
            className="rounded p-1.5 text-red-600 hover:bg-red-50 transition-colors"
            title="Inactivar Torneo"
            disabled={row.estado === 'inactivo'}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary-600" />
            Gestión de Torneos
          </h1>
          <p className="mt-2 text-gray-600">Administra los torneos, sus fechas y estados.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nuevo Torneo
        </button>
      </div>

      <DataGridTable
        columns={columns}
        data={torneos}
        isLoading={isLoading}
        emptyMessage="No se encontraron torneos registrados en el sistema."
      />

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTorneo ? 'Editar Torneo' : 'Crear Nuevo Torneo'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre del Torneo *</label>
                <input
                  type="text"
                  {...register('nombre')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                  placeholder="Ej: Torneo Clausura 2026"
                />
                {errors.nombre && <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Inicio *</label>
                  <input
                    type="date"
                    {...register('fecha_inicio')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                  />
                  {errors.fecha_inicio && <p className="mt-1 text-sm text-red-600">{errors.fecha_inicio.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Fin *</label>
                  <input
                    type="date"
                    {...register('fecha_fin')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                  />
                  {errors.fecha_fin && <p className="mt-1 text-sm text-red-600">{errors.fecha_fin.message}</p>}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 border border-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <AsyncButton
                  onClickAction={handleSubmit(onSubmit)}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
                >
                  {editingTorneo ? 'Guardar Cambios' : 'Crear Torneo'}
                </AsyncButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
