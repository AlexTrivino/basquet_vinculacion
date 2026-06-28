import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, Calendar, Trophy, FileWarning } from 'lucide-react';

export default function Dashboard() {
  useAuth(); // Consumo obligatorio de contexto

  const cards = [
    { name: 'Inscripciones Pendientes', value: '12', icon: FileWarning, to: '/admin/auditoria', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { name: 'Partidos Hoy', value: '4', icon: Calendar, to: '/admin/partidos', color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Equipos Activos', value: '24', icon: Users, to: '#', color: 'text-green-600', bg: 'bg-green-50' },
    { name: 'Torneos Finalizados', value: '3', icon: Trophy, to: '#', color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard de Administración</h1>
        <p className="mt-2 text-gray-600">Resumen global de la plataforma Torneos Salesianos.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.name} className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${card.bg}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{card.name}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
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
