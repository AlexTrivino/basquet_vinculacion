import { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { DataGridTable, type Column } from '../../../components/DataGridTable';
import { AsyncButton } from '../../../components/AsyncButton';
import { getPlantillas, createJugador, createPlantilla } from '../api/plantillas.api';
import { getInscripciones } from '../../equipos/api/equipos.api';
import type { Plantilla } from '../../../types/api.types';
import { Skeleton } from '../../../components/Skeleton';
import { EmptyState } from '../../../components/EmptyState';

const columns: Column<Plantilla>[] = [
  { 
    key: 'jugador', 
    header: 'Nombre', 
    render: (row) => <span className="font-medium text-gray-900">{row.jugador?.nombres} {row.jugador?.apellidos}</span> 
  },
  { 
    key: 'numero_camiseta', 
    header: 'Camiseta', 
    render: (row) => <span className="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">#{row.numero_camiseta}</span> 
  },
  { 
    key: 'identificacion', 
    header: 'Cédula / ID', 
    render: (row) => <span className="text-gray-500">{row.jugador?.documento_identificacion}</span> 
  },
];

const jugadorSchema = z.object({
  nombres: z.string().min(2, 'Nombres requeridos'),
  apellidos: z.string().min(2, 'Apellidos requeridos'),
  documento_identificacion: z.string().min(5, 'Documento inválido'),
  genero: z.string().min(1, 'Género requerido'),
  fecha_nacimiento: z.string().min(1, 'Fecha requerida'),
  numero_camiseta: z.number().min(0, 'Número inválido'),
});
type JugadorFormValues = z.infer<typeof jugadorSchema>;

export function GestorPlantilla() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  // 1. Obtener el equipo del delegado
  const { data: inscripcionesRes, isLoading: isLoadingInscripciones } = useQuery({
    queryKey: ['inscripciones', 'delegado'],
    queryFn: () => getInscripciones(1, 1),
  });
  const idEquipo = inscripcionesRes?.data?.[0]?.equipo?.id_equipo || inscripcionesRes?.data?.[0]?.id_equipo;
  const idTorneo = inscripcionesRes?.data?.[0]?.torneo?.id_torneo || inscripcionesRes?.data?.[0]?.id_torneo;

  // 2. Obtener la plantilla de ese equipo
  const { data: plantillasRes, isLoading: isLoadingPlantilla, isError } = useQuery({
    queryKey: ['plantillas', idEquipo],
    queryFn: () => getPlantillas(idEquipo),
    enabled: !!idEquipo,
  });
  const plantilla = plantillasRes?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<JugadorFormValues>({
    resolver: zodResolver(jugadorSchema),
  });

  const onSubmit = async (data: JugadorFormValues) => {
    if (!idEquipo || !idTorneo) {
      toast.error('No se pudo identificar el equipo o torneo activo.');
      return;
    }

    try {
      // 1. Crear el jugador
      const jugadorRes = await createJugador({
        nombres: data.nombres,
        apellidos: data.apellidos,
        genero: data.genero,
        documento_identificacion: data.documento_identificacion,
        fecha_nacimiento: data.fecha_nacimiento,
      });

      if (!jugadorRes.data) throw new Error('Error al crear jugador');

      // 2. Añadirlo a la plantilla
      await createPlantilla({
        id_jugador: jugadorRes.data.id_jugador || jugadorRes.data.id,
        id_equipo: idEquipo,
        id_torneo: idTorneo,
        numero_camiseta: data.numero_camiseta,
      });

      queryClient.invalidateQueries({ queryKey: ['plantillas', idEquipo] });
      toast.success('Jugador añadido a la plantilla exitosamente');
      reset();
      setShowForm(false);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Ocurrió un error al registrar el jugador.';
      toast.error(message);
    }
  };

  const isLoading = isLoadingInscripciones || isLoadingPlantilla;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Roster del Equipo</h2>
          <p className="text-sm text-gray-500">Administra a los jugadores aprobados en tu plantilla oficial.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            disabled={!idEquipo}
            className="flex items-center gap-2 bg-primary-600 px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto w-full justify-center"
          >
            <UserPlus className="h-4 w-4" />
            Añadir Jugador
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 relative">
          <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registrar Nuevo Jugador</h3>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombres</label>
              <input type="text" {...register('nombres')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errors.nombres && <p className="mt-1 text-xs text-red-600">{errors.nombres.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Apellidos</label>
              <input type="text" {...register('apellidos')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errors.apellidos && <p className="mt-1 text-xs text-red-600">{errors.apellidos.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Documento de Identidad</label>
              <input type="text" {...register('documento_identificacion')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errors.documento_identificacion && <p className="mt-1 text-xs text-red-600">{errors.documento_identificacion.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Género</label>
              <select {...register('genero')} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none">
                <option value="">Seleccione...</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
              {errors.genero && <p className="mt-1 text-xs text-red-600">{errors.genero.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fecha de Nacimiento</label>
              <input type="date" {...register('fecha_nacimiento')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errors.fecha_nacimiento && <p className="mt-1 text-xs text-red-600">{errors.fecha_nacimiento.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Número de Camiseta</label>
              <input type="number" {...register('numero_camiseta', { valueAsNumber: true })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errors.numero_camiseta && <p className="mt-1 text-xs text-red-600">{errors.numero_camiseta.message}</p>}
            </div>
            
            <div className="sm:col-span-2 mt-2">
              <AsyncButton onClickAction={handleSubmit(onSubmit)} className="w-full bg-primary-600 py-2 text-white">
                Guardar Jugador
              </AsyncButton>
            </div>
          </form>
        </div>
      )}

      {isError ? (
        <div className="text-red-500 text-center py-4">Error al cargar la plantilla.</div>
      ) : isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : plantilla.length === 0 ? (
        <EmptyState
          title="Plantilla Vacía"
          description="Aún no tienes jugadores inscritos en tu roster."
          icon={<UserPlus className="mx-auto h-12 w-12 text-gray-400" />}
        />
      ) : (
        <DataGridTable
          columns={columns}
          data={plantilla}
          ariaLabel="Tabla de jugadores de la plantilla"
        />
      )}
    </div>
  );
}
