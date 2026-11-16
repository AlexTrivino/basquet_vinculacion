import { forwardRef, useMemo } from 'react';
import { Shield } from 'lucide-react';
import type { PodioDeCategoria, PodiosDelTorneo, PuestoDelPodio } from '@/modules/partidos';
import type { Encuadre } from '../api/flyers.api';
import { tamanoParaAncho, useFuente } from '../ajuste';
import { CENTRADO, encuadreDe } from '../foto';
import { fechasDelTorneo, ganchoDelPuesto, LUGARES, lineasDelTorneo, pieDelTorneo } from '../textosPodio';
import { EscudoFlyer, FondoFlyer, type Formato } from './Flyer';

// Posición (px del lienzo de 1080) de cada pieza del flyer del podio: el encabezado con el nombre del campeonato y la
// copa, la franja con la categoría y las fechas, el héroe (la foto o el escudo), la palabra del puesto, el equipo, el
// dato del puesto, los cuatro números y el pie. En estados, los 250 px de arriba y de abajo quedan libres (barra y
// caja de respuesta). `base` es donde apoya la palabra del puesto, que pisa la parte baja del héroe.
const MEDIDAS = {
  historia: { alto: 1920, cab: 250, cabAlto: 290, titulo: 520, copa: 410, banda: 558, foto: 632, fotoAlto: 760, base: 1250, equipo: 1268, gancho: 1356, stats: 1448, pie: 1592 },
  feed: { alto: 1350, cab: 56, cabAlto: 224, titulo: 410, copa: 320, banda: 296, foto: 370, fotoAlto: 610, base: 868, equipo: 886, gancho: 974, stats: 1064, pie: 1208 },
} as const;

// Proporción del marco de la foto en cada formato: el editor de recorte la usa para mostrar lo mismo que el flyer
export const aspectoDeLaFoto = (formato: Formato) => 1080 / MEDIDAS[formato].fotoAlto;

// La foto llena el marco recortada alrededor de su foco (object-position) y el zoom la acerca desde ese mismo punto,
// que no se mueve. Se desvanece arriba y abajo: la palabra del puesto y el nombre del equipo la pisan sin corte recto.
// `draggable={false}`: en el editor, el navegador arrancaría el arrastre nativo de la imagen y cancelaría el puntero.
export function FotoHeroe({ url, foco_x, foco_y, zoom }: { url: string } & Encuadre) {
  const foco = `${foco_x}% ${foco_y}%`;
  return (
    <div className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0,#000_9%,#000_56%,transparent_84%)]">
      <img src={url} alt="" draggable={false} className="h-full w-full object-cover" style={{ objectPosition: foco, transform: `scale(${zoom})`, transformOrigin: foco }} />
    </div>
  );
}

// Sin foto, el escudo es el héroe: grande, bajo un cono de luz y con su reflejo en el piso. `k` escala las piezas
// del héroe de estados (760 px de alto) al alto de este formato.
function EscudoHeroe({ url, k }: { url: string | null; k: number }) {
  const centrado = 'absolute left-1/2 -translate-x-1/2';
  return (
    <>
      <span className={`${centrado} bg-[radial-gradient(closest-side,rgb(41_169_225/0.18),transparent)]`} style={{ top: 40 * k, width: 760, height: 560 * k }} />
      <span
        className={`${centrado} blur-[18px] bg-[conic-gradient(from_180deg_at_50%_0,transparent_160deg,rgb(241_231_208/0.12)_172deg,rgb(241_231_208/0.2)_180deg,rgb(241_231_208/0.12)_188deg,transparent_200deg)]`}
        style={{ top: -60 * k, width: 900, height: 700 * k }}
      />
      <span className={`${centrado} bg-[radial-gradient(closest-side,rgb(214_179_106/0.16),transparent)]`} style={{ top: 430 * k, width: 860, height: 200 * k }} />
      {url ? (
        <img src={url} alt="" className={`${centrado} object-contain [filter:drop-shadow(0_30px_50px_rgb(0_0_0/0.7))]`} style={{ top: 18 * k, height: 470 * k, maxWidth: 560 }} />
      ) : (
        <Shield className={`${centrado} text-crema/20`} style={{ top: 70 * k, height: 380 * k, width: 380 * k }} strokeWidth={1} aria-hidden="true" />
      )}
    </>
  );
}

interface Props {
  formato: Formato;
  torneo: PodiosDelTorneo['torneo'];
  categoria: PodioDeCategoria['categoria'];
  puesto: PuestoDelPodio;
  encuadre?: Encuadre; // el que se está ajustando: va en lugar del guardado
}

// El flyer de un puesto del podio. Héroe: la foto del podio, si no la del equipo y, si no hay ninguna, el escudo.
export const FlyerPodio = forwardRef<HTMLDivElement, Props>(function FlyerPodio({ formato, torneo, categoria, puesto, encuadre }, ref) {
  const m = MEDIDAS[formato];
  const fuenteLista = useFuente();
  const url = puesto.foto?.url ?? puesto.url_foto_equipo;
  const marco = encuadre ?? (puesto.foto ? encuadreDe(puesto.foto) : CENTRADO);
  const lugar = LUGARES[puesto.lugar].toUpperCase();
  const [etiqueta, dato] = ganchoDelPuesto(puesto);
  const equipo = puesto.equipo.nombre_equipo;

  // El texto llena su caja: cada línea del campeonato, la palabra del puesto (hasta 190 px), el equipo y el dato
  const tamanos = useMemo(() => {
    const lineas = lineasDelTorneo(torneo.nombre).map((l) => l.toUpperCase());
    return {
      lineas: lineas.map((l) => [l, tamanoParaAncho(l, m.titulo, 999)] as const),
      lugar: tamanoParaAncho(lugar, 940, 190),
      equipo: tamanoParaAncho(equipo, url ? 830 : 936, 52),
      dato: tamanoParaAncho(dato, 936, 38),
    };
    // fuenteLista está en las dependencias para medir otra vez cuando baja Cinzel
  }, [fuenteLista, torneo.nombre, m.titulo, lugar, equipo, dato, url]);

  const generoYaDicho = categoria.nombre_categoria.toLowerCase().includes(categoria.genero_categoria.toLowerCase());
  const numeros = [['Ganados', puesto.PG], ['Perdidos', puesto.PP], ['Pts. a favor', puesto.PF], ['Pts. en contra', puesto.PC]] as const;
  const k = m.fotoAlto / 760;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${LUGARES[puesto.lugar]} de ${categoria.nombre_categoria}: ${equipo}`}
      style={{ width: 1080, height: m.alto }}
      className="relative isolate overflow-hidden bg-marino font-sans tabular-nums text-slate-100"
    >
      <FondoFlyer />

      <header className="absolute flex items-center justify-between" style={{ left: 72, right: 64, top: m.cab, height: m.cabAlto }}>
        <div className="flex flex-col gap-[8px]" style={{ width: m.titulo }}>
          {tamanos.lineas.map(([linea, tamano]) => (
            <span key={linea} className="block w-max whitespace-nowrap font-display font-bold leading-[0.92] text-crema [text-shadow:0_6px_30px_rgb(8_18_38/0.9)]" style={{ fontSize: tamano }}>
              {linea}
            </span>
          ))}
        </div>
        <img src="/img/logo-copa-intercolegial.webp" alt="" className="[filter:drop-shadow(0_18px_36px_rgb(0_0_0/0.55))]" style={{ width: m.copa }} />
      </header>

      <div
        className="absolute flex items-center justify-between gap-[24px] whitespace-nowrap border-y border-crema/15 text-[23px] font-semibold uppercase tracking-[0.18em] text-crema"
        style={{ left: 72, right: 72, top: m.banda, height: 62 }}
      >
        <span className="min-w-0 truncate">
          Categoría <b className="font-semibold text-oro">{categoria.nombre_categoria}</b>
          {!generoYaDicho && ` ${categoria.genero_categoria}`}
        </span>
        <span>{fechasDelTorneo(torneo.fecha_inicio, torneo.fecha_fin)}</span>
      </div>

      <div className="absolute inset-x-0" style={{ top: m.foto, height: m.fotoAlto }}>
        {url ? <FotoHeroe url={url} {...marco} /> : <EscudoHeroe url={puesto.equipo.url_logo} k={k} />}
      </div>

      <p
        className="absolute inset-x-0 text-center font-display font-bold leading-[0.9] text-crema [text-shadow:0_6px_30px_rgb(8_18_38/0.95),0_2px_0_rgb(8_18_38/0.7)]"
        style={{ top: m.base - 0.9 * tamanos.lugar, fontSize: tamanos.lugar }}
      >
        {lugar}
      </p>

      <div className="absolute inset-x-0 flex items-center justify-center gap-[22px] font-display font-bold leading-[1.25] text-crema" style={{ top: m.equipo, fontSize: tamanos.equipo }}>
        {url && <EscudoFlyer url={puesto.equipo.url_logo} className="h-[84px] w-[84px]" />}
        <span className="whitespace-nowrap">{equipo}</span>
      </div>

      <div className="absolute inset-x-0 flex flex-col items-center gap-[8px]" style={{ top: m.gancho }}>
        <span className="text-[22px] font-semibold uppercase leading-[1.2] tracking-[0.24em] text-oro">{etiqueta}</span>
        <span className="whitespace-nowrap font-display font-bold leading-[1.25] text-crema" style={{ fontSize: tamanos.dato }}>{dato}</span>
      </div>

      <dl className="absolute grid grid-cols-4 border-y border-crema/15" style={{ left: 72, right: 72, top: m.stats, height: 126 }}>
        {numeros.map(([etiquetaNumero, valor], i) => (
          <div key={etiquetaNumero} className="relative flex flex-col items-center justify-center gap-[4px]">
            {i > 0 && <span className="absolute inset-y-[26px] left-0 w-px bg-crema/15" />}
            <dt className="whitespace-nowrap text-[20px] font-semibold uppercase leading-[1.2] tracking-[0.18em] text-oro">{etiquetaNumero}</dt>
            <dd className="font-display text-[62px] font-bold leading-none text-crema">{valor}</dd>
          </div>
        ))}
      </dl>

      <footer className="absolute flex items-end justify-between gap-[40px] border-t border-crema/15 pt-[14px]" style={{ left: 72, right: 72, top: m.pie, height: 78 }}>
        <p className="line-clamp-2 max-w-[560px] font-display text-[22px] font-semibold leading-[1.3] text-crema/85">{pieDelTorneo(torneo.nombre)}</p>
        <div className="flex shrink-0 items-end gap-[16px]">
          <img src="/img/logo-recortado.webp" alt="" className="h-[62px] w-auto" />
          <span className="text-[24px] font-semibold leading-[1.2] text-crema">baloncestomanta.com</span>
        </div>
      </footer>
    </div>
  );
});
