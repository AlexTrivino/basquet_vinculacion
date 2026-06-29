import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AsyncButton } from '../../../components/AsyncButton';
import { createEquipo, createInscripcion } from '../api/equipos.api';

// Esquema Zod
const inscripcionSchema = z.object({
  nombreEquipo: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  categoria: z.string().min(1, 'Debes seleccionar una categoría'),
  entrenador: z.string().min(3, 'El nombre del entrenador es requerido'),
});

type InscripcionValues = z.infer<typeof inscripcionSchema>;

export function InscripcionWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InscripcionValues>({
    resolver: zodResolver(inscripcionSchema),
    defaultValues: {
      nombreEquipo: '',
      categoria: '',
      entrenador: '',
    },
  });

  const onSubmit = async (data: InscripcionValues) => {
    try {
      // 1. Crear el equipo
      const equipoRes = await createEquipo({
        nombre: data.nombreEquipo,
        entrenador: data.entrenador,
      });
      
      const nuevoEquipo = equipoRes.data;
      if (!nuevoEquipo) throw new Error('No se pudo crear el equipo');

      // 2. Crear la inscripción (usando torneo 1 por defecto para MVP)
      await createInscripcion({
        id_torneo: 1, // TODO: Seleccionar torneo dinámicamente si hay múltiples
        id_equipo: nuevoEquipo.id_equipo || nuevoEquipo.id,
        id_categoria: Number(data.categoria),
      });

      // 3. Invalidar caché para refrescar el Dashboard
      queryClient.invalidateQueries({ queryKey: ['inscripciones', 'delegado'] });

      toast.success('Inscripción registrada correctamente');
      navigate('/delegado/dashboard');
    } catch (error: any) {
      console.error(error);
      const message =
        error.response?.data?.message ||
        'Ocurrió un error al procesar la inscripción.';
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-gray-900">Formulario de Inscripción</h2>
      <p className="mb-6 mt-1 text-sm text-gray-500">
        Ingresa los datos obligatorios para matricular a tu equipo en el torneo.
      </p>

      <form className="flex flex-col gap-5">
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
          <label htmlFor="categoria" className="mb-1 block text-sm font-medium text-gray-700">
            Categoría Oficial
          </label>
          <select
            id="categoria"
            {...register('categoria')}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">-- Selecciona una categoría --</option>
            <option value="1">Masculino Senior</option>
            <option value="2">Femenino Senior</option>
            <option value="3">Mixto Libre</option>
          </select>
          {errors.categoria && <p className="mt-1 text-xs text-red-600">{errors.categoria.message}</p>}
        </div>

        <div>
          <label htmlFor="entrenador" className="mb-1 block text-sm font-medium text-gray-700">
            Director Técnico / Entrenador
          </label>
          <input
            id="entrenador"
            type="text"
            {...register('entrenador')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Ej. Phil Jackson"
          />
          {errors.entrenador && <p className="mt-1 text-xs text-red-600">{errors.entrenador.message}</p>}
        </div>

        <div className="mt-4 border-t border-gray-100 pt-5">
          <AsyncButton
            type="button"
            onClickAction={handleSubmit(onSubmit)}
            className="w-full bg-primary-600 py-2.5 text-white transition-colors hover:bg-primary-700"
          >
            Guardar Inscripción
          </AsyncButton>
        </div>
      </form>
    </div>
  );
}
