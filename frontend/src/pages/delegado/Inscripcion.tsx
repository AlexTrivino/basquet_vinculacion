import { InscripcionWizard } from '../../features/equipos/components/InscripcionWizard';

export default function Inscripcion() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Registro de Equipo</h1>
        <p className="mt-2 text-gray-600 font-medium">
          PROPORCIONA LA INFORMACIÓN REQUERIDA PARA AVALAR A TU CLUB EN EL TORNEO ACTUAL.<br/>
          SOLO SE PERMITE UN MÁXIMO DE 3 EQUIPOS POR DELEGADO.
        </p>
      </div>
      
      <InscripcionWizard />
    </main>
  );
}
