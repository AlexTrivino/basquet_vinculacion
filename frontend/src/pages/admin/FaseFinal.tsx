import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GitBranch, Save } from 'lucide-react';
import { toast } from 'sonner';

import { AsyncButton } from '../../components/AsyncButton';
import { generarLlaves, getFaseFinal, getTorneosAdmin, setFormatoCategoria, setGrupos } from '../../features/torneos/api/torneos.api';
import { getInscripcionesPublicas } from '../../features/equipos/api/equipos.api';
import type { Categoria, FormatoFaseFinal, Llave } from '../../types/api.types';

const TARJETA = 'bg-marino-claro p-6 rounded-2xl border border-white/10 shadow-sm';
const SELECT = 'w-full rounded-md border border-white/15 bg-marino-claro px-3 py-2 text-sm focus:border-celeste focus:outline-none';
const INPUT = 'rounded-md border border-white/15 px-2 py-1.5 text-sm focus:border-celeste focus:outline-none';
const CHIP = 'inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold';
const ESTADO: Record<Llave['estado'], { texto: string; clase: string }> = {
  finalizado: { texto: 'Finalizado', clase: 'bg-white/10 text-slate-300' },
  programado: { texto: 'Programado', clase: 'bg-blue-500/10 text-blue-200' },
  listo: { texto: 'Listo para crear', clase: 'bg-emerald-500/10 text-emerald-200' },
  espera: { texto: 'En espera', clase: 'bg-amber-500/10 text-amber-200' },
};

// En el torneo hay categorías con el mismo nombre ("Juvenil" masculino y femenino): se distinguen por género
const etiquetaCategoria = (c: Categoria) => {
  const nombre = c.nombre_categoria ?? c.nombre ?? '';
  return c.genero_categoria && !nombre.toLowerCase().includes(c.genero_categoria) ? `${nombre} (${c.genero_categoria})` : nombre;
};

function Paso({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className={TARJETA} aria-labelledby={`paso-${n}`}>
      <h2 id={`paso-${n}`} className="mb-4 flex items-center gap-3 text-lg font-bold text-crema">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs text-white">{n}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export default function FaseFinal() {
  const queryClient = useQueryClient();
  const [elegido, setIdTorneo] = useState<number>(0);
  const [idCategoria, setIdCategoria] = useState<number>(0);
  const [asignacion, setAsignacion] = useState<Record<string, string | null>>({});
  const [programacion, setProgramacion] = useState<Record<string, { fecha: string; hora: string }>>({});
  const [ubicacion, setUbicacion] = useState('Coliseo Pablo Delgado Álava');

  const { data: torneosRes } = useQuery({ queryKey: ['torneos_admin'], queryFn: () => getTorneosAdmin(1, 100) });
  const torneos = torneosRes?.data || [];
  // Sin elección, el torneo en curso o el programado más reciente (la lista viene del más nuevo al más viejo)
  const actual = torneos.find((t) => t.estado === 'en_curso') ?? torneos.find((t) => t.estado === 'programado');
  const idTorneo = elegido || (actual?.id_torneo ?? actual?.id ?? 0);
  const torneo = torneos.find((t) => (t.id_torneo ?? t.id) === idTorneo);
  const categorias = torneo?.categorias || [];

  const { data: faseRes, isLoading } = useQuery({
    queryKey: ['torneos', String(idTorneo), 'fase-final', idCategoria],
    queryFn: () => getFaseFinal(idTorneo, idCategoria),
    enabled: idTorneo > 0 && idCategoria > 0,
  });
  const fase = faseRes?.data;

  const { data: inscRes } = useQuery({
    queryKey: ['inscripciones', 'publicas', idTorneo],
    queryFn: () => getInscripcionesPublicas(idTorneo),
    enabled: idTorneo > 0,
  });
  const equipos = useMemo(
    () => (inscRes?.data || []).filter((i) => i.categoria?.id_categoria === idCategoria && i.equipo).map((i) => i.equipo!),
    [inscRes, idCategoria]
  );

  // Al cambiar de categoría se parte de lo guardado en el servidor
  useEffect(() => { setAsignacion(fase?.grupos || {}); setProgramacion({}); }, [fase]);

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ['torneos'] });
    queryClient.invalidateQueries({ queryKey: ['torneos_admin'] });
  };
  const guardarFormato = useMutation({
    mutationFn: (formato: FormatoFaseFinal | null) => setFormatoCategoria(idCategoria, formato),
    onSuccess: () => { toast.success('Formato guardado'); refrescar(); },
    onError: () => toast.error('No se pudo guardar el formato'),
  });
  const guardarGrupos = useMutation({
    mutationFn: () => setGrupos(idTorneo, idCategoria, asignacion),
    onSuccess: () => { toast.success('Grupos guardados'); refrescar(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'No se pudieron guardar los grupos'),
  });
  const programar = (codigo: string, campo: 'fecha' | 'hora', valor: string) =>
    setProgramacion({ ...programacion, [codigo]: { ...(programacion[codigo] || { fecha: '', hora: '' }), [campo]: valor } });
  const listas = (fase?.llaves || []).filter((l) => l.estado === 'listo' && programacion[l.codigo]?.fecha && programacion[l.codigo]?.hora);
  const crearPartidos = useMutation({
    mutationFn: () => generarLlaves(idTorneo, idCategoria, listas.map((l) => ({ llave: l.codigo, ...programacion[l.codigo], ubicacion }))),
    onSuccess: (res) => { toast.success(`${res.data?.length ?? 0} partido(s) creado(s)`); refrescar(); queryClient.invalidateQueries({ queryKey: ['partidos'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'No se pudieron crear los partidos'),
  });

  const formato = fase?.formato ? fase.formatos[fase.formato] : null;
  const letras = formato?.grupos || [];
  const nombre = (id: number | string) => equipos.find((e) => e.id_equipo === Number(id))?.nombre_equipo || `Equipo ${id}`;
  const equipoDe = (l: Llave, lado: 'local' | 'visitante') => l[lado]?.nombre_equipo || l[lado === 'local' ? 'ref_local' : 'ref_visitante'];

  return (
    <div className="space-y-6 w-full px-[10%] py-8">
      <div className={`flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between ${TARJETA}`}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-oro/30 bg-oro/10 text-oro">
            <GitBranch className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight text-crema">Llaves</h1>
            <p className="mt-0.5 text-sm text-slate-500">Formato de la fase final, grupos y partidos de las llaves de cada categoría.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[34rem]">
          <label className="text-sm font-medium text-slate-300">
            Torneo
            <select className={`${SELECT} mt-1`} value={idTorneo} onChange={(e) => { setIdTorneo(Number(e.target.value)); setIdCategoria(0); }}>
              <option value={0}>Seleccionar…</option>
              {torneos.map((t) => (
                <option key={t.id_torneo ?? t.id} value={t.id_torneo ?? t.id}>
                  {t.nombre_torneo ?? t.nombre}{t.estado ? ` · ${t.estado.replace('_', ' ')}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-300">
            Categoría
            <select className={`${SELECT} mt-1`} value={idCategoria} disabled={!torneo} onChange={(e) => setIdCategoria(Number(e.target.value))}>
              <option value={0}>Seleccionar…</option>
              {categorias.map((c) => <option key={c.id_categoria ?? c.id} value={c.id_categoria ?? c.id}>{etiquetaCategoria(c)}</option>)}
            </select>
          </label>
        </div>
      </div>

      {!fase && <p className={`${TARJETA} text-sm text-slate-500`}>{isLoading ? 'Cargando…' : 'Elige un torneo y una categoría.'}</p>}

      {fase && (
        <>
          <Paso n={1} titulo="Formato de la categoría">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[...Object.entries(fase.formatos).sort(([, a], [, b]) => b.grupos.length - a.grupos.length || b.cupos - a.cupos), ['', { nombre: 'Sin fase final', descripcion: 'Solo tabla de posiciones.' }] as const].map(([clave, f]) => (
                <label key={clave} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${(fase.formato ?? '') === clave ? 'border-blue-400 bg-blue-500/10' : 'border-white/10 hover:border-white/15'}`}>
                  <input type="radio" name="formato" className="mt-1" checked={(fase.formato ?? '') === clave} disabled={guardarFormato.isPending} onChange={() => guardarFormato.mutate((clave || null) as FormatoFaseFinal | null)} />
                  <span>
                    <span className="block text-sm font-bold text-crema">{f.nombre}</span>
                    <span className="block text-xs text-slate-500">{f.descripcion}</span>
                  </span>
                </label>
              ))}
            </div>
          </Paso>

          {letras.length > 0 && (
            <Paso n={2} titulo="Grupos">
              <div className="grid gap-4 md:grid-cols-3">
                {[...letras, null].map((letra) => {
                  const ids = Object.keys(asignacion).filter((id) => (asignacion[id] || null) === letra);
                  return (
                    <div key={letra ?? 'sin'} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <h3 className="mb-2 flex items-center justify-between text-sm font-bold text-slate-300">
                        {letra ? `Grupo ${letra}` : 'Sin grupo'} <span className="text-xs font-semibold text-slate-400">{ids.length}</span>
                      </h3>
                      <ul className="space-y-1.5">
                        {ids.map((id) => (
                          <li key={id} className="flex items-center justify-between gap-2 rounded-md bg-marino-claro px-3 py-1.5 text-sm">
                            <span className="truncate font-medium text-crema">{nombre(id)}</span>
                            <select aria-label={`Grupo de ${nombre(id)}`} className={INPUT} value={asignacion[id] || ''} onChange={(e) => setAsignacion({ ...asignacion, [id]: e.target.value || null })}>
                              <option value="">—</option>
                              {letras.map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </li>
                        ))}
                        {ids.length === 0 && <li className="px-3 py-1.5 text-xs text-slate-400">Vacío</li>}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <AsyncButton onClickAction={() => guardarGrupos.mutateAsync().then(() => undefined)} className="bg-celeste px-4 py-2 text-sm text-marino hover:bg-white">
                  <Save className="h-4 w-4" /> Guardar grupos
                </AsyncButton>
              </div>
            </Paso>
          )}

          {formato && (
            <Paso n={letras.length ? 3 : 2} titulo="Cruces">
              <p className="mb-4 text-sm text-slate-500">
                {fase.fase_grupos.terminada
                  ? 'Fase de grupos finalizada: las llaves con dos equipos definidos se pueden crear como partidos.'
                  : `Fase de grupos: ${fase.fase_grupos.jugados} de ${fase.fase_grupos.esperados} partidos jugados. Las llaves se habilitan cuando termine.`}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Llave</th><th className="px-3 py-2">Ronda</th><th className="px-3 py-2">Local</th><th className="px-3 py-2">Visitante</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Fecha y hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {fase.llaves.map((l) => (
                      <tr key={l.codigo}>
                        <td className="px-3 py-2 font-bold text-crema">{l.codigo}</td>
                        <td className="px-3 py-2 text-slate-300">{l.ronda}</td>
                        <td className={`px-3 py-2 ${l.local ? 'font-medium text-crema' : 'text-slate-400'}`}>{equipoDe(l, 'local')}</td>
                        <td className={`px-3 py-2 ${l.visitante ? 'font-medium text-crema' : 'text-slate-400'}`}>{equipoDe(l, 'visitante')}</td>
                        <td className="px-3 py-2">
                          <span className={`${CHIP} ${ESTADO[l.estado].clase}`}>{ESTADO[l.estado].texto}</span>
                          {l.estado === 'finalizado' && l.partido && <span className="ml-2 tabular-nums text-slate-300">{l.partido.marcador_local}-{l.partido.marcador_visitante}</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-300">
                          {l.estado === 'listo' ? (
                            <span className="flex gap-2">
                              <input type="date" aria-label={`Fecha ${l.codigo}`} className={INPUT} value={programacion[l.codigo]?.fecha || ''} onChange={(e) => programar(l.codigo, 'fecha', e.target.value)} />
                              <input type="time" aria-label={`Hora ${l.codigo}`} className={INPUT} value={programacion[l.codigo]?.hora || ''} onChange={(e) => programar(l.codigo, 'hora', e.target.value)} />
                            </span>
                          ) : l.partido?.fecha ? `${l.partido.fecha} ${l.partido.hora?.slice(0, 5) ?? ''}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {fase.llaves.some((l) => l.estado === 'listo') && (
                <div className="mt-4 flex flex-wrap items-end justify-end gap-3">
                  <label className="text-sm font-medium text-slate-300">
                    Ubicación
                    <input type="text" className={`${INPUT} mt-1 block w-72`} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
                  </label>
                  <AsyncButton disabled={listas.length === 0} onClickAction={() => crearPartidos.mutateAsync().then(() => undefined)} className="bg-celeste px-4 py-2 text-sm text-marino hover:bg-white">
                    Crear {listas.length} partido(s)
                  </AsyncButton>
                </div>
              )}
            </Paso>
          )}
        </>
      )}
    </div>
  );
}
