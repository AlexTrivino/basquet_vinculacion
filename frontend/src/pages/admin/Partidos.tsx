import { GestorPartidos } from '../../features/partidos/components/GestorPartidos';

export default function Partidos() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Partidos</h1>
        <p className="mt-2 text-gray-600">Programa el calendario y las fases del torneo actual.</p>
      </div>
      <GestorPartidos />
    </main>
  );
}
