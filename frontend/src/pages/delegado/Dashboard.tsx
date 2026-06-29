import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { getInscripciones } from '../../features/equipos/api/equipos.api';
import { Skeleton } from '../../components/Skeleton';
import { ShieldAlert } from 'lucide-react';

export default function Dashboard() {
  useAuth();

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['inscripciones', 'delegado'],
    queryFn: () => getInscripciones(1, 10),
  });

  const inscripciones = response?.data || [];
  // Para el MVP, asumimos que el delegado está gestionando principalmente su inscripción más reciente.
  const inscripcionActual = inscripciones.length > 0 ? inscripciones[0] : null;
  const estadoActual = inscripcionActual?.estado_inscripcion || inscripcionActual?.estado;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Panel del Delegado</h1>
        <p className="mt-2 text-gray-600">Bienvenido al centro de administración de tu equipo.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">Estado de Inscripción</h3>
          
          {isLoading ? (
            <div className="mt-4 flex flex-col gap-2">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-16 w-full mt-2" />
            </div>
          ) : isError ? (
            <div className="mt-4 text-sm text-red-500 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Error de conexión
            </div>
          ) : !inscripcionActual ? (
            <>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">Estado actual:</span>
                <StatusBadge status="Desconocido" />
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Aún no has registrado ningún equipo.
              </p>
            </>
          ) : (
            <>
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Equipo:</span>
                  <span className="font-semibold text-gray-900">{inscripcionActual.equipo?.nombre_equipo || inscripcionActual.equipo?.nombre}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Estado actual:</span>
                  <StatusBadge status={estadoActual === 'pendiente' ? 'Pendiente' : estadoActual === 'aprobado' ? 'Aprobado' : 'Rechazado'} />
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                {estadoActual === 'pendiente' 
                  ? 'El perfil de tu equipo está bajo revisión administrativa.' 
                  : estadoActual === 'aprobado'
                  ? 'Tu equipo ha sido aprobado exitosamente.'
                  : 'Tu inscripción ha sido rechazada. Revisa las observaciones.'}
              </p>
            </>
          )}
          
          <div className="mt-auto pt-6 flex flex-col gap-2">
            {!inscripcionActual && (
              <Link
                to="/delegado/inscripcion"
                className="inline-flex w-full items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                Inscribir Nuevo Equipo
              </Link>
            )}
            {inscripcionActual && (
              <Link
                to="/delegado/plantilla"
                className="inline-flex w-full items-center justify-center rounded-md bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
              >
                Gestionar Plantilla
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
