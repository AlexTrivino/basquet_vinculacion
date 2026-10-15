import { forwardRef, type ReactNode } from 'react';
import { ChevronsRight, Shield } from 'lucide-react';
import { Escudo } from '../../torneos/components/PartidosList';
import { FotoJugador } from '../../../components/FotoJugador';
import { horaCartel } from '../textos';
import type { FiguraFlyer, ResultadoFlyer } from '../api/flyers.api';

// Lienzos de Instagram a 1080 px de ancho. En la historia, los 250 px de arriba y de abajo quedan
// bajo la barra y la caja de respuesta de Instagram: ahí solo va fondo.
export const FORMATOS = {
  feed: { ancho: 1080, alto: 1350, etiqueta: 'Publicación 4:5', margen: 56, ventana: 80, heroe: 500, resultados: 4, figuras: 4 },
  historia: { ancho: 1080, alto: 1920, etiqueta: 'Historia 9:16', margen: 250, ventana: 90, heroe: 680, resultados: 4, figuras: 5 },
} as const;
export type Formato = keyof typeof FORMATOS;

// RESULTADOS, la palabra más ancha de los títulos, ocupa 881 de los 936 px útiles en Cinzel 700 a este tamaño
const TITULO = 128;

// Grano de película muy tenue: textura de cartel impreso
const GRANO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

// Mismo busto que public/img/jugador-silueta.svg (viewBox 300 × 400)
const BUSTO =
  'M150 78c-33 0-57 30-57 69 0 27 13 52 35 63v22c-44 7-78 28-92 61-6 13-9 28-9 44v63h246v-63c0-16-3-31-9-44-14-33-48-54-92-61v-22c22-11 35-36 35-63 0-39-24-69-57-69z';

// Etiqueta en oro sobre su valor: los pares de la franja
function Par({ etiqueta, valor, derecha }: { etiqueta: string; valor: ReactNode; derecha?: boolean }) {
  return (
    <div className={`min-w-0 ${derecha ? 'text-right' : ''}`}>
      <p className="text-[20px] font-semibold uppercase tracking-[0.24em] text-oro">{etiqueta}</p>
      <p className="mt-[8px] font-display text-[44px] font-bold uppercase leading-none tabular-nums text-crema">{valor}</p>
    </div>
  );
}

function Pie({ torneo, pagina }: { torneo: string; pagina?: readonly [number, number] }) {
  const sigue = pagina && pagina[0] < pagina[1];
  return (
    <footer className="mt-[24px] flex items-end justify-between gap-[40px] border-t border-crema/15 pt-[20px]">
      <p className="line-clamp-2 max-w-[540px] font-display text-[22px] font-semibold leading-snug text-crema/85">{torneo}</p>
      <div className="shrink-0 text-right">
        {sigue ? (
          <p className="flex items-center justify-end gap-[4px] text-[24px] font-bold uppercase tracking-[0.2em] text-oro">
            Desliza <ChevronsRight className="h-[32px] w-[32px]" aria-hidden="true" />
          </p>
        ) : (
          <p className="text-[24px] font-semibold text-crema">baloncestomanta.com</p>
        )}
        <p className="mt-[4px] text-[20px] text-slate-400">{pagina ? `${pagina[0]} de ${pagina[1]}` : 'Coliseo Pablo Delgado Álava'}</p>
      </div>
    </footer>
  );
}

interface MarcoProps {
  formato: Formato;
  torneo: string;
  titulo: readonly [string, string, string]; // palabra, conector, palabra
  dato: readonly [string, string]; // franja izquierda
  cifra: readonly [string, string | number]; // franja derecha
  gancho?: ReactNode;
  heroe?: ReactNode; // el título le pisa la base
  formula?: boolean;
  pagina?: readonly [number, number];
  children: ReactNode;
}

// Cartelera de coliseo (Noche Cinemática): franja con fecha, logo y cifra; título apilado que pisa al héroe
// o a la foto del coliseo; gancho con la cifra en oro; el contenido entre filetes y el pie.
export const MarcoFlyer = forwardRef<HTMLDivElement, MarcoProps>(function MarcoFlyer(
  { formato, torneo, titulo, dato, cifra, gancho, heroe, formula, pagina, children },
  ref
) {
  const { ancho, alto, margen, ventana } = FORMATOS[formato];
  return (
    <div
      ref={ref}
      style={{ width: ancho, height: alto, paddingTop: margen, paddingBottom: margen }}
      className="relative isolate flex flex-col overflow-hidden bg-marino px-[72px] font-sans text-slate-100"
    >
      <img src="/img/hero-coliseo.jpg" alt="" className="absolute inset-x-0 top-0 -z-10 h-[60%] w-full object-cover opacity-70 [filter:blur(2px)]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-marino/40 via-marino/85 via-50% to-marino" />
      <img src="/img/logo-recortado.webp" alt="" className="absolute -right-[200px] bottom-[90px] -z-10 h-[820px] max-w-none opacity-[0.07]" />
      <div className="absolute inset-0 -z-10 opacity-[0.09] mix-blend-overlay" style={{ backgroundImage: GRANO }} />

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[24px] border-b border-crema/15 pb-[18px]">
        <Par etiqueta={dato[0]} valor={dato[1]} />
        <img src="/img/logo-recortado.webp" alt="" className="h-[104px] w-[104px] object-contain" />
        <Par etiqueta={cifra[0]} valor={cifra[1]} derecha />
      </div>

      <div style={{ marginTop: heroe ? 24 : ventana }}>
        {heroe}
        <h1
          className="relative text-center font-display font-bold uppercase leading-[0.92] text-crema [text-shadow:0_6px_30px_rgb(8_18_38/0.9)]"
          style={{ fontSize: TITULO, marginTop: heroe ? -150 : 0 }}
        >
          <span className="block">{titulo[0]}</span>
          <span className="block font-sans text-[40px] font-normal normal-case italic leading-[1.3] text-crema/85">{titulo[1]}</span>
          <span className="block">{titulo[2]}</span>
        </h1>
        {gancho && <p className="mt-[18px] text-center text-[26px] font-semibold uppercase tracking-[0.16em] text-crema">{gancho}</p>}
      </div>

      <div className="mt-[30px] min-h-0 flex-1">{children}</div>

      <Pie torneo={torneo} pagina={pagina} />
      {formula && (
        <p className="absolute right-[30px] top-1/2 -translate-y-1/2 rotate-180 whitespace-nowrap text-[20px] font-semibold uppercase tracking-[0.2em] text-slate-400 [writing-mode:vertical-rl]">
          Valoración = puntos + rebotes + asistencias + tapones
        </p>
      )}
    </div>
  );
});

// Sin logo, medallón oscuro: un disco blanco vacío sería lo más brillante del cartel
function EscudoFlyer({ url, className }: { url: string | null; className: string }) {
  if (url) return <Escudo url={url} className={className} />;
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-marino-claro ring-2 ring-crema/15 ${className}`}>
      <Shield className="h-1/2 w-1/2 text-crema/30" aria-hidden="true" />
    </span>
  );
}

// ── Resultados de una fecha: filas entre filetes ──
export function ListaResultados({ resultados, conFigura }: { resultados: ResultadoFlyer[]; conFigura: boolean }) {
  // Con uno o dos partidos las filas crecen: el cartel no queda medio vacío
  const g = resultados.length <= 2;
  const escudo = g ? 'h-[88px] w-[88px]' : 'h-[60px] w-[60px]';
  const nombre = (gana: boolean) => `line-clamp-2 font-display font-bold leading-tight ${g ? 'text-[30px]' : 'text-[26px]'} ${gana ? 'text-crema' : 'text-crema/55'}`;
  return (
    <div className="flex h-full flex-col justify-center">
      <ol className="divide-y divide-crema/15 border-y border-crema/15">
        {resultados.map((r) => {
          const ganaLocal = r.local.marcador >= r.visitante.marcador;
          return (
            <li key={r.id_partido} className={g ? 'py-[26px]' : 'py-[14px]'}>
              <p className="text-[20px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                {[r.categoria, horaCartel(r.hora), r.estado === 'finalizado_wo' ? 'Ganado por W.O.' : null].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-[10px] grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-[18px]">
                <EscudoFlyer url={r.local.url_logo} className={escudo} />
                <p className={nombre(ganaLocal)}>{r.local.nombre_equipo}</p>
                <p className={`whitespace-nowrap font-display font-bold leading-none tabular-nums ${g ? 'text-[72px]' : 'text-[56px]'}`}>
                  <span className={ganaLocal ? 'text-oro' : 'text-crema/55'}>{r.local.marcador}</span>
                  <span className="mx-[10px] text-crema/40">-</span>
                  <span className={ganaLocal ? 'text-crema/55' : 'text-oro'}>{r.visitante.marcador}</span>
                </p>
                <p className={`text-right ${nombre(!ganaLocal)}`}>{r.visitante.nombre_equipo}</p>
                <EscudoFlyer url={r.visitante.url_logo} className={escudo} />
              </div>
              {conFigura && r.figura && (
                <p className="mt-[10px] truncate text-[22px] text-slate-300">
                  Figura: <span className="font-semibold text-crema">{r.figura.jugador.nombre}</span> · {r.figura.linea.puntos} pts,{' '}
                  {r.figura.linea.rebotes} reb, {r.figura.linea.asistencias} ast
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Una figura: el jugador es el héroe y el título le pisa la base ──
export function HeroeFigura({ figura, formato }: { figura: FiguraFlyer; formato: Formato }) {
  const alto = FORMATOS[formato].heroe;
  const { url_foto: foto, numero_camiseta: dorsal } = figura.jugador;
  return (
    <div className="relative mx-auto" style={{ height: alto, width: Math.round(alto * 0.75) }}>
      {foto ? (
        // La foto se desvanece hacia abajo: el título la pisa sin un borde recto
        <div className="relative h-full overflow-hidden rounded-[28px] ring-1 ring-oro/35 [mask-image:linear-gradient(to_bottom,#000_55%,transparent_96%)]">
          <FotoJugador url={foto} className="h-full w-full object-cover object-[center_20%]" />
          {dorsal != null && (
            <span className="absolute left-[22px] top-[14px] font-display text-[120px] font-bold leading-none text-transparent [-webkit-text-stroke:2px_var(--color-oro)]">
              {dorsal}
            </span>
          )}
        </div>
      ) : (
        // Sin foto, el jugador va a contraluz delante de su dorsal gigante: misterio en lugar de un hueco
        <>
          <span className="absolute -inset-x-[40%] -top-[12%] h-[85%] bg-[radial-gradient(closest-side,rgb(241_231_208/0.42),rgb(214_179_106/0.16)_45%,transparent)]" />
          {dorsal != null && (
            <span
              className="absolute inset-x-0 top-[2%] text-center font-display font-bold leading-none text-transparent [-webkit-text-stroke:3px_rgb(214_179_106/0.55)]"
              style={{ fontSize: Math.round(alto * 0.62) }}
            >
              {dorsal}
            </span>
          )}
          <svg viewBox="0 0 300 400" className="absolute inset-0 h-full w-full [filter:drop-shadow(0_0_22px_rgb(214_179_106/0.35))]" aria-hidden="true">
            {/* Relleno y filo se desvanecen en la base del busto: el título la pisa sin un corte recto */}
            <defs>
              <linearGradient id="flyer-busto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0F2148" />
                <stop offset="0.6" stopColor="#081226" />
                <stop offset="0.95" stopColor="#081226" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="flyer-filo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#D6B36A" stopOpacity="0.75" />
                <stop offset="0.6" stopColor="#D6B36A" stopOpacity="0.5" />
                <stop offset="0.9" stopColor="#D6B36A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={BUSTO} fill="url(#flyer-busto)" stroke="url(#flyer-filo)" strokeWidth="1.5" />
          </svg>
        </>
      )}
    </div>
  );
}

// Nombre, equipo y la línea de números como pares etiqueta → valor entre filetes
export function FichaFigura({ figura }: { figura: FiguraFlyer }) {
  const contexto = [
    figura.equipo?.nombre_equipo,
    figura.categoria,
    figura.partidos !== undefined ? `${figura.partidos} ${figura.partidos === 1 ? 'partido' : 'partidos'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const numeros: [string, number][] = [
    ['Puntos', figura.linea.puntos],
    ['Rebotes', figura.linea.rebotes],
    ['Asistencias', figura.linea.asistencias],
    ['Tapones', figura.linea.tapones],
  ];
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-balance text-center font-display text-[52px] font-bold uppercase leading-[1.05] text-crema">{figura.jugador.nombre}</p>
      <p className="mt-[14px] flex items-center justify-center gap-[14px] text-[22px] font-semibold uppercase tracking-[0.12em] text-slate-300">
        {figura.equipo && <EscudoFlyer url={figura.equipo.url_logo} className="h-[52px] w-[52px]" />}
        <span className="min-w-0">{contexto}</span>
      </p>
      <dl className="mt-[28px] grid grid-cols-4 border-y border-crema/15">
        {numeros.map(([etiqueta, valor], i) => (
          <div key={etiqueta} className={`py-[16px] text-center ${i ? 'border-l border-crema/15' : ''}`}>
            <dt className="text-[20px] font-semibold uppercase tracking-[0.16em] text-slate-300">{etiqueta}</dt>
            <dd className={`mt-[8px] font-display text-[68px] font-bold leading-none tabular-nums ${i === 0 ? 'text-oro' : 'text-crema'}`}>{valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ── Varias figuras (una por categoría): filas con retrato chico ──
export function ListaFiguras({ figuras }: { figuras: FiguraFlyer[] }) {
  const g = figuras.length <= 2;
  return (
    <div className="flex h-full flex-col justify-center">
      <ol className="divide-y divide-crema/15 border-y border-crema/15">
        {figuras.map((f) => (
          <li
            key={`${f.id_categoria}-${f.jugador.id_jugador}`}
            className={`grid items-center gap-[24px] ${g ? 'grid-cols-[120px_minmax(0,1fr)_auto] py-[24px]' : 'grid-cols-[72px_minmax(0,1fr)_auto] py-[14px]'}`}
          >
            <div className={`overflow-hidden rounded-[14px] ring-1 ring-oro/40 ${g ? 'h-[160px] w-[120px]' : 'h-[96px] w-[72px]'}`}>
              <FotoJugador url={f.jugador.url_foto} className="h-full w-full object-cover object-[center_20%]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[20px] font-semibold uppercase tracking-[0.16em] text-slate-300">{f.categoria}</p>
              <p className="mt-[6px] truncate font-display text-[32px] font-bold leading-tight text-crema">{f.jugador.nombre}</p>
              <p className="mt-[4px] truncate text-[22px] text-slate-300">
                {f.equipo?.nombre_equipo ?? 'Sin equipo'} · {f.linea.puntos} pts, {f.linea.rebotes} reb, {f.linea.asistencias} ast
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-[56px] font-bold leading-none tabular-nums text-oro">{f.valoracion}</p>
              <p className="mt-[6px] text-[20px] font-semibold uppercase tracking-[0.16em] text-slate-400">Valoración</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
