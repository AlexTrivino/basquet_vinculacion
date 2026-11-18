import { forwardRef } from 'react';
import type { FotoDelPodio } from '@/modules/partidos';
import type { Encuadre, FiguraFlyer, FinalDeCategoria, PremiosDeCategoria, PremiosDelTorneo, TipoPremio } from '../api/flyers.api';
import { CENTRADO, encuadreDe } from '../foto';
import { numerosDelPremio, PREMIOS, resultadoDeLaFinal } from '../textosPremio';
import { HeroeFigura, type Formato } from './Flyer';
import { FotoHeroe, MarcoPodio } from './FlyerPodio';

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

// El flyer del MVP o del mejor defensa de la final: el armazón del podio con la palabra del premio sobre la foto, el
// jugador con el escudo de su equipo, el resultado de la final y sus números del partido. Héroe: la foto del premio
// y, si no la hay, la de la ficha del jugador o su silueta con el dorsal, como en los flyers de figuras.
export const FlyerPremio = forwardRef<HTMLDivElement, Props>(function FlyerPremio({ formato, tipo, torneo, categoria, final, figura, foto, encuadre }, ref) {
  const premio = PREMIOS[tipo];
  const nombre = figura.jugador.nombre.toUpperCase();
  const marco = encuadre ?? (foto ? encuadreDe(foto) : CENTRADO);

  return (
    <MarcoPodio
      ref={ref}
      formato={formato}
      torneo={torneo}
      categoria={categoria}
      etiqueta={`${premio.nombre} de ${categoria.nombre_categoria}: ${nombre}`}
      heroe={
        foto ? (
          <FotoHeroe url={foto.url} {...marco} />
        ) : (
          <div className="pt-[24px]">
            <HeroeFigura figura={figura} formato={formato} />
          </div>
        )
      }
      palabra={{ texto: premio.palabra, encima: premio.encima, tope: premio.tope }}
      nombre={{ texto: nombre, escudo: figura.equipo?.url_logo ?? null }}
      gancho={resultadoDeLaFinal(final, figura.equipo?.id_equipo)}
      numeros={numerosDelPremio(tipo, figura.linea).map((n) => [n.etiqueta, n.valor] as const)}
    />
  );
});
