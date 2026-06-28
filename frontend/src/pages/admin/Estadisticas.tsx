import { CargaResultados } from '../../features/estadisticas/components/CargaResultados';

export default function Estadisticas() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Registro de Estadísticas</h1>
        <p className="mt-2 text-gray-600">Procesa los resultados oficiales post-partido y actualiza la tabla FIBA.</p>
      </div>
      <CargaResultados />
    </main>
  );
}
