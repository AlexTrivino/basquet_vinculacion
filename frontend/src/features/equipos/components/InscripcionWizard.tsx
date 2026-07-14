import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AsyncButton } from '../../../components/AsyncButton';
import { inscribirEquipoCompleto } from '../api/equipos.api';
import { getTorneos } from '../../torneos/api/torneos.api';
import { getCategorias } from '../../categorias/api/categorias.api';

const inscripcionSchema = z.object({
  torneo: z.string().min(1, 'Debes seleccionar un torneo'),
  nombreEquipo: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  categoria: z.string().min(1, 'Debes seleccionar una categoría'),
});

type InscripcionValues = z.infer<typeof inscripcionSchema>;

export function InscripcionWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);

  const { data: torneosRes, isLoading: isLoadingTorneos } = useQuery({
    queryKey: ['torneos_activos'],
    queryFn: () => getTorneos(1, 100),
  });

  const { data: categoriasRes, isLoading: isLoadingCategorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => getCategorias(1, 100),
  });

  const torneos = torneosRes?.data?.filter(t => t.estado === 'en_curso' || t.estado === 'programado') || [];
  const categorias = categoriasRes?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InscripcionValues>({
    resolver: zodResolver(inscripcionSchema),
    defaultValues: {
      torneo: '',
      nombreEquipo: '',
      categoria: '',
    },
  });

  const onSubmit = async (data: InscripcionValues) => {
    if (!comprobanteFile) {
      toast.error('Debes seleccionar un archivo para el comprobante');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('nombre_equipo', data.nombreEquipo);
      formData.append('id_torneo', data.torneo);
      formData.append('id_categoria', data.categoria);
      formData.append('archivo', comprobanteFile);

      await inscribirEquipoCompleto(formData);
      
      queryClient.invalidateQueries({ queryKey: ['inscripciones', 'delegado'] });
      toast.success('Comuniquese con el representante de la organización');
      navigate('/delegado/dashboard');
    } catch (error: any) {
      console.error(error);
      let message = error.response?.data?.message || 'Error al procesar la inscripción';
      if (message.toLowerCase().includes('tamaño') || message.toLowerCase().includes('size')) {
        message = 'El comprobante excede el tamaño máximo permitido (5 MB).';
      }
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-gray-900">Datos de Inscripción</h2>
      <p className="mb-6 mt-1 text-sm text-gray-500">
        Completa todos los campos obligatorios y adjunta el comprobante de pago para matricular tu equipo.
      </p>

      <form className="flex flex-col gap-5">
        <div>
          <label htmlFor="torneo" className="mb-1 block text-sm font-medium text-gray-700">
            Torneo a Inscribirse
          </label>
          <select
            id="torneo"
            {...register('torneo')}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
            disabled={isLoadingTorneos || torneos.length === 0}
          >
            <option value="">-- Selecciona un torneo --</option>
            {torneos.map(t => (
              <option key={t.id_torneo || t.id} value={t.id_torneo || t.id}>{t.nombre_torneo || t.nombre}</option>
            ))}
          </select>
          {torneos.length === 0 && !isLoadingTorneos && (
              <p className="mt-1 text-xs text-amber-600">No hay torneos activos disponibles.</p>
          )}
          {errors.torneo && <p className="mt-1 text-xs text-red-600">{errors.torneo.message}</p>}
        </div>

        <div>
          <label htmlFor="categoria" className="mb-1 block text-sm font-medium text-gray-700">
            Categoría Oficial
          </label>
          <select
            id="categoria"
            {...register('categoria')}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
            disabled={isLoadingCategorias || categorias.length === 0}
          >
            <option value="">-- Selecciona una categoría --</option>
            {categorias.map(c => (
              <option key={c.id_categoria || c.id} value={c.id_categoria || c.id} className="capitalize">{c.nombre_categoria || c.nombre} ({c.genero_categoria})</option>
            ))}
          </select>
          {errors.categoria && <p className="mt-1 text-xs text-red-600">{errors.categoria.message}</p>}
        </div>

        <div>
          <label htmlFor="nombreEquipo" className="mb-1 block text-sm font-medium text-gray-700">
            Nombre del Equipo
          </label>
          <input
            id="nombreEquipo"
            type="text"
            {...register('nombreEquipo')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Ej. Los Ángeles Lakers"
          />
          {errors.nombreEquipo && <p className="mt-1 text-xs text-red-600">{errors.nombreEquipo.message}</p>}
        </div>

        <div>
          <label htmlFor="comprobante" className="mb-1 block text-sm font-medium text-gray-700">
            Archivo de Comprobante (PDF, JPG, PNG)
          </label>
          <p className="mb-2 text-xs text-gray-500">
            Tamaño máximo permitido: 5 MB.
          </p>
          <input
            id="comprobante"
            type="file"
            accept=".pdf, .jpg, .jpeg, .png"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setComprobanteFile(e.target.files[0]);
              } else {
                setComprobanteFile(null);
              }
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>

        <div className="mt-4 border-t border-gray-100 pt-5">
          <AsyncButton
            type="button"
            onClickAction={handleSubmit(onSubmit)}
            className="w-full bg-primary-600 py-2.5 text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            disabled={torneos.length === 0 || categorias.length === 0 || !comprobanteFile}
          >
            Inscribir Equipo
          </AsyncButton>
        </div>
      </form>
    </div>
  );
}
