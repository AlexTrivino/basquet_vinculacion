import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '../../context/AuthContext';
import { useBusinessRules } from '../../hooks/useBusinessRules';
import { getInscripciones } from '../../features/equipos/api/equipos.api';
import { ShieldAlert, Trophy } from 'lucide-react';
import EquipoProfile from '../public/EquipoProfile';
import { BannerNuevosTorneos } from './components/BannerNuevosTorneos';

// El panel vive bajo la barra oscura y muestra el perfil del equipo: sus estados usan la misma paleta
const PANEL = 'rounded-2xl border border-oro/25 bg-marino-claro/80 shadow-xl shadow-black/30';
const PAGINA = 'tema-cartel min-h-[100dvh] bg-marino text-slate-100';

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
      <main aria-busy="true" className={`${PAGINA} flex flex-col items-center justify-center px-4`}>
        <div className="mb-4 h-12 w-12 rounded-full border-2 border-oro/25 border-t-oro motion-safe:animate-spin" />
        <p className="font-medium text-slate-300">Cargando información del equipo...</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className={`${PAGINA} flex items-center justify-center px-4`}>
        <div className={`${PANEL} w-full max-w-md px-8 py-10 text-center`}>
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-300" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="mt-4 font-display text-2xl font-bold text-crema">Error al cargar datos</h2>
          <p className="mt-2 text-sm text-slate-400">Ocurrió un error al obtener la información de tu equipo. Por favor, intenta nuevamente más tarde.</p>
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
      <main className={`${PAGINA} px-4 py-8 sm:px-6 lg:px-8`}>
        <div className="mx-auto max-w-7xl">
        <div className={`relative mb-8 overflow-hidden p-8 ${PANEL}`}>
          <div className="relative z-10 max-w-xl">
            <h1 className="font-display text-3xl font-bold tracking-tight text-crema sm:text-4xl">
              ¡Bienvenido al Panel de Delegado!
            </h1>
            <p className="mt-3 text-base leading-relaxed text-slate-300">
              Registra tu equipo, sube el comprobante de pago y añade a tus jugadores para participar en los torneos oficiales de baloncesto.
            </p>
          </div>
          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-oro/10 blur-3xl" />
        </div>

        <div className={`mx-auto max-w-2xl overflow-hidden ${PANEL}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-crema">
              <Trophy className="h-5 w-5 text-oro" aria-hidden="true" />
              Primer Paso: Inscribe tu Equipo
            </h2>
            {inscripciones.length >= maxEquiposDelegado && (
              <span className="rounded-full border border-oro/40 bg-oro/10 px-3 py-1 text-xs font-semibold text-oro">
                Límite de {maxEquiposDelegado} equipo(s) alcanzado
              </span>
            )}
          </div>

          <div className="px-6 py-6">
            <p className="mb-4 font-display text-xs font-semibold uppercase tracking-[0.25em] text-oro/80">
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
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-oro/50 bg-marino font-display text-sm font-bold text-oro">
                    {step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-crema">{title}</p>
                    <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="px-6 pb-6">
            <Link
              to="/delegado/inscripcion"
              className="inline-flex w-full items-center justify-center rounded-xl bg-celeste px-4 py-3 text-sm font-semibold text-marino transition-colors hover:bg-white"
            >
              Inscribir Nuevo Equipo
            </Link>
          </div>
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
