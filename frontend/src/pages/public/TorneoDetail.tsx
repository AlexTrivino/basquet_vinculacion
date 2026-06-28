import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';

import { PosicionesTable } from '../../features/torneos/components/PosicionesTable';
import { EmptyState } from '../../components/EmptyState';

type Tab = 'posiciones' | 'calendario';

export default function TorneoDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>('posiciones');

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Torneo #{id}</h1>
        <p className="mt-2 text-gray-600">Detalles y estadísticas del torneo en curso.</p>
      </div>

      {/* Tabs simplificados */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('posiciones')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'posiciones'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Posiciones
          </button>
          <button
            onClick={() => setActiveTab('calendario')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'calendario'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Calendario
          </button>
        </nav>
      </div>

      {/* Renderizado condicional según el Tab activo */}
      <div className="mt-8">
        {activeTab === 'posiciones' && <PosicionesTable />}
        {activeTab === 'calendario' && (
          <EmptyState
            title="Calendario no disponible"
            description="El calendario de partidos se generará próximamente."
            icon={<Calendar className="mx-auto h-12 w-12 text-gray-400" />}
          />
        )}
      </div>
    </main>
  );
}
