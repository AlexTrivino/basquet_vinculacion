import { useId, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { Crosshair, Loader2 } from 'lucide-react';
import type { Encuadre } from '../api/flyers.api';
import { CENTRADO } from '../foto';
import { FotoHeroe } from './FlyerPodio';

interface Medidas {
  ancho: number;
  alto: number;
}

const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const dos = (v: number) => Math.round(v * 100) / 100;

// Arrastrar la foto: el punto que está bajo el puntero lo sigue. La foto llena el marco (cover) y el zoom la agranda
// desde el foco, así que en cada eje el foco recorre sus 100 % mientras la foto ya escalada sobra del marco;
// sin sobrante en un eje no hay nada que mover en él. `mov` es lo que se movió el puntero desde que agarró la foto.
export function arrastrar(inicio: Encuadre, mov: { x: number; y: number }, marco: Medidas, foto: Medidas): Encuadre {
  const escala = Math.max(marco.ancho / foto.ancho, marco.alto / foto.alto);
  const sobraX = foto.ancho * escala * inicio.zoom - marco.ancho;
  const sobraY = foto.alto * escala * inicio.zoom - marco.alto;
  return {
    ...inicio,
    foco_x: sobraX > 0.5 ? dos(entre(inicio.foco_x - (100 * mov.x) / sobraX, 0, 100)) : inicio.foco_x,
    foco_y: sobraY > 0.5 ? dos(entre(inicio.foco_y - (100 * mov.y) / sobraY, 0, 100)) : inicio.foco_y,
  };
}

// Con el teclado el encuadre se mueve como una ventana: la flecha derecha muestra más de la derecha de la foto
const FLECHAS: Record<string, readonly [number, number] | undefined> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const boton = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-150 active:scale-[0.98] disabled:opacity-50';

// Editor de recorte: el marco tiene la proporción del héroe del flyer y se ve igual que en él (con los
// desvanecidos), así que lo que queda dentro es lo que sale. Arrastrar, flechas del teclado y zoom; el flyer de
// arriba se actualiza mientras tanto porque el encuadre vive en quien lo usa.
export function EditorEncuadre({ foto, encuadre, aspecto, guardando, alCambiar, alGuardar, alCancelar }: {
  foto: { url: string; ancho: number; alto: number };
  encuadre: Encuadre;
  aspecto: number; // ancho / alto del marco de la foto en el flyer
  guardando?: boolean;
  alCambiar: (e: Encuadre) => void;
  alGuardar: () => void;
  alCancelar: () => void;
}) {
  const id = useId();
  const agarre = useRef<{ x: number; y: number; inicio: Encuadre; marco: Medidas } | null>(null);
  const centrado = encuadre.foco_x === CENTRADO.foco_x && encuadre.foco_y === CENTRADO.foco_y && encuadre.zoom === CENTRADO.zoom;

  function agarrar(e: PointerEvent<HTMLDivElement>) {
    const caja = e.currentTarget.getBoundingClientRect();
    agarre.current = { x: e.clientX, y: e.clientY, inicio: encuadre, marco: { ancho: caja.width, alto: caja.height } };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function mover(e: PointerEvent<HTMLDivElement>) {
    const a = agarre.current;
    if (a) alCambiar(arrastrar(a.inicio, { x: e.clientX - a.x, y: e.clientY - a.y }, a.marco, foto));
  }

  function teclear(e: KeyboardEvent<HTMLDivElement>) {
    const flecha = FLECHAS[e.key];
    if (!flecha) return;
    e.preventDefault();
    const paso = e.shiftKey ? 5 : 1;
    alCambiar({
      ...encuadre,
      foco_x: dos(entre(encuadre.foco_x + flecha[0] * paso, 0, 100)),
      foco_y: dos(entre(encuadre.foco_y + flecha[1] * paso, 0, 100)),
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-oro/25 bg-marino p-3">
      <div
        role="group"
        aria-label="Encuadre de la foto"
        aria-describedby={`${id}-ayuda`}
        tabIndex={0}
        onPointerDown={agarrar}
        onPointerMove={mover}
        onPointerUp={() => (agarre.current = null)}
        onPointerCancel={() => (agarre.current = null)}
        onKeyDown={teclear}
        className="relative w-full cursor-grab touch-none select-none overflow-hidden rounded-lg bg-marino-claro ring-1 ring-oro/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-celeste active:cursor-grabbing"
        style={{ aspectRatio: aspecto }}
      >
        <FotoHeroe url={foto.url} {...encuadre} />
      </div>
      <p id={`${id}-ayuda`} className="text-xs leading-relaxed text-slate-400">
        Arrastra la foto (o usa las flechas del teclado; con Mayús van de a 5) para elegir qué parte se ve. Lo que se
        desvanece arriba y abajo queda bajo el título y el nombre.
      </p>
      <div>
        <label htmlFor={`${id}-zoom`} className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          <span>Zoom</span>
          <span className="tabular-nums text-crema">{encuadre.zoom.toFixed(2).replace('.', ',')}×</span>
        </label>
        <input
          id={`${id}-zoom`}
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={encuadre.zoom}
          onChange={(e) => alCambiar({ ...encuadre, zoom: Number(e.target.value) })}
          className="w-full"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => alCambiar(CENTRADO)} disabled={centrado || guardando} className={`${boton} border border-white/25 text-white hover:bg-white/10`}>
          <Crosshair className="h-4 w-4" aria-hidden="true" />
          Centrar
        </button>
        <button type="button" onClick={alCancelar} disabled={guardando} className={`${boton} border border-white/25 text-white hover:bg-white/10`}>
          Cancelar
        </button>
        <button type="button" onClick={alGuardar} disabled={guardando} className={`${boton} bg-celeste text-marino hover:bg-white`}>
          {guardando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Guardar encuadre
        </button>
      </div>
    </div>
  );
}
