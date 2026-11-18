import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ajustarFotoPremio, elegirPremiado, quitarFotoPremio, subirFotoPremio, type FiguraFlyer, type PremioGuardado, type PremiosDeCategoria, type TipoPremio,
} from '../api/flyers.api';
import { CENTRADO } from '../foto';
import { AccionesPremio, type BorradorPremio } from './AccionesPremio';
import { aspectoDelPremio } from './FlyerPremio';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../api/flyers.api', async (original) => ({
  ...(await original<typeof import('../api/flyers.api')>()),
  elegirPremiado: vi.fn(),
  subirFotoPremio: vi.fn(),
  ajustarFotoPremio: vi.fn(),
  quitarFotoPremio: vi.fn(),
}));

const JAVIER = { id_equipo: 1, nombre_equipo: 'COLEGIO JAVIER', url_logo: null };
const SPELLMAN = { id_equipo: 2, nombre_equipo: 'SPELLMAN', url_logo: null };
const FOTO = { url: '/fotos/premio.webp', ancho: 2400, alto: 1757, foco_x: 30, foco_y: 70, zoom: 1.5 };

const figura = (id: number, nombre: string, equipo: FiguraFlyer['equipo'], linea: Partial<FiguraFlyer['linea']>, urlFoto: string | null = null): FiguraFlyer => ({
  jugador: { id_jugador: id, nombre, url_foto: urlFoto, numero_camiseta: id },
  equipo,
  categoria: null,
  linea: { puntos: 0, rebotes: 0, asistencias: 0, tapones: 0, triples: 0, tiros_libres: 0, ...linea },
  valoracion: 0,
});
const BRYAN = figura(1, 'BRYAN CHÁVEZ', JAVIER, { puntos: 18, triples: 2, rebotes: 7, asistencias: 3, tapones: 4 });
const LUIS = figura(2, 'LUIS MACÍAS', JAVIER, { puntos: 12, rebotes: 3, tapones: 1 });
const CARLOS = figura(3, 'CARLOS ZAMBRANO', SPELLMAN, { puntos: 9, rebotes: 10, tapones: 2 });

const premio = (premios: PremiosDeCategoria['premios'] = { mvp: null, defensa: null }): PremiosDeCategoria => ({
  categoria: { id_categoria: 9, nombre_categoria: 'INFANTIL +40', genero_categoria: 'masculino' },
  final: { id_partido: 99, ronda: 'Final', fecha: '2026-11-02', campeon: { ...JAVIER, marcador: 58 }, vice: { ...SPELLMAN, marcador: 55 } },
  candidatos: { mvp: [BRYAN, LUIS], defensa: [BRYAN, CARLOS, LUIS] },
  premios,
});
const guardado = (id_jugador: number, foto: PremioGuardado['foto'] = null): PremioGuardado => ({ id_jugador, foto });

// Quien usa estas acciones guarda el borrador; aquí lo hace un anfitrión mínimo
function Anfitrion({ tipo, p, figuraDelFlyer, alBorrador, inicial }: {
  tipo: TipoPremio; p: PremiosDeCategoria; figuraDelFlyer: FiguraFlyer; alBorrador?: (b: BorradorPremio | null) => void; inicial?: BorradorPremio;
}) {
  const [borrador, setBorrador] = useState<BorradorPremio | null>(inicial ?? null);
  return (
    <AccionesPremio
      idTorneo={5}
      tipo={tipo}
      premio={p}
      figura={figuraDelFlyer}
      formato="historia"
      borrador={borrador}
      alBorrador={(b) => { alBorrador?.(b); setBorrador(b); }}
    />
  );
}

function montar(tipo: TipoPremio, p: PremiosDeCategoria, figuraDelFlyer: FiguraFlyer, alBorrador?: (b: BorradorPremio | null) => void, inicial?: BorradorPremio) {
  const clientes = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={clientes}><Anfitrion tipo={tipo} p={p} figuraDelFlyer={figuraDelFlyer} alBorrador={alBorrador} inicial={inicial} /></QueryClientProvider>);
}

const selector = () => screen.getByLabelText('Jugador del premio') as HTMLSelectElement;
const elegirOtro = (id: number) => fireEvent.change(selector(), { target: { value: String(id) } });
const foto = () => new File(['x'], 'premio.jpg', { type: 'image/jpeg' });
const subir = (archivo: File, de = 'BRYAN CHÁVEZ') => fireEvent.change(screen.getByLabelText(`Foto de ${de}`), { target: { files: [archivo] } });
const editor = () => screen.queryByRole('group', { name: 'Encuadre de la foto' });
const imagenDe = (ancho: number, alto: number) => vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: ancho, height: alto, close: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(elegirPremiado).mockResolvedValue({ success: true, message: 'ok', data: guardado(1) });
  vi.mocked(subirFotoPremio).mockResolvedValue({ success: true, message: 'ok', data: guardado(1, FOTO) });
  vi.mocked(ajustarFotoPremio).mockResolvedValue({ success: true, message: 'ok', data: guardado(1, FOTO) });
  vi.mocked(quitarFotoPremio).mockResolvedValue({ success: true, message: 'ok', data: guardado(1) });
});
afterEach(() => vi.unstubAllGlobals());

describe('AccionesPremio: el jugador', () => {
  it('el MVP se elige entre los candidatos de la final, con sus cifras, y el primero va marcado como sugerido', () => {
    montar('mvp', premio(), BRYAN);
    expect(selector()).toHaveValue('1');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'BRYAN CHÁVEZ · 18 pts, 2 tri, 7 reb, 3 ast, 4 tap (sugerido)',
      'LUIS MACÍAS · 12 pts, 3 reb, 1 tap',
    ]);
  });

  it('el mejor defensa muestra rebotes, tapones y el equipo de cada candidato, de los dos finalistas', () => {
    montar('defensa', premio(), BRYAN);
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'BRYAN CHÁVEZ · 7 reb, 4 tap · COLEGIO JAVIER (sugerido)',
      'CARLOS ZAMBRANO · 10 reb, 2 tap · SPELLMAN',
      'LUIS MACÍAS · 3 reb, 1 tap · COLEGIO JAVIER',
    ]);
  });

  it('sin elegir avisa que el flyer lleva al sugerido, y deja subir su foto', () => {
    montar('mvp', premio(), BRYAN);
    expect(screen.getByText(/^Sin elegir: el flyer lleva al de mejor valoración de la final/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir foto' })).toBeEnabled();
  });

  it('con un jugador elegido el selector lo muestra y avisa que cambiarlo borra la foto del premio', () => {
    montar('mvp', premio({ mvp: guardado(2), defensa: null }), LUIS);
    expect(selector()).toHaveValue('2');
    expect(screen.getByText('Elegido por ti. Cambiar de jugador borra la foto del premio.')).toBeInTheDocument();
  });

  it('elegir a otro jugador sin foto lo guarda al instante, sin preguntar', async () => {
    const alBorrador = vi.fn();
    montar('mvp', premio({ mvp: guardado(1), defensa: null }), BRYAN, alBorrador);
    elegirOtro(2);
    await waitFor(() => expect(elegirPremiado).toHaveBeenCalledWith(9, 'mvp', 2));
    expect(screen.queryByText('¿Cambiar de jugador?')).not.toBeInTheDocument();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Jugador guardado.'));
    expect(alBorrador).toHaveBeenCalledWith(null); // el encuadre en curso era del anterior
  });

  it('con una foto de por medio pregunta antes de cambiar, nombrando a los dos, y cancelar no toca nada', async () => {
    montar('mvp', premio({ mvp: guardado(1, FOTO), defensa: null }), BRYAN);
    elegirOtro(2);
    expect(screen.getByText('¿Cambiar de jugador?')).toBeInTheDocument();
    expect(screen.getByText(/La foto del premio es de BRYAN CHÁVEZ y se borra al cambiar de jugador: tendrás que subir la de LUIS MACÍAS\./)).toBeInTheDocument();
    expect(elegirPremiado).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('¿Cambiar de jugador?')).not.toBeInTheDocument();
    expect(elegirPremiado).not.toHaveBeenCalled();
  });

  it('confirmar el cambio guarda al otro jugador', async () => {
    montar('mvp', premio({ mvp: guardado(1, FOTO), defensa: null }), BRYAN);
    elegirOtro(2);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(elegirPremiado).toHaveBeenCalledWith(9, 'mvp', 2));
    expect(screen.queryByText('¿Cambiar de jugador?')).not.toBeInTheDocument();
  });

  it('si el servidor rechaza al jugador, muestra su mensaje', async () => {
    vi.mocked(elegirPremiado).mockRejectedValue(Object.assign(new Error('422'), { isAxiosError: true, response: { data: { message: 'El MVP tiene que ser un jugador del equipo campeón con estadísticas cargadas en la final.' } } }));
    montar('mvp', premio(), BRYAN);
    elegirOtro(2);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('El MVP tiene que ser un jugador del equipo campeón con estadísticas cargadas en la final.'));
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('AccionesPremio: la foto del premio', () => {
  it('dice qué foto lleva el flyer: la del premio, la de la ficha o la silueta', () => {
    montar('mvp', premio({ mvp: guardado(1, FOTO), defensa: null }), BRYAN);
    expect(screen.getByText('El flyer lleva la foto que subiste para el premio.')).toBeInTheDocument();
    for (const nombre of ['Cambiar foto', 'Ajustar recorte', 'Quitar foto']) expect(screen.getByRole('button', { name: nombre })).toBeEnabled();
  });

  it('sin foto del premio pero con la de la ficha, subir una la reemplaza', () => {
    montar('mvp', premio(), figura(1, 'BRYAN CHÁVEZ', JAVIER, { puntos: 18 }, '/fotos/ficha.jpg'));
    expect(screen.getByText('El flyer lleva la foto de su ficha. Sube la del premio y la reemplaza.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajustar recorte' })).not.toBeInTheDocument();
  });

  it('sin ninguna foto avisa que el flyer lleva la silueta con el dorsal', () => {
    montar('mvp', premio(), BRYAN);
    expect(screen.getByText('Sin foto: el flyer lleva la silueta del jugador con su dorsal.')).toBeInTheDocument();
  });

  it('el selector de archivos es el del jugador y solo ofrece JPG, PNG y WebP', () => {
    montar('mvp', premio(), BRYAN);
    expect(screen.getByLabelText('Foto de BRYAN CHÁVEZ')).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
  });

  it('subir sin haber elegido guarda primero al sugerido y después la foto, y abre el editor centrado', async () => {
    imagenDe(2400, 1600);
    const alBorrador = vi.fn();
    montar('mvp', premio(), BRYAN, alBorrador);
    const archivo = foto();
    subir(archivo);
    await waitFor(() => expect(subirFotoPremio).toHaveBeenCalledWith(9, 'mvp', archivo));
    expect(elegirPremiado).toHaveBeenCalledWith(9, 'mvp', 1); // la foto es del premiado: sin jugador guardado no hay dónde ponerla
    expect(vi.mocked(elegirPremiado).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(subirFotoPremio).mock.invocationCallOrder[0]);
    await waitFor(() => expect(alBorrador).toHaveBeenCalledWith({ tipo: 'mvp', id_categoria: 9, id_jugador: 1, encuadre: CENTRADO }));
    expect(toast.success).toHaveBeenCalledWith('Foto guardada. Ajusta el recorte si hace falta.');
  });

  it('con el jugador ya elegido solo sube la foto', async () => {
    imagenDe(2400, 1600);
    montar('defensa', premio({ mvp: null, defensa: guardado(3) }), CARLOS);
    const archivo = foto();
    subir(archivo, 'CARLOS ZAMBRANO');
    await waitFor(() => expect(subirFotoPremio).toHaveBeenCalledWith(9, 'defensa', archivo));
    expect(elegirPremiado).not.toHaveBeenCalled();
  });

  it('si la foto no sirve, no se sube nada ni se guarda al jugador', async () => {
    montar('mvp', premio(), BRYAN);
    subir(new File(['x'], 'baile.gif', { type: 'image/gif' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Esa foto es de un tipo que no se puede usar. Elige una JPG, PNG o WebP.'));
    expect(subirFotoPremio).not.toHaveBeenCalled();
    expect(elegirPremiado).not.toHaveBeenCalled(); // la revisión del navegador va antes que cualquier llamada
  });

  it('ajustar el recorte abre el editor con el encuadre guardado y guarda solo foco y zoom en el premio que es', async () => {
    const alBorrador = vi.fn();
    montar('defensa', premio({ mvp: null, defensa: guardado(3, FOTO) }), CARLOS, alBorrador);
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar recorte' }));
    expect(editor()).toBeInTheDocument();
    expect(editor()).toHaveStyle({ aspectRatio: String(aspectoDelPremio('historia')) }); // el marco del flyer del premio, no el del podio
    expect(alBorrador).toHaveBeenCalledWith({ tipo: 'defensa', id_categoria: 9, id_jugador: 3, encuadre: { foco_x: 30, foco_y: 70, zoom: 1.5 } });

    fireEvent.keyDown(editor() as HTMLElement, { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar encuadre' }));
    await waitFor(() => expect(ajustarFotoPremio).toHaveBeenCalledWith(9, 'defensa', { foco_x: 31, foco_y: 70, zoom: 1.5 }));
    await waitFor(() => expect(editor()).not.toBeInTheDocument());
  });

  it('un encuadre en curso de otro jugador no abre el editor de este', () => {
    montar('mvp', premio({ mvp: guardado(1, FOTO), defensa: null }), BRYAN, undefined, { tipo: 'mvp', id_categoria: 9, id_jugador: 2, encuadre: CENTRADO });
    expect(editor()).not.toBeInTheDocument();
  });

  it('quitar la foto pide confirmar, dice de quién es y la borra de ese premio', async () => {
    montar('mvp', premio({ mvp: guardado(1, FOTO), defensa: null }), BRYAN);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar foto' }));
    expect(screen.getByText('¿Quitar la foto?')).toBeInTheDocument();
    expect(screen.getByText(/Se borra la foto del premio de BRYAN CHÁVEZ y el flyer vuelve a llevar la de su ficha\./)).toBeInTheDocument();
    expect(quitarFotoPremio).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(quitarFotoPremio).toHaveBeenCalledWith(9, 'mvp'));
    expect(toast.success).toHaveBeenCalledWith('Foto eliminada.');
  });
});
