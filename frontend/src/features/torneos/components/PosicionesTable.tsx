import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGridTable, type Column } from '../../../components/DataGridTable';
import { getPosicionesByTorneo } from '../api/torneos.api';
import type { PosicionFIBA } from '../../../types/api.types';
import { EmptyState } from '../../../components/EmptyState';
import { Trophy, Info, X } from 'lucide-react';

interface PosicionesTableProps {
  torneoId: string;
}

export function PosicionesTable({ torneoId }: PosicionesTableProps) {
  const [selectedPosicion, setSelectedPosicion] = useState<PosicionFIBA | null>(null);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['torneos', torneoId, 'posiciones'],
    queryFn: () => getPosicionesByTorneo(torneoId),
  });

  const posiciones = response?.data || [];

  const columns: Column<PosicionFIBA>[] = [
    {
      key: 'nombre_equipo',
      header: 'Equipo',
      render: (row) => <span className="font-semibold text-primary-900">{row.nombre_equipo}</span>
    },
    { key: 'PJ', header: 'PJ' },
    { key: 'PG', header: 'PG' },
    { key: 'PP', header: 'PP' },
    {
      key: 'puntos',
      header: 'Pts',
      render: (row) => <span className="font-bold text-gray-900">{row.puntos}</span>
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <button
          onClick={() => setSelectedPosicion(row)}
          className="text-primary-600 hover:text-primary-800 transition-colors p-1 flex items-center gap-1 text-sm font-medium"
        >
          <Info className="w-4 h-4" />
          <span className="hidden sm:inline">Detalles</span>
        </button>
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
    <div className="mt-6">
      <DataGridTable
        columns={columns}
        data={posiciones}
        isLoading={isLoading}
        ariaLabel="Tabla de Posiciones FIBA"
      />
      
      {selectedPosicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="bg-primary-900 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Detalles del Equipo</h3>
              <button onClick={() => setSelectedPosicion(null)} className="text-primary-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <h4 className="text-xl font-black text-gray-900 mb-4">{selectedPosicion.nombre_equipo}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-1">Partidos Jugados</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedPosicion.PJ}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-1">Victorias / Derrotas</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedPosicion.PG} - {selectedPosicion.PP}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-1">Puntos a Favor</p>
                  <p className="text-lg font-semibold text-green-600">{selectedPosicion.PF}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-1">Puntos en Contra</p>
                  <p className="text-lg font-semibold text-red-600">{selectedPosicion.PC}</p>
                </div>
                <div className="col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Diferencia de Puntos</p>
                    <p className={`text-xl font-bold ${selectedPosicion.DIF > 0 ? 'text-green-600' : selectedPosicion.DIF < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {selectedPosicion.DIF > 0 ? '+' : ''}{selectedPosicion.DIF}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-medium mb-1">Puntos FIBA</p>
                    <p className="text-2xl font-black text-primary-700">{selectedPosicion.puntos}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button 
                onClick={() => setSelectedPosicion(null)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
