import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, History, CalendarDays } from 'lucide-react';
import { getTorneos } from '../../features/torneos/api/torneos.api';
import { agruparTorneosPorAniosRecientes } from '../../features/torneos/utils/torneoGrouping';
import { ActiveTournamentBadge } from '../../features/torneos/components/ActiveTournamentBadge';
import { TorneoCardHome } from '../../features/torneos/components/TorneoCardHome';
import { PartidosRecientesSection } from '../../features/torneos/components/PartidosRecientesSection';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { SponsorsCarousel } from '../../components/SponsorsCarousel';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    // Si Supabase nos tira aquí con parámetros de recuperación de clave, saltamos a la vista correcta
    if (hash.includes('type=recovery') || hash.includes('error_code=otp_expired')) {
      navigate('/auth/reset-password' + hash, { replace: true });
    }
  }, [navigate]);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['torneos', 'public', 'todos'],
    queryFn: () => getTorneos(1, 50),
  });

  const torneos = response?.data || [];

  const [showAllYears, setShowAllYears] = useState(false);

  const { aniosMostrados, torneosPorAnio, torneosActivos } = useMemo(() => {
    return agruparTorneosPorAniosRecientes(torneos, showAllYears ? 100 : 2);
  }, [torneos, showAllYears]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Determinar el año activo de forma reactiva (por defecto el año más reciente con torneos)
  const activeYear =
    selectedYear !== null && aniosMostrados.includes(selectedYear)
      ? selectedYear
      : aniosMostrados[0] ?? null;

  const torneosDelAnioActivo = activeYear ? torneosPorAnio[activeYear] || [] : [];

  return (
    <main className="min-h-screen bg-gray-50/50 pb-20">
      {/* ═══════════════════════════════════════════════════════════════════
          HERO SECTION: Banner Deportivo Enriquecido
         ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 text-white px-4 pt-16 pb-20 sm:px-6 lg:px-8 overflow-hidden shadow-md">
        {/* Patrón de Cancha de Básquet Decorativo */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="home-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#home-grid)" />
          </svg>
        </div>

        {/* Glow deportivo sutil */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center">
          {/* Badge Intercalado de Torneo Activo */}
          <div className="mb-6">
            <ActiveTournamentBadge torneosActivos={torneosActivos} />
          </div>

          {/* Logo y Títulos */}
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 mb-6">
            <img
              src="/logo.png"
              alt="Torneos Baloncesto Manta Logo"
              className="h-40 w-40 sm:h-56 sm:w-56 object-contain hover:scale-105 transition-transform duration-300 drop-shadow-2xl"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                Torneos Baloncesto Manta
              </h1>
              <p className="mt-2 text-base sm:text-xl font-medium text-primary-200 max-w-xl">
                Desde el 2019 reactivando el baloncesto de la ciudad de Manta
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECCIÓN PRINCIPAL: Pestañas de Años Dinámicos y Grid de Torneos
         ═══════════════════════════════════════════════════════════════════ */}
      <section id="torneos-section" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 -mt-6 relative z-20">
        {/* Cabecera con Selector de Años (Tabs) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          {/* Tabs de los 2 años más recientes */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-1 hidden md:inline-flex items-center gap-1">
              <CalendarDays className="w-4 h-4" /> Temporada:
            </span>

            {isLoading ? (
              <div className="flex gap-2">
                <Skeleton className="w-28 h-10 rounded-xl" />
                <Skeleton className="w-28 h-10 rounded-xl" />
              </div>
            ) : aniosMostrados.length > 0 ? (
              aniosMostrados.map((anio, idx) => {
                const esActivo = anio === activeYear;
                const cantTorneos = torneosPorAnio[anio]?.length || 0;
                return (
                  <button
                    key={anio}
                    type="button"
                    onClick={() => setSelectedYear(anio)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all duration-200 shadow-sm ${
                      esActivo
                        ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20 scale-[1.02]'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/70'
                    }`}
                  >
                    <span>Torneos {anio}</span>
                    {idx === 0 && (
                      <span
                        className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                          esActivo ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        Reciente
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        esActivo ? 'bg-primary-700 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {cantTorneos}
                    </span>
                  </button>
                );
              })
            ) : (
              <span className="text-sm font-bold text-gray-500">Sin torneos registrados</span>
            )}
          </div>

          {/* Botón Maquetado de Años Anteriores (Histórico) */}
          {!showAllYears && (
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setShowAllYears(true)}
                title="Consulta el archivo histórico de ediciones pasadas"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <History className="w-3.5 h-3.5 text-gray-500" />
                <span>Ver torneos anteriores</span>
              </button>
            </div>
          )}
        </div>

        {/* Listado de Tarjetas del Año Seleccionado */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center bg-white p-8 rounded-2xl border border-red-200 text-red-600 font-semibold">
            Error al cargar los torneos. Por favor, intenta nuevamente más tarde.
          </div>
        ) : torneosDelAnioActivo.length === 0 ? (
          <EmptyState
            title={`No hay torneos registrados para el año ${activeYear || ''}`}
            description="En este momento no hay competiciones disponibles para esta temporada."
            icon={<Trophy className="h-12 w-12 text-gray-400" />}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
            {torneosDelAnioActivo.map((torneo) => (
              <TorneoCardHome
                key={torneo.id_torneo || torneo.id}
                torneo={torneo}
              />
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SECCIÓN DE PARTIDOS RECIENTES Y RESULTADOS
           ═══════════════════════════════════════════════════════════════════ */}
        <PartidosRecientesSection />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CARRUSEL DE AUSPICIANTES FIJO AL INFERIOR
         ═══════════════════════════════════════════════════════════════════ */}
      <SponsorsCarousel />
    </main>
  );
}
