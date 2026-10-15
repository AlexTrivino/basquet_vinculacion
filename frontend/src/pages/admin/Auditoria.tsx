import { AuditoriaEquipos } from '../../features/equipos/components/AuditoriaEquipos';

export default function Auditoria() {
  return (
    <main className="mx-auto w-full max-w-[1650px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-crema tracking-tight">Auditoría de Inscripciones</h1>
        <p className="mt-2 text-base text-slate-300">Revisa, aprueba o rechaza los equipos que solicitan participar en el torneo.</p>
      </div>
      <AuditoriaEquipos />
    </main>
  );
}
