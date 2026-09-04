import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '../../context/AuthContext';
import { useBusinessRules } from '../../hooks/useBusinessRules';
import { getInscripciones } from '../../features/equipos/api/equipos.api';
import { ShieldAlert, Trophy } from 'lucide-react';
import EquipoProfile from '../public/EquipoProfile';
import { BannerNuevosTorneos } from './components/BannerNuevosTorneos';

export default function Dashboard() {
  const { activeTeamId, setActiveTeamId } = useAuth();
  const { rules } = useBusinessRules();
  const maxEquiposDelegado = rules.MAX_EQUIPOS_POR_DELEGADO;

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['inscripciones', 'delegado'],
    queryFn: () => getInscripciones(1, 50),
  });

  const inscripciones = response?.data || [];

  useEffect(() => {
    if (inscripciones.length > 0 && activeTeamId === null) {
      const id = inscripciones[0].equipo?.id_equipo || inscripciones[0].equipo?.id;
      if (id !== undefined) setActiveTeamId(id);
    }
  }, [inscripciones, activeTeamId, setActiveTeamId]);


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

  const inscripcionActual = (activeTeamId 
    ? inscripciones.find(ins => (ins.equipo?.id_equipo || ins.equipo?.id) === activeTeamId)
    : inscripciones[0]) || inscripciones[0];

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
              Registra tu equipo, sube el comprobante de pago y añade a tus jugadores para participar en los torneos oficiales de baloncesto.
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
            {inscripciones.length >= maxEquiposDelegado && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                Límite de {maxEquiposDelegado} equipo(s) alcanzado
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
                  title: 'Datos del Equipo y Comprobante',
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

  const idEquipo = inscripcionActual.equipo?.id_equipo || inscripcionActual.equipo?.id;



  return (
    <div className="relative w-full">
      <BannerNuevosTorneos inscripciones={inscripciones} idEquipo={idEquipo!} />
      
      {/* 2. EL PERFIL (Centro) */}
      <EquipoProfile 
        teamId={idEquipo}
        dashboardStatus={estadoActual}
      />
    </div>
  );
}
