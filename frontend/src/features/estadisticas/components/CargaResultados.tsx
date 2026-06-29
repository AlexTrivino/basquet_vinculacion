import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AsyncButton } from '../../../components/AsyncButton';

// Esquema para validar los resultados antes de tocar el backend
const cargaSchema = z.object({
  partidoId: z.string().min(1, 'Debes seleccionar un partido finalizado'),
  puntosLocal: z.number().min(0, 'No puede ser negativo').max(300, 'Puntaje irreal'),
  puntosVisitante: z.number().min(0, 'No puede ser negativo').max(1000, 'Puntaje irreal'),
  observaciones: z.string().optional(),
});

type CargaValues = z.infer<typeof cargaSchema>;

export function CargaResultados() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CargaValues>({
    resolver: zodResolver(cargaSchema),
    defaultValues: { partidoId: '', puntosLocal: 0, puntosVisitante: 0, observaciones: '' },
  });

  const onSubmit = async (data: CargaValues) => {
    // Simula retardo HTTP
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('Resultados enviados (Bulk):', data);
    toast.success('Resultados procesados. La tabla de posiciones ha sido actualizada.');
    reset(); // Limpiar el formulario tras envío exitoso
  };

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="mb-6 text-xl font-bold text-gray-900">Carga de Resultados Oficiales</h2>
      
      <form className="flex flex-col gap-6">
        <div>
          <label htmlFor="partidoId" className="mb-1 block text-sm font-medium text-gray-700">
            Partido Finalizado
          </label>
          <select
            id="partidoId"
            {...register('partidoId')}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">-- Selecciona el encuentro --</option>
            <option value="p1">Lakers vs Bulls (24 Oct 2026)</option>
            <option value="p2">Heat vs Warriors (25 Oct 2026)</option>
          </select>
          {errors.partidoId && <p className="mt-1 text-xs text-red-600">{errors.partidoId.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="puntosLocal" className="mb-1 block text-sm font-medium text-gray-700">
              Puntos Equipo Local
            </label>
            <input
              id="puntosLocal"
              type="number"
              {...register('puntosLocal', { valueAsNumber: true })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            {errors.puntosLocal && <p className="mt-1 text-xs text-red-600">{errors.puntosLocal.message}</p>}
          </div>
          <div>
            <label htmlFor="puntosVisitante" className="mb-1 block text-sm font-medium text-gray-700">
              Puntos Equipo Visitante
            </label>
            <input
              id="puntosVisitante"
              type="number"
              {...register('puntosVisitante', { valueAsNumber: true })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            {errors.puntosVisitante && <p className="mt-1 text-xs text-red-600">{errors.puntosVisitante.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="observaciones" className="mb-1 block text-sm font-medium text-gray-700">
            Observaciones Arbitrales (Opcional)
          </label>
          <textarea
            id="observaciones"
            rows={3}
            {...register('observaciones')}
            placeholder="Incidentes, faltas técnicas, sanciones, etc."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="mt-2 border-t border-gray-100 pt-5">
          <AsyncButton onClickAction={handleSubmit(onSubmit)} className="w-full bg-primary-600 py-2.5 text-white transition-colors hover:bg-primary-700">
            Confirmar e Ingresar Resultado
          </AsyncButton>
        </div>
      </form>
    </div>
  );
}
