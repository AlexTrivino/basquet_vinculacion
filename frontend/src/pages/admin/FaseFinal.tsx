import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GitBranch, Save } from 'lucide-react';
import { toast } from 'sonner';

import { AsyncButton } from '../../components/AsyncButton';
import { generarLlaves, getFaseFinal, getTorneosAdmin, setFormatoCategoria, setGrupos } from '../../features/torneos/api/torneos.api';
import { getInscripcionesPublicas } from '../../features/equipos/api/equipos.api';
import type { FormatoFaseFinal, Llave } from '../../types/api.types';

const TARJETA = 'bg-white p-6 rounded-2xl border border-slate-200 shadow-sm';
const SELECT = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none';
const INPUT = 'rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none';
const CHIP = 'inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold';
const ESTADO: Record<Llave['estado'], { texto: string; clase: string }> = {
  finalizado: { texto: 'Finalizado', clase: 'bg-slate-100 text-slate-700' },
  programado: { texto: 'Programado', clase: 'bg-blue-50 text-blue-700' },
  listo: { texto: 'Listo para crear', clase: 'bg-emerald-50 text-emerald-700' },
  espera: { texto: 'En espera', clase: 'bg-amber-50 text-amber-700' },
};

function Paso({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className={TARJETA} aria-labelledby={`paso-${n}`}>
      <h2 id={`paso-${n}`} className="mb-4 flex items-center gap-3 text-lg font-bold text-slate-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs text-white">{n}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export default function FaseFinal() {
  const queryClient = useQueryClient();
  const [idTorneo, setIdTorneo] = useState<number>(0);
  const [idCategoria, setIdCategoria] = useState<number>(0);
  const [asignacion, setAsignacion] = useState<Record<string, string | null>>({});
  const [programacion, setProgramacion] = useState<Record<string, { fecha: string; hora: string }>>({});
  const [ubicacion, setUbicacion] = useState('Coliseo Pablo Delgado Álava');

  const { data: torneosRes } = useQuery({ queryKey: ['torneos_admin'], queryFn: () => getTorneosAdmin(1, 100) });
  const torneos = torneosRes?.data || [];
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
      <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${TARJETA}`}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-600">
            <GitBranch className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Fase final</h1>
            <p className="mt-0.5 text-sm text-slate-500">Formato de cada categoría, grupos y creación de las llaves.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:min-w-[28rem]">
          <label className="text-sm font-medium text-gray-700">
            Torneo
            <select className={`${SELECT} mt-1`} value={idTorneo} onChange={(e) => { setIdTorneo(Number(e.target.value)); setIdCategoria(0); }}>
              <option value={0}>Seleccionar…</option>
              {torneos.map((t) => <option key={t.id_torneo ?? t.id} value={t.id_torneo ?? t.id}>{t.nombre_torneo ?? t.nombre}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Categoría
            <select className={`${SELECT} mt-1`} value={idCategoria} disabled={!torneo} onChange={(e) => setIdCategoria(Number(e.target.value))}>
              <option value={0}>Seleccionar…</option>
              {categorias.map((c) => <option key={c.id_categoria ?? c.id} value={c.id_categoria ?? c.id}>{c.nombre_categoria ?? c.nombre}</option>)}
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
                <label key={clave} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${(fase.formato ?? '') === clave ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="formato" className="mt-1" checked={(fase.formato ?? '') === clave} disabled={guardarFormato.isPending} onChange={() => guardarFormato.mutate((clave || null) as FormatoFaseFinal | null)} />
                  <span>
                    <span className="block text-sm font-bold text-slate-900">{f.nombre}</span>
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
                    <div key={letra ?? 'sin'} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <h3 className="mb-2 flex items-center justify-between text-sm font-bold text-slate-700">
                        {letra ? `Grupo ${letra}` : 'Sin grupo'} <span className="text-xs font-semibold text-slate-400">{ids.length}</span>
                      </h3>
                      <ul className="space-y-1.5">
                        {ids.map((id) => (
                          <li key={id} className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-1.5 text-sm">
                            <span className="truncate font-medium text-slate-800">{nombre(id)}</span>
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
                <AsyncButton onClickAction={() => guardarGrupos.mutateAsync().then(() => undefined)} className="bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">
                  <Save className="h-4 w-4" /> Guardar grupos
                </AsyncButton>
              </div>
            </Paso>
          )}

          {formato && (
            <Paso n={letras.length ? 3 : 2} titulo="Llaves">
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
                  <tbody className="divide-y divide-slate-100">
                    {fase.llaves.map((l) => (
                      <tr key={l.codigo}>
                        <td className="px-3 py-2 font-bold text-slate-900">{l.codigo}</td>
                        <td className="px-3 py-2 text-slate-600">{l.ronda}</td>
                        <td className={`px-3 py-2 ${l.local ? 'font-medium text-slate-800' : 'text-slate-400'}`}>{equipoDe(l, 'local')}</td>
                        <td className={`px-3 py-2 ${l.visitante ? 'font-medium text-slate-800' : 'text-slate-400'}`}>{equipoDe(l, 'visitante')}</td>
                        <td className="px-3 py-2">
                          <span className={`${CHIP} ${ESTADO[l.estado].clase}`}>{ESTADO[l.estado].texto}</span>
                          {l.estado === 'finalizado' && l.partido && <span className="ml-2 tabular-nums text-slate-600">{l.partido.marcador_local}-{l.partido.marcador_visitante}</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">
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
                  <label className="text-sm font-medium text-gray-700">
                    Ubicación
                    <input type="text" className={`${INPUT} mt-1 block w-72`} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
                  </label>
                  <AsyncButton disabled={listas.length === 0} onClickAction={() => crearPartidos.mutateAsync().then(() => undefined)} className="bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">
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
