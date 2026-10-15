import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { getPatrocinadores, createPatrocinador, updatePatrocinador, deletePatrocinador, type Patrocinador } from '../../features/patrocinadores/api/patrocinadores.api';
import { DataGridTable, type Column } from '../../components/DataGridTable';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Loader2, Award, Plus, Trash2, X, Image as ImageIcon } from 'lucide-react';

const schema = z.object({
  nombre_patrocinador: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
});
type FormDataSchema = z.infer<typeof schema>;

export default function AdminPatrocinadores() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Patrocinador | null>(null);
  const [deleteSponsorId, setDeleteSponsorId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: patrocinadores, isLoading } = useQuery({
    queryKey: ['admin-patrocinadores'],
    queryFn: getPatrocinadores,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormDataSchema>({
    resolver: zodResolver(schema),
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSponsor(null);
    setFile(null);
    setFilePreview(null);
    reset();
  };

  const openEditModal = (sponsor: Patrocinador) => {
    setEditingSponsor(sponsor);
    reset({ nombre_patrocinador: sponsor.nombre_patrocinador });
    setFilePreview(sponsor.url_logo_patrocinador);
    setFile(null);
    setIsModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => createPatrocinador(formData),
    onSuccess: () => {
      toast.success('Patrocinador registrado.');
      queryClient.invalidateQueries({ queryKey: ['admin-patrocinadores'] });
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al registrar.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: number, formData: FormData }) => updatePatrocinador(id, formData),
    onSuccess: () => {
      toast.success('Patrocinador actualizado.');
      queryClient.invalidateQueries({ queryKey: ['admin-patrocinadores'] });
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al actualizar.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePatrocinador(id),
    onSuccess: () => {
      toast.success('Patrocinador eliminado.');
      queryClient.invalidateQueries({ queryKey: ['admin-patrocinadores'] });
      setDeleteSponsorId(null);
    },
    onError: () => toast.error('Error al eliminar el patrocinador.')
  });

  const onSubmit = async (data: FormDataSchema) => {
    if (!editingSponsor && !file) {
      toast.error('Debe seleccionar el logo del patrocinador.');
      return;
    }
    const formData = new FormData();
    formData.append('nombre_patrocinador', data.nombre_patrocinador);
    if (file) formData.append('logo', file);

    if (editingSponsor) {
      await updateMutation.mutateAsync({ id: editingSponsor.id_patrocinador, formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('El archivo excede los 10MB');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
    }
  };

  const clearFile = () => {
    setFile(null);
    if (editingSponsor) {
      setFilePreview(editingSponsor.url_logo_patrocinador);
    } else {
      setFilePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const columns: Column<Patrocinador>[] = [
    { 
      key: 'logo', 
      header: 'Logo', 
      render: (row) => (
        <div className="h-10 w-24 bg-white rounded flex items-center justify-center overflow-hidden p-1 ring-1 ring-oro/30">
          {row.url_logo_patrocinador ? (
            <img src={row.url_logo_patrocinador} alt={row.nombre_patrocinador} className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageIcon className="w-5 h-5 text-slate-400" />
          )}
        </div>
      ) 
    },
    { key: 'nombre', header: 'Nombre del Auspiciante', render: (row) => <span className="font-bold text-crema">{row.nombre_patrocinador}</span> },
    { key: 'acciones', header: 'Acciones', render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-white/10 text-slate-300 hover:bg-white/15"
          >
            Editar
          </button>
          <button
            onClick={() => setDeleteSponsorId(row.id_patrocinador)}
            className="p-1.5 rounded-md text-red-300 hover:bg-red-500/15"
            title="Eliminar"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-crema flex items-center gap-2">
            <Award className="w-6 h-6 text-oro"/> 
            Auspiciantes
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Gestiona los patrocinadores que se mostrarán en la página principal.
          </p>
        </div>
        <button
          onClick={() => { reset(); setIsModalOpen(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-celeste px-4 py-2 text-sm font-medium text-marino hover:bg-white transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Auspiciante
        </button>
      </div>

      <div className="bg-marino-claro shadow-sm border border-white/10 rounded-lg overflow-hidden">
        <DataGridTable 
          columns={columns} 
          data={patrocinadores || []} 
          isLoading={isLoading} 
          emptyMessage="No hay auspiciantes registrados en el sistema." 
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-marino-claro rounded-xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-crema">
                {editingSponsor ? 'Editar Auspiciante' : 'Nuevo Auspiciante'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre del Auspiciante</label>
                <input
                  {...register('nombre_patrocinador')}
                  type="text"
                  className="w-full rounded-md border border-white/15 px-3 py-2 text-sm focus:border-celeste focus:ring-1 focus:ring-celeste outline-none"
                  placeholder="Ej. Coca-Cola"
                />
                {errors.nombre_patrocinador && <p className="mt-1 text-xs text-red-400">{errors.nombre_patrocinador.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Logo del Auspiciante</label>
                <div className="flex flex-col gap-4">
                  {/* Vista Previa más grande */}
                  <div className="relative h-40 w-full sm:w-64 rounded-xl border-2 border-dashed border-white/15 flex items-center justify-center bg-white/[0.03] overflow-hidden group">
                    {filePreview ? (
                      <>
                        <img src={filePreview} alt="Preview" className="h-full w-full object-contain p-2" />
                        {file && (
                          <button
                            type="button"
                            onClick={clearFile}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/30"
                            title="Eliminar archivo seleccionado"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                        <span className="text-xs font-medium">Sin imagen</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Selector de Archivo */}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-celeste/10 file:text-celeste hover:file:bg-celeste/15 cursor-pointer transition-colors"
                    />
                    <p className="mt-2 text-xs text-slate-400">Formato JPG, PNG o WebP. Tamaño máximo 10MB.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-marino-claro border border-white/15 rounded-md hover:bg-white/5 disabled:opacity-50"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-marino bg-celeste rounded-md hover:bg-white disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {editingSponsor ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteSponsorId && (
        <ConfirmationModal
          title="Eliminar Auspiciante"
          description="¿Estás seguro de que deseas eliminar este auspiciante? Esta acción no se puede deshacer."
          isDangerous={true}
          onConfirm={() => deleteMutation.mutate(deleteSponsorId)}
          onCancel={() => setDeleteSponsorId(null)}
        />
      )}
    </div>
  );
}
