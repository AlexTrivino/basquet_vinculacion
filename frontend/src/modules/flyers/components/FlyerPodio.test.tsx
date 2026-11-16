import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PodioDeCategoria, PuestoDelPodio } from '@/modules/partidos';
import { aspectoDeLaFoto, FlyerPodio } from './FlyerPodio';

const TORNEO = { id_torneo: 5, nombre: 'CAMPEONATO NACIONAL INTERCOLEGIAL EXALUMNOS - SEDE MANTA', estado: 'finalizado', fecha_inicio: '2026-10-31', fecha_fin: '2026-11-02' };
const CATEGORIA: PodioDeCategoria['categoria'] = { id_categoria: 9, nombre_categoria: 'INFANTIL +40', genero_categoria: 'masculino' };
const JAVIER = { id_equipo: 1, nombre_equipo: 'COLEGIO JAVIER', url_logo: '/escudo-javier.png' };
const FOTO = { url: '/fotos/javier.webp', ancho: 2400, alto: 1757, foco_x: 30, foco_y: 70, zoom: 1.5 };

const puesto = (extra: Partial<PuestoDelPodio> = {}): PuestoDelPodio => ({
  lugar: 1, equipo: JAVIER, PJ: 6, PG: 6, PP: 0, PF: 328, PC: 202, sellos: ['invicto'],
  partido: { ronda: 'Final', fecha: '2026-11-02', propio: 58, rival: 55, wo: false, equipo_rival: { id_equipo: 2, nombre_equipo: 'SPELLMAN', url_logo: null } },
  foto: null, url_foto_equipo: null, ...extra,
});

function montar(p: PuestoDelPodio = puesto(), extra: Partial<Parameters<typeof FlyerPodio>[0]> = {}) {
  const { container } = render(<FlyerPodio formato="historia" torneo={TORNEO} categoria={CATEGORIA} puesto={p} {...extra} />);
  return container;
}
const flyer = () => screen.getByRole('img', { name: /de INFANTIL \+40:/ });
const imagen = (src: string) => flyer().querySelector(`img[src="${src}"]`) as HTMLImageElement | null;

// jsdom no trae canvas: el flyer mide el texto con uno y sin él estima el ancho
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('FlyerPodio: lo que dice', () => {
  it('lleva los datos reales del puesto: título, categoría, fechas, hecho clave, números y pie', () => {
    montar();
    expect(screen.getByRole('img', { name: 'Campeón de INFANTIL +40: COLEGIO JAVIER' })).toBeInTheDocument();
    for (const linea of ['CAMPEONATO', 'NACIONAL', 'INTERCOLEGIAL', 'EXALUMNOS']) expect(screen.getByText(linea)).toBeInTheDocument();
    expect(screen.getByText(/^Categoría/)).toHaveTextContent('Categoría INFANTIL +40 masculino');
    expect(screen.getByText('31 OCT – 2 NOV 2026')).toBeInTheDocument();
    expect(screen.getByText('CAMPEÓN')).toBeInTheDocument();
    expect(screen.getByText('COLEGIO JAVIER')).toBeInTheDocument();
    expect(screen.getByText('Final · 2 nov')).toBeInTheDocument();
    expect(screen.getByText('58 – 55 ante SPELLMAN')).toBeInTheDocument();
    const cuatro = (rotulo: string) => within(screen.getByText(rotulo).parentElement as HTMLElement).getByText(/^\d+$/).textContent;
    expect([cuatro('Ganados'), cuatro('Perdidos'), cuatro('Pts. a favor'), cuatro('Pts. en contra')]).toEqual(['6', '0', '328', '202']);
    expect(screen.getByText('CAMPEONATO NACIONAL INTERCOLEGIAL EXALUMNOS · SEDE MANTA')).toBeInTheDocument();
    expect(screen.getByText('baloncestomanta.com')).toBeInTheDocument();
  });

  it('el género no se repite si el nombre de la categoría ya lo dice', () => {
    montar(puesto(), { categoria: { ...CATEGORIA, nombre_categoria: '+40 MASCULINO' } });
    expect(screen.getByText(/^Categoría/)).toHaveTextContent(/^Categoría\s*\+40 MASCULINO$/);
  });

  it('el subcampeón con el mejor ataque cuenta sus puntos en lugar de la final', () => {
    montar(puesto({ lugar: 2, sellos: ['mas_puntos'], PF: 342 }));
    expect(screen.getByText('VICECAMPEÓN')).toBeInTheDocument();
    expect(screen.getByText('Mejor ataque del torneo')).toBeInTheDocument();
    expect(screen.getByText('342 puntos en 6 partidos')).toBeInTheDocument();
  });

  it('el tercer lugar lleva su nombre', () => {
    montar(puesto({ lugar: 3 }));
    expect(screen.getByText('TERCER LUGAR')).toBeInTheDocument();
  });
});

describe('FlyerPodio: el héroe', () => {
  it('con foto del podio la pinta recortada alrededor de su foco, con el zoom desde ese mismo punto, y el escudo va de medallón', () => {
    montar(puesto({ foto: FOTO }));
    const foto = imagen('/fotos/javier.webp') as HTMLImageElement;
    expect(foto.style.objectPosition).toBe('30% 70%');
    expect(foto.style.transformOrigin).toBe('30% 70%');
    expect(foto.style.transform).toBe('scale(1.5)');
    expect(imagen('/escudo-javier.png')).not.toBeNull(); // el medallón junto al nombre
  });

  it('sin foto del podio usa la del equipo, centrada y sin zoom', () => {
    montar(puesto({ url_foto_equipo: '/fotos/equipo.jpg' }));
    const foto = imagen('/fotos/equipo.jpg') as HTMLImageElement;
    expect(foto.style.objectPosition).toBe('50% 50%');
    expect(foto.style.transform).toBe('scale(1)');
  });

  it('la foto del podio gana a la del equipo', () => {
    montar(puesto({ foto: FOTO, url_foto_equipo: '/fotos/equipo.jpg' }));
    expect(imagen('/fotos/javier.webp')).not.toBeNull();
    expect(imagen('/fotos/equipo.jpg')).toBeNull();
  });

  it('el encuadre que se está ajustando va en lugar del guardado', () => {
    montar(puesto({ foto: FOTO }), { encuadre: { foco_x: 10, foco_y: 20, zoom: 2 } });
    const foto = imagen('/fotos/javier.webp') as HTMLImageElement;
    expect(foto.style.objectPosition).toBe('10% 20%');
    expect(foto.style.transform).toBe('scale(2)');
  });

  it('sin ninguna foto el héroe es el escudo, una sola vez y sin recorte', () => {
    montar();
    const escudos = [...flyer().querySelectorAll('img')].filter((i) => i.getAttribute('src') === '/escudo-javier.png');
    expect(escudos).toHaveLength(1);
    expect(escudos[0].style.objectPosition).toBe('');
  });

  it('sin foto ni escudo queda el escudo genérico en su lugar', () => {
    const contenedor = montar(puesto({ equipo: { ...JAVIER, url_logo: null } }));
    // solo quedan las imágenes fijas del flyer (fondo, copa, marca): ninguna del equipo
    expect([...flyer().querySelectorAll('img')].every((i) => i.getAttribute('src')?.startsWith('/img/'))).toBe(true);
    expect(contenedor.querySelector('svg')).not.toBeNull();
  });
});

describe('FlyerPodio: los formatos', () => {
  it('estados mide 1080 × 1920 y redes 1080 × 1350', () => {
    const { unmount } = render(<FlyerPodio formato="historia" torneo={TORNEO} categoria={CATEGORIA} puesto={puesto()} />);
    expect(flyer()).toHaveStyle({ width: '1080px', height: '1920px' });
    unmount();
    render(<FlyerPodio formato="feed" torneo={TORNEO} categoria={CATEGORIA} puesto={puesto()} />);
    expect(flyer()).toHaveStyle({ width: '1080px', height: '1350px' });
  });

  it('el editor de recorte usa la proporción del marco de la foto de cada formato', () => {
    expect(aspectoDeLaFoto('historia')).toBeCloseTo(1080 / 760);
    expect(aspectoDeLaFoto('feed')).toBeCloseTo(1080 / 610);
  });
});
