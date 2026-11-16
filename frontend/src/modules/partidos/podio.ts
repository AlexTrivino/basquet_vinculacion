import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PuestoDelPodio } from './api/partidos.api';

export const fechaCorta = (f: string) => format(parseISO(f), 'd MMM', { locale: es });

// El partido que definió el puesto: «Final · 2 nov» y «58 – 55 ante Spellman»; sin llaves, su campaña en la tabla.
// Lo leen la portada y el flyer del podio.
export function partidoClave(puesto: PuestoDelPodio): [string, string] {
  const p = puesto.partido;
  if (!p) return [`${puesto.lugar}.º de la tabla`, `${puesto.PG} ${puesto.PG === 1 ? 'ganado' : 'ganados'} de ${puesto.PJ}`];
  const etiqueta = [p.ronda, p.fecha && fechaCorta(p.fecha)].filter(Boolean).join(' · ');
  const rival = p.equipo_rival.nombre_equipo;
  if (p.wo) return [etiqueta, `${p.propio >= p.rival ? 'Ganó' : 'Perdió'} por W.O. ante ${rival}`];
  return [etiqueta, `${p.propio} – ${p.rival} ante ${rival}`];
}
