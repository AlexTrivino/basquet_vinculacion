import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { getInscripciones } from '../../features/equipos/api/equipos.api';
import { ShieldAlert, Trophy, AlertCircle, Users, ArrowLeft } from 'lucide-react';
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
            const esBorrador = ins.estado_inscripcion === 'borrador' || ins.estado === 'borrador';
            return (
              <div key={idEq} className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col items-center p-6 hover:shadow-md transition-shadow ${
                esBorrador ? 'border-amber-300' : 'border-gray-200'
              }`}>
                {esBorrador && (
                  <div className="w-full mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Inscripción en Borrador — Completa tu plantilla</span>
                  </div>
                )}
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4 overflow-hidden border-4 border-gray-50 shadow-inner">
                  {logo ? <img src={logo} alt={eq.nombre_equipo} className="w-full h-full object-cover" /> : <span className="text-2xl font-bold text-gray-400">{inicial}</span>}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{eq.nombre_equipo}</h3>
                <StatusBadge status={esBorrador ? 'Borrador' : ins.estado_inscripcion ?? ins.estado ?? 'Desconocido'} />
                <div className="w-full mt-4 space-y-2">
                  {esBorrador ? (
                    <Link
                      to="/delegado/inscripcion"
                      className="w-full inline-flex items-center justify-center gap-2 bg-amber-600 text-white font-semibold py-2.5 rounded-xl hover:bg-amber-700 transition-colors shadow-sm text-sm"
                    >
                      <Users className="w-4 h-4" />
                      Continuar Registro (Jugadores)
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        if (idEq !== undefined) setActiveTeamId(idEq);
                      }}
                      className="w-full bg-primary-600 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-700 transition-colors shadow-sm text-sm"
                    >
                      Administrar Equipo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4" />
          <p className="text-gray-500 font-medium">Cargando información del equipo...</p>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-red-500" />
          <h2 className="text-lg font-bold">Error al cargar datos</h2>
          <p className="text-sm mt-1">Ocurrió un error al obtener la información de tu equipo. Por favor, intenta nuevamente más tarde.</p>
        </div>
      </main>
    );
  }

  const inscripcionActual = activeTeamId 
    ? inscripciones.find(ins => (ins.equipo?.id_equipo || ins.equipo?.id) === activeTeamId)
    : inscripciones[0];

  const estadoActual = inscripcionActual?.estado_inscripcion ?? inscripcionActual?.estado;

  if (!inscripcionActual) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-800 to-primary-600 p-8 text-white shadow-lg mb-8">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              ¡Bienvenido al Panel de Delegado!
            </h1>
            <p className="mt-3 text-base text-primary-100 leading-relaxed">
              Registra tu club, sube el comprobante de pago y añade a tus jugadores para participar en los torneos oficiales de baloncesto.
            </p>
          </div>
          <div className="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 right-32 h-48 w-48 rounded-full bg-black/10 blur-xl pointer-events-none" />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden max-w-2xl mx-auto">
          <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary-600" />
              Primer Paso: Inscribe tu Equipo
            </h2>
            {inscripciones.length >= 3 && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                Límite de 3 equipos alcanzado
              </span>
            )}
          </div>

          <div className="px-6 py-6">
            <p className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
              ¿Cómo funciona el proceso?
            </p>
            <ol className="space-y-4">
              {[
                {
                  step: 1,
                  title: 'Datos del Club y Comprobante',
                  desc: 'Selecciona torneo y categoría, completa la información de tu equipo y adjunta el comprobante de pago.',
                },
                {
                  step: 2,
                  title: 'Nómina Oficial de Jugadores',
                  desc: 'Registra los jugadores de tu equipo con sus datos, dorsales de camiseta y documentos.',
                },
                {
                  step: 3,
                  title: 'Envío y Auditoría',
                  desc: 'Revisa y envía la solicitud completa para que el comité organizador / Administrador evalúe y apruebe la inscripción.',
                },
                {
                  step: 4,
                  title: '¡Listos para Competir!',
                  desc: 'Una vez aprobada la solicitud, tu equipo y su plantilla quedarán oficialmente habilitados en el torneo.',
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
        {inscripciones.length > 1 && (
          <button
            type="button"
            onClick={() => setActiveTeamId(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-800 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Cambiar de Equipo
          </button>
        )}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary-600" /> Administración
          </h2>
          <StatusBadge status={estadoActual === 'pendiente' ? 'Pendiente' : estadoActual === 'aprobado' ? 'Aprobado' : 'Rechazado'} />
        </div>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
        {estadoActual === 'borrador'
          ? 'Inscripción en borrador. Completa el registro de jugadores para enviar la solicitud.'
          : estadoActual === 'pendiente'
            ? 'Tu equipo está pendiente de aprobación por parte del administrador.'
            : estadoActual === 'aprobado'
              ? 'Equipo aprobado. Todo en orden.'
              : 'Inscripción rechazada.'}
        </p>
        {estadoActual === 'borrador' ? (
          <Link
            to="/delegado/inscripcion"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 shadow-sm"
          >
            <Users className="w-4 h-4" />
            Continuar Registro de Jugadores
          </Link>
        ) : estadoActual === 'aprobado' ? (
          <Link
            to="/delegado/plantilla"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 shadow-sm"
          >
            Gestionar Plantilla
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex w-full items-center justify-center rounded-md bg-gray-100 text-gray-400 border border-gray-200 px-4 py-2 text-sm font-medium cursor-not-allowed select-none"
            title={estadoActual === 'pendiente' ? "La plantilla solo estará disponible una vez que la inscripción sea aprobada" : "Inscripción no aprobada"}
          >
            Plantilla Bloqueada ({estadoActual === 'pendiente' ? 'En Revisión' : 'Rechazada'})
          </button>
        )}
      </div>

      {/* 2. EL PERFIL (Centro) */}
      <EquipoProfile teamId={inscripcionActual.equipo?.id_equipo || inscripcionActual.equipo?.id} />

      {/* 3. TARJETA FLOTANTE DE ESCRITORIO (Glassmorphism) */}
      <div className={`mt-8 hidden lg:block fixed ${inscripcionActual.equipo?.estado === 'inactivo' ? 'top-40' : 'top-24'} right-8 z-40 bg-white/80 backdrop-blur-xl shadow-2xl rounded-2xl p-6 border border-white/40 w-80 transition-all duration-300`}>
        {inscripciones.length > 1 && (
          <button
            type="button"
            onClick={() => setActiveTeamId(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Cambiar de Equipo
          </button>
        )}
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
          {estadoActual === 'borrador'
            ? 'Inscripción en borrador. Completa el registro de jugadores para enviar la solicitud al administrador.'
            : estadoActual === 'pendiente'
              ? 'Tu equipo está pendiente de aprobación por parte del administrador.'
              : estadoActual === 'aprobado'
                ? 'Tu equipo ha sido aprobado exitosamente. ¡Mantén tu plantilla al día!'
                : 'Tu inscripción ha sido rechazada. Revisa las observaciones.'}
        </p>

        {estadoActual === 'borrador' ? (
          <Link
            to="/delegado/inscripcion"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-amber-700 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <Users className="w-4 h-4" />
            Continuar Registro de Jugadores
          </Link>
        ) : estadoActual === 'aprobado' ? (
          <Link
            to="/delegado/plantilla"
            className="inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-700 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            Gestionar Plantilla
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex w-full items-center justify-center rounded-xl bg-gray-100 text-gray-400 border border-gray-200 px-4 py-3 text-sm font-semibold cursor-not-allowed select-none"
            title={estadoActual === 'pendiente' ? "La plantilla solo estará disponible una vez que la inscripción sea aprobada" : "Inscripción no aprobada"}
          >
            Plantilla Bloqueada ({estadoActual === 'pendiente' ? 'En Revisión' : 'Rechazada'})
          </button>
        )}
      </div>
    </div>
  );
}
