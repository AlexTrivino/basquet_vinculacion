import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { getTorneoById } from '../../features/torneos/api/torneos.api';
import { PosicionesTable } from '../../features/torneos/components/PosicionesTable';
import { PartidosList } from '../../features/torneos/components/PartidosList';
import { Skeleton } from '../../components/Skeleton';
import { ArrowLeft } from 'lucide-react';

type Tab = 'posiciones' | 'calendario';

export default function TorneoDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('posiciones');
  const [activeCategoriaId, setActiveCategoriaId] = useState<number | undefined>(undefined);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['torneos', id],
    queryFn: () => getTorneoById(id as string),
    enabled: !!id,
  });

  const torneo = response?.data;

  if (isError) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error al cargar el torneo</h2>
        <Link to="/" className="text-primary-600 hover:underline inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>
      </main>
    );
  }

  // Set the first category as active by default if none is selected
  if (torneo?.categorias?.length && activeCategoriaId === undefined) {
    setActiveCategoriaId(torneo.categorias[0].id_categoria);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver a torneos
        </Link>
        
        {isLoading ? (
          <div>
            <Skeleton className="h-10 w-3/4 max-w-md mb-2" />
            <Skeleton className="h-6 w-full max-w-2xl" />
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{torneo?.nombre}</h1>
            <p className="mt-2 text-gray-600">{torneo?.descripcion}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700 font-medium capitalize">{torneo?.estado}</span>
              {torneo?.ubicacion && <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700">📍 {torneo.ubicacion}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Tabs Principales */}
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

      {/* Tabs de Categorías */}
      {torneo?.categorias && torneo.categorias.length > 0 && (
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Categorías">
            {torneo.categorias.map((cat) => ( 
              <button
                key={cat.id_categoria}
                onClick={() => setActiveCategoriaId(cat.id_categoria)}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                  activeCategoriaId === cat.id_categoria
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {cat.nombre_categoria} ({cat.genero_categoria})
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Renderizado condicional */}
      <div className="mt-8">
        {!torneo?.categorias?.length && !isLoading && (
          <div className="text-center text-gray-500 py-10">
            Este torneo aún no tiene categorías registradas.
          </div>
        )}
        
        {id && activeCategoriaId && activeTab === 'posiciones' && (
          <PosicionesTable torneoId={id} idCategoria={activeCategoriaId} />
        )}
        {id && activeCategoriaId && activeTab === 'calendario' && (
          <PartidosList torneoId={id} idCategoria={activeCategoriaId} />
        )}
      </div>
    </main>
  );
}
