import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toPng } from 'html-to-image';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import { getTorneosAdmin } from '../../torneos/api/torneos.api';
import { getDatosFlyers, type DatosFlyers, type FiguraFlyer } from '../api/flyers.api';
import { cifra, diaSemana, fechaCartel, puntosDelDia, textoFigura, textoFiguras, textoResultados } from '../textos';
import { FichaFigura, FORMATOS, HeroeFigura, ListaFiguras, ListaResultados, MarcoFlyer, type Formato } from './Flyer';

type Tipo = 'resultados' | 'figura-fecha' | 'categoria' | 'equipo';
const TIPOS: { valor: Tipo; texto: string }[] = [
  { valor: 'resultados', texto: 'Resultados del día' },
  { valor: 'figura-fecha', texto: 'Figura de la fecha' },
  { valor: 'categoria', texto: 'Figuras por categoría' },
  { valor: 'equipo', texto: 'Figura por equipo' },
];
// Si un escudo o una foto no se pueden leer, la imagen sale igual (con ese hueco vacío)
const PIXEL_VACIO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const archivo = (...partes: (string | number | undefined)[]) =>
  `flyer-${partes.filter((p) => p !== undefined && p !== '').join('-')}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .toLowerCase() + '.png';

function trocear<T>(lista: T[], n: number): T[][] {
  const trozos: T[][] = [];
  for (let i = 0; i < lista.length; i += n) trozos.push(lista.slice(i, i + n));
  return trozos;
}

interface Pagina {
  titulo: readonly [string, string, string];
  dato: readonly [string, string];
  cifra: readonly [string, string | number];
  gancho?: ReactNode;
  heroe?: ReactNode;
  formula?: boolean;
  cuerpo: ReactNode;
  archivo: string;
}

// Las láminas del flyer elegido y su caption para Instagram
function armarFlyer(datos: DatosFlyers, tipo: Tipo, formato: Formato, categoria: string, equipo: string): { paginas: Pagina[]; texto: string } {
  const fecha = datos.fecha;
  const nada = { paginas: [], texto: '' };
  if (!fecha) return nada;
  const acumulado = ['Acumulado', fechaCartel(fecha)] as const;
  const unaFigura = (f: FiguraFlyer, titulo: Pagina['titulo'], dato: Pagina['dato'], encabezado: string, nombre?: string | null) => ({
    paginas: [{
      titulo, dato, cifra: ['Valoración', f.valoracion] as const, formula: true,
      heroe: <HeroeFigura figura={f} formato={formato} />,
      cuerpo: <FichaFigura figura={f} />,
      archivo: archivo('figura', nombre ?? undefined, fecha),
    }],
    texto: textoFigura(encabezado, f),
  });

  if (tipo === 'resultados') {
    const trozos = trocear(datos.resultados, FORMATOS[formato].resultados);
    const { partidos, puntos } = puntosDelDia(datos.resultados);
    const gancho = partidos ? <><span className="text-oro">{cifra.format(puntos)}</span> {puntos === 1 ? 'punto' : 'puntos'} en la jornada</> : undefined;
    return {
      paginas: trozos.map((trozo, i) => ({
        titulo: ['Resultados', 'del', diaSemana(fecha)],
        dato: ['Fecha', fechaCartel(fecha)],
        cifra: ['Partidos', datos.resultados.length],
        gancho,
        cuerpo: <ListaResultados resultados={trozo} conFigura={formato === 'historia'} />,
        archivo: archivo('resultados', fecha, trozos.length > 1 ? i + 1 : undefined),
      })),
      texto: textoResultados(fecha, datos.resultados),
    };
  }
  if (tipo === 'figura-fecha') {
    const f = datos.figura_fecha;
    return f ? unaFigura(f, ['Figura', 'de la', 'Fecha'], [diaSemana(fecha), fechaCartel(fecha)], 'Figura de la fecha') : nada;
  }
  if (tipo === 'categoria') {
    if (categoria === 'todas') {
      const trozos = trocear(datos.figuras_categoria, FORMATOS[formato].figuras);
      return {
        paginas: trozos.map((trozo, i) => ({
          titulo: ['Figuras', 'del', 'Torneo'],
          dato: acumulado,
          cifra: ['Categorías', datos.figuras_categoria.length],
          gancho: 'La mejor valoración de cada categoría',
          formula: true,
          cuerpo: <ListaFiguras figuras={trozo} />,
          archivo: archivo('figuras-categorias', fecha, trozos.length > 1 ? i + 1 : undefined),
        })),
        texto: textoFiguras(fecha, datos.figuras_categoria),
      };
    }
    const f = datos.figuras_categoria.find((x) => String(x.id_categoria) === categoria);
    return f ? unaFigura(f, ['Figura', 'de la', 'Categoría'], acumulado, `Figura de ${f.categoria}`, f.categoria) : nada;
  }
  const f = datos.figuras_equipo.find((x) => `${x.equipo?.id_equipo}-${x.id_categoria}` === equipo);
  return f ? unaFigura(f, ['Figura', 'del', 'Equipo'], acumulado, `Figura de ${f.equipo?.nombre_equipo} en ${f.categoria}`, f.equipo?.nombre_equipo) : nada;
}

// Ancho disponible para escalar la vista previa (el flyer se arma a tamaño real y se reduce con transform)
function useAncho<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setAncho(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setAncho(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho] as const;
}

const etiqueta = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400';
const selector =
  'block w-full cursor-pointer appearance-none rounded-lg border border-white/15 bg-marino py-2.5 pl-3 pr-9 text-sm font-semibold text-crema transition-colors hover:border-oro/50 disabled:cursor-not-allowed disabled:opacity-50';

function Selector({ id, texto, valor, alCambiar, children, deshabilitado }: {
  id: string; texto: string; valor: string; alCambiar: (v: string) => void; children: ReactNode; deshabilitado?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={etiqueta}>{texto}</label>
      <div className="relative">
        <select id={id} value={valor} onChange={(e) => alCambiar(e.target.value)} disabled={deshabilitado} className={selector}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-oro" aria-hidden="true" />
      </div>
    </div>
  );
}

function Segmentos<T extends string>({ texto, opciones, valor, alCambiar }: {
  texto: string; opciones: { valor: T; texto: string }[]; valor: T; alCambiar: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className={etiqueta}>{texto}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-marino p-1">
        {opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            aria-pressed={o.valor === valor}
            onClick={() => alCambiar(o.valor)}
            className={`rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors duration-200 ${
              o.valor === valor ? 'bg-white/10 text-crema ring-1 ring-oro/40' : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            {o.texto}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function EstudioFlyers() {
  const { data: torneosRes } = useQuery({ queryKey: ['torneos_admin'], queryFn: () => getTorneosAdmin(1, 100) });
  const torneos = torneosRes?.data ?? [];
  const [elegido, setElegido] = useState(0);
  const actual = torneos.find((t) => t.estado === 'en_curso') ?? torneos.find((t) => t.estado === 'programado');
  const idTorneo = elegido || (actual?.id_torneo ?? actual?.id ?? 0);

  const [tipo, setTipo] = useState<Tipo>('resultados');
  const [formato, setFormato] = useState<Formato>('feed');
  const [fecha, setFecha] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [equipo, setEquipo] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['flyers', idTorneo, fecha],
    queryFn: () => getDatosFlyers(idTorneo, fecha),
    enabled: idTorneo > 0,
  });
  const datos = data?.data;
  const equipoActual = equipo || (datos?.figuras_equipo[0] ? `${datos.figuras_equipo[0].equipo?.id_equipo}-${datos.figuras_equipo[0].id_categoria}` : '');
  const { paginas, texto } = datos ? armarFlyer(datos, tipo, formato, categoria, equipoActual) : { paginas: [], texto: '' };

  const [ref, anchoVista] = useAncho<HTMLDivElement>();
  const { ancho, alto } = FORMATOS[formato];
  const escala = anchoVista ? Math.min(anchoVista, formato === 'historia' ? 420 : 560) / ancho : 0.4;
  const nodos = useRef<(HTMLDivElement | null)[]>([]);
  const [descargando, setDescargando] = useState<number | 'todas' | null>(null);

  async function exportar(i: number) {
    const nodo = nodos.current[i];
    if (!nodo) return;
    await document.fonts.ready;
    const url = await toPng(nodo, { width: ancho, height: alto, pixelRatio: 1, cacheBust: true, imagePlaceholder: PIXEL_VACIO });
    const a = document.createElement('a');
    a.href = url;
    a.download = paginas[i].archivo;
    a.click();
  }

  async function copiarTexto() {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Texto copiado. Pégalo como descripción de la publicación.');
    } catch {
      toast.error('No se pudo copiar el texto.');
    }
  }

  async function descargar(cual: number | 'todas') {
    setDescargando(cual);
    try {
      for (const i of cual === 'todas' ? paginas.map((_, k) => k) : [cual]) await exportar(i);
    } catch {
      toast.error('No se pudo generar la imagen. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setDescargando(null);
    }
  }

  const vacio =
    !datos?.fecha ? 'Este torneo todavía no tiene partidos jugados.'
    : tipo === 'resultados' ? 'No hay resultados en esta fecha.'
    : tipo === 'figura-fecha' ? 'Los partidos de esta fecha no tienen estadísticas cargadas, así que no hay figura.'
    : 'Todavía no hay estadísticas cargadas en este torneo.';

  return (
    <section aria-labelledby="titulo-flyers" className="rounded-xl border border-oro/25 bg-marino-claro/80 shadow-[0_20px_25px_-5px_rgb(0_0_0/0.3)]">
      <div className="border-b border-white/10 px-5 py-4 sm:px-6">
        <h2 id="titulo-flyers" className="font-display text-2xl font-bold text-crema">Flyers para Instagram</h2>
        <p className="mt-1 text-sm text-slate-400">Resultados y figuras listos para publicar, con los datos cargados en el sistema.</p>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Selector id="flyer-torneo" texto="Torneo" valor={String(idTorneo)} alCambiar={(v) => { setElegido(Number(v)); setFecha(''); }}>
            {torneos.map((t) => (
              <option key={t.id_torneo ?? t.id} value={t.id_torneo ?? t.id}>
                {t.nombre ?? t.nombre_torneo} ({t.estado.replace('_', ' ')})
              </option>
            ))}
          </Selector>
          <Segmentos texto="Flyer" opciones={TIPOS} valor={tipo} alCambiar={setTipo} />
          {(tipo === 'resultados' || tipo === 'figura-fecha') && (
            <Selector id="flyer-fecha" texto="Fecha" valor={fecha || datos?.fecha || ''} alCambiar={setFecha} deshabilitado={!datos?.fechas.length}>
              {(datos?.fechas ?? []).map((f) => (
                <option key={f} value={f}>{format(parseISO(f), "EEE d 'de' MMM yyyy", { locale: es })}</option>
              ))}
            </Selector>
          )}
          {tipo === 'categoria' && (
            <Selector id="flyer-categoria" texto="Categoría" valor={categoria} alCambiar={setCategoria}>
              <option value="todas">Todas (una figura por categoría)</option>
              {(datos?.figuras_categoria ?? []).map((f) => (
                <option key={f.id_categoria} value={f.id_categoria}>{f.categoria}</option>
              ))}
            </Selector>
          )}
          {tipo === 'equipo' && (
            <Selector id="flyer-equipo" texto="Equipo" valor={equipoActual} alCambiar={setEquipo} deshabilitado={!datos?.figuras_equipo.length}>
              {(datos?.figuras_equipo ?? []).map((f) => {
                const clave = `${f.equipo?.id_equipo}-${f.id_categoria}`;
                return <option key={clave} value={clave}>{f.equipo?.nombre_equipo} · {f.categoria}</option>;
              })}
            </Selector>
          )}
          <Segmentos
            texto="Formato"
            opciones={(Object.keys(FORMATOS) as Formato[]).map((f) => ({ valor: f, texto: FORMATOS[f].etiqueta }))}
            valor={formato}
            alCambiar={setFormato}
          />
          <p className="text-xs leading-relaxed text-slate-400">
            Figura es la mejor valoración: puntos + rebotes + asistencias + tapones. Por categoría y por equipo se suma todo el torneo; en la fecha, cada partido.
          </p>
          {texto && (
            <button
              type="button"
              onClick={copiarTexto}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10 active:scale-[0.98]"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar texto para Instagram
            </button>
          )}
          {paginas.length > 1 && (
            <button
              type="button"
              onClick={() => descargar('todas')}
              disabled={descargando !== null}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {descargando === 'todas' ? 'Generando…' : `Descargar las ${paginas.length}`}
            </button>
          )}
        </div>

        <div ref={ref} className="min-w-0">
          {isLoading || !idTorneo ? (
            <div className="aspect-[4/5] w-full max-w-[560px] rounded-xl bg-white/5 motion-safe:animate-pulse" aria-busy="true" />
          ) : isError ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
              No pudimos cargar los datos del torneo.
              <button type="button" onClick={() => refetch()} className="ml-3 rounded-lg border border-white/25 px-3 py-1.5 font-semibold text-white hover:bg-white/10">
                Reintentar
              </button>
            </div>
          ) : paginas.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <p className="font-semibold text-crema">Nada para publicar todavía</p>
              <p className="mt-1 text-sm text-slate-400">{vacio}</p>
            </div>
          ) : (
            <ol className="flex flex-wrap gap-6">
              {paginas.map((p, i) => (
                <li key={p.archivo} className="flex flex-col gap-3">
                  {/* Bandeja y núcleo: el flyer va encajado como una lámina */}
                  <div className="rounded-[1.25rem] bg-white/[0.04] p-2 ring-1 ring-oro/30">
                    <div className="overflow-hidden rounded-[0.75rem]" style={{ width: ancho * escala, height: alto * escala }}>
                      <div style={{ width: ancho, transform: `scale(${escala})`, transformOrigin: 'top left' }}>
                        <MarcoFlyer
                          ref={(n) => { nodos.current[i] = n; }}
                          formato={formato}
                          torneo={datos?.torneo.nombre ?? ''}
                          titulo={p.titulo}
                          dato={p.dato}
                          cifra={p.cifra}
                          gancho={p.gancho}
                          heroe={p.heroe}
                          formula={p.formula}
                          pagina={paginas.length > 1 ? [i + 1, paginas.length] : undefined}
                        >
                          {p.cuerpo}
                        </MarcoFlyer>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => descargar(i)}
                    disabled={descargando !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-celeste px-5 py-2.5 text-sm font-semibold text-marino transition-colors duration-150 hover:bg-white active:scale-[0.98] disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {descargando === i ? 'Generando…' : paginas.length > 1 ? `Descargar ${i + 1} de ${paginas.length}` : 'Descargar PNG'}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
