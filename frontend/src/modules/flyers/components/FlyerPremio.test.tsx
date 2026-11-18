import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FiguraFlyer, FinalDeCategoria, PremiosDeCategoria, TipoPremio } from '../api/flyers.api';
import { aspectoDelPremio, FlyerPremio } from './FlyerPremio';
import { PREMIOS } from '../textosPremio';

const TORNEO = { id_torneo: 5, nombre: 'CAMPEONATO NACIONAL INTERCOLEGIAL EXALUMNOS - SEDE MANTA', estado: 'finalizado', fecha_inicio: '2026-10-31', fecha_fin: '2026-11-02' };
const CATEGORIA: PremiosDeCategoria['categoria'] = { id_categoria: 9, nombre_categoria: 'INFANTIL +40', genero_categoria: 'masculino' };
const JAVIER = { id_equipo: 1, nombre_equipo: 'COLEGIO JAVIER', url_logo: '/escudo-javier.png' };
const SPELLMAN = { id_equipo: 2, nombre_equipo: 'SPELLMAN', url_logo: null };
const FINAL: FinalDeCategoria = { id_partido: 99, ronda: 'Final', fecha: '2026-11-02', campeon: { ...JAVIER, marcador: 58 }, vice: { ...SPELLMAN, marcador: 55 } };
const FOTO = { url: '/fotos/premio.webp', ancho: 2400, alto: 1757, foco_x: 30, foco_y: 70, zoom: 1.5 };
const COMPLETA = { puntos: 18, triples: 2, rebotes: 7, asistencias: 3, tapones: 4, tiros_libres: 5 };

// El dorsal (23) no coincide con ninguna cifra de la línea para encontrarlo en el flyer sin confundirlo
const figura = (extra: Partial<FiguraFlyer> = {}, linea: Partial<FiguraFlyer['linea']> = {}): FiguraFlyer => ({
  jugador: { id_jugador: 1, nombre: 'Bryan Chávez', url_foto: null, numero_camiseta: 23 },
  equipo: JAVIER,
  categoria: null,
  linea: { ...COMPLETA, ...linea },
  valoracion: 32,
  ...extra,
});

function montar(tipo: TipoPremio, f: FiguraFlyer = figura(), extra: Partial<Parameters<typeof FlyerPremio>[0]> = {}) {
  return render(<FlyerPremio formato="historia" tipo={tipo} torneo={TORNEO} categoria={CATEGORIA} final={FINAL} figura={f} foto={null} {...extra} />);
}
const flyer = () => screen.getByRole('img', { name: /de INFANTIL \+40:/ });
const imagen = (src: string) => flyer().querySelector(`img[src="${src}"]`) as HTMLImageElement | null;
// Los números del flyer: [rótulo, valor] en el orden en que se leen
const numeros = () => [...flyer().querySelectorAll('dl > div')].map((d) => [d.querySelector('dt')?.textContent, d.querySelector('dd')?.textContent]);

// jsdom no trae canvas: el flyer mide el texto con uno y sin él estima el ancho
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('FlyerPremio: MVP de la final', () => {
  it('lleva el premio, el jugador, el resultado de la final y sus cinco números del partido', () => {
    montar('mvp');
    expect(screen.getByRole('img', { name: 'MVP de la final de INFANTIL +40: BRYAN CHÁVEZ' })).toBeInTheDocument();
    expect(screen.getByText('MVP')).toBeInTheDocument();
    expect(screen.getByText('Jugador más valioso')).toBeInTheDocument();
    expect(screen.getByText('BRYAN CHÁVEZ')).toBeInTheDocument(); // el nombre sale en mayúsculas aunque llegue en minúsculas
    expect(screen.getByText('Final · 2 nov')).toBeInTheDocument();
    expect(screen.getByText('58 – 55 ante SPELLMAN')).toBeInTheDocument();
    expect(numeros()).toEqual([['Puntos', '18'], ['Triples', '2'], ['Rebotes', '7'], ['Asistencias', '3'], ['Tapones', '4']]); // sin tiros libres
    expect(screen.getByText('CAMPEONATO NACIONAL INTERCOLEGIAL EXALUMNOS · SEDE MANTA')).toBeInTheDocument();
  });

  it('un número en 0 no sale: la franja se reparte entre los que quedan', () => {
    montar('mvp', figura({}, { triples: 0, asistencias: 0 }));
    expect(numeros()).toEqual([['Puntos', '18'], ['Rebotes', '7'], ['Tapones', '4']]);
    expect((flyer().querySelector('dl') as HTMLElement).style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
  });

  it('un MVP sin ninguna cifra queda sin franja de números en lugar de una fila de ceros', () => {
    montar('mvp', figura({}, { puntos: 0, triples: 0, rebotes: 0, asistencias: 0, tapones: 0 }));
    expect(flyer().querySelector('dl')).toBeNull();
    expect(screen.getByRole('img', { name: 'MVP de la final de INFANTIL +40: BRYAN CHÁVEZ' })).toBeInTheDocument();
  });
});

describe('FlyerPremio: mejor defensa de la final', () => {
  it('lleva solo los rebotes y los tapones de la final, bajo «Mejor DEFENSA»', () => {
    montar('defensa');
    expect(screen.getByRole('img', { name: 'Mejor defensa de la final de INFANTIL +40: BRYAN CHÁVEZ' })).toBeInTheDocument();
    expect(screen.getByText('Mejor')).toBeInTheDocument();
    expect(screen.getByText('DEFENSA')).toBeInTheDocument();
    expect(numeros()).toEqual([['Rebotes', '7'], ['Tapones', '4']]);
    expect(screen.queryByText('Puntos')).not.toBeInTheDocument();
    // con dos columnas las cifras crecen: hay sitio
    expect(flyer().querySelector('dd')).toHaveStyle({ fontSize: '80px' });
  });

  it('un jugador del subcampeón cuenta la final desde su lado: su marcador va primero', () => {
    montar('defensa', figura({ equipo: SPELLMAN }));
    expect(screen.getByText('55 – 58 ante COLEGIO JAVIER')).toBeInTheDocument();
  });

  it('con 0 tapones solo queda el rebote, y sin ninguno de los dos no hay franja', () => {
    const { unmount } = montar('defensa', figura({}, { tapones: 0 }));
    expect(numeros()).toEqual([['Rebotes', '7']]);
    unmount();
    montar('defensa', figura({}, { rebotes: 0, tapones: 0 }));
    expect(flyer().querySelector('dl')).toBeNull();
  });
});

describe('FlyerPremio: el héroe', () => {
  it('con foto del premio la pinta recortada alrededor de su foco, con el zoom desde ese punto, y el dorsal no se superpone', () => {
    montar('mvp', figura(), { foto: FOTO });
    const foto = imagen('/fotos/premio.webp') as HTMLImageElement;
    expect(foto.style.objectPosition).toBe('30% 70%');
    expect(foto.style.transformOrigin).toBe('30% 70%');
    expect(foto.style.transform).toBe('scale(1.5)');
    expect(screen.queryByText('23')).not.toBeInTheDocument();
  });

  it('el escudo del equipo va de medallón junto al nombre', () => {
    montar('mvp', figura(), { foto: FOTO });
    expect(imagen('/escudo-javier.png')).not.toBeNull();
  });

  it('el encuadre que se está ajustando va en lugar del guardado', () => {
    montar('mvp', figura(), { foto: FOTO, encuadre: { foco_x: 10, foco_y: 20, zoom: 2 } });
    const foto = imagen('/fotos/premio.webp') as HTMLImageElement;
    expect(foto.style.objectPosition).toBe('10% 20%');
    expect(foto.style.transform).toBe('scale(2)');
  });

  it('sin foto del premio usa la de la ficha del jugador, entera: sin desvanecer y sin el dorsal encima', () => {
    montar('mvp', figura({ jugador: { id_jugador: 1, nombre: 'Bryan Chávez', url_foto: '/fotos/ficha.jpg', numero_camiseta: 23 } }));
    const ficha = imagen('/fotos/ficha.jpg') as HTMLImageElement;
    expect(ficha).not.toBeNull();
    expect(screen.queryByText('23')).not.toBeInTheDocument();
    expect(ficha.closest('[class*="mask-image"]')).toBeNull();
  });

  it('la foto del premio tampoco se desvanece: se ve entera dentro de su marco', () => {
    montar('mvp', figura(), { foto: FOTO });
    expect((imagen('/fotos/premio.webp') as HTMLImageElement).closest('[class*="mask-image"]')).toBeNull();
  });

  it('la foto del premio gana a la de la ficha', () => {
    montar('mvp', figura({ jugador: { id_jugador: 1, nombre: 'Bryan Chávez', url_foto: '/fotos/ficha.jpg', numero_camiseta: 23 } }), { foto: FOTO });
    expect(imagen('/fotos/premio.webp')).not.toBeNull();
    expect(imagen('/fotos/ficha.jpg')).toBeNull();
  });

  it('sin ninguna foto el héroe es la silueta delante de su dorsal gigante, sin imágenes del jugador', () => {
    montar('defensa');
    expect(screen.getByText('23')).toBeInTheDocument();
    expect([...flyer().querySelectorAll('img')].filter((i) => i.getAttribute('src')?.startsWith('/fotos/'))).toHaveLength(0);
    expect(flyer().querySelector('svg')).not.toBeNull();
  });

  it('sin equipo ni escudo queda el escudo genérico, sin romper el flyer', () => {
    montar('defensa', figura({ equipo: null }));
    expect(screen.getByText('58 – 55 ante SPELLMAN')).toBeInTheDocument(); // sin equipo conocido se cuenta desde el campeón
    expect(imagen('/escudo-javier.png')).toBeNull();
  });
});

// Lo que pidió el admin: que ni el rótulo ni la palabra tapen la foto. Cada pieza tiene su renglón, de arriba abajo.
describe('FlyerPremio: la foto no se tapa', () => {
  const arriba = (e: HTMLElement) => parseFloat(e.style.top);
  const flyerDe = (formato: 'feed' | 'historia', tipo: TipoPremio) =>
    render(<FlyerPremio formato={formato} tipo={tipo} torneo={TORNEO} categoria={CATEGORIA} final={FINAL} figura={figura()} foto={FOTO} />);

  it.each([['feed', 'mvp'], ['feed', 'defensa'], ['historia', 'mvp'], ['historia', 'defensa']] as const)(
    'en %s, el %s: rótulo, palabra, foto y nombre van uno bajo otro, sin pisarse',
    (formato, tipo) => {
      flyerDe(formato, tipo);
      const rotulo = screen.getByText(PREMIOS[tipo].encima).parentElement as HTMLElement;
      const palabra = screen.getByText(PREMIOS[tipo].palabra);
      const heroe = screen.getByTestId('heroe');
      const nombre = screen.getByText('BRYAN CHÁVEZ').parentElement as HTMLElement;
      const encabezado = flyer().querySelector('header') as HTMLElement;

      expect(arriba(encabezado) + parseFloat(encabezado.style.height)).toBeLessThan(arriba(rotulo));
      expect(arriba(rotulo)).toBeLessThan(arriba(palabra));
      expect(arriba(palabra) + 0.9 * parseFloat(palabra.style.fontSize)).toBeLessThanOrEqual(arriba(heroe)); // la palabra termina donde empieza la foto
      expect(arriba(heroe) + parseFloat(heroe.style.height)).toBeLessThanOrEqual(arriba(nombre));
    }
  );

  it('el marco de la foto del premio es el que enseña el editor de recorte', () => {
    expect(aspectoDelPremio('feed')).toBeCloseTo(936 / 452);
    expect(aspectoDelPremio('historia')).toBeCloseTo(936 / 636);
  });

  it('el encabezado lleva la categoría con su género y las fechas del campeonato, junto a la copa', () => {
    flyerDe('feed', 'mvp');
    const encabezado = flyer().querySelector('header') as HTMLElement;
    expect(encabezado).toHaveTextContent('Categoría');
    expect(encabezado).toHaveTextContent('INFANTIL +40 MASCULINO');
    expect(encabezado).toHaveTextContent('31 OCT – 2 NOV 2026');
    expect(encabezado.querySelector('img[src="/img/logo-copa-intercolegial.webp"]')).not.toBeNull();
  });

  it('un género que la categoría ya dice no se repite', () => {
    const { container } = render(<FlyerPremio formato="feed" tipo="mvp" torneo={TORNEO} categoria={{ ...CATEGORIA, nombre_categoria: 'JUNIOR +50 MASCULINO', genero_categoria: 'masculino' }} final={FINAL} figura={figura()} foto={null} />);
    const encabezado = container.querySelector('header') as HTMLElement;
    expect(encabezado).toHaveTextContent('JUNIOR +50 MASCULINO');
    expect(encabezado).not.toHaveTextContent('MASCULINO MASCULINO');
  });
});

describe('FlyerPremio: nombres largos y formatos', () => {
  it('un nombre largo se achica para caber en una línea, sin cortarse', () => {
    const { unmount } = montar('mvp');
    const corto = parseFloat((screen.getByText('BRYAN CHÁVEZ').parentElement as HTMLElement).style.fontSize);
    unmount();
    const largo = 'Juan Sebastián Rodríguez-Maldonado de la Torre';
    montar('mvp', figura({ jugador: { id_jugador: 2, nombre: largo, url_foto: null, numero_camiseta: 5 } }));
    const alto = screen.getByText(largo.toUpperCase());
    expect(alto).toBeInTheDocument(); // entero: ni puntos suspensivos ni recorte
    expect(parseFloat((alto.parentElement as HTMLElement).style.fontSize)).toBeLessThan(corto);
  });

  it('estados mide 1080 × 1920 y redes 1080 × 1350', () => {
    const { unmount } = montar('mvp');
    expect(flyer()).toHaveStyle({ width: '1080px', height: '1920px' });
    unmount();
    render(<FlyerPremio formato="feed" tipo="mvp" torneo={TORNEO} categoria={CATEGORIA} final={FINAL} figura={figura()} foto={null} />);
    expect(flyer()).toHaveStyle({ width: '1080px', height: '1350px' });
  });

  it('los dos formatos llevan lo mismo: premio, jugador y números', () => {
    render(<FlyerPremio formato="feed" tipo="defensa" torneo={TORNEO} categoria={CATEGORIA} final={FINAL} figura={figura()} foto={FOTO} />);
    expect(screen.getByRole('img', { name: 'Mejor defensa de la final de INFANTIL +40: BRYAN CHÁVEZ' })).toBeInTheDocument();
    expect(numeros()).toEqual([['Rebotes', '7'], ['Tapones', '4']]);
  });
});
