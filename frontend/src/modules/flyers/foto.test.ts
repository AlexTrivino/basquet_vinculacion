import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FotoDelPodio } from '@/modules/partidos';
import { CENTRADO, encuadreDe, LADO_MAXIMO, MAX_ORIGINAL, medidasReducidas, prepararFoto, revisarArchivo, revisarMedidas } from './foto';

const MB = 1024 * 1024;

// Un archivo con el peso que se pide, sin gastar esa memoria
const archivo = (peso: number, tipo = 'image/jpeg', nombre = 'foto.jpg') => {
  const f = new File(['x'], nombre, { type: tipo });
  Object.defineProperty(f, 'size', { value: peso });
  return f;
};

// El navegador decodifica con createImageBitmap y redibuja en un canvas; jsdom no trae ninguno de los dos.
// `pesos` es lo que pesa el JPEG que sale en cada intento de calidad.
function simular(ancho: number, alto: number, pesos: number[] = [MB]) {
  const imagen = { width: ancho, height: alto, close: vi.fn() };
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(imagen));
  const ctx = { fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: '' };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
  const calidades: number[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((alTerminar, _tipo, calidad) => {
    calidades.push(calidad as number);
    alTerminar(new Blob([new Uint8Array(pesos[Math.min(calidades.length, pesos.length) - 1])], { type: 'image/jpeg' }));
  });
  return { imagen, ctx, calidades };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('foto del podio: lo que se revisa antes de subir', () => {
  it('acepta JPG, PNG y WebP y rechaza otros tipos y lo que pesa más de 15 MB', () => {
    for (const tipo of ['image/jpeg', 'image/png', 'image/webp']) expect(() => revisarArchivo(archivo(MB, tipo))).not.toThrow();
    expect(() => revisarArchivo(archivo(MAX_ORIGINAL))).not.toThrow();
    expect(() => revisarArchivo(archivo(MB, 'image/gif'))).toThrow('Esa foto es de un tipo que no se puede usar. Elige una JPG, PNG o WebP.');
    expect(() => revisarArchivo(archivo(MB, ''))).toThrow(/tipo que no se puede usar/);
    expect(() => revisarArchivo(archivo(20 * MB))).toThrow('La foto pesa 20,0 MB y el máximo es 15,0 MB.');
  });

  it('pide al menos 1080 × 608 px, que es lo que llena el héroe del flyer sin verse borroso', () => {
    expect(() => revisarMedidas(1080, 608)).not.toThrow();
    expect(() => revisarMedidas(900, 500)).toThrow('La foto mide 900 × 500 px y el mínimo es 1080 × 608 px: en el flyer se vería borrosa.');
    expect(() => revisarMedidas(1079, 2000)).toThrow(/1079 × 2000/);
    expect(() => revisarMedidas(2000, 607)).toThrow(/2000 × 607/);
  });

  it('reduce el lado mayor a 2560 px y nunca agranda', () => {
    expect(LADO_MAXIMO).toBe(2560);
    expect(medidasReducidas(4000, 3000)).toEqual({ ancho: 2560, alto: 1920 });
    expect(medidasReducidas(3000, 4500)).toEqual({ ancho: 1707, alto: 2560 });
    expect(medidasReducidas(2400, 1757)).toEqual({ ancho: 2400, alto: 1757 });
    expect(medidasReducidas(1080, 608)).toEqual({ ancho: 1080, alto: 608 });
  });

  it('el encuadre es solo foco y zoom: lo único que el editor mueve y el servidor acepta', () => {
    const foto: FotoDelPodio = { url: '/f.jpg', ancho: 2400, alto: 1757, foco_x: 30, foco_y: 70, zoom: 1.5 };
    expect(encuadreDe(foto)).toEqual({ foco_x: 30, foco_y: 70, zoom: 1.5 });
    expect(Object.keys(encuadreDe(foto))).toEqual(['foco_x', 'foco_y', 'zoom']);
    expect(CENTRADO).toEqual({ foco_x: 50, foco_y: 50, zoom: 1 });
  });
});

describe('prepararFoto', () => {
  it('una foto que ya cabe (tipo, peso y medidas) sube tal cual, sin pasar por el canvas', async () => {
    const { imagen, calidades } = simular(2400, 1757);
    const original = archivo(MB);
    const { archivo: listo, aviso } = await prepararFoto(original);
    expect(listo).toBe(original);
    expect(aviso).toBeNull();
    expect(calidades).toEqual([]);
    expect(imagen.close).toHaveBeenCalled();
  });

  it('avisa de la foto vertical y la deja subir', async () => {
    simular(1200, 1800);
    const { archivo: listo, aviso } = await prepararFoto(archivo(MB));
    expect(aviso).toContain('La foto es vertical');
    expect(listo.size).toBe(MB);
  });

  it('una foto de más de 4 MB o de más de 2560 px se redibuja a 2560 px en JPEG', async () => {
    const { ctx, calidades, imagen } = simular(4000, 3000, [2 * MB]);
    const { archivo: listo } = await prepararFoto(archivo(6 * MB, 'image/png', 'equipo.png'));
    expect(ctx.drawImage).toHaveBeenCalledWith(imagen, 0, 0, 2560, 1920);
    expect(ctx.fillStyle).toBe('#081226'); // el marino del flyer, por si la foto trae transparencias
    expect(calidades).toEqual([0.88]);
    expect(listo.name).toBe('equipo.jpg');
    expect(listo.type).toBe('image/jpeg');
    expect(listo.size).toBe(2 * MB);
  });

  it('una foto liviana pero de más de 2560 px también se reduce', async () => {
    const { ctx } = simular(5000, 2500, [MB]);
    await prepararFoto(archivo(MB));
    expect(ctx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2560, 1280);
  });

  it('si a calidad 0,88 sigue pasando de 4 MB, prueba con 0,7', async () => {
    const { calidades } = simular(4000, 3000, [5 * MB, 3 * MB]);
    const { archivo: listo } = await prepararFoto(archivo(9 * MB));
    expect(calidades).toEqual([0.88, 0.7]);
    expect(listo.size).toBe(3 * MB);
  });

  it('si aun así pesa de más, la rechaza con un mensaje que se entiende', async () => {
    simular(4000, 3000, [5 * MB, 5 * MB]);
    await expect(prepararFoto(archivo(9 * MB))).rejects.toThrow('La foto pesa demasiado aun reducida. Prueba con otra.');
  });

  it('rechaza lo que no es una foto, lo que mide poco y lo que no se puede leer', async () => {
    const { imagen } = simular(900, 500);
    await expect(prepararFoto(archivo(MB, 'application/pdf'))).rejects.toThrow(/tipo que no se puede usar/);
    expect(imagen.close).not.toHaveBeenCalled(); // ni siquiera se decodificó

    await expect(prepararFoto(archivo(MB))).rejects.toThrow('La foto mide 900 × 500 px y el mínimo es 1080 × 608 px');
    expect(imagen.close).toHaveBeenCalled(); // la imagen se libera aunque falle

    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('corrupta')));
    await expect(prepararFoto(archivo(MB))).rejects.toThrow('No se pudo leer la foto: el archivo está dañado o no es una imagen.');
  });

  it('sin canvas no se puede reducir y lo dice', async () => {
    simular(4000, 3000);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await expect(prepararFoto(archivo(6 * MB))).rejects.toThrow('No se pudo leer la foto');
  });
});
