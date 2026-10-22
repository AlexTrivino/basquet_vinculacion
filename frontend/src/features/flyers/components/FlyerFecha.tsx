import { useState } from 'react';
import { FORMATOS, type Formato } from './Flyer';
import { Laminas, paginasDeLaFecha } from './Laminas';
import { filaDePartido } from '../textos';
import type { Partido } from '../../../types/api.types';

// Flyer de los partidos de la fecha elegida en el calendario del torneo, para redes (4:5) o estados (9:16).
// Se carga aparte (lazy) para que html-to-image no pese en la vista del torneo.
export default function FlyerFecha({ fecha, partidos }: { fecha: string; partidos: Partido[] }) {
  const [formato, setFormato] = useState<Formato>('feed');
  const filas = partidos.filter((p) => p.estado !== 'anulado').map(filaDePartido);
  const paginas = paginasDeLaFecha(fecha, filas, formato);
  if (!paginas.length) return null;

  return (
    <section aria-labelledby="flyer-fecha" className="rounded-xl border border-oro/30 bg-marino-claro/80 p-4 shadow-xl shadow-black/30 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 id="flyer-fecha" className="font-display text-lg font-bold text-crema">Flyer de la fecha</h3>
        <div className="flex gap-1 rounded-lg bg-white/5 p-1" role="group" aria-label="Formato del flyer">
          {(Object.keys(FORMATOS) as Formato[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={formato === f}
              onClick={() => setFormato(f)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                formato === f ? 'bg-marino text-crema ring-1 ring-inset ring-oro/60' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f === 'feed' ? 'Redes' : 'Estados'}
            </button>
          ))}
        </div>
      </div>
      <Laminas paginas={paginas} formato={formato} torneo={partidos[0]?.torneo?.nombre ?? ''} anchoMaximo={formato === 'historia' ? 300 : 440} />
    </section>
  );
}
