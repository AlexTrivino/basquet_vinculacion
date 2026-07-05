import { useState, useRef } from 'react';
import { UserPlus, X, Trash2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { DataGridTable, type Column } from '../../../components/DataGridTable';
import { AsyncButton } from '../../../components/AsyncButton';
import { useAuth } from '../../../context/AuthContext';
import { getPlantillas, createJugador, createPlantilla, uploadFotoJugador, deletePlantilla } from '../api/plantillas.api';
import { getInscripciones } from '../../equipos/api/equipos.api';
import { getSanciones } from '../../sanciones/api/sanciones.api';
import type { Plantilla } from '../../../types/api.types';
import { Skeleton } from '../../../components/Skeleton';
import { EmptyState } from '../../../components/EmptyState';

const jugadorSchema = z.object({
  nombres: z.string().min(2, 'Nombres requeridos'),
  apellidos: z.string().min(2, 'Apellidos requeridos'),
  documento_identificacion: z.string().length(10, 'La cédula debe tener exactamente 10 dígitos'),
  genero: z.string().min(1, 'Género requerido'),
  fecha_nacimiento: z.string().min(1, 'Fecha requerida'),
  numero_camiseta: z.number().min(0, 'Número inválido'),
  telefono: z.string().optional().or(z.literal('')),
  correo: z.string().email('Inválido').optional().or(z.literal('')),
});
type JugadorFormValues = z.infer<typeof jugadorSchema>;

export function GestorPlantilla() {
  const [showForm, setShowForm] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const hiddenFileInput = useRef<HTMLInputElement>(null);
  const [selectedJugadorId, setSelectedJugadorId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();

  const { activeTeamId } = useAuth();

  const { data: inscripcionesRes, isLoading: isLoadingInscripciones } = useQuery({
    queryKey: ['inscripciones', 'delegado'],
    queryFn: () => getInscripciones(1, 50),
  });
  
  const inscripciones = inscripcionesRes?.data || [];
  const inscripcion = activeTeamId 
    ? inscripciones.find(i => (i.equipo?.id_equipo || i.equipo?.id) === activeTeamId)
    : inscripciones[0];
  const idEquipo = inscripcion?.equipo?.id_equipo || inscripcion?.id_equipo;
  const idTorneo = inscripcion?.torneo?.id_torneo || inscripcion?.id_torneo;
  const generoCategoria = inscripcion?.categoria?.genero_categoria;

  const { data: plantillasRes, isLoading: isLoadingPlantilla, isError } = useQuery({
    queryKey: ['plantillas', idEquipo],
    queryFn: () => getPlantillas(idEquipo),
    enabled: !!idEquipo,
  });
  const plantilla = plantillasRes?.data || [];

  const { data: sancionesRes } = useQuery({
    queryKey: ['sanciones-activas-liga'],
    queryFn: () => getSanciones(undefined, 'activa'),
  });
  const amonestacionesActivas = sancionesRes?.data || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<JugadorFormValues>({
    resolver: zodResolver(jugadorSchema),
  });

  const onSubmit = async (data: JugadorFormValues) => {
    if (!idEquipo || !idTorneo) {
      toast.error('No se pudo identificar el equipo o torneo activo.');
      return;
    }

    if (generoCategoria && generoCategoria !== 'mixto' && data.genero !== generoCategoria) {
      toast.error(`El género del jugador no coincide con la categoría (${generoCategoria}).`);
      return;
    }

    try {
      const payload = {
        nombres: data.nombres,
        apellidos: data.apellidos,
        genero: data.genero,
        documento_identificacion: data.documento_identificacion,
        fecha_nacimiento: data.fecha_nacimiento,
        telefono: data.telefono === "" ? undefined : data.telefono,
        correo: data.correo === "" ? undefined : data.correo,
      };

      const jugadorRes = await createJugador(payload);

      if (!jugadorRes.data) throw new Error('Error al crear jugador');
      const idJugador = jugadorRes.data.id_jugador || jugadorRes.data.id;

      if (fotoFile) {
        try {
          await uploadFotoJugador(idJugador, fotoFile);
        } catch (fotoErr: any) {
          console.error(fotoErr);
          toast.warning('Jugador creado, pero hubo un error al subir la foto.');
        }
      }

      await createPlantilla({
        id_jugador: idJugador,
        id_equipo: idEquipo,
        id_torneo: idTorneo,
        numero_camiseta: data.numero_camiseta,
      });

      queryClient.invalidateQueries({ queryKey: ['plantillas', idEquipo] });
      toast.success('Jugador añadido a la plantilla exitosamente');
      reset();
      setFotoFile(null);
      setShowForm(false);
    } catch (error: any) {
      let message = error.response?.data?.message || error.response?.data?.errors || error.message || 'Ocurrió un error al registrar el jugador.';
      if (typeof message === 'object' && message !== null) {
        try {
          message = Object.entries(message)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join(' | ');
        } catch (e) {
          message = JSON.stringify(message);
        }
      }
      toast.error(String(message));
    }
  };

  const handleEliminarPlantilla = async (idPlantilla: number) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar su perfil del roster?")) return;
    
    try {
      await deletePlantilla(idPlantilla);
      toast.success('Jugador eliminado de la plantilla.');
      queryClient.invalidateQueries({ queryKey: ['plantillas', idEquipo] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar jugador.');
    }
  };

  const handleUploadFotoDirecta = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedJugadorId) return;

    try {
      await uploadFotoJugador(selectedJugadorId, file);
      toast.success('Foto actualizada exitosamente.');
      queryClient.invalidateQueries({ queryKey: ['plantillas', idEquipo] });
    } catch (error: any) {
      toast.error('Error al actualizar la foto.');
    } finally {
      if (hiddenFileInput.current) {
        hiddenFileInput.current.value = '';
      }
      setSelectedJugadorId(null);
    }
  };

  const handleClickActualizarFoto = (idJugador: number) => {
    setSelectedJugadorId(idJugador);
    hiddenFileInput.current?.click();
  };

  const columns: Column<Plantilla>[] = [
    { 
      key: 'jugador', 
      header: 'Nombre', 
      render: (row) => {
        const fotoUrl = row.jugador?.url_foto;
        const inicial = row.jugador?.nombres?.charAt(0) || '?';
        const idJugador = row.jugador?.id_jugador || row.jugador?.id || row.id_jugador;
        const amonestado = amonestacionesActivas.some(s => s.id_jugador === idJugador);
        return (
          <div className="flex items-center gap-3">
            {fotoUrl ? (
              <img src={fotoUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover bg-gray-200" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs uppercase">
                {inicial}
              </div>
            )}
            <span className="font-medium text-gray-900 flex items-center gap-2">
              {row.jugador?.nombres} {row.jugador?.apellidos}
              {amonestado && <span title="Jugador Amonestado (Faltas Activas)"><AlertTriangle className="w-4 h-4 text-yellow-500" /></span>}
            </span>
          </div>
        );
      }
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
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => {
        const idPlantilla = row.id_plantilla || row.id || 0;
        const idJugador = row.jugador?.id_jugador || row.jugador?.id || row.id_jugador;
        return (
          <div className="flex gap-2">
            <button
              onClick={() => handleClickActualizarFoto(idJugador)}
              className="text-gray-500 hover:text-primary-600 transition-colors p-1"
              title="Actualizar Foto"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleEliminarPlantilla(idPlantilla)}
              className="text-gray-500 hover:text-red-600 transition-colors p-1"
              title="Quitar del Roster"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  const isLoading = isLoadingInscripciones || isLoadingPlantilla;

  return (
    <div className="flex flex-col gap-6">
      <input 
        type="file" 
        ref={hiddenFileInput} 
        onChange={handleUploadFotoDirecta} 
        style={{ display: 'none' }} 
        accept="image/jpeg, image/png, image/webp" 
      />

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
          <button onClick={() => { setShowForm(false); setFotoFile(null); reset(); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
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
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
              <input type="text" {...register('telefono')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errors.telefono && <p className="mt-1 text-xs text-red-600">{errors.telefono.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Correo Electrónico (Opcional)</label>
              <input type="email" {...register('correo')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
              {errors.correo && <p className="mt-1 text-xs text-red-600">{errors.correo.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Foto de Perfil (Opcional)</label>
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/webp"
                onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" 
              />
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
