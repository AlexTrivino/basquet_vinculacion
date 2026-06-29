import { Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '../../../components/EmptyState';
import { AsyncButton } from '../../../components/AsyncButton';
import { DataGridTable, type Column } from '../../../components/DataGridTable';
import { StatusBadge } from '../../../components/StatusBadge';
import { getPartidosByTorneo } from '../../torneos/api/torneos.api';
import type { Partido } from '../../../types/api.types';
import { Skeleton } from '../../../components/Skeleton';

export function GestorPartidos() {
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['partidos', 1],
    queryFn: () => getPartidosByTorneo(1),
  });

  const partidos = response?.data || [];

  const handleGenerar = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast.success('Calendario generado exitosamente (Simulación)');
  };

  const columns: Column<Partido>[] = [
    { 
      key: 'fecha', 
      header: 'Fecha y Hora', 
      render: (row) => <span className="font-medium text-gray-900">{row.fecha} {row.hora}</span> 
    },
    { 
      key: 'fase', 
      header: 'Fase', 
      render: (row) => <span className="text-gray-500">{row.fase || 'Regular'}</span> 
    },
    { 
      key: 'encuentro', 
      header: 'Encuentro', 
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{row.equipo_local?.nombre_equipo || 'Local'}</span>
          <span className="text-gray-400 text-xs">vs</span>
          <span className="font-semibold text-gray-900">{row.equipo_visitante?.nombre_equipo || 'Visitante'}</span>
        </div>
      ) 
    },
    { 
      key: 'marcador', 
      header: 'Marcador', 
      render: (row) => (
        <span className="font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
          {row.marcador_local} - {row.marcador_visitante}
        </span>
      ) 
    },
    { 
      key: 'estado', 
      header: 'Estado', 
      render: (row) => (
        <StatusBadge 
          status={
            row.estado === 'programado' ? 'Pendiente' : 
            row.estado === 'finalizado' ? 'Activo' : 
            row.estado === 'en_curso' ? 'Aprobado' : 'Rechazado'
          } 
        />
      ) 
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <AsyncButton onClickAction={handleGenerar} className="bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 shadow-sm">
          Simular Generación de Calendario
        </AsyncButton>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Calendario Oficial</h2>
        
        {isError ? (
          <div className="text-red-500 text-center py-4">Error al cargar los partidos.</div>
        ) : isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : partidos.length === 0 ? (
          <EmptyState
            title="No hay partidos programados"
            description="El torneo aún no tiene un calendario oficial generado para esta fase."
            icon={<CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />}
          />
        ) : (
          <DataGridTable 
            columns={columns} 
            data={partidos} 
            ariaLabel="Tabla de Partidos Programados" 
          />
        )}
      </div>
    </div>
  );
}
