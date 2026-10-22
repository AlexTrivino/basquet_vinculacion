import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toPng } from 'html-to-image';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { FORMATOS, ListaPartidos, MarcoFlyer, type Formato } from './Flyer';
import { cifra, diaSemana, fechaCartel, horaCartel, LEMA, puntosDelDia } from '../textos';
import type { ResultadoFlyer } from '../api/flyers.api';

// Una lámina del flyer: lo que lleva el marco (ver MarcoFlyer) y el nombre del PNG
export interface Pagina {
  titulo: readonly [string, string, string];
  dato: readonly [string, string];
  cifra: readonly [string, string | number];
  gancho?: ReactNode;
  heroe?: ReactNode;
  formula?: string;
  suelta?: boolean; // láminas que se publican solas: sin "Desliza" ni "1 de N"
  cuerpo: ReactNode;
  archivo: string;
}

// Si un escudo o una foto no se pueden leer, la imagen sale igual (con ese hueco vacío)
const PIXEL_VACIO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const archivo = (...partes: (string | number | null | undefined)[]) =>
  `flyer-${partes.filter((p) => p !== undefined && p !== null && p !== '').join('-')}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .toLowerCase() + '.png';

export function trocear<T>(lista: T[], n: number): T[][] {
  const trozos: T[][] = [];
  for (let i = 0; i < lista.length; i += n) trozos.push(lista.slice(i, i + n));
  return trozos;
}

// Partidos de una fecha: programación (horas y el lema) o, si ya se jugaron todos, resultados (marcadores
// y los puntos de la jornada). La usan el estudio del panel y la vista pública del torneo.
export function paginasDeLaFecha(fecha: string, partidos: ResultadoFlyer[], formato: Formato): Pagina[] {
  const filas = [...partidos].sort((a, b) => (a.hora ?? '99').localeCompare(b.hora ?? '99'));
  if (!filas.length) return [];
  const jugada = filas.every((p) => p.estado.startsWith('finalizado'));
  const hoy = fecha === format(new Date(), 'yyyy-MM-dd');
  const dia = diaSemana(fecha);
  const conFigura = formato === 'historia' && filas.some((p) => p.figura);
  const trozos = trocear(filas, conFigura ? FORMATOS[formato].resultados : FORMATOS[formato].partidos);
  const { partidos: jugados, puntos } = puntosDelDia(filas);
  const primera = filas.find((p) => !p.estado.startsWith('finalizado') && p.hora)?.hora ?? null;
  const gancho = jugada
    ? jugados > 0 ? <><span className="text-oro">{cifra.format(puntos)}</span> {puntos === 1 ? 'punto' : 'puntos'} en la jornada</> : undefined
    : LEMA;
  return trozos.map((trozo, i) => ({
    titulo: jugada ? ['Resultados', 'del', dia] : hoy ? ['Partidos', 'de', 'hoy'] : ['Partidos', 'del', dia],
    dato: hoy && !jugada ? [dia, fechaCartel(fecha)] : ['Fecha', fechaCartel(fecha)],
    cifra: jugada || !primera ? ['Partidos', filas.length] : ['Desde', horaCartel(primera) ?? '—'],
    gancho,
    cuerpo: <ListaPartidos partidos={trozo} conFigura={conFigura} />,
    archivo: archivo(jugada ? 'resultados' : 'partidos', fecha, trozos.length > 1 ? i + 1 : undefined),
  }));
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

// Vistas previas de las láminas con su botón de descarga (PNG a tamaño real) y "Descargar las N"
export function Laminas({ paginas, formato, torneo, anchoMaximo }: { paginas: Pagina[]; formato: Formato; torneo: string; anchoMaximo?: number }) {
  const [ref, anchoVista] = useAncho<HTMLDivElement>();
  const { ancho, alto } = FORMATOS[formato];
  const escala = anchoVista ? Math.min(anchoVista, anchoMaximo ?? (formato === 'historia' ? 420 : 560)) / ancho : 0.4;
  const nodos = useRef<(HTMLDivElement | null)[]>([]);
  const [descargando, setDescargando] = useState<number | 'todas' | null>(null);
  const serie = paginas.length > 1 && !paginas[0].suelta;

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

  return (
    <div ref={ref} className="min-w-0">
      {paginas.length > 1 && (
        <button
          type="button"
          onClick={() => descargar('todas')}
          disabled={descargando !== null}
          className="mb-4 inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {descargando === 'todas' ? 'Generando…' : `Descargar las ${paginas.length}`}
        </button>
      )}
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
                    torneo={torneo}
                    titulo={p.titulo}
                    dato={p.dato}
                    cifra={p.cifra}
                    gancho={p.gancho}
                    heroe={p.heroe}
                    formula={p.formula}
                    pagina={serie ? [i + 1, paginas.length] : undefined}
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
    </div>
  );
}
