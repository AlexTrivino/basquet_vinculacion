import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/shared/api/axios.config';
import { ajustarFotoPodio, clavePodios, quitarFotoPodio, subirFotoPodio } from './flyers.api';

vi.mock('@/shared/api/axios.config', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const respuesta = { success: true, message: 'ok', data: null };

describe('API de la foto del podio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const metodo of ['post', 'patch', 'delete'] as const) vi.mocked(axiosInstance[metodo]).mockResolvedValue({ data: respuesta });
  });

  it('subir manda la foto en el campo «foto» de un multipart, a la ruta del equipo en la categoría', async () => {
    const foto = new File(['abc'], 'javier.jpg', { type: 'image/jpeg' });
    expect(await subirFotoPodio(9, 1, foto)).toBe(respuesta);
    const [ruta, cuerpo] = vi.mocked(axiosInstance.post).mock.calls[0];
    expect(ruta).toBe('/torneos/categorias/9/podio/1/foto');
    expect(cuerpo).toBeInstanceOf(FormData);
    expect((cuerpo as FormData).get('foto')).toBe(foto);
    expect([...(cuerpo as FormData).keys()]).toEqual(['foto']);
  });

  it('ajustar manda foco_x, foco_y y zoom, y nada más aunque le pasen el dato completo de la foto', async () => {
    const completo = { url: '/f.jpg', ancho: 2400, alto: 1757, foco_x: 31, foco_y: 70, zoom: 1.5 };
    await ajustarFotoPodio(9, 1, completo);
    expect(axiosInstance.patch).toHaveBeenCalledWith('/torneos/categorias/9/podio/1/foto', { foco_x: 31, foco_y: 70, zoom: 1.5 });
  });

  it('quitar borra la foto de ese equipo en esa categoría', async () => {
    await quitarFotoPodio(9, 3);
    expect(axiosInstance.delete).toHaveBeenCalledWith('/torneos/categorias/9/podio/3/foto');
  });

  it('los podios de cada torneo tienen su propia clave de caché', () => {
    expect(clavePodios(5)).toEqual(['flyers', 'podios', 5]);
    expect(clavePodios(5)).not.toEqual(clavePodios(7));
  });
});
