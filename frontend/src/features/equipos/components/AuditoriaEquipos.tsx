import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGridTable, type Column } from '../../../components/DataGridTable';
import { StatusBadge } from '../../../components/StatusBadge';
import { AsyncButton } from '../../../components/AsyncButton';
import { getInscripciones, updateInscripcionEstado } from '../api/equipos.api';
import type { Inscripcion } from '../../../types/api.types';
import { EmptyState } from '../../../components/EmptyState';
import { FileWarning, Eye } from 'lucide-react';

export function AuditoriaEquipos() {
  const queryClient = useQueryClient();

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['inscripciones', 'admin'],
    queryFn: () => getInscripciones(1, 100), // En MVP traemos bastantes
  });

  const inscripciones = response?.data || [];

  const updateEstadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: 'aprobado' | 'rechazado' }) =>
      updateInscripcionEstado(id, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inscripciones', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
  });

  const handleAprobar = async (id: number, equipo: string) => {
    const inscripcion = inscripciones.find(i => (i.id_inscripcion || i.id) === id);
    if (inscripcion && !inscripcion.url_comprobante_pago) {
      const confirm = window.confirm("Esta inscripción no tiene comprobante asignado. ¿Estás seguro de que deseas aprobarla?");
      if (!confirm) {
        return;
      }
    }

    try {
      await updateEstadoMutation.mutateAsync({ id, estado: 'aprobado' });
      toast.success(`Equipo ${equipo} aprobado exitosamente.`);
    } catch (error) {
      toast.error(`Error al aprobar equipo ${equipo}.`);
    }
  };

  const handleRechazar = async (id: number, equipo: string) => {
    const confirm = window.confirm(`Estás a punto de rechazar la inscripción del equipo ${equipo}. Esto eliminará permanentemente la inscripción y el equipo de la base de datos. ¿Deseas continuar?`);
    if (!confirm) {
      return;
    }
    
    try {
      await updateEstadoMutation.mutateAsync({ id, estado: 'rechazado' });
      toast.success(`Equipo ${equipo} rechazado y eliminado permanentemente.`);
    } catch (error) {
      toast.error(`Error al rechazar equipo ${equipo}.`);
    }
  };

  const columns: Column<Inscripcion>[] = [
    { key: 'equipo', header: 'Equipo', render: (row) => <span className="font-semibold text-gray-900">{row.equipo?.nombre_equipo || row.equipo?.nombre}</span> },
    { key: 'torneo', header: 'Torneo', render: (row) => <span className="text-sm">{row.torneo?.nombre || 'General'}</span> },
    { key: 'categoria', header: 'Categoría', render: (row) => <span className="text-sm">{row.categoria?.nombre_categoria || row.categoria?.nombre || 'General'}</span> },
    { 
      key: 'delegado', 
      header: 'Delegado', 
      render: (row) => {
        const u = row.equipo?.usuario;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{u?.nombre || 'Desconocido'}</span>
            <span className="text-xs text-gray-500">{u?.correo || 'Sin correo'}</span>
          </div>
        );
      }
    },
    { 
      key: 'comprobante', 
      header: 'Comprobante', 
      render: (row) => {
        if (row.url_comprobante_pago) {
          return (
            <a 
              href={row.url_comprobante_pago} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
            >
              <Eye className="h-4 w-4" />
              Ver Recibo
            </a>
          );
        }
        return <span className="text-sm text-gray-400 italic">Sin archivo</span>;
      }
    },
    { key: 'estado', header: 'Estado', render: (row) => {
      const estado = row.estado_inscripcion || row.estado;
      return <StatusBadge status={estado === 'pendiente' ? 'Pendiente' : estado === 'aprobado' ? 'Aprobado' : 'Rechazado'} />;
    } },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => {
        const id = row.id_inscripcion || row.id || 0;
        const nombreEquipo = row.equipo?.nombre_equipo || row.equipo?.nombre || 'Desconocido';
        const estado = row.estado_inscripcion || row.estado;
        return (
          <div className="flex gap-2">
            <AsyncButton
              onClickAction={() => handleAprobar(id, nombreEquipo)}
              disabled={estado !== 'pendiente'}
              className="bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 disabled:bg-gray-300"
            >
              Aprobar
            </AsyncButton>
            <AsyncButton
              onClickAction={() => handleRechazar(id, nombreEquipo)}
              disabled={estado !== 'pendiente'}
              className="bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 disabled:bg-gray-300"
            >
              Rechazar
            </AsyncButton>
          </div>
        );
      },
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-gray-900">Solicitudes Recientes</h2>
      {isError ? (
        <div className="text-red-500 text-center py-4">Error al cargar las inscripciones.</div>
      ) : !isLoading && inscripciones.length === 0 ? (
        <EmptyState
          title="Sin solicitudes"
          description="No hay inscripciones registradas en el sistema en este momento."
          icon={<FileWarning className="mx-auto h-12 w-12 text-gray-400" />}
        />
      ) : (
        <DataGridTable columns={columns} data={inscripciones} isLoading={isLoading} ariaLabel="Auditoría de Equipos" />
      )}
    </div>
  );
}
