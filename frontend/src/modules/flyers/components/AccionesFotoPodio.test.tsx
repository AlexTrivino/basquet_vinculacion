import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PuestoDelPodio } from '@/modules/partidos';
import { ajustarFotoPodio, quitarFotoPodio, subirFotoPodio } from '../api/flyers.api';
import { CENTRADO } from '../foto';
import { AccionesFotoPodio, type Borrador } from './AccionesFotoPodio';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../api/flyers.api', async (original) => ({
  ...(await original<typeof import('../api/flyers.api')>()),
  subirFotoPodio: vi.fn(),
  ajustarFotoPodio: vi.fn(),
  quitarFotoPodio: vi.fn(),
}));

const FOTO = { url: '/fotos/javier.webp', ancho: 2400, alto: 1757, foco_x: 30, foco_y: 70, zoom: 1.5 };
const puesto = (extra: Partial<PuestoDelPodio> = {}): PuestoDelPodio => ({
  lugar: 1, equipo: { id_equipo: 1, nombre_equipo: 'COLEGIO JAVIER', url_logo: null }, PJ: 6, PG: 6, PP: 0, PF: 328, PC: 202,
  sellos: [], partido: null, foto: null, url_foto_equipo: null, ...extra,
});

// Quien usa estas acciones guarda el borrador; aquí lo hace un anfitrión mínimo
function Anfitrion({ p, alBorrador }: { p: PuestoDelPodio; alBorrador?: (b: Borrador | null) => void }) {
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  return (
    <AccionesFotoPodio
      idTorneo={5}
      idCategoria={9}
      puesto={p}
      formato="historia"
      borrador={borrador}
      alBorrador={(b) => { alBorrador?.(b); setBorrador(b); }}
    />
  );
}

function montar(p: PuestoDelPodio, alBorrador?: (b: Borrador | null) => void) {
  const clientes = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={clientes}><Anfitrion p={p} alBorrador={alBorrador} /></QueryClientProvider>);
}

const foto = (tipo = 'image/jpeg', nombre = 'javier.jpg') => new File(['x'], nombre, { type: tipo });
const elegir = (archivo: File) => fireEvent.change(screen.getByLabelText('Foto de COLEGIO JAVIER'), { target: { files: [archivo] } });
const editor = () => screen.queryByRole('group', { name: 'Encuadre de la foto' });
const imagenDe = (ancho: number, alto: number) => vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: ancho, height: alto, close: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(subirFotoPodio).mockResolvedValue({ success: true, message: 'ok', data: FOTO });
  vi.mocked(ajustarFotoPodio).mockResolvedValue({ success: true, message: 'ok', data: FOTO });
  vi.mocked(quitarFotoPodio).mockResolvedValue({ success: true, message: 'ok', data: null });
});
afterEach(() => vi.unstubAllGlobals());

describe('AccionesFotoPodio: lo que se ofrece', () => {
  it('sin foto: solo subir, y avisa que el flyer lleva el escudo', () => {
    montar(puesto());
    expect(screen.getByText('Sin foto: el flyer lleva el escudo del equipo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir foto' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Ajustar recorte' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar foto' })).not.toBeInTheDocument();
  });

  it('con la foto del equipo avisa que subir una la reemplaza para este podio', () => {
    montar(puesto({ url_foto_equipo: '/fotos/equipo.jpg' }));
    expect(screen.getByText('El flyer lleva la foto del equipo. Sube una para este podio y la reemplaza.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajustar recorte' })).not.toBeInTheDocument();
  });

  it('con foto del podio: cambiarla, ajustar su recorte y quitarla', () => {
    montar(puesto({ foto: FOTO }));
    expect(screen.getByText('El flyer lleva la foto que subiste.')).toBeInTheDocument();
    for (const nombre of ['Cambiar foto', 'Ajustar recorte', 'Quitar foto']) expect(screen.getByRole('button', { name: nombre })).toBeEnabled();
    expect(editor()).not.toBeInTheDocument();
  });

  it('el selector de archivos solo ofrece JPG, PNG y WebP', () => {
    montar(puesto());
    expect(screen.getByLabelText('Foto de COLEGIO JAVIER')).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
  });
});

describe('AccionesFotoPodio: subir', () => {
  it('sube la foto, avisa y deja el encuadre centrado para acomodarlo', async () => {
    imagenDe(2400, 1600);
    const alBorrador = vi.fn();
    montar(puesto(), alBorrador);
    const archivo = foto();
    elegir(archivo);
    await waitFor(() => expect(subirFotoPodio).toHaveBeenCalledWith(9, 1, archivo));
    await waitFor(() => expect(alBorrador).toHaveBeenCalledWith({ id_categoria: 9, id_equipo: 1, encuadre: CENTRADO }));
    expect(toast.success).toHaveBeenCalledWith('Foto guardada. Ajusta el recorte si hace falta.');
  });

  it('una foto vertical se sube y avisa cómo se verá', async () => {
    imagenDe(1200, 1800);
    montar(puesto());
    elegir(foto());
    await waitFor(() => expect(subirFotoPodio).toHaveBeenCalled());
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('La foto es vertical'));
  });

  it('una foto que no sirve no se sube: el aviso dice por qué', async () => {
    montar(puesto());
    elegir(foto('image/gif', 'baile.gif'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Esa foto es de un tipo que no se puede usar. Elige una JPG, PNG o WebP.'));
    expect(subirFotoPodio).not.toHaveBeenCalled();

    imagenDe(900, 500);
    elegir(foto());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('La foto mide 900 × 500 px')));
    expect(subirFotoPodio).not.toHaveBeenCalled();
  });

  it('si el servidor la rechaza, muestra su mensaje y no abre el editor', async () => {
    imagenDe(2400, 1600);
    vi.mocked(subirFotoPodio).mockRejectedValue(Object.assign(new Error('400'), { isAxiosError: true, response: { data: { message: 'La foto no es una imagen válida.' } } }));
    const alBorrador = vi.fn();
    montar(puesto(), alBorrador);
    elegir(foto());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('La foto no es una imagen válida.'));
    expect(alBorrador).not.toHaveBeenCalled();
  });

  it('si se cae la conexión, el aviso es uno que se entiende', async () => {
    imagenDe(2400, 1600);
    vi.mocked(subirFotoPodio).mockRejectedValue(Object.assign(new Error('Network Error'), { isAxiosError: true }));
    montar(puesto());
    elegir(foto());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No se pudo completar la acción. Revisa la conexión e inténtalo de nuevo.'));
  });
});

describe('AccionesFotoPodio: ajustar el recorte', () => {
  it('abre el editor con el encuadre guardado, y al guardar manda solo foco y zoom', async () => {
    const alBorrador = vi.fn();
    montar(puesto({ foto: FOTO }), alBorrador);
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar recorte' }));
    expect(editor()).toBeInTheDocument();
    // el borrador parte del encuadre guardado y no arrastra la url ni las medidas de la foto
    expect(alBorrador).toHaveBeenCalledWith({ id_categoria: 9, id_equipo: 1, encuadre: { foco_x: 30, foco_y: 70, zoom: 1.5 } });
    expect(screen.getByText('1,50×')).toBeInTheDocument();

    fireEvent.keyDown(editor() as HTMLElement, { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar encuadre' }));
    await waitFor(() => expect(ajustarFotoPodio).toHaveBeenCalledWith(9, 1, { foco_x: 31, foco_y: 70, zoom: 1.5 }));
    await waitFor(() => expect(editor()).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith('Encuadre guardado.');
  });

  it('el botón abre y cierra el editor, y Cancelar lo cierra sin guardar', () => {
    montar(puesto({ foto: FOTO }));
    const boton = screen.getByRole('button', { name: 'Ajustar recorte' });
    expect(boton).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(boton);
    expect(boton).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(boton);
    expect(editor()).not.toBeInTheDocument();

    fireEvent.click(boton);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(editor()).not.toBeInTheDocument();
    expect(ajustarFotoPodio).not.toHaveBeenCalled();
  });

  it('si el servidor no guarda el encuadre, el editor sigue abierto para no perder lo hecho', async () => {
    vi.mocked(ajustarFotoPodio).mockRejectedValue(Object.assign(new Error('500'), { isAxiosError: true, response: { data: { message: 'No se pudo guardar.' } } }));
    montar(puesto({ foto: FOTO }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar recorte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar encuadre' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No se pudo guardar.'));
    expect(editor()).toBeInTheDocument();
  });
});

describe('AccionesFotoPodio: quitar', () => {
  it('pide confirmar y luego borra la foto de ese equipo en esa categoría', async () => {
    montar(puesto({ foto: FOTO }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar foto' }));
    expect(screen.getByText('¿Quitar la foto?')).toBeInTheDocument();
    expect(screen.getByText(/Se borra la foto de COLEGIO JAVIER en este podio/)).toBeInTheDocument();
    expect(quitarFotoPodio).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(quitarFotoPodio).toHaveBeenCalledWith(9, 1));
    expect(toast.success).toHaveBeenCalledWith('Foto eliminada.');
  });

  it('cancelar no borra nada', () => {
    montar(puesto({ foto: FOTO }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar foto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('¿Quitar la foto?')).not.toBeInTheDocument();
    expect(quitarFotoPodio).not.toHaveBeenCalled();
  });
});
