import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTorneosAdmin } from '@/shared/api/catalogo';
import { getPartidosByTorneo, getPodiosDelTorneo, type PodiosDelTorneo } from '@/modules/partidos';
import { ajustarFotoPodio, getDatosFlyers, quitarFotoPodio, subirFotoPodio } from '../api/flyers.api';
import { EstudioFlyers } from './EstudioFlyers';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/shared/api/catalogo');
vi.mock('@/modules/partidos/api/partidos.api');
vi.mock('../api/flyers.api', async (original) => ({
  ...(await original<typeof import('../api/flyers.api')>()),
  getDatosFlyers: vi.fn(),
  subirFotoPodio: vi.fn(),
  ajustarFotoPodio: vi.fn(),
  quitarFotoPodio: vi.fn(),
}));

const equipo = (id: number, nombre: string) => ({ id_equipo: id, nombre_equipo: nombre, url_logo: null });
const JAVIER = equipo(1, 'COLEGIO JAVIER');
const SPELLMAN = equipo(2, 'SPELLMAN');
const ANDINO = equipo(3, 'ANDINO 2.0');
const PIERREGROSSE = equipo(4, 'JULIO PIERREGROSSE');
const FOTO = { url: '/fotos/javier.webp', ancho: 2400, alto: 1757, foco_x: 30, foco_y: 70, zoom: 1.5 };

const TORNEO = { id_torneo: 5, nombre: 'CAMPEONATO NACIONAL INTERCOLEGIAL EXALUMNOS - SEDE MANTA', estado: 'finalizado', fecha_inicio: '2026-10-31', fecha_fin: '2026-11-02' };
const partido = (ronda: string, propio: number, rival: number, contra: typeof JAVIER) => ({ ronda, fecha: '2026-11-02', propio, rival, wo: false, equipo_rival: contra });

const podios = (fotoDeJavier: typeof FOTO | null): PodiosDelTorneo => ({
  torneo: TORNEO,
  podios: [{
    categoria: { id_categoria: 9, nombre_categoria: 'INFANTIL +40', genero_categoria: 'masculino' },
    puestos: [
      { lugar: 1, equipo: JAVIER, PJ: 6, PG: 6, PP: 0, PF: 328, PC: 202, sellos: ['invicto'], partido: partido('Final', 58, 55, SPELLMAN), foto: fotoDeJavier, url_foto_equipo: null },
      { lugar: 2, equipo: SPELLMAN, PJ: 6, PG: 4, PP: 2, PF: 342, PC: 261, sellos: ['mas_puntos'], partido: partido('Final', 55, 58, JAVIER), foto: null, url_foto_equipo: null },
      { lugar: 3, equipo: ANDINO, PJ: 6, PG: 2, PP: 4, PF: 258, PC: 331, sellos: [], partido: partido('Tercer puesto', 52, 44, PIERREGROSSE), foto: null, url_foto_equipo: null },
    ],
  }],
});
const responder = (datos: PodiosDelTorneo) => ({ success: true, message: '', data: datos }) as never;

function montar() {
  const clientes = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={clientes}><EstudioFlyers /></QueryClientProvider>);
}

async function abrirPodio() {
  montar();
  fireEvent.click(await screen.findByRole('button', { name: 'Podio del torneo' }));
  await screen.findByRole('button', { name: 'Descargar campeón' });
}
const tarjeta = (nombre: string) => screen.getByRole('button', { name: nombre }).closest('li') as HTMLElement;
const flyerDe = (el: HTMLElement) => within(el).getByRole('img', { name: /^(Campeón|Vicecampeón|Tercer lugar) de/ });
const heroe = (flyer: HTMLElement, src: string) => flyer.querySelector(`img[src="${src}"]`) as HTMLImageElement;

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom no trae canvas: el flyer mide su texto con uno y sin él estima el ancho
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.mocked(getTorneosAdmin).mockResolvedValue({
    success: true, message: '',
    data: [{ id: 7, id_torneo: 7, nombre: 'LIGA 2027', estado: 'programado' }, { ...TORNEO, id: 5 }],
  } as never);
  vi.mocked(getPartidosByTorneo).mockResolvedValue({ success: true, message: '', data: [] } as never);
  vi.mocked(getDatosFlyers).mockResolvedValue({ success: true, message: '', data: { torneo: { id_torneo: 5, nombre: TORNEO.nombre }, fecha: null, fechas: [], resultados: [], figura_fecha: null, figuras_categoria: [], figuras_equipo: [], jugadores_fecha: [], jugadores_torneo: [] } } as never);
  vi.mocked(getPodiosDelTorneo).mockResolvedValue(responder(podios(FOTO)));
  vi.mocked(subirFotoPodio).mockResolvedValue({ success: true, message: 'ok', data: FOTO });
  vi.mocked(ajustarFotoPodio).mockResolvedValue({ success: true, message: 'ok', data: FOTO });
  vi.mocked(quitarFotoPodio).mockResolvedValue({ success: true, message: 'ok', data: null });
});
afterEach(() => vi.unstubAllGlobals());

describe('Estudio de flyers: Podio del torneo', () => {
  it('elige solo el torneo ya jugado y arma un flyer por puesto con su botón de descarga', async () => {
    await abrirPodio();
    expect(getPodiosDelTorneo).toHaveBeenCalledWith(5); // hay un torneo programado, pero el podio es de uno que ya se jugó
    expect(screen.getByLabelText('Torneo')).toHaveValue('5');
    expect(screen.getByRole('button', { name: 'Descargar vicecampeón' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar tercer lugar' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Campeón de INFANTIL +40: COLEGIO JAVIER' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Vicecampeón de INFANTIL +40: SPELLMAN' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Tercer lugar de INFANTIL +40: ANDINO 2.0' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'INFANTIL +40 (masculino)' })).toBeInTheDocument();
  });

  it('el formato cambia el tamaño de los tres flyers', async () => {
    await abrirPodio();
    expect(flyerDe(tarjeta('Descargar campeón'))).toHaveStyle({ height: '1350px' }); // redes 4:5 es el formato de entrada
    fireEvent.click(screen.getByRole('button', { name: 'Estados 9:16' }));
    expect(flyerDe(tarjeta('Descargar campeón'))).toHaveStyle({ height: '1920px' });
  });

  it('cada puesto ofrece subir, cambiar, ajustar o quitar su propia foto', async () => {
    await abrirPodio();
    const campeon = within(tarjeta('Descargar campeón'));
    expect(campeon.getByRole('button', { name: 'Cambiar foto' })).toBeInTheDocument();
    expect(campeon.getByRole('button', { name: 'Ajustar recorte' })).toBeInTheDocument();
    expect(campeon.getByRole('button', { name: 'Quitar foto' })).toBeInTheDocument();
    const vice = within(tarjeta('Descargar vicecampeón'));
    expect(vice.getByRole('button', { name: 'Subir foto' })).toBeInTheDocument();
    expect(vice.queryByRole('button', { name: 'Ajustar recorte' })).not.toBeInTheDocument();
  });

  it('copia para Instagram el podio con los tres equipos', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true });
    await abrirPodio();
    fireEvent.click(screen.getByRole('button', { name: 'Copiar texto para Instagram' }));
    await waitFor(() => expect(escribir).toHaveBeenCalledTimes(1));
    const texto = escribir.mock.calls[0][0] as string;
    expect(texto).toContain('🏆 Podio de INFANTIL +40 (masculino) en CAMPEONATO NACIONAL INTERCOLEGIAL EXALUMNOS - SEDE MANTA');
    expect(texto).toContain('🥇 Campeón: COLEGIO JAVIER');
    expect(texto).toContain('🥈 Vicecampeón: SPELLMAN');
    expect(texto).toContain('🥉 Tercer lugar: ANDINO 2.0');
    expect(toast.success).toHaveBeenCalledWith('Texto copiado. Pégalo como descripción de la publicación.');
  });

  it('ajustar el recorte mueve la foto del flyer en vivo y guardar manda solo el encuadre', async () => {
    await abrirPodio();
    const campeon = tarjeta('Descargar campeón');
    expect(heroe(flyerDe(campeon), '/fotos/javier.webp').style.objectPosition).toBe('30% 70%');

    fireEvent.click(within(campeon).getByRole('button', { name: 'Ajustar recorte' }));
    const marco = within(campeon).getByRole('group', { name: 'Encuadre de la foto' });
    fireEvent.keyDown(marco, { key: 'ArrowRight', shiftKey: true });
    // el flyer ya muestra el encuadre nuevo sin haber guardado nada
    expect(heroe(flyerDe(campeon), '/fotos/javier.webp').style.objectPosition).toBe('35% 70%');
    expect(ajustarFotoPodio).not.toHaveBeenCalled();
    // los otros flyers no se enteran
    expect(within(tarjeta('Descargar vicecampeón')).queryByRole('group', { name: 'Encuadre de la foto' })).not.toBeInTheDocument();

    fireEvent.click(within(campeon).getByRole('button', { name: 'Guardar encuadre' }));
    await waitFor(() => expect(ajustarFotoPodio).toHaveBeenCalledWith(9, 1, { foco_x: 35, foco_y: 70, zoom: 1.5 }));
    await waitFor(() => expect(within(campeon).queryByRole('group', { name: 'Encuadre de la foto' })).not.toBeInTheDocument());
  });

  it('cancelar el ajuste devuelve el flyer a su encuadre guardado', async () => {
    await abrirPodio();
    const campeon = tarjeta('Descargar campeón');
    fireEvent.click(within(campeon).getByRole('button', { name: 'Ajustar recorte' }));
    fireEvent.keyDown(within(campeon).getByRole('group', { name: 'Encuadre de la foto' }), { key: 'ArrowDown', shiftKey: true });
    expect(heroe(flyerDe(campeon), '/fotos/javier.webp').style.objectPosition).toBe('30% 75%');
    fireEvent.click(within(campeon).getByRole('button', { name: 'Cancelar' }));
    expect(heroe(flyerDe(campeon), '/fotos/javier.webp').style.objectPosition).toBe('30% 70%');
  });

  it('subir una foto nueva la pone en el flyer y abre el editor con el encuadre centrado', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 2400, height: 1600, close: vi.fn() }));
    // al abrir no hay foto; cuando se sube, el servidor ya la devuelve con el encuadre centrado
    vi.mocked(getPodiosDelTorneo).mockResolvedValueOnce(responder(podios(null))).mockResolvedValue(responder(podios({ ...FOTO, foco_x: 50, foco_y: 50, zoom: 1 })));
    await abrirPodio();
    const campeon = tarjeta('Descargar campeón');
    expect(within(campeon).queryByRole('group', { name: 'Encuadre de la foto' })).not.toBeInTheDocument();

    const archivo = new File(['x'], 'javier.jpg', { type: 'image/jpeg' });
    fireEvent.change(within(campeon).getByLabelText('Foto de COLEGIO JAVIER'), { target: { files: [archivo] } });
    await waitFor(() => expect(subirFotoPodio).toHaveBeenCalledWith(9, 1, archivo));
    expect(await within(campeon).findByRole('group', { name: 'Encuadre de la foto' })).toBeInTheDocument();
    expect(heroe(flyerDe(campeon), '/fotos/javier.webp').style.objectPosition).toBe('50% 50%');
    expect(within(campeon).getByText('1,00×')).toBeInTheDocument();
  });

  it('quitar la foto pide confirmar y la borra del podio de ese equipo', async () => {
    await abrirPodio();
    fireEvent.click(within(tarjeta('Descargar campeón')).getByRole('button', { name: 'Quitar foto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(quitarFotoPodio).toHaveBeenCalledWith(9, 1));
  });

  it('sin podios todavía lo dice y no ofrece nada que descargar', async () => {
    vi.mocked(getPodiosDelTorneo).mockResolvedValue(responder({ torneo: TORNEO, podios: [] }));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Podio del torneo' }));
    expect(await screen.findByText('Nada para publicar todavía')).toBeInTheDocument();
    expect(screen.getByText('El podio aparece cuando se juega la final de una categoría. Elige un torneo que ya se jugó.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Descargar/ })).not.toBeInTheDocument();
  });

  it('si la API falla, ofrece reintentar', async () => {
    vi.mocked(getPodiosDelTorneo).mockRejectedValueOnce(new Error('caída'));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Podio del torneo' }));
    expect(await screen.findByText(/No pudimos cargar los datos del torneo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: 'Descargar campeón' })).toBeInTheDocument();
  });
});
