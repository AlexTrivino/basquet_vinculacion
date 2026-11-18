import { forwardRef, useMemo } from 'react';
import type { FotoDelPodio } from '@/modules/partidos';
import type { Encuadre, FiguraFlyer, FinalDeCategoria, PremiosDeCategoria, PremiosDelTorneo, TipoPremio } from '../api/flyers.api';
import { tamanoParaAncho, useFuente } from '../ajuste';
import { CENTRADO, encuadreDe } from '../foto';
import { fechasDelTorneo } from '../textosPodio';
import { numerosDelPremio, PREMIOS, resultadoDeLaFinal } from '../textosPremio';
import { HeroeFigura, type Formato } from './Flyer';
import { FotoHeroe, MarcoBase, MEDIDAS } from './FlyerPodio';

// Posición (px del lienzo de 1080) de lo de arriba del flyer de un premio, de arriba abajo y sin que nada se pise: el
// encabezado con la categoría, las fechas y la copa; el rótulo; la palabra; y la foto, que llega hasta 18 px antes
// del nombre. De ahí para abajo es el armazón del podio (MarcoBase). En estados, los 250 px de arriba quedan libres.
const ARRIBA = {
  historia: { cab: 250, rotulo: 392, palabra: 448, foto: 614 },
  feed: { cab: 56, rotulo: 198, palabra: 254, foto: 416 },
} as const;
const CAB_ALTO = 124;
const COPA = 180; // ancho de la copa del encabezado
const ANCHO_CATEGORIA = 944 - COPA - 24; // lo que deja la copa al texto de su izquierda
const ANCHO_FOTO = 936;

const altoDeLaFoto = (formato: Formato) => MEDIDAS[formato].equipo - 18 - ARRIBA[formato].foto;

// Proporción del marco de la foto del premio en cada formato: el editor de recorte la usa para mostrar lo mismo que el flyer
export const aspectoDelPremio = (formato: Formato) => ANCHO_FOTO / altoDeLaFoto(formato);

interface Props {
  formato: Formato;
  tipo: TipoPremio;
  torneo: PremiosDelTorneo['torneo'];
  categoria: PremiosDeCategoria['categoria'];
  final: FinalDeCategoria;
  figura: FiguraFlyer; // el jugador premiado y sus números de la final
  foto: FotoDelPodio | null; // la que el admin subió para el premio
  encuadre?: Encuadre; // el que se está ajustando: va en lugar del guardado
}

// El flyer del MVP o del mejor defensa de la final. La foto va entera, en su marco y sin nada encima: arriba, la
// categoría y la copa; bajo ellos, el rótulo y la palabra del premio; bajo la foto, el jugador con el escudo de su
// equipo, el resultado de la final y sus números del partido. Héroe: la foto del premio y, si no la hay, la de la ficha
// del jugador o su silueta con el dorsal, como en los flyers de figuras.
export const FlyerPremio = forwardRef<HTMLDivElement, Props>(function FlyerPremio({ formato, tipo, torneo, categoria, final, figura, foto, encuadre }, ref) {
  const premio = PREMIOS[tipo];
  const a = ARRIBA[formato];
  const alto = altoDeLaFoto(formato);
  const fuenteLista = useFuente();
  const nombre = figura.jugador.nombre.toUpperCase();
  const marco = encuadre ?? (foto ? encuadreDe(foto) : CENTRADO);
  const generoYaDicho = categoria.nombre_categoria.toLowerCase().includes(categoria.genero_categoria.toLowerCase());
  const nombreDeLaCategoria = (generoYaDicho ? categoria.nombre_categoria : `${categoria.nombre_categoria} ${categoria.genero_categoria}`).toUpperCase();

  // El texto llena su caja: la categoría y la palabra del premio, hasta su tope
  const tamanos = useMemo(
    () => ({ categoria: tamanoParaAncho(nombreDeLaCategoria, ANCHO_CATEGORIA, 52), palabra: tamanoParaAncho(premio.palabra, 940, premio.tope) }),
    // fuenteLista está en las dependencias para medir otra vez cuando baja Cinzel
    [fuenteLista, nombreDeLaCategoria, premio.palabra, premio.tope]
  );

  return (
    <MarcoBase
      ref={ref}
      formato={formato}
      torneo={torneo}
      etiqueta={`${premio.nombre} de ${categoria.nombre_categoria}: ${nombre}`}
      nombre={{ texto: nombre, escudo: figura.equipo?.url_logo ?? null }}
      gancho={resultadoDeLaFinal(final, figura.equipo?.id_equipo)}
      numeros={numerosDelPremio(tipo, figura.linea).map((n) => [n.etiqueta, n.valor] as const)}
    >
      <header className="absolute flex items-center justify-between gap-[24px]" style={{ left: 72, right: 64, top: a.cab, height: CAB_ALTO }}>
        <div className="min-w-0">
          <p className="text-[22px] font-semibold uppercase leading-[1.2] tracking-[0.24em] text-oro">Categoría</p>
          <p className="mt-[6px] whitespace-nowrap font-display font-bold leading-[1.1] text-crema [text-shadow:0_6px_30px_rgb(8_18_38/0.9)]" style={{ fontSize: tamanos.categoria }}>
            {nombreDeLaCategoria}
          </p>
          <p className="mt-[6px] text-[23px] font-semibold uppercase leading-[1.2] tracking-[0.18em] text-crema/85">{fechasDelTorneo(torneo.fecha_inicio, torneo.fecha_fin)}</p>
        </div>
        <img src="/img/logo-copa-intercolegial.webp" alt="" className="shrink-0 [filter:drop-shadow(0_18px_36px_rgb(0_0_0/0.55))]" style={{ width: COPA }} />
      </header>

      {/* Un rótulo con fondo, como en el podio. El espacio que deja el tracking a la derecha se compensa a la izquierda
          para que el texto quede centrado. */}
      <div className="absolute inset-x-0 flex justify-center" style={{ top: a.rotulo }}>
        <span
          className="rounded-full border-[1.5px] border-oro/70 bg-marino/85 py-[9px] pr-[30px] text-[26px] font-semibold uppercase leading-[1.25] tracking-[0.3em] text-oro"
          style={{ paddingLeft: 'calc(30px + 0.3em)' }}
        >
          {premio.encima}
        </span>
      </div>
      <p
        className="absolute inset-x-0 text-center font-display font-bold leading-[0.9] text-crema [text-shadow:0_6px_30px_rgb(8_18_38/0.95),0_2px_0_rgb(8_18_38/0.7)]"
        style={{ top: a.palabra, fontSize: tamanos.palabra }}
      >
        {premio.palabra}
      </p>

      <div
        data-testid="heroe"
        className={`absolute ${foto ? 'overflow-hidden rounded-[28px] bg-marino-claro ring-1 ring-oro/35' : ''}`}
        style={{ left: (1080 - ANCHO_FOTO) / 2, width: ANCHO_FOTO, top: a.foto, height: alto }}
      >
        {foto ? <FotoHeroe url={foto.url} limpia {...marco} /> : <HeroeFigura figura={figura} formato={formato} alto={alto} limpia />}
      </div>
    </MarcoBase>
  );
});
