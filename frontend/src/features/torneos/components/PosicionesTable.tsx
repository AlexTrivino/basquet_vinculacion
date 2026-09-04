import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataGridTable, type Column } from '../../../components/DataGridTable';
import { getPosicionesByTorneo } from '../api/torneos.api';
import type { PosicionFIBA } from '../../../types/api.types';
import { EmptyState } from '../../../components/EmptyState';
import { Trophy, Info, X } from 'lucide-react';

interface PosicionesTableProps {
  torneoId: string;
  idCategoria?: number;
}

export function PosicionesTable({ torneoId, idCategoria }: PosicionesTableProps) {
  const [selectedPosicion, setSelectedPosicion] = useState<PosicionFIBA | null>(null);

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
        <Link to={`/equipos/${row.id_equipo}`} className="group flex items-center gap-3 p-1.5 pr-4 -ml-1.5 rounded-full transition-all duration-200 hover:bg-primary-50 w-max">
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
    { key: 'PJ', header: 'Partidos Jugados', headerClassName: 'text-center', cellClassName: 'text-center' },
    { key: 'PG', header: 'Partidos Ganados', headerClassName: 'text-center', cellClassName: 'text-center' },
    { key: 'PP', header: 'Partidos Perdidos', headerClassName: 'text-center', cellClassName: 'text-center' },
    {
      key: 'puntos',
      header: 'Puntos FIBA',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (row) => <span className="font-bold text-gray-900">{row.puntos}</span>
    },
    {
      key: 'acciones',
      header: 'Acciones',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (row) => (
        <div className="flex justify-center w-full">
          <button
            onClick={() => setSelectedPosicion(row)}
            className="text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-bold border border-primary-100"
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Ver Equipo</span>
          </button>
        </div>
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
      
      {selectedPosicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
            {/* Header del Modal */}
            <div className="bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 px-6 py-5 flex items-center justify-between relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
                  {selectedPosicion.url_logo ? (
                    <img src={selectedPosicion.url_logo} alt={selectedPosicion.nombre_equipo} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <Trophy className="w-5 h-5 text-amber-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight leading-none">{selectedPosicion.nombre_equipo}</h3>
                  <p className="text-xs text-primary-200 mt-1 font-medium">Estadísticas Oficiales del Torneo</p>
                </div>
              </div>
              <button onClick={() => setSelectedPosicion(null)} className="relative z-10 text-primary-200 hover:text-white transition-colors bg-white/10 rounded-full p-1.5 hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Cuerpo del Modal */}
            <div className="p-6 bg-gray-50/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Partidos Jugados</p>
                  <p className="text-2xl font-black text-gray-900">{selectedPosicion.PJ}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Victorias - Derrotas</p>
                  <p className="text-2xl font-black text-gray-900">{selectedPosicion.PG} - {selectedPosicion.PP}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><span className="text-4xl text-green-600 font-black">+</span></div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 relative z-10">Puntos a Favor</p>
                  <p className="text-2xl font-black text-green-600 relative z-10">{selectedPosicion.PF}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><span className="text-4xl text-red-600 font-black">-</span></div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 relative z-10">Puntos en Contra</p>
                  <p className="text-2xl font-black text-red-600 relative z-10">{selectedPosicion.PC}</p>
                </div>
                
                <div className="col-span-2 bg-gradient-to-r from-gray-900 to-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg flex justify-between items-center text-white mt-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                  <div className="relative z-10">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Diferencia (DIF)</p>
                    <p className={`text-3xl font-black ${selectedPosicion.DIF > 0 ? 'text-green-400' : selectedPosicion.DIF < 0 ? 'text-red-400' : 'text-gray-100'}`}>
                      {selectedPosicion.DIF > 0 ? '+' : ''}{selectedPosicion.DIF}
                    </p>
                  </div>
                  <div className="text-right relative z-10">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Puntos FIBA</p>
                    <div className="flex items-end gap-1 justify-end">
                      <p className="text-4xl font-black text-amber-400 leading-none">{selectedPosicion.puntos}</p>
                      <span className="text-sm font-bold text-gray-400 mb-1">PTS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer del Modal */}
            <div className="bg-white px-6 py-4 flex justify-end border-t border-gray-100">
              <button 
                onClick={() => setSelectedPosicion(null)}
                className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                Cerrar Detalles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
