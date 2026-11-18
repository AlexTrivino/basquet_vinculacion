import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTorneosAdmin } from '@/shared/api/catalogo';
import { getPartidosByTorneo, getPodiosDelTorneo, type PodiosDelTorneo } from '@/modules/partidos';
import {
  ajustarFotoPodio, ajustarFotoPremio, elegirPremiado, getDatosFlyers, getPremiosFinal, quitarFotoPodio, quitarFotoPremio, subirFotoPodio, subirFotoPremio,
  type FiguraFlyer, type PremioGuardado, type PremiosDelTorneo,
} from '../api/flyers.api';
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
  getPremiosFinal: vi.fn(),
  elegirPremiado: vi.fn(),
  subirFotoPremio: vi.fn(),
  ajustarFotoPremio: vi.fn(),
  quitarFotoPremio: vi.fn(),
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

// Premios de la final: el campeón es COLEGIO JAVIER (58 – 55); candidatos con estadísticas en esa final
const FOTO_PREMIO = { url: '/fotos/premio.webp', ancho: 2400, alto: 1757, foco_x: 30, foco_y: 70, zoom: 1.5 };
const jugador = (id: number, nombre: string, club: typeof JAVIER, linea: Partial<FiguraFlyer['linea']>): FiguraFlyer => ({
  jugador: { id_jugador: id, nombre, url_foto: null, numero_camiseta: id },
  equipo: club,
  categoria: null,
  linea: { puntos: 0, rebotes: 0, asistencias: 0, tapones: 0, triples: 0, tiros_libres: 0, ...linea },
  valoracion: 0,
});
const BRYAN = jugador(1, 'BRYAN CHÁVEZ', JAVIER, { puntos: 18, triples: 2, rebotes: 7, asistencias: 3, tapones: 4 });
const LUIS = jugador(2, 'LUIS MACÍAS', JAVIER, { puntos: 12, rebotes: 3, tapones: 1 });
const CARLOS = jugador(3, 'CARLOS ZAMBRANO', SPELLMAN, { puntos: 9, rebotes: 10, tapones: 2 });
const elegido = (id_jugador: number, foto: PremioGuardado['foto'] = null): PremioGuardado => ({ id_jugador, foto });
const categoria = (id: number, nombre: string) => ({ id_categoria: id, nombre_categoria: nombre, genero_categoria: 'masculino' });
const final = (idPartido: number) => ({ id_partido: idPartido, ronda: 'Final', fecha: '2026-11-02', campeon: { ...JAVIER, marcador: 58 }, vice: { ...SPELLMAN, marcador: 55 } });
const premiosDelTorneo = (premios: PremiosDelTorneo['premios'][number]['premios'] = { mvp: null, defensa: null }): PremiosDelTorneo => ({
  torneo: TORNEO,
  premios: [{ categoria: categoria(9, 'INFANTIL +40'), final: final(99), candidatos: { mvp: [BRYAN, LUIS], defensa: [BRYAN, CARLOS, LUIS] }, premios }],
});
const responderPremios = (datos: PremiosDelTorneo) => ({ success: true, message: '', data: datos }) as never;

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
  vi.mocked(getPremiosFinal).mockResolvedValue({ success: true, message: '', data: premiosDelTorneo() });
  vi.mocked(elegirPremiado).mockResolvedValue({ success: true, message: 'ok', data: elegido(2) });
  vi.mocked(subirFotoPremio).mockResolvedValue({ success: true, message: 'ok', data: elegido(1, FOTO_PREMIO) });
  vi.mocked(ajustarFotoPremio).mockResolvedValue({ success: true, message: 'ok', data: elegido(1, FOTO_PREMIO) });
  vi.mocked(quitarFotoPremio).mockResolvedValue({ success: true, message: 'ok', data: elegido(1) });
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

// ── MVP y mejor defensa de la final ──
const flyerPremio = () => screen.getByRole('img', { name: /^(MVP|Mejor defensa) de la final de / });
const tarjetaPremio = (descarga: string) => screen.getByRole('button', { name: descarga }).closest('li') as HTMLElement;
const numerosDelFlyer = () => [...flyerPremio().querySelectorAll('dl > div')].map((d) => [d.querySelector('dt')?.textContent, d.querySelector('dd')?.textContent]);

async function abrirPremio(pestana: 'MVP de la final' | 'Mejor defensa de la final', descarga: string) {
  montar();
  fireEvent.click(await screen.findByRole('button', { name: pestana }));
  await screen.findByRole('button', { name: descarga });
}

describe('Estudio de flyers: MVP de la final', () => {
  it('trae los premios del torneo ya jugado y arma el flyer con el jugador que el sistema sugiere', async () => {
    await abrirPremio('MVP de la final', 'Descargar MVP');
    expect(getPremiosFinal).toHaveBeenCalledWith(5); // hay un torneo programado, pero los premios son de uno que ya se jugó
    expect(getPodiosDelTorneo).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Torneo')).toHaveValue('5');
    expect(screen.getByRole('img', { name: 'MVP de la final de INFANTIL +40: BRYAN CHÁVEZ' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'INFANTIL +40 (masculino)' })).toBeInTheDocument();
    expect(numerosDelFlyer()).toEqual([['Puntos', '18'], ['Triples', '2'], ['Rebotes', '7'], ['Asistencias', '3'], ['Tapones', '4']]);
    expect(screen.getByText('58 – 55 ante SPELLMAN')).toBeInTheDocument();
    expect(within(tarjetaPremio('Descargar MVP')).getByLabelText('Jugador del premio')).toHaveValue('1');
  });

  it('el formato cambia el tamaño del flyer', async () => {
    await abrirPremio('MVP de la final', 'Descargar MVP');
    expect(flyerPremio()).toHaveStyle({ height: '1350px' }); // redes 4:5 es el formato de entrada
    fireEvent.click(screen.getByRole('button', { name: 'Estados 9:16' }));
    expect(flyerPremio()).toHaveStyle({ height: '1920px' });
  });

  it('elegir a otro jugador lo guarda y el flyer pasa a llevar sus números', async () => {
    vi.mocked(getPremiosFinal).mockResolvedValueOnce(responderPremios(premiosDelTorneo())).mockResolvedValue(responderPremios(premiosDelTorneo({ mvp: elegido(2), defensa: null })));
    await abrirPremio('MVP de la final', 'Descargar MVP');
    fireEvent.change(screen.getByLabelText('Jugador del premio'), { target: { value: '2' } });
    await waitFor(() => expect(elegirPremiado).toHaveBeenCalledWith(9, 'mvp', 2));
    expect(await screen.findByRole('img', { name: 'MVP de la final de INFANTIL +40: LUIS MACÍAS' })).toBeInTheDocument();
    expect(numerosDelFlyer()).toEqual([['Puntos', '12'], ['Rebotes', '3'], ['Tapones', '1']]); // sin triples ni asistencias: estaban en 0
    expect(screen.getByLabelText('Jugador del premio')).toHaveValue('2');
    expect(screen.getByText('Elegido por ti. Cambiar de jugador borra la foto del premio.')).toBeInTheDocument();
  });

  it('un jugador elegido con foto lleva la foto del premio y cambiar de jugador pide confirmar', async () => {
    vi.mocked(getPremiosFinal).mockResolvedValue(responderPremios(premiosDelTorneo({ mvp: elegido(1, FOTO_PREMIO), defensa: null })));
    await abrirPremio('MVP de la final', 'Descargar MVP');
    const foto = flyerPremio().querySelector('img[src="/fotos/premio.webp"]') as HTMLImageElement;
    expect(foto.style.objectPosition).toBe('30% 70%');

    fireEvent.change(screen.getByLabelText('Jugador del premio'), { target: { value: '2' } });
    expect(screen.getByText('¿Cambiar de jugador?')).toBeInTheDocument();
    expect(elegirPremiado).not.toHaveBeenCalled();
  });

  it('ajustar el recorte mueve la foto del premio en vivo y guardar manda solo el encuadre', async () => {
    vi.mocked(getPremiosFinal).mockResolvedValue(responderPremios(premiosDelTorneo({ mvp: elegido(1, FOTO_PREMIO), defensa: null })));
    await abrirPremio('MVP de la final', 'Descargar MVP');
    const tarjeta = tarjetaPremio('Descargar MVP');
    fireEvent.click(within(tarjeta).getByRole('button', { name: 'Ajustar recorte' }));
    fireEvent.keyDown(within(tarjeta).getByRole('group', { name: 'Encuadre de la foto' }), { key: 'ArrowRight', shiftKey: true });
    expect((flyerPremio().querySelector('img[src="/fotos/premio.webp"]') as HTMLImageElement).style.objectPosition).toBe('35% 70%');
    expect(ajustarFotoPremio).not.toHaveBeenCalled();

    fireEvent.click(within(tarjeta).getByRole('button', { name: 'Guardar encuadre' }));
    await waitFor(() => expect(ajustarFotoPremio).toHaveBeenCalledWith(9, 'mvp', { foco_x: 35, foco_y: 70, zoom: 1.5 }));
  });

  it('subir la foto sin haber elegido guarda al sugerido y luego la foto', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 2400, height: 1600, close: vi.fn() }));
    await abrirPremio('MVP de la final', 'Descargar MVP');
    const archivo = new File(['x'], 'bryan.jpg', { type: 'image/jpeg' });
    fireEvent.change(within(tarjetaPremio('Descargar MVP')).getByLabelText('Foto de BRYAN CHÁVEZ'), { target: { files: [archivo] } });
    await waitFor(() => expect(subirFotoPremio).toHaveBeenCalledWith(9, 'mvp', archivo));
    expect(elegirPremiado).toHaveBeenCalledWith(9, 'mvp', 1);
  });

  it('quitar la foto pide confirmar y la borra del premio', async () => {
    vi.mocked(getPremiosFinal).mockResolvedValue(responderPremios(premiosDelTorneo({ mvp: elegido(1, FOTO_PREMIO), defensa: null })));
    await abrirPremio('MVP de la final', 'Descargar MVP');
    fireEvent.click(within(tarjetaPremio('Descargar MVP')).getByRole('button', { name: 'Quitar foto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(quitarFotoPremio).toHaveBeenCalledWith(9, 'mvp'));
  });

  it('copia para Instagram el premio con el jugador, sus números y el resultado de la final', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true });
    await abrirPremio('MVP de la final', 'Descargar MVP');
    fireEvent.click(screen.getByRole('button', { name: 'Copiar texto para Instagram' }));
    await waitFor(() => expect(escribir).toHaveBeenCalledTimes(1));
    const texto = escribir.mock.calls[0][0] as string;
    expect(texto).toContain('🏆 MVP de la final de INFANTIL +40 (masculino) en CAMPEONATO NACIONAL INTERCOLEGIAL EXALUMNOS - SEDE MANTA: BRYAN CHÁVEZ (COLEGIO JAVIER), con 18 puntos, 2 triples, 7 rebotes, 3 asistencias y 4 tapones en la final (58 – 55 ante SPELLMAN).');
  });

  it('con varias categorías, el selector cambia el flyer a la final de la otra', async () => {
    const otra = { categoria: categoria(10, 'JUVENIL'), final: final(100), candidatos: { mvp: [LUIS], defensa: [LUIS] }, premios: { mvp: null, defensa: null } };
    const datos = premiosDelTorneo();
    vi.mocked(getPremiosFinal).mockResolvedValue(responderPremios({ ...datos, premios: [...datos.premios, otra] }));
    await abrirPremio('MVP de la final', 'Descargar MVP');
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: '10' } });
    expect(await screen.findByRole('img', { name: 'MVP de la final de JUVENIL: LUIS MACÍAS' })).toBeInTheDocument();
  });

  it('sin finales jugadas lo dice y no ofrece nada que descargar', async () => {
    vi.mocked(getPremiosFinal).mockResolvedValue(responderPremios({ torneo: TORNEO, premios: [] }));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'MVP de la final' }));
    expect(await screen.findByText('Nada para publicar todavía')).toBeInTheDocument();
    expect(screen.getByText('El MVP y el mejor defensa salen de la final de una categoría, y aparecen cuando se juega. Elige un torneo que ya se jugó.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Descargar/ })).not.toBeInTheDocument();
  });

  it('una final sin estadísticas de jugadores no tiene a quién premiar y lo dice', async () => {
    const datos = premiosDelTorneo();
    vi.mocked(getPremiosFinal).mockResolvedValue(responderPremios({ ...datos, premios: [{ ...datos.premios[0], candidatos: { mvp: [], defensa: [] } }] }));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'MVP de la final' }));
    expect(await screen.findByText('Nada para publicar todavía')).toBeInTheDocument();
    expect(screen.getByText(/Esta final no tiene jugadores con estadísticas cargadas para este premio/)).toBeInTheDocument();
  });

  it('si la API falla, ofrece reintentar', async () => {
    vi.mocked(getPremiosFinal).mockRejectedValueOnce(new Error('caída'));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'MVP de la final' }));
    expect(await screen.findByText(/No pudimos cargar los datos del torneo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: 'Descargar MVP' })).toBeInTheDocument();
  });
});

describe('Estudio de flyers: mejor defensa de la final', () => {
  it('arma el flyer del mejor defensa con rebotes y tapones, y el sugerido es el de más rebotes y tapones de los dos equipos', async () => {
    vi.mocked(getPremiosFinal).mockResolvedValue(responderPremios({ ...premiosDelTorneo(), premios: [{ ...premiosDelTorneo().premios[0], candidatos: { mvp: [BRYAN, LUIS], defensa: [CARLOS, BRYAN, LUIS] } }] }));
    await abrirPremio('Mejor defensa de la final', 'Descargar mejor defensa');
    expect(screen.getByRole('img', { name: 'Mejor defensa de la final de INFANTIL +40: CARLOS ZAMBRANO' })).toBeInTheDocument();
    expect(numerosDelFlyer()).toEqual([['Rebotes', '10'], ['Tapones', '2']]);
    expect(screen.getByText('55 – 58 ante COLEGIO JAVIER')).toBeInTheDocument(); // el resultado, desde el lado del jugador
    expect(within(tarjetaPremio('Descargar mejor defensa')).getByRole('option', { name: /CARLOS ZAMBRANO · 10 reb, 2 tap · SPELLMAN \(sugerido\)/ })).toBeInTheDocument();
  });

  it('el MVP y el mejor defensa se eligen por separado', async () => {
    vi.mocked(getPremiosFinal).mockResolvedValue(responderPremios(premiosDelTorneo({ mvp: elegido(2), defensa: elegido(3) })));
    await abrirPremio('Mejor defensa de la final', 'Descargar mejor defensa');
    expect(screen.getByRole('img', { name: 'Mejor defensa de la final de INFANTIL +40: CARLOS ZAMBRANO' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'MVP de la final' }));
    expect(await screen.findByRole('img', { name: 'MVP de la final de INFANTIL +40: LUIS MACÍAS' })).toBeInTheDocument();
  });

  it('copia para Instagram solo los rebotes y tapones del partido', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true });
    await abrirPremio('Mejor defensa de la final', 'Descargar mejor defensa');
    fireEvent.click(screen.getByRole('button', { name: 'Copiar texto para Instagram' }));
    await waitFor(() => expect(escribir).toHaveBeenCalledTimes(1));
    const texto = escribir.mock.calls[0][0] as string;
    expect(texto).toContain('🛡️ Mejor defensa de la final de INFANTIL +40 (masculino)');
    expect(texto).toContain('BRYAN CHÁVEZ (COLEGIO JAVIER), con 7 rebotes y 4 tapones en la final (58 – 55 ante SPELLMAN).');
    expect(texto).not.toContain('puntos');
  });
});
