import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CENTRADO } from '../foto';
import { arrastrar, EditorEncuadre } from './EditorEncuadre';

describe('arrastrar (la cuenta del gesto)', () => {
  const marco = { ancho: 400, alto: 300 };
  const cuadrada = { ancho: 1000, alto: 1000 }; // llena el ancho: sobran 100 px arriba y abajo y nada a los lados

  it('bajar la foto muestra más de arriba: el foco sube, y solo en el eje que sobra', () => {
    expect(arrastrar(CENTRADO, { x: 80, y: 10 }, marco, cuadrada)).toEqual({ foco_x: 50, foco_y: 40, zoom: 1 });
    expect(arrastrar(CENTRADO, { x: 0, y: -25 }, marco, cuadrada)).toEqual({ foco_x: 50, foco_y: 75, zoom: 1 });
  });

  it('con zoom la foto sobra en los dos ejes (800 × 800 en un marco de 400 × 300)', () => {
    expect(arrastrar({ foco_x: 50, foco_y: 50, zoom: 2 }, { x: 40, y: -50 }, marco, cuadrada)).toEqual({ foco_x: 40, foco_y: 60, zoom: 2 });
  });

  it('no sale de 0 ni de 100 y redondea a dos decimales', () => {
    expect(arrastrar(CENTRADO, { x: 0, y: 900 }, marco, cuadrada).foco_y).toBe(0);
    expect(arrastrar(CENTRADO, { x: 0, y: -900 }, marco, cuadrada).foco_y).toBe(100);
    expect(arrastrar(CENTRADO, { x: 0, y: 1 }, marco, { ancho: 1000, alto: 1500 }).foco_y).toBe(49.67); // 1 px de 300 de sobra
  });

  it('sin sobrante no hay nada que mover: la foto con la proporción del marco queda quieta', () => {
    const quieto = { foco_x: 30, foco_y: 70, zoom: 1 };
    expect(arrastrar(quieto, { x: 50, y: 50 }, marco, { ancho: 1600, alto: 1200 })).toEqual(quieto);
  });
});

const FOTO = { url: '/foto.jpg', ancho: 1000, alto: 1000 };

function montar(encuadre = CENTRADO, extra: { guardando?: boolean } = {}) {
  const funciones = { alCambiar: vi.fn(), alGuardar: vi.fn(), alCancelar: vi.fn() };
  render(<EditorEncuadre foto={FOTO} encuadre={encuadre} aspecto={4 / 3} {...funciones} {...extra} />);
  return funciones;
}
const marcoDelEditor = () => screen.getByRole('group', { name: 'Encuadre de la foto' });
const conMedidas = (el: HTMLElement) => {
  el.getBoundingClientRect = () => ({ width: 400, height: 300, x: 0, y: 0, top: 0, left: 0, right: 400, bottom: 300, toJSON: () => ({}) });
  return el;
};

describe('EditorEncuadre', () => {
  it('con la foto del podio avisa de lo que se desvanece; en los premios, donde nada la pisa, no', () => {
    const { unmount } = render(<EditorEncuadre foto={FOTO} encuadre={CENTRADO} aspecto={4 / 3} alCambiar={vi.fn()} alGuardar={vi.fn()} alCancelar={vi.fn()} />);
    expect(screen.getByText(/se desvanece arriba y abajo/)).toBeInTheDocument();
    unmount();
    render(<EditorEncuadre foto={FOTO} encuadre={CENTRADO} aspecto={4 / 3} limpia alCambiar={vi.fn()} alGuardar={vi.fn()} alCancelar={vi.fn()} />);
    expect(screen.queryByText(/desvanece/)).not.toBeInTheDocument();
    expect(screen.getByText(/elegir qué parte se ve/)).toBeInTheDocument();
  });

  it('muestra la foto con su encuadre y su zoom, y la imagen no es arrastrable como archivo', () => {
    montar({ foco_x: 30, foco_y: 70, zoom: 1.5 });
    const foto = marcoDelEditor().querySelector('img') as HTMLImageElement;
    expect(foto).toHaveAttribute('src', '/foto.jpg');
    // sin esto el navegador arranca el arrastre de la imagen y cancela el puntero a mitad del gesto
    expect(foto).toHaveAttribute('draggable', 'false');
    expect(foto.style.objectPosition).toBe('30% 70%');
    expect(foto.style.transformOrigin).toBe('30% 70%');
    expect(foto.style.transform).toBe('scale(1.5)');
    expect(screen.getByText('1,50×')).toBeInTheDocument();
    expect(marcoDelEditor()).toHaveStyle({ aspectRatio: String(4 / 3) });
  });

  it('con las flechas el encuadre se mueve de a 1 y con Mayús de a 5, sin salirse de 0 a 100', () => {
    const { alCambiar } = montar();
    fireEvent.keyDown(marcoDelEditor(), { key: 'ArrowRight' });
    expect(alCambiar).toHaveBeenLastCalledWith({ foco_x: 51, foco_y: 50, zoom: 1 });
    fireEvent.keyDown(marcoDelEditor(), { key: 'ArrowUp', shiftKey: true });
    expect(alCambiar).toHaveBeenLastCalledWith({ foco_x: 50, foco_y: 45, zoom: 1 });
    fireEvent.keyDown(marcoDelEditor(), { key: 'ArrowLeft' });
    expect(alCambiar).toHaveBeenLastCalledWith({ foco_x: 49, foco_y: 50, zoom: 1 });
    fireEvent.keyDown(marcoDelEditor(), { key: 'ArrowDown' });
    expect(alCambiar).toHaveBeenLastCalledWith({ foco_x: 50, foco_y: 51, zoom: 1 });
    expect(alCambiar).toHaveBeenCalledTimes(4);

    fireEvent.keyDown(marcoDelEditor(), { key: 'a' }); // otra tecla no hace nada
    expect(alCambiar).toHaveBeenCalledTimes(4);
  });

  it('en el borde las flechas no pasan de 0 ni de 100', () => {
    const { alCambiar } = montar({ foco_x: 100, foco_y: 2, zoom: 2 });
    fireEvent.keyDown(marcoDelEditor(), { key: 'ArrowRight', shiftKey: true });
    expect(alCambiar).toHaveBeenLastCalledWith({ foco_x: 100, foco_y: 2, zoom: 2 });
    fireEvent.keyDown(marcoDelEditor(), { key: 'ArrowUp', shiftKey: true });
    expect(alCambiar).toHaveBeenLastCalledWith({ foco_x: 100, foco_y: 0, zoom: 2 });
  });

  it('el zoom va de 1× a 3× y conserva el foco', () => {
    const { alCambiar } = montar({ foco_x: 20, foco_y: 80, zoom: 1 });
    const zoom = screen.getByLabelText(/Zoom/);
    expect(zoom).toHaveAttribute('min', '1');
    expect(zoom).toHaveAttribute('max', '3');
    fireEvent.change(zoom, { target: { value: '1.6' } });
    expect(alCambiar).toHaveBeenCalledWith({ foco_x: 20, foco_y: 80, zoom: 1.6 });
  });

  it('Centrar vuelve al centro y se apaga cuando ya está centrado', () => {
    const { alCambiar } = montar({ foco_x: 20, foco_y: 80, zoom: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Centrar' }));
    expect(alCambiar).toHaveBeenCalledWith(CENTRADO);
  });

  it('centrado, Centrar no tiene nada que hacer', () => {
    montar(CENTRADO);
    expect(screen.getByRole('button', { name: 'Centrar' })).toBeDisabled();
  });

  it('Guardar y Cancelar avisan a quien lo usa; mientras guarda no se puede tocar nada', () => {
    const { alGuardar, alCancelar } = montar({ foco_x: 20, foco_y: 80, zoom: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar encuadre' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(alGuardar).toHaveBeenCalledTimes(1);
    expect(alCancelar).toHaveBeenCalledTimes(1);
  });

  it('guardando se bloquean los tres botones', () => {
    montar({ foco_x: 20, foco_y: 80, zoom: 2 }, { guardando: true });
    for (const nombre of ['Centrar', 'Cancelar', 'Guardar encuadre']) expect(screen.getByRole('button', { name: nombre })).toBeDisabled();
  });

  it('arrastrar sigue al puntero desde donde se agarró la foto y se detiene al soltar', () => {
    const { alCambiar } = montar();
    const marco = conMedidas(marcoDelEditor());
    fireEvent.pointerDown(marco, { pointerId: 1, clientX: 200, clientY: 150 });
    fireEvent.pointerMove(marco, { pointerId: 1, clientX: 200, clientY: 160 });
    expect(alCambiar).toHaveBeenLastCalledWith({ foco_x: 50, foco_y: 40, zoom: 1 });
    // cada movimiento se mide desde el agarre, no desde el movimiento anterior
    fireEvent.pointerMove(marco, { pointerId: 1, clientX: 200, clientY: 170 });
    expect(alCambiar).toHaveBeenLastCalledWith({ foco_x: 50, foco_y: 30, zoom: 1 });
    expect(alCambiar).toHaveBeenCalledTimes(2);

    fireEvent.pointerUp(marco, { pointerId: 1 });
    fireEvent.pointerMove(marco, { pointerId: 1, clientX: 200, clientY: 180 });
    expect(alCambiar).toHaveBeenCalledTimes(2);
  });

  it('mover el puntero sin haber agarrado la foto no cambia nada, y cancelar el gesto la suelta', () => {
    const { alCambiar } = montar();
    const marco = conMedidas(marcoDelEditor());
    fireEvent.pointerMove(marco, { pointerId: 1, clientX: 10, clientY: 10 });
    expect(alCambiar).not.toHaveBeenCalled();

    fireEvent.pointerDown(marco, { pointerId: 1, clientX: 200, clientY: 150 });
    fireEvent.pointerCancel(marco, { pointerId: 1 });
    fireEvent.pointerMove(marco, { pointerId: 1, clientX: 200, clientY: 190 });
    expect(alCambiar).not.toHaveBeenCalled();
  });
});
