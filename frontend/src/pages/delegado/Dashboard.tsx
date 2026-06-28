import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  // Garantizamos el consumo de AuthContext (no necesitamos variables específicas para esta UI)
  useAuth();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Panel del Delegado</h1>
        <p className="mt-2 text-gray-600">Bienvenido al centro de administración de tu equipo.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">Estado de Inscripción</h3>
          
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500">Estado actual:</span>
            {/* Reutilizando StatusBadge de la Fase 3 */}
            <StatusBadge status="Pendiente" />
          </div>
          
          <p className="mt-4 text-sm text-gray-600">
            El perfil de tu equipo está bajo revisión administrativa.
          </p>
          
          <div className="mt-auto pt-6">
            <Link
              to="/delegado/inscripcion"
              className="inline-flex w-full items-center justify-center rounded-md bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
            >
              Completar o Editar Inscripción
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
