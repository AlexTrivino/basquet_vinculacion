import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJugadorPerfil } from '../../features/jugadores/api/jugadores.api';
import { useAuth } from '../../context/AuthContext';
import { PartidosJugador } from '../../features/visor/components/PartidosJugador';
import { Escudo } from '../../features/torneos/components/PartidosList';
import {
  Shield,
  Activity,
  Target,
  ArrowUp,
  Hand,
  Goal,
  ArrowLeft,
  Calendar,
  Mail,
  Phone,
  FileText,
  Lock,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

function calcularEdad(fechaStr?: string | null): number | null {
  if (!fechaStr) return null;
  const birth = new Date(fechaStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

const ITEMS_POR_PAGINA = 3;

export default function JugadorProfile() {
  const { id } = useParams<{ id: string }>();
  const { userRole } = useAuth();
  const [torneoSeleccionado, setTorneoSeleccionado] = useState<string>('global');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');
  const [paginaActual, setPaginaActual] = useState<number>(1);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['jugador-perfil', id],
    queryFn: () => getJugadorPerfil(id!),
    enabled: !!id,
  });

  const jugador = response?.data;

  // Deduplicar y ordenar participaciones por año más reciente
  const participacionesOrdenadas = useMemo(() => {
    if (!jugador?.participaciones) return [];
    const mapa = new Map<string, (typeof jugador.participaciones)[0]>();
    for (const p of jugador.participaciones) {
      const key = `${p.id_plantilla}-${p.id_categoria || '0'}-${p.id_torneo}`;
      if (!mapa.has(key)) {
        mapa.set(key, p);
      }
    }
    return Array.from(mapa.values()).sort((a, b) => {
      const anioA = a.anio || 0;
      const anioB = b.anio || 0;
      if (anioB !== anioA) return anioB - anioA;
      return (b.id_torneo || 0) - (a.id_torneo || 0);
    });
  }, [jugador?.participaciones]);

  // Cálculo de páginas y slice activo (3 por vista)
  const totalPaginas = Math.max(1, Math.ceil(participacionesOrdenadas.length / ITEMS_POR_PAGINA));
  const paginaValida = Math.min(Math.max(paginaActual, 1), totalPaginas);
  const indiceInicio = (paginaValida - 1) * ITEMS_POR_PAGINA;
  const participacionesPaginadas = participacionesOrdenadas.slice(
    indiceInicio,
    indiceInicio + ITEMS_POR_PAGINA
  );

  // Opciones únicas de torneos para el selector de estadísticas
  const torneosConEstadisticas = useMemo(() => {
    if (!jugador?.participaciones) return [];
    
    const torneosValidos = jugador.participaciones.filter(
      (p: any) => p.estado_torneo !== 'programado'
    );
    
    return Array.from(
      new Map(
        torneosValidos.map((p: any) => [String(p.id_torneo), p])
      ).values()
    );
  }, [jugador?.participaciones]);

  const categoriasTorneoSeleccionado = useMemo(() => {
    if (torneoSeleccionado === 'global' || !jugador?.participaciones) return [];
    
    const participacionesTorneo = jugador.participaciones.filter(
      (p: any) => String(p.id_torneo) === torneoSeleccionado
    );
    
    return Array.from(
      new Map(
        participacionesTorneo.map((p: any) => [String(p.id_categoria), p])
      ).values()
    );
  }, [torneoSeleccionado, jugador?.participaciones]);

  const handleTorneoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTorneoSeleccionado(val);
    
    if (val === 'global') {
      setCategoriaSeleccionada('');
    } else {
      const participacionesTorneo = jugador?.participaciones?.filter(
        (p: any) => String(p.id_torneo) === val
      ) || [];
      if (participacionesTorneo.length > 0) {
        setCategoriaSeleccionada(String(participacionesTorneo[0].id_categoria));
      } else {
        setCategoriaSeleccionada('');
      }
    }
  };

  const tarjeta = 'rounded-xl border border-white/10 bg-marino-claro/80 shadow-xl shadow-black/30 backdrop-blur-sm';
  const bloque = 'rounded-lg bg-white/10 motion-safe:animate-pulse';

  if (isLoading) {
    return (
      <main className="tema-cartel relative isolate min-h-[100dvh] bg-marino pb-16 text-slate-100">
        <div className="mx-auto max-w-7xl space-y-6 px-4 pt-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-4 pt-10">
              <div className={`h-4 w-40 ${bloque}`} />
              <div className={`h-14 w-full max-w-xl ${bloque}`} />
              <div className={`h-5 w-64 ${bloque}`} />
            </div>
            <div className={`aspect-[3/4] w-48 lg:w-full ${bloque}`} />
          </div>
          <div className={`h-64 ${bloque}`} />
          <div className={`h-48 ${bloque}`} />
        </div>
      </main>
    );
  }

  if (isError || !jugador) {
    return (
      <main className="tema-cartel flex min-h-[100dvh] items-center justify-center bg-marino p-4 text-slate-100">
        <div className={`${tarjeta} w-full max-w-md space-y-4 p-8 text-center`}>
          <Shield className="mx-auto h-10 w-10 text-oro/70" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-crema">Jugador no encontrado</h1>
          <p className="text-sm text-slate-400">
            La ficha que buscas no existe o fue deshabilitada temporalmente.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-celeste px-5 py-2.5 text-sm font-semibold text-marino transition-colors hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  const nombreCompletoUpper = (jugador.nombre || '').toUpperCase();
  const iniciales = (jugador.nombre || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w.charAt(0))
    .join('')
    .toUpperCase();

  // El backend solo envía los datos personales al admin o al delegado del equipo del jugador
  const puedeVerDatosPrivados = jugador.documento_identificacion !== undefined;
  const edad = jugador.edad ?? calcularEdad(jugador.fecha_nacimiento);
  const participacionReciente = participacionesOrdenadas[0];
  const volver = userRole === 'visor' ? { to: '/visor', texto: 'Volver al buscador' } : { to: '/', texto: 'Inicio' };

  const statsMostradas =
    torneoSeleccionado === 'global'
      ? jugador.estadisticas
      : jugador.estadisticas_por_torneo?.[torneoSeleccionado]?.[categoriaSeleccionada] || {
          partidos_jugados: 0,
          puntos_totales: 0,
          promedio_puntos: 0,
          rebotes_totales: 0,
          asistencias_totales: 0,
          triples_totales: 0,
          tapones_totales: 0,
          tiros_libres_totales: 0,
        };

  const kpis: [string, number | undefined, typeof Goal][] = [
    ['Puntos', statsMostradas?.puntos_totales, Goal],
    ['Triples', statsMostradas?.triples_totales, Target],
    ['Rebotes', statsMostradas?.rebotes_totales, ArrowUp],
    ['Asistencias', statsMostradas?.asistencias_totales, Hand],
    ['Tapones', statsMostradas?.tapones_totales, ShieldAlert],
    ['Tiros libres', statsMostradas?.tiros_libres_totales, Activity],
  ];
  const selectCls =
    'w-full max-w-[13rem] cursor-pointer truncate rounded-lg border border-white/15 bg-marino py-2 pl-3 pr-8 text-sm font-semibold text-crema transition-colors hover:border-oro/50';

  const datosPrivados: [string, string | undefined, typeof Goal][] = [
    ['Cédula', jugador.documento_identificacion, FileText],
    ['Nacimiento', jugador.fecha_nacimiento, Calendar],
    ['Correo', jugador.correo, Mail],
    ['Teléfono', jugador.telefono, Phone],
  ];

  return (
    <main className="tema-cartel relative isolate min-h-[100dvh] overflow-x-clip bg-marino pb-20 text-slate-100">
      <div aria-hidden="true" className="fondo-logo" />

      {/* ─── Portada: nombre grande y retrato, como el cartel del buscador ─── */}
      <section className="relative z-10 border-b border-oro/30 bg-gradient-to-br from-marino-claro via-marino to-marino">
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-12">
          <Link to={volver.to} className="inline-flex items-center gap-2 text-sm font-semibold text-celeste transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {volver.texto}
          </Link>
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div className="order-last lg:order-none">
              {participacionReciente && (
                <p className="flex items-center gap-2 text-sm font-semibold text-oro">
                  <Escudo url={participacionReciente.url_logo} className="h-7 w-7" />
                  {participacionReciente.nombre_equipo}
                </p>
              )}
              <h1 className="mt-3 text-balance break-words font-display text-4xl font-black leading-[0.95] text-crema sm:text-5xl lg:text-6xl">
                {nombreCompletoUpper}
              </h1>
              <dl className="mt-6 flex flex-wrap gap-x-9 gap-y-3">
                {edad !== null && edad !== undefined && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Edad</dt>
                    <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-crema">{edad}</dd>
                  </div>
                )}
                {jugador.genero && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Género</dt>
                    <dd className="mt-1 font-display text-2xl font-bold capitalize text-crema">{jugador.genero}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Partidos</dt>
                  <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-crema">{jugador.estadisticas?.partidos_jugados ?? 0}</dd>
                </div>
              </dl>
            </div>
  
            <div className="w-44 sm:w-52 lg:w-full">
              <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl bg-marino-claro shadow-2xl shadow-black/50 ring-2 ring-oro/40">
                {jugador.url_foto ? (
                  <img src={jugador.url_foto} alt={nombreCompletoUpper} className="h-full w-full object-cover object-top" />
                ) : (
                  <span className="font-display text-7xl font-black text-oro/40">{iniciales || 'J'}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 pt-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* ─── Estadísticas ─── */}
          <section aria-labelledby="titulo-estadisticas" className={`${tarjeta} p-6 ${puedeVerDatosPrivados ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="titulo-estadisticas" className="font-display text-2xl font-bold text-crema">Estadísticas</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {statsMostradas?.partidos_jugados ?? 0} {statsMostradas?.partidos_jugados === 1 ? 'partido' : 'partidos'}
                  {statsMostradas?.partidos_jugados ? `, ${statsMostradas.promedio_puntos} puntos por partido` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {torneosConEstadisticas.length > 0 && (
                  <select
                    id="filtro-torneo"
                    aria-label="Filtro de torneo"
                    value={torneoSeleccionado}
                    onChange={handleTorneoChange}
                    className={selectCls}
                  >
                    <option value="global">Carrera completa</option>
                    {torneosConEstadisticas.map((t: any) => (
                      <option key={`torneo-${t.id_torneo}`} value={String(t.id_torneo)}>
                        {t.nombre_torneo}
                      </option>
                    ))}
                  </select>
                )}
                {torneoSeleccionado !== 'global' && categoriasTorneoSeleccionado.length > 0 && (
                  <select
                    id="filtro-categoria"
                    aria-label="Filtro de categoría"
                    value={categoriaSeleccionada}
                    onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                    className={selectCls}
                  >
                    {categoriasTorneoSeleccionado.map((c: any) => (
                      <option key={`cat-${c.id_categoria}`} value={String(c.id_categoria)}>
                        {c.nombre_categoria}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {kpis.map(([etiqueta, valor, Icono], i) => (
                <div
                  key={etiqueta}
                  className={`rounded-lg border p-4 ${i === 0 ? 'border-oro/50 bg-oro/10' : 'border-white/10 bg-marino/60'}`}
                >
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    <Icono className="h-3.5 w-3.5 text-oro" aria-hidden="true" />
                    {etiqueta}
                  </dt>
                  <dd className={`mt-2 font-display text-3xl font-black tabular-nums ${i === 0 ? 'text-oro' : 'text-crema'}`}>{valor ?? 0}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ─── Ficha técnica: solo llega al admin o al delegado del equipo ─── */}
          {puedeVerDatosPrivados && (
            <section aria-labelledby="titulo-ficha" className={`${tarjeta} p-6 lg:col-span-4`}>
              <h2 id="titulo-ficha" className="flex items-center gap-2 font-display text-xl font-bold text-crema">
                <Lock className="h-4 w-4 text-oro" aria-hidden="true" /> Ficha técnica
              </h2>
              <p className="mt-1 text-xs text-slate-400">Datos privados: solo los ven el admin y el delegado del equipo.</p>
              <dl className="mt-5 space-y-3 text-sm">
                {datosPrivados.map(([etiqueta, valor, Icono]) =>
                  valor ? (
                    <div key={etiqueta} className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-1.5 text-slate-400">
                        <Icono className="h-3.5 w-3.5 text-oro/80" aria-hidden="true" /> {etiqueta}
                      </dt>
                      <dd className="truncate font-semibold tabular-nums text-crema" title={valor}>{valor}</dd>
                    </div>
                  ) : null
                )}
              </dl>
              {(jugador.url_cedula || jugador.url_acta_bachiller) && (
                <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4">
                  {jugador.url_cedula && (
                    <a href={jugador.url_cedula} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-oro/50 px-3 py-2 text-xs font-semibold text-oro transition-colors hover:bg-oro hover:text-marino">
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Ver cédula
                    </a>
                  )}
                  {jugador.url_acta_bachiller && (
                    <a href={jugador.url_acta_bachiller} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-oro/50 px-3 py-2 text-xs font-semibold text-oro transition-colors hover:bg-oro hover:text-marino">
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Ver acta de bachiller
                    </a>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ─── Historial de equipos (3 por vista) ─── */}
        <section aria-labelledby="titulo-historial" className={`${tarjeta} p-6 sm:p-7`}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 id="titulo-historial" className="font-display text-2xl font-bold text-crema">Historial de equipos</h2>
              <p className="mt-1 text-sm text-slate-400">
                {participacionesOrdenadas.length} {participacionesOrdenadas.length === 1 ? 'participación' : 'participaciones'}, de la más reciente a la más antigua
              </p>
            </div>
            {totalPaginas > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
                  disabled={paginaValida === 1}
                  aria-label="Página anterior"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="px-1.5 text-sm font-semibold tabular-nums text-slate-300">{paginaValida} / {totalPaginas}</span>
                <button
                  type="button"
                  onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
                  disabled={paginaValida === totalPaginas}
                  aria-label="Página siguiente"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          {participacionesOrdenadas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-oro/30 px-4 py-10 text-center">
              <Shield className="mx-auto mb-2 h-10 w-10 text-oro/60" aria-hidden="true" />
              <p className="text-sm text-slate-400">Actualmente no registra equipos activos asignados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {participacionesPaginadas.map((part, idx) => (
                <article
                  key={`part-${part.id_plantilla}-${part.id_categoria || '0'}-${part.id_torneo}-${indiceInicio + idx}`}
                  className="flex flex-col justify-between rounded-lg border border-white/10 bg-marino/60 p-5 transition-colors hover:border-oro/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Escudo url={part.url_logo} className="h-11 w-11" />
                      <div className="min-w-0">
                        <Link to={`/equipos/${part.id_equipo}`} className="line-clamp-1 font-bold text-crema transition-colors hover:text-white">
                          {part.nombre_equipo}
                        </Link>
                        <Link to={`/torneos/${part.id_torneo}`} className="mt-0.5 line-clamp-1 text-xs text-slate-400 transition-colors hover:text-celeste">
                          {part.nombre_torneo}
                        </Link>
                      </div>
                    </div>
                    {part.numero_camiseta !== null && part.numero_camiseta !== undefined && (
                      <span className="shrink-0 font-display text-xl font-black tabular-nums text-oro">#{part.numero_camiseta}</span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5 text-slate-300">
                      <Layers className="h-3.5 w-3.5 shrink-0 text-oro/80" aria-hidden="true" />
                      <span className="truncate">{part.nombre_categoria || 'Categoría general'}</span>
                    </span>
                    {part.anio && <span className="shrink-0 font-semibold tabular-nums text-slate-500">{part.anio}</span>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Visor y admin: partidos jugados con la línea estadística de cada uno */}
        {id && (userRole === 'visor' || userRole === 'super_admin') && <PartidosJugador idJugador={id} />}
      </div>
    </main>
  );
}
