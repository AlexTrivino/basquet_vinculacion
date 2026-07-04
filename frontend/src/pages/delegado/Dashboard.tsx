import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { getInscripciones } from '../../features/equipos/api/equipos.api';
import { Skeleton } from '../../components/Skeleton';
import { ShieldAlert, Trophy } from 'lucide-react';
import EquipoProfile from '../public/EquipoProfile';

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

  if (!inscripcionActual) {
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
            ) : (
              <>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">Estado actual:</span>
                  <StatusBadge status="Desconocido" />
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  Aún no has registrado ningún equipo.
                </p>
                <div className="mt-auto pt-6 flex flex-col gap-2">
                  <Link
                    to="/delegado/inscripcion"
                    className="inline-flex w-full items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                  >
                    Inscribir Nuevo Equipo
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="relative w-full">
      {/* 1. VISTA MÓVIL (Primero en DOM) */}
      <div className="block lg:hidden bg-white p-4 border-b border-gray-200 shadow-sm relative z-20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary-600" /> Administración
          </h2>
          <StatusBadge status={estadoActual === 'pendiente' ? 'Pendiente' : estadoActual === 'aprobado' ? 'Aprobado' : 'Rechazado'} />
        </div>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          {estadoActual === 'pendiente' 
            ? 'Perfil en revisión administrativa.' 
            : estadoActual === 'aprobado'
            ? 'Equipo aprobado. Todo en orden.'
            : 'Inscripción rechazada.'}
        </p>
        <Link
          to="/delegado/plantilla"
          className="inline-flex w-full items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 shadow-sm"
        >
          Gestionar Plantilla
        </Link>
      </div>

      {/* 2. EL PERFIL (Centro) */}
      <EquipoProfile teamId={inscripcionActual.equipo?.id_equipo || inscripcionActual.equipo?.id} />

      {/* 3. TARJETA FLOTANTE DE ESCRITORIO (Glassmorphism) */}
      <div className={`hidden lg:block fixed ${inscripcionActual.equipo?.estado === 'inactivo' ? 'top-40' : 'top-24'} right-8 z-40 bg-white/80 backdrop-blur-xl shadow-2xl rounded-2xl p-6 border border-white/40 w-80 transition-all duration-300`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary-600" /> Administración
          </h2>
        </div>
        
        <div className="mb-4">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">Estatus del Equipo</span>
          <StatusBadge status={estadoActual === 'pendiente' ? 'Pendiente' : estadoActual === 'aprobado' ? 'Aprobado' : 'Rechazado'} />
        </div>
        
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          {estadoActual === 'pendiente' 
            ? 'El perfil de tu equipo está bajo revisión administrativa. Te notificaremos pronto.' 
            : estadoActual === 'aprobado'
            ? 'Tu equipo ha sido aprobado exitosamente. ¡Mantén tu plantilla al día!'
            : 'Tu inscripción ha sido rechazada. Revisa las observaciones.'}
        </p>
        
        <Link
          to="/delegado/plantilla"
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-700 shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          Gestionar Plantilla
        </Link>
      </div>
    </div>
  );
}
