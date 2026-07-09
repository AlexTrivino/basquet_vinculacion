import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTorneos } from '../../features/torneos/api/torneos.api';
import { getInscripcionesPublicas } from '../../features/equipos/api/equipos.api';
import { Skeleton } from '../../components/Skeleton';
import { Trophy } from 'lucide-react';

export default function DirectorioEquipos() {
  const [selectedTorneo, setSelectedTorneo] = useState<number | ''>('');

  const { data: torneosRes, isLoading: loadingTorneos } = useQuery({
    queryKey: ['torneos', 'public'],
    queryFn: () => getTorneos(1, 100),
  });
  const torneos = useMemo(() => {
    return (torneosRes?.data || []).filter(t => t.estado === 'programado' || t.estado === 'en_curso');
  }, [torneosRes]);

  // Set initial selected torneo to the first active one
  useEffect(() => {
    if (torneos.length > 0 && selectedTorneo === '') {
      setSelectedTorneo(torneos[0].id_torneo!);
    }
  }, [torneos, selectedTorneo]);

  const { data: inscripcionesRes, isLoading: loadingInscripciones } = useQuery({
    queryKey: ['inscripciones-publicas', selectedTorneo],
    queryFn: () => getInscripcionesPublicas(Number(selectedTorneo)),
    enabled: selectedTorneo !== '',
  });
  const inscripciones = (inscripcionesRes?.data || []).filter(ins => ins.estado_inscripcion === 'aprobado');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4 flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 text-primary-600" />
            Directorio de Clubes
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Explora los equipos registrados en nuestros torneos, conoce sus plantillas y sigue su progreso en la competición.
          </p>
        </div>

        {/* Filters */}
        <div className="flex justify-center mb-10">
          <div className="w-full max-w-sm">
            {loadingTorneos ? (
              <Skeleton className="h-12 w-full rounded-xl" />
            ) : (
              <div className="relative">
                <select
                  value={selectedTorneo}
                  onChange={(e) => setSelectedTorneo(Number(e.target.value))}
                  className="block w-full pl-4 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-xl shadow-sm appearance-none bg-white cursor-pointer"
                >
                  <option value="" disabled>Seleccione un torneo...</option>
                  {torneos.map((t) => (
                    <option key={t.id_torneo} value={t.id_torneo}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Grid */}
        {selectedTorneo !== '' && (
          loadingInscripciones ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="bg-white rounded-2xl p-6 flex flex-col items-center">
                  <Skeleton className="w-20 h-20 rounded-full mb-4" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : inscripciones.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {inscripciones.map((insc) => (
                <Link
                  key={insc.id_inscripcion}
                  to={`/equipos/${insc.equipo?.id_equipo}`}
                  className="bg-white rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-md hover:-translate-y-1 transition-all duration-200 border border-transparent hover:border-gray-100"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full shadow-sm bg-gray-100 border-2 border-white overflow-hidden mb-4 flex items-center justify-center relative">
                    {insc.equipo?.url_logo ? (
                      <img src={insc.equipo.url_logo} alt={insc.equipo.nombre_equipo} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-gray-400">
                        {insc.equipo?.nombre_equipo?.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1 line-clamp-2">
                    {insc.equipo?.nombre_equipo}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">
                    {insc.categoria?.nombre_categoria}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">Sin equipos registrados</h3>
              <p className="text-gray-500 mt-1">Aún no hay equipos aprobados en este torneo.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
