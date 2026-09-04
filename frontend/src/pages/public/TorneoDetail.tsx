import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { getTorneoById } from '../../features/torneos/api/torneos.api';
import { PosicionesTable } from '../../features/torneos/components/PosicionesTable';
import { PartidosList } from '../../features/torneos/components/PartidosList';
import { LideresEstadisticos } from '../../features/torneos/components/LideresEstadisticos';
import { Skeleton } from '../../components/Skeleton';
import { ArrowLeft, Download } from 'lucide-react';

type Tab = 'calendario' | 'posiciones' | 'estadisticas';

export default function TorneoDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('calendario');
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
    <main className="min-h-screen bg-gray-50/50 pb-20">
      {/* ═══════════════════════════════════════════════════════════════════
          HERO SECTION: Banner del Torneo
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 text-white px-4 pt-12 pb-24 sm:px-6 lg:px-8 overflow-hidden shadow-md">
        {/* Patrón Decorativo */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="torneo-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#torneo-grid)" />
          </svg>
        </div>
        
        {/* Glow sutil */}
        <div className="absolute -top-24 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-[94%] max-w-[1600px] mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-primary-200 hover:text-white transition-colors mb-6 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10 w-fit">
            <ArrowLeft className="w-4 h-4" /> Volver a torneos
          </Link>
          
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-10 bg-white/20 rounded-xl w-3/4 max-w-md mb-3"></div>
              <div className="h-6 bg-white/10 rounded-xl w-full max-w-2xl"></div>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="bg-white text-primary-900 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm">
                  {torneo?.estado.replace('_', ' ')}
                </span>
                {torneo?.ubicacion && (
                  <span className="bg-primary-800/80 text-primary-100 px-3 py-1 rounded-lg text-xs font-bold border border-primary-700/50 flex items-center gap-1.5 backdrop-blur-sm">
                    <span>📍</span> {torneo.ubicacion}
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight mb-2">
                {torneo?.nombre}
              </h1>
              <p className="text-base sm:text-lg font-medium text-primary-200 max-w-3xl">
                {torneo?.descripcion}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CONTENIDO PRINCIPAL
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-20 w-[94%] max-w-[1600px] mx-auto -mt-10 min-h-screen">
        <div className="bg-white rounded-t-2xl shadow-sm border-x border-t border-gray-200/80 min-h-screen flex flex-col pb-20">
          {/* Tabs Principales */}
          <div className="bg-gray-50 border-b border-gray-200 rounded-t-2xl">
            <nav className="flex space-x-2 px-4 py-3 overflow-x-auto" aria-label="Tabs">
              {(['calendario', 'posiciones', 'estadisticas'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-black transition-all duration-200 capitalize ${
                    activeTab === tab
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                      : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tabs de Categorías */}
          {torneo?.categorias && torneo.categorias.length > 0 && (
            <div className="border-b border-gray-100 bg-white">
              <nav className="flex space-x-1 px-4 py-3 overflow-x-auto scrollbar-hide" aria-label="Categorías">
                {torneo.categorias.map((cat) => ( 
                  <button
                    key={cat.id_categoria}
                    onClick={() => setActiveCategoriaId(cat.id_categoria)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                      activeCategoriaId === cat.id_categoria
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-gray-500 hover:bg-gray-50 border border-transparent hover:text-gray-700'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                    {cat.nombre_categoria} <span className="opacity-75 font-medium">({cat.genero_categoria})</span>
                  </button>
                ))}
              </nav>
            </div>
          )}

          {/* Área de Renderizado */}
          <div className="p-4 sm:p-6 lg:p-8 min-h-[400px]">


        {!torneo?.categorias?.length && !isLoading && (
            <div className="text-center text-gray-500 py-16 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="font-medium text-lg">Este torneo aún no tiene categorías registradas.</p>
            </div>
        )}
        
        {id && activeCategoriaId && activeTab === 'calendario' && (
          <PartidosList torneoId={id} idCategoria={activeCategoriaId} urlCalendario={torneo?.url_calendario_excel} />
        )}
        {id && activeCategoriaId && activeTab === 'posiciones' && (
          <PosicionesTable torneoId={id} idCategoria={activeCategoriaId} />
        )}
        {id && activeCategoriaId && activeTab === 'estadisticas' && (
          <LideresEstadisticos torneoId={id} idCategoria={activeCategoriaId} />
        )}
        </div>
        </div>
      </section>
    </main>
  );
}
