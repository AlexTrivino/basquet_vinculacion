import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTorneos } from '../../features/torneos/api/torneos.api';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { Trophy } from 'lucide-react';
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
    queryKey: ['torneos', 'public'],
    queryFn: () => getTorneos(1, 10), // Limitamos a 10 torneos en Home
  });

  const torneos = response?.data || [];

  return (
    <main>
      {/* Hero Section */}
      <section className="bg-primary-900 px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Torneos Salesianos de Baloncesto
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-xl text-primary-100">
          La mejor plataforma para gestionar y seguir de cerca los torneos de baloncesto de nuestra comunidad.
        </p>
      </section>

      {/* Carrusel de Auspiciantes */}
      <SponsorsCarousel />

      {/* Grid de Torneos */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-2xl font-bold text-gray-900">Torneos Destacados</h2>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center text-red-500">Error al cargar los torneos. Intenta nuevamente más tarde.</div>
        ) : torneos.length === 0 ? (
          <EmptyState
            title="No hay torneos activos"
            description="En este momento no hay torneos disponibles para mostrar."
            icon={<Trophy className="h-12 w-12 text-gray-400" />}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {torneos.map((torneo) => (
              <div key={torneo.id_torneo || torneo.id} className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <h3 className="text-lg font-bold text-gray-900">{torneo.nombre_torneo || torneo.nombre}</h3>
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{torneo.descripcion || 'Sin descripción'}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>Estado: <strong className="capitalize">{torneo.estado}</strong></span>
                  <span>{new Date(torneo.fecha_inicio).toLocaleDateString()}</span>
                </div>
                <div className="mt-auto pt-6">
                  <Link
                    to={`/torneos/${torneo.id_torneo || torneo.id}`}
                    className="inline-flex w-full items-center justify-center rounded-md bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100"
                  >
                    Ver detalles
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
