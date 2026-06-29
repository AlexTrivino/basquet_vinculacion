import { useQuery } from '@tanstack/react-query';
import { DataGridTable, type Column } from '../../../components/DataGridTable';
import { getPosicionesByTorneo } from '../api/torneos.api';
import type { PosicionFIBA } from '../../../types/api.types';
import { EmptyState } from '../../../components/EmptyState';
import { Trophy } from 'lucide-react';

const columns: Column<PosicionFIBA>[] = [
  { 
    key: 'nombre_equipo', 
    header: 'Equipo', 
    render: (row) => <span className="font-semibold text-primary-900">{row.nombre_equipo}</span> 
  },
  { key: 'partidos_jugados', header: 'PJ' },
  { key: 'partidos_ganados', header: 'PG' },
  { key: 'partidos_perdidos', header: 'PP' },
  { key: 'puntos_a_favor', header: 'PF' },
  { key: 'puntos_en_contra', header: 'PC' },
  { key: 'diferencia_puntos', header: 'DIF' },
  { 
    key: 'puntos_fiba', 
    header: 'Pts', 
    render: (row) => <span className="font-bold text-gray-900">{row.puntos_fiba}</span> 
  },
];

interface PosicionesTableProps {
  torneoId: string;
}

export function PosicionesTable({ torneoId }: PosicionesTableProps) {
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['torneos', torneoId, 'posiciones'],
    queryFn: () => getPosicionesByTorneo(torneoId),
  });

  const posiciones = response?.data || [];

  if (isError) {
    return <div className="text-center text-red-500 py-8">Error al cargar la tabla de posiciones.</div>;
  }

  if (!isLoading && posiciones.length === 0) {
    return (
      <EmptyState
        title="Sin estadísticas"
        description="Aún no hay posiciones calculadas para este torneo."
        icon={<Trophy className="mx-auto h-12 w-12 text-gray-400" />}
      />
    );
  }

  return (
    <div className="mt-6">
      <DataGridTable
        columns={columns}
        data={posiciones}
        isLoading={isLoading}
        ariaLabel="Tabla de Posiciones FIBA"
      />
    </div>
  );
}
