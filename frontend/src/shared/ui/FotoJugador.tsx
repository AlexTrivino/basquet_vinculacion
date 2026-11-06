import type { ImgHTMLAttributes } from 'react';

// Silueta en blanco y negro para los jugadores sin foto (o cuya foto no carga)
export const SILUETA_JUGADOR = '/img/jugador-silueta.svg';

type FotoJugadorProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { url?: string | null };

export function FotoJugador({ url, alt = '', ...img }: FotoJugadorProps) {
  return (
    <img
      {...img}
      src={url || SILUETA_JUGADOR}
      alt={alt}
      onError={(e) => {
        if (!e.currentTarget.src.endsWith(SILUETA_JUGADOR)) e.currentTarget.src = SILUETA_JUGADOR;
      }}
    />
  );
}
