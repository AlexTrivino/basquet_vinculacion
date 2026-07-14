import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { getInscripciones } from '../../features/equipos/api/equipos.api';
import { Skeleton } from '../../components/Skeleton';
import { ShieldAlert, Trophy } from 'lucide-react';
import EquipoProfile from '../public/EquipoProfile';

export default function Dashboard() {
  const { activeTeamId, setActiveTeamId } = useAuth();

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['inscripciones', 'delegado'],
    queryFn: () => getInscripciones(1, 50),
  });

  const inscripciones = response?.data || [];

  useEffect(() => {
    if (inscripciones.length === 1 && activeTeamId === null) {
      const id = inscripciones[0].equipo?.id_equipo || inscripciones[0].equipo?.id;
      if (id !== undefined) setActiveTeamId(id);
    }
  }, [inscripciones, activeTeamId, setActiveTeamId]);

  if (inscripciones.length > 1 && activeTeamId === null) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Bienvenido, Entrenador</h1>
          <p className="mt-2 text-gray-600">Selecciona el equipo que deseas administrar.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {inscripciones.map(ins => {
            const eq = ins.equipo;
            if (!eq) return null;
            const idEq = eq.id_equipo || eq.id;
            const logo = eq.url_logo;
            const inicial = eq.nombre_equipo?.charAt(0) || '?';
            return (
              <div key={idEq} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col items-center p-6 hover:shadow-md transition-shadow">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4 overflow-hidden border-4 border-gray-50 shadow-inner">
                  {logo ? <img src={logo} alt={eq.nombre_equipo} className="w-full h-full object-cover" /> : <span className="text-2xl font-bold text-gray-400">{inicial}</span>}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">{eq.nombre_equipo}</h3>

                <button
                  onClick={() => {
                    if (idEq !== undefined) setActiveTeamId(idEq);
                  }}
                  className="w-full bg-primary-600 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
                >
                  Administrar Equipo
                </button>
              </div>
            );
          })}
          {(() => {
            // El backend ya filtra equipos inactivos, así que todas las 
            // inscripciones devueltas son de equipos activos del delegado.
            const cuposOcupados = inscripciones.length;
            const hasReachedLimit = cuposOcupados >= 3;

            return (
              <div className={`bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden flex flex-col items-center justify-center p-6 text-center transition-colors ${hasReachedLimit ? 'opacity-50' : 'hover:bg-gray-100'}`}>
                <ShieldAlert className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-bold text-gray-600 mb-2">Inscribir Otro Equipo</h3>
                {hasReachedLimit ? (
                  <p className="text-sm text-red-500 font-medium mb-4 uppercase">LÍMITE DE 3 EQUIPOS ALCANZADO</p>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">Registra una nueva categoría bajo tu misma cuenta.</p>
                )}
                {hasReachedLimit ? (
                  <button disabled className="inline-flex w-full items-center justify-center rounded-xl bg-gray-400 px-4 py-2.5 text-sm font-semibold text-white cursor-not-allowed">
                    Límite Alcanzado
                  </button>
                ) : (
                  <Link to="/delegado/inscripcion" className="inline-flex w-full items-center justify-center rounded-xl bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-900">
                    Registrar Equipo
                  </Link>
                )}
              </div>
            );
          })()}
        </div>
      </main>
    );
  }

  let inscripcionActual = null;
  if (activeTeamId) {
    inscripcionActual = inscripciones.find(i => (i.equipo?.id_equipo || i.equipo?.id) === activeTeamId);
  } else if (inscripciones.length > 0) {
    inscripcionActual = inscripciones[0];
  }

  const estadoActual = inscripcionActual?.estado_inscripcion || inscripcionActual?.estado;

  if (!inscripcionActual) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Panel del Delegado</h1>
          <p className="mt-2 text-gray-500">Bienvenido al centro de administración de tu equipo.</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 px-6 py-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5" /> Estado de Inscripción
            </h2>
            <p className="mt-1 text-primary-100 text-sm">Aún no has registrado ningún equipo.</p>
          </div>

          {/* Status */}
          <div className="px-6 pt-5 pb-2 flex items-center gap-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-500">Estado actual:</span>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : isError ? (
              <div className="text-sm text-red-500 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4" /> Error de conexión
              </div>
            ) : (
              <StatusBadge status="Desconocido" />
            )}
          </div>

          {/* Instructions */}
          <div className="px-6 py-6">
            <p className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
              ¿Cómo funciona el proceso?
            </p>
            <ol className="space-y-4">
              {[
                {
                  step: 1,
                  title: 'Inscribe tu equipo',
                  desc: 'Selecciona el torneo y la categoría, completa los datos del equipo y sube el comprobante de pago.',
                },
                {
                  step: 2,
                  title: 'Espera la aprobación',
                  desc: 'El administrador revisará tu solicitud y comprobante. Recibirás un cambio de estado en tu panel.',
                },
                {
                  step: 3,
                  title: 'Gestiona tu plantilla',
                  desc: 'Una vez aprobado, ingresa a "Plantilla" para agregar cada jugador con sus datos y número de camiseta.',
                },
                {
                  step: 4,
                  title: '¡Listo para competir!',
                  desc: 'Tu equipo y sus jugadores aparecerán en el directorio público del torneo.',
                },
              ].map(({ step, title, desc }) => (
                <li key={step} className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-50 text-primary-700 font-bold text-sm flex items-center justify-center border border-primary-100">
                    {step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* CTA */}
          <div className="px-6 pb-6">
            <Link
              to="/delegado/inscripcion"
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-700 shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              Inscribir Nuevo Equipo
            </Link>
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
            ? 'TU EQUIPO ESTÁ PENDIENTE DE APROBACIÓN POR PARTE DEL ADMINISTRADOR.'
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
      <div className={`mt-8 hidden lg:block fixed ${inscripcionActual.equipo?.estado === 'inactivo' ? 'top-40' : 'top-24'} right-8 z-40 bg-white/80 backdrop-blur-xl shadow-2xl rounded-2xl p-6 border border-white/40 w-80 transition-all duration-300`}>
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
            ? 'Tu equipo está pendiente de aprobación por parte del administrador.'
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
