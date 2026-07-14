import { InscripcionWizard } from '../../features/equipos/components/InscripcionWizard';

export default function Inscripcion() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Registro de Equipo</h1>
        <p className="mt-2 text-gray-600 font-medium">
          Proporciona la información requerida para avalar a tu club en el torneo actual.<br/>
          Solo se permite un máximo de 3 equipos por delegado.
        </p>
      </div>
      
      <InscripcionWizard />
    </main>
  );
}
