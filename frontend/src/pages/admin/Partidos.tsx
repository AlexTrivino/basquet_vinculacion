import { GestorPartidos } from '../../features/partidos/components/GestorPartidos';

export default function Partidos() {
  return (
    <main className="w-full max-w-[1600px] px-4 py-8 mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Partidos</h1>
        <p className="mt-2 text-gray-600">Programa el calendario y las fases del torneo actual.</p>
      </div>
      <GestorPartidos />
    </main>
  );
}
