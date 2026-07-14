import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Users, Calendar, Trophy, FileWarning } from 'lucide-react';
import { getDashboardStats } from '../../features/estadisticas/api/estadisticas.api';
import { Skeleton } from '../../components/Skeleton';

export default function Dashboard() {
  useAuth(); // Consumo obligatorio de contexto

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: getDashboardStats,
  });

  const stats = response?.data;

  const cards = [
    { 
      name: 'Inscripciones Pendientes', 
      value: stats?.inscripciones_pendientes ?? '0', 
      icon: FileWarning, to: '/admin/auditoria', color: 'text-yellow-600', bg: 'bg-yellow-50' 
    },
    { 
      name: 'Partidos Activos', 
      value: stats?.partidos_hoy ?? '0', 
      icon: Calendar, to: '/admin/partidos', color: 'text-blue-600', bg: 'bg-blue-50' 
    },
    { 
      name: 'Equipos Inscritos', 
      value: stats?.equipos_totales ?? '0', 
      icon: Users, to: '#', color: 'text-green-600', bg: 'bg-green-50' 
    },
    { 
      name: 'Torneos Activos', 
      value: '1', 
      icon: Trophy, to: '#', color: 'text-purple-600', bg: 'bg-purple-50' 
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard de Administración</h1>
        <p className="mt-2 text-gray-600">Resumen global de la plataforma Torneos Baloncesto Manta.</p>
      </div>

      {isError && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
          No se pudieron cargar las estadísticas. Revisa tu conexión.
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.name} className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${card.bg}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{card.name}</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                )}
              </div>
            </div>
            {card.to !== '#' && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <Link to={card.to} className="text-sm font-medium text-primary-600 hover:text-primary-700">
                  Ver detalles →
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
