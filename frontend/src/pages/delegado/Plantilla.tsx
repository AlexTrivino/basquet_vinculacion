import { GestorPlantilla } from '../../features/plantillas/components/GestorPlantilla';

export default function Plantilla() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Jugadores</h1>
        <p className="mt-2 text-gray-600">
          Visualiza tu roster y registra nuevos perfiles para evaluación técnica.
        </p>
      </div>
      
      <GestorPlantilla />
    </main>
  );
}
