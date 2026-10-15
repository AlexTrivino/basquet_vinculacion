import { forwardRef, type ReactNode } from 'react';
import { Escudo } from '../../torneos/components/PartidosList';
import { FotoJugador } from '../../../components/FotoJugador';
import { partirNombre } from '../../../utils/nombres';
import type { FiguraFlyer, ResultadoFlyer } from '../api/flyers.api';

// Lienzos de Instagram: publicación 4:5 e historia 9:16, siempre a 1080 px de ancho
export const FORMATOS = {
  feed: { ancho: 1080, alto: 1350, etiqueta: 'Publicación 4:5', resultados: 5, figuras: 5 },
  historia: { ancho: 1080, alto: 1920, etiqueta: 'Historia 9:16', resultados: 7, figuras: 8 },
} as const;
export type Formato = keyof typeof FORMATOS;

// Grano de película muy tenue: textura de cartel impreso
const GRANO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";
const cifra = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 });

function Esquinas() {
  const base = 'absolute h-[56px] w-[56px] border-oro/55';
  return (
    <>
      <span className={`${base} left-[30px] top-[30px] border-l-2 border-t-2`} />
      <span className={`${base} right-[30px] top-[30px] border-r-2 border-t-2`} />
      <span className={`${base} bottom-[30px] left-[30px] border-b-2 border-l-2`} />
      <span className={`${base} bottom-[30px] right-[30px] border-b-2 border-r-2`} />
    </>
  );
}

interface MarcoProps {
  formato: Formato;
  torneo: string;
  titulo: string;
  subtitulo?: string;
  cinta: string;
  pie?: string;
  children: ReactNode;
}

// Cartel de noche de partido: coliseo velado, marca de agua, esquinas en L y cinta dorada con la fecha
export const MarcoFlyer = forwardRef<HTMLDivElement, MarcoProps>(function MarcoFlyer(
  { formato, torneo, titulo, subtitulo, cinta, pie, children },
  ref
) {
  const { ancho, alto } = FORMATOS[formato];
  return (
    <div
      ref={ref}
      style={{ width: ancho, height: alto }}
      className="relative isolate flex flex-col overflow-hidden bg-marino px-[72px] pb-[56px] pt-[68px] font-sans text-slate-100"
    >
      <img src="/img/hero-coliseo.jpg" alt="" className="absolute inset-x-0 top-0 -z-10 h-[58%] w-full object-cover opacity-60 [filter:blur(3px)]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-marino/30 via-marino/90 via-55% to-marino" />
      <img src="/img/logo-recortado.webp" alt="" className="absolute -right-[200px] bottom-[90px] -z-10 h-[820px] max-w-none opacity-[0.07]" />
      <div className="absolute inset-0 -z-10 opacity-[0.09] mix-blend-overlay" style={{ backgroundImage: GRANO }} />
      <Esquinas />

      <header className="flex items-center gap-[24px]">
        <img src="/img/logo-recortado.webp" alt="" className="h-[96px] w-[96px] object-contain" />
        <div className="min-w-0">
          <p className="text-[24px] font-bold uppercase tracking-[0.22em] text-oro">Torneos Baloncesto Manta</p>
          <p className="mt-1 line-clamp-2 font-display text-[28px] font-semibold leading-tight text-crema">{torneo}</p>
        </div>
      </header>

      <div className="mt-[52px]">
        <h1 className="text-balance font-display text-[92px] font-bold leading-[1.02] text-crema">{titulo}</h1>
        {subtitulo && <p className="mt-[14px] text-[30px] font-semibold leading-snug text-slate-300">{subtitulo}</p>}
        <span className="mt-[26px] inline-block rounded-[6px] bg-oro px-[20px] py-[8px] font-display text-[26px] font-bold uppercase tracking-[0.08em] text-marino">
          {cinta}
        </span>
      </div>

      <div className="mt-[44px] min-h-0 flex-1">{children}</div>

      <footer className="mt-[36px] flex items-center justify-between border-t border-oro/30 pt-[26px] text-[26px]">
        <span className="font-semibold tracking-wide text-crema">baloncestomanta.com</span>
        <span className="text-slate-400">{pie ?? 'Coliseo Pablo Delgado Álava'}</span>
      </footer>
    </div>
  );
});

// ── Resultados de una fecha ──
export function ListaResultados({ resultados, conFigura }: { resultados: ResultadoFlyer[]; conFigura: boolean }) {
  // Con pocos partidos las filas crecen y el bloque se centra: el cartel no queda medio vacío
  const g = resultados.length <= 3;
  return (
    <ol className={`flex h-full flex-col justify-center ${g ? 'gap-[28px]' : 'gap-[18px]'}`}>
      {resultados.map((r) => {
        const ganaLocal = r.local.marcador >= r.visitante.marcador;
        const wo = r.estado === 'finalizado_wo';
        return (
          <li
            key={r.id_partido}
            className={`rounded-[20px] border border-oro/25 bg-marino-claro/80 px-[28px] shadow-[0_20px_25px_-5px_rgb(0_0_0/0.3)] ${g ? 'py-[30px]' : 'py-[20px]'}`}
          >
            <p className={`font-semibold uppercase tracking-[0.14em] text-slate-400 ${g ? 'text-[24px]' : 'text-[21px]'}`}>
              {[r.categoria, r.hora, wo ? 'Ganado por W.O.' : null].filter(Boolean).join(' · ')}
            </p>
            <div className={`mt-[14px] grid items-center gap-[18px] ${g ? 'grid-cols-[100px_minmax(0,1fr)_auto_minmax(0,1fr)_100px]' : 'grid-cols-[76px_minmax(0,1fr)_auto_minmax(0,1fr)_76px]'}`}>
              <Escudo url={r.local.url_logo} className={g ? 'h-[100px] w-[100px]' : 'h-[76px] w-[76px]'} />
              <p className={`line-clamp-2 font-display font-bold leading-tight ${g ? 'text-[30px]' : 'text-[26px]'} ${ganaLocal ? 'text-crema' : 'text-crema/55'}`}>
                {r.local.nombre_equipo}
              </p>
              <p className={`whitespace-nowrap font-display font-bold leading-none tabular-nums ${g ? 'text-[68px]' : 'text-[52px]'}`}>
                <span className={ganaLocal ? 'text-oro' : 'text-crema/55'}>{r.local.marcador}</span>
                <span className="mx-[10px] text-crema/40">-</span>
                <span className={ganaLocal ? 'text-crema/55' : 'text-oro'}>{r.visitante.marcador}</span>
              </p>
              <p className={`line-clamp-2 text-right font-display font-bold leading-tight ${g ? 'text-[30px]' : 'text-[26px]'} ${ganaLocal ? 'text-crema/55' : 'text-crema'}`}>
                {r.visitante.nombre_equipo}
              </p>
              <Escudo url={r.visitante.url_logo} className={g ? 'h-[100px] w-[100px]' : 'h-[76px] w-[76px]'} />
            </div>
            {conFigura && r.figura && (
              <p className="mt-[12px] border-t border-white/10 pt-[10px] text-[22px] text-slate-300">
                Figura: <span className="font-semibold text-crema">{r.figura.jugador.nombre}</span> · {r.figura.linea.puntos} pts,{' '}
                {r.figura.linea.rebotes} reb, {r.figura.linea.asistencias} ast
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Una figura: cromo grande, nombre de placa y su línea de números ──
function Cromo({ figura, className }: { figura: FiguraFlyer; className: string }) {
  const dorsal = figura.jugador.numero_camiseta;
  return (
    <div className={`rounded-[36px] bg-white/[0.04] p-[12px] ring-1 ring-oro/45 shadow-[0_32px_56px_-24px_rgb(0_0_0/0.85)] ${className}`}>
      <div className="relative h-full overflow-hidden rounded-[26px] bg-marino-claro shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
        <FotoJugador url={figura.jugador.url_foto} className="h-full w-full object-cover object-[center_20%]" />
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-marino via-marino/40 to-transparent" />
        {dorsal != null && (
          <span className="absolute bottom-[18px] left-[26px] font-display text-[132px] font-bold leading-none text-transparent [-webkit-text-stroke:2px_var(--color-oro)]">
            {dorsal}
          </span>
        )}
      </div>
    </div>
  );
}

function Numeros({ figura, columnas }: { figura: FiguraFlyer; columnas: 2 | 4 }) {
  const datos: [string, number][] = [
    ['Puntos', figura.linea.puntos],
    ['Rebotes', figura.linea.rebotes],
    ['Asistencias', figura.linea.asistencias],
    ['Tapones', figura.linea.tapones],
  ];
  return (
    <dl className={`grid gap-x-[28px] gap-y-[22px] ${columnas === 4 ? 'grid-cols-4' : 'grid-cols-2'}`}>
      {datos.map(([etiqueta, valor], i) => (
        <div key={etiqueta} className="border-t border-oro/30 pt-[12px]">
          <dt className="font-display text-[20px] font-semibold uppercase tracking-[0.2em] text-oro/80">{etiqueta}</dt>
          <dd className={`mt-[6px] font-display text-[76px] font-bold leading-none tabular-nums ${i === 0 ? 'text-oro' : 'text-crema'}`}>{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function Identidad({ figura, tamano }: { figura: FiguraFlyer; tamano: 'grande' | 'mediano' }) {
  const { apellidos, nombres } = partirNombre(figura.jugador.nombre);
  return (
    <div className="min-w-0">
      <p className={`font-display font-bold uppercase leading-[0.95] text-crema ${tamano === 'grande' ? 'text-[72px]' : 'text-[58px]'}`}>{apellidos}</p>
      {nombres && <p className="mt-[10px] text-[30px] font-semibold uppercase tracking-wide text-slate-300">{nombres}</p>}
      {figura.equipo && (
        <p className="mt-[26px] flex items-center gap-[16px]">
          <Escudo url={figura.equipo.url_logo} className="h-[68px] w-[68px]" />
          <span className="font-display text-[32px] font-bold leading-tight text-crema">{figura.equipo.nombre_equipo}</span>
        </p>
      )}
    </div>
  );
}

function Contexto({ figura }: { figura: FiguraFlyer }) {
  const acumulado = figura.partidos !== undefined;
  return (
    <p className="text-[26px] leading-snug text-slate-300">
      Valoración <span className="font-semibold tabular-nums text-crema">{figura.valoracion}</span>
      {acumulado ? (
        <>
          {' '}en <span className="font-semibold tabular-nums text-crema">{figura.partidos}</span> {figura.partidos === 1 ? 'partido' : 'partidos'} ·{' '}
          <span className="font-semibold tabular-nums text-crema">{cifra.format(figura.promedio_puntos ?? 0)}</span> pts por partido
        </>
      ) : (
        figura.partido && <> · {figura.partido}</>
      )}
    </p>
  );
}

export function FiguraDestacada({ figura, formato }: { figura: FiguraFlyer; formato: Formato }) {
  if (formato === 'historia') {
    return (
      <div className="flex h-full flex-col">
        <Cromo figura={figura} className="mx-auto h-[760px] w-[570px]" />
        <div className="mt-[40px]">
          <Identidad figura={figura} tamano="grande" />
        </div>
        <div className="mt-[36px]">
          <Numeros figura={figura} columnas={4} />
        </div>
        <div className="mt-[26px]">
          <Contexto figura={figura} />
        </div>
      </div>
    );
  }
  return (
    <div className="grid h-full grid-cols-[430px_minmax(0,1fr)] gap-[44px]">
      <Cromo figura={figura} className="h-[574px]" />
      <div className="flex min-w-0 flex-col">
        <Identidad figura={figura} tamano="mediano" />
        <div className="mt-[30px]">
          <Numeros figura={figura} columnas={2} />
        </div>
        <div className="mt-auto pt-[18px]">
          <Contexto figura={figura} />
        </div>
      </div>
    </div>
  );
}

// ── Varias figuras (una por categoría): filas con cromo chico ──
export function ListaFiguras({ figuras }: { figuras: FiguraFlyer[] }) {
  const g = figuras.length <= 3;
  return (
    <ol className={`flex h-full flex-col justify-center ${g ? 'gap-[26px]' : 'gap-[16px]'}`}>
      {figuras.map((f) => (
        <li
          key={`${f.id_categoria}-${f.jugador.id_jugador}`}
          className={`grid items-center gap-[26px] rounded-[20px] border border-oro/25 bg-marino-claro/80 py-[14px] pl-[14px] pr-[30px] shadow-[0_20px_25px_-5px_rgb(0_0_0/0.3)] ${g ? 'grid-cols-[132px_minmax(0,1fr)_auto]' : 'grid-cols-[96px_minmax(0,1fr)_auto]'}`}
        >
          <div className={`overflow-hidden rounded-[14px] ring-1 ring-oro/40 ${g ? 'h-[176px] w-[132px]' : 'h-[128px] w-[96px]'}`}>
            <FotoJugador url={f.jugador.url_foto} className="h-full w-full object-cover object-[center_20%]" />
          </div>
          <div className="min-w-0">
            <p className="text-[20px] font-semibold uppercase tracking-[0.14em] text-oro/85">{f.categoria}</p>
            <p className="mt-[6px] truncate font-display text-[32px] font-bold leading-tight text-crema">{f.jugador.nombre}</p>
            <p className="mt-[4px] truncate text-[24px] text-slate-300">
              {f.equipo?.nombre_equipo ?? 'Sin equipo'} · {f.linea.puntos} pts, {f.linea.rebotes} reb, {f.linea.asistencias} ast
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-[56px] font-bold leading-none tabular-nums text-oro">{f.valoracion}</p>
            <p className="mt-[6px] font-display text-[20px] font-semibold uppercase tracking-[0.2em] text-oro/80">Valoración</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
