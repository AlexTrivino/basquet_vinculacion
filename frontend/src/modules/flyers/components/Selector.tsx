import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// El rótulo de los controles del estudio y su selector: los usan los filtros del panel y el jugador de cada premio
export const ETIQUETA = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400';
const SELECTOR =
  'block w-full cursor-pointer appearance-none rounded-lg border border-white/15 bg-marino py-2.5 pl-3 pr-9 text-sm font-semibold text-crema transition-colors hover:border-oro/50 disabled:cursor-not-allowed disabled:opacity-50';

export function Selector({ id, texto, valor, alCambiar, children, deshabilitado }: {
  id: string; texto: string; valor: string; alCambiar: (v: string) => void; children: ReactNode; deshabilitado?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={ETIQUETA}>{texto}</label>
      <div className="relative">
        <select id={id} value={valor} onChange={(e) => alCambiar(e.target.value)} disabled={deshabilitado} className={SELECTOR}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-oro" aria-hidden="true" />
      </div>
    </div>
  );
}
