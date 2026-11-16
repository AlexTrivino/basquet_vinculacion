import { useEffect, useState } from 'react';

// Tamaño de letra con el que `texto` mide `ancho` px, sin pasar de `tope`: para los títulos que llenan su caja.
// Se mide en un canvas, no en el DOM: la vista previa del flyer está escalada con un transform y el DOM mediría
// el tamaño reducido. Sin canvas (pruebas) se estima un ancho medio por letra.
let lienzo: HTMLCanvasElement | undefined;

export function tamanoParaAncho(texto: string, ancho: number, tope: number, fuente = '700 100px Cinzel') {
  const ctx = (lienzo ??= document.createElement('canvas')).getContext('2d');
  if (ctx) ctx.font = fuente;
  const medido = ctx ? ctx.measureText(texto).width : texto.length * 75;
  return Math.min(tope, medido > 0 ? (100 * ancho) / medido : tope);
}

// Medir con la fuente de reserva da otro tamaño: el componente que mide se vuelve a dibujar cuando la fuente baja
export function useFuente(fuente = '700 100px Cinzel') {
  const [lista, setLista] = useState(!document.fonts);
  useEffect(() => {
    let vivo = true;
    document.fonts?.load(fuente).then(() => vivo && setLista(true), () => {});
    return () => {
      vivo = false;
    };
  }, [fuente]);
  return lista;
}
