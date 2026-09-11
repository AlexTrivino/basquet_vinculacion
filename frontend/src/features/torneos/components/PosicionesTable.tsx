
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataGridTable, type Column } from '../../../components/DataGridTable';
import { getPosicionesByTorneo } from '../api/torneos.api';
import type { PosicionFIBA } from '../../../types/api.types';
import { EmptyState } from '../../../components/EmptyState';
import { Trophy } from 'lucide-react';

interface PosicionesTableProps {
  torneoId: string;
  idCategoria?: number;
}

export function PosicionesTable({ torneoId, idCategoria }: PosicionesTableProps) {

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['torneos', torneoId, 'posiciones', idCategoria],
    queryFn: () => getPosicionesByTorneo(torneoId, idCategoria),
  });

  const posiciones = response?.data || [];

  const columns: Column<PosicionFIBA>[] = [
    {
      key: 'nombre_equipo',
      header: 'Equipo',
      render: (row) => (
        <Link to={`/equipos/${row.id_equipo}`} className="group flex items-center gap-3 transition-all duration-200 w-max">
          <div className="w-8 h-8 rounded-full shadow-sm bg-white border border-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
            {row.url_logo ? (
              <img src={row.url_logo} alt={row.nombre_equipo} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-gray-400">{row.nombre_equipo.substring(0, 2).toUpperCase()}</span>
            )}
          </div>
          <span className="font-bold text-gray-900 group-hover:text-primary-700 transition-colors">
            {row.nombre_equipo}
          </span>
        </Link>
      )
    },
    { key: 'PJ', header: 'PJ', headerClassName: 'text-center', cellClassName: 'text-center font-medium' },
    { key: 'PG', header: 'PG', headerClassName: 'text-center', cellClassName: 'text-center font-medium text-green-700' },
    { key: 'PP', header: 'PP', headerClassName: 'text-center', cellClassName: 'text-center font-medium text-red-700' },
    { key: 'PF', header: 'GF', headerClassName: 'text-center', cellClassName: 'text-center text-gray-600' },
    { key: 'PC', header: 'GC', headerClassName: 'text-center', cellClassName: 'text-center text-gray-600' },
    {
      key: 'puntos',
      header: 'Puntos',
      headerClassName: 'text-center font-black text-primary-700 tracking-wider pr-4 sm:pr-8',
      cellClassName: 'text-center pr-4 sm:pr-8',
      render: (row) => (
        <span className="text-2xl font-black text-primary-600">
          {row.puntos}
        </span>
      )
    },
    { 
      key: 'DIF', 
      header: 'DIF', 
      headerClassName: 'text-center', 
      cellClassName: 'text-center font-bold',
      render: (row) => (
        <span className={row.DIF > 0 ? 'text-green-600' : row.DIF < 0 ? 'text-red-600' : 'text-gray-900'}>
          {row.DIF > 0 ? '+' : ''}{row.DIF}
        </span>
      )
    }
  ];

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
    <div className="mt-6 px-2 sm:px-[5%]">
      <DataGridTable
        columns={columns}
        data={posiciones}
        isLoading={isLoading}
        ariaLabel="Tabla de Posiciones FIBA"
      />
    </div>
  );
}
