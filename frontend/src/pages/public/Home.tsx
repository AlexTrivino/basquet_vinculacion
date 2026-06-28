import { Link } from 'react-router-dom';

const mockTorneos = [
  { id: '1', name: 'Torneo Apertura 2026', status: 'Inscripciones abiertas' },
  { id: '2', name: 'Copa Intercolegial', status: 'En juego' },
  { id: '3', name: 'Liga de Verano', status: 'Finalizado' },
];

export default function Home() {
  return (
    <main>
      {/* Hero Section */}
      <section className="bg-primary-900 px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Torneos Salesianos de Baloncesto
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-xl text-primary-100">
          La mejor plataforma para gestionar y seguir de cerca los torneos de baloncesto de nuestra comunidad.
        </p>
      </section>

      {/* Grid de Torneos */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-2xl font-bold text-gray-900">Torneos Destacados</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mockTorneos.map((torneo) => (
            <div key={torneo.id} className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <h3 className="text-lg font-bold text-gray-900">{torneo.name}</h3>
              <p className="mt-2 text-sm text-gray-500">Estado: {torneo.status}</p>
              <div className="mt-auto pt-6">
                <Link
                  to={`/torneos/${torneo.id}`}
                  className="inline-flex w-full items-center justify-center rounded-md bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100"
                >
                  Ver detalles
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
