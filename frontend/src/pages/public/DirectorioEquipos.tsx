import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTorneos } from '../../features/torneos/api/torneos.api';
import { getInscripcionesPublicas } from '../../features/equipos/api/equipos.api';
import { ChevronDown, Users } from 'lucide-react';

export default function DirectorioEquipos() {
  const [selectedTorneo, setSelectedTorneo] = useState<number | ''>('');
  const [selectedCategoria, setSelectedCategoria] = useState<number | 'todas'>('todas');

  const { data: torneosRes, isLoading: loadingTorneos } = useQuery({
    queryKey: ['torneos', 'public'],
    queryFn: () => getTorneos(1, 100),
  });
  const torneos = useMemo(() => {
    return (torneosRes?.data || []).sort((a, b) => {
      const anioA = (a as any).anio || (a.fecha_inicio ? new Date(a.fecha_inicio).getFullYear() : 0);
      const anioB = (b as any).anio || (b.fecha_inicio ? new Date(b.fecha_inicio).getFullYear() : 0);
      if (anioB !== anioA) return anioB - anioA;
      return (b.id_torneo || 0) - (a.id_torneo || 0);
    });
  }, [torneosRes]);

  // Set initial selected torneo to the first active one or the most recent
  useEffect(() => {
    if (torneos.length > 0 && selectedTorneo === '') {
      const primerActivo = torneos.find(t => t.estado === 'en_curso') || torneos[0];
      setSelectedTorneo(primerActivo.id_torneo!);
    }
  }, [torneos, selectedTorneo]);

  useEffect(() => {
    setSelectedCategoria('todas');
  }, [selectedTorneo]);

  const { data: inscripcionesRes, isLoading: loadingInscripciones } = useQuery({
    queryKey: ['inscripciones-publicas', selectedTorneo],
    queryFn: () => getInscripcionesPublicas(Number(selectedTorneo)),
    enabled: selectedTorneo !== '',
  });

  const categoriasDisponibles = useMemo(() => {
    if (!inscripcionesRes?.data) return [];
    const cats = new Map();
    inscripcionesRes.data.forEach(ins => {
      if (ins.estado_inscripcion === 'aprobado' && ins.categoria) {
        cats.set(ins.categoria.id_categoria, ins.categoria);
      }
    });
    return Array.from(cats.values()).sort((a, b) => a.nombre_categoria.localeCompare(b.nombre_categoria));
  }, [inscripcionesRes?.data]);

  const inscripciones = useMemo(() => {
    const aprobadas = (inscripcionesRes?.data || []).filter(ins => ins.estado_inscripcion === 'aprobado');
    if (selectedCategoria !== 'todas') {
      return aprobadas.filter(ins => ins.categoria?.id_categoria === selectedCategoria);
    }
    return aprobadas;
  }, [inscripcionesRes?.data, selectedCategoria]);

  const ESTADO_TORNEO: Record<string, string> = { en_curso: 'En curso', programado: 'Próximo', finalizado: 'Finalizado' };
  const selectCls =
    'block w-full cursor-pointer appearance-none rounded-lg border border-white/15 bg-marino-claro py-3 pl-4 pr-10 text-sm font-semibold text-crema transition-colors hover:border-oro/50 disabled:cursor-not-allowed disabled:opacity-50';
  const bloque = 'motion-safe:animate-pulse rounded bg-white/10';

  return (
    // tema-cartel: misma paleta que la portada (marino, oro, crema; celeste solo para foco)
    <div className="tema-cartel min-h-[100dvh] bg-marino px-4 py-16 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-12 text-center">
          <h1 className="font-display text-4xl font-bold tracking-wide text-crema sm:text-5xl">Directorio de Equipos</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
            Explora los equipos registrados en nuestros torneos, conoce sus plantillas y sigue su progreso en la competición.
          </p>
        </header>

        {/* Filtros */}
        <div className="mx-auto mb-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="filtro-torneo" className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Torneo
            </label>
            {loadingTorneos ? (
              <div className={`h-12 w-full ${bloque}`} />
            ) : (
              <div className="relative">
                <select
                  id="filtro-torneo"
                  value={selectedTorneo}
                  onChange={(e) => setSelectedTorneo(Number(e.target.value))}
                  className={selectCls}
                >
                  <option value="" disabled>Selecciona un torneo</option>
                  {torneos.map((t) => (
                    <option key={t.id_torneo} value={t.id_torneo}>
                      {t.nombre} ({ESTADO_TORNEO[t.estado] ?? t.estado})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-oro" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <label htmlFor="filtro-categoria" className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Categoría
            </label>
            {loadingTorneos ? (
              <div className={`h-12 w-full ${bloque}`} />
            ) : (
              <div className="relative">
                <select
                  id="filtro-categoria"
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
                  disabled={selectedTorneo === ''}
                  className={selectCls}
                >
                  <option value="todas">Todas las categorías</option>
                  {categoriasDisponibles.map((c) => (
                    <option key={c.id_categoria} value={c.id_categoria}>
                      {c.nombre_categoria} ({c.genero_categoria})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-oro" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        {/* Grilla de equipos */}
        {selectedTorneo !== '' &&
          (loadingInscripciones ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="flex flex-col items-center rounded-xl border border-white/10 bg-marino-claro/50 p-6">
                  <div className={`mb-4 h-20 w-20 rounded-full ${bloque}`} />
                  <div className={`mb-2 h-5 w-3/4 ${bloque}`} />
                  <div className={`h-4 w-1/2 ${bloque}`} />
                </div>
              ))}
            </div>
          ) : inscripciones.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {inscripciones.map((insc) => (
                <Link
                  key={insc.id_inscripcion}
                  to={`/equipos/${insc.equipo?.id_equipo}`}
                  className="group flex flex-col items-center rounded-xl border border-oro/25 bg-marino-claro/70 p-5 text-center shadow-lg shadow-black/30 transition duration-200 hover:-translate-y-1 hover:border-oro/60 active:scale-[0.98] sm:p-6"
                >
                  {/* Medallón claro, igual que en las tarjetas de partido: los logos en silueta se leen sobre marino */}
                  <div className="mb-4 flex aspect-square w-full max-w-[6rem] items-center justify-center rounded-full bg-gradient-to-b from-white to-slate-200 p-[14%] shadow-lg shadow-black/40 ring-2 ring-oro/40 sm:max-w-[7rem]">
                    {insc.equipo?.url_logo ? (
                      <img src={insc.equipo.url_logo} alt="" loading="lazy" className="h-full w-full object-contain" />
                    ) : (
                      <span className="font-display text-2xl font-bold text-slate-500">
                        {insc.equipo?.nombre_equipo?.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h3 className="line-clamp-2 text-balance font-display text-base font-bold leading-snug text-crema sm:text-lg">
                    {insc.equipo?.nombre_equipo}
                  </h3>
                  <p className="mt-1 text-sm font-medium capitalize text-slate-400">
                    {insc.categoria?.nombre_categoria} ({insc.categoria?.genero_categoria})
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-oro/30 bg-marino-claro/50 px-6 py-16 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-oro/70" aria-hidden="true" />
              <h3 className="font-display text-xl font-bold text-crema">Sin equipos registrados</h3>
              <p className="mt-2 text-slate-400">Aún no hay equipos aprobados en este torneo.</p>
            </div>
          ))}
      </div>
    </div>
  );
}
