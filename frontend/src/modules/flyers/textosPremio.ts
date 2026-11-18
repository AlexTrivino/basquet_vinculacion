import { fechaCorta } from '@/modules/partidos';
import type { FiguraFlyer, FinalDeCategoria, PremiosDeCategoria, TipoPremio } from './api/flyers.api';
import { cuenta, ENLACE, ETIQUETAS, etiquetaCategoria, numerosDe } from './textos';

// Cada premio de la final: cómo se llama en el estudio, la palabra grande del flyer con su rótulo encima, el tope de su
// tamaño y los números del partido que cuenta. Las dos palabras comparten el renglón de arriba de la foto y tienen el
// mismo tope: «DEFENSA», más larga, entra a 176 px en los 940 que tiene de ancho.
interface Premio {
  nombre: string;
  descarga: string;
  palabra: string;
  encima: string;
  tope: number;
  numeros: readonly string[];
  emoji: string;
  sinElegir: string; // lo que se le dice al admin mientras no ha elegido: el flyer lleva al sugerido
  ayuda: string; // de dónde sale el premio y cómo se arma el flyer, en el panel del estudio
}
export const PREMIOS: Record<TipoPremio, Premio> = {
  mvp: {
    nombre: 'MVP de la final', descarga: 'Descargar MVP', palabra: 'MVP', encima: 'Jugador más valioso', tope: 176,
    numeros: ['puntos', 'triples', 'rebotes', 'asistencias', 'tapones'], emoji: '🏆',
    sinElegir: 'Sin elegir: el flyer lleva al de mejor valoración de la final. Elige a otro si no fue la figura del partido.',
    ayuda: 'El MVP sale del equipo campeón de la final. Elige al jugador (no siempre es el de mejor valoración) y sube su foto: acomódala con «Ajustar recorte», lo que ves es lo que se descarga.',
  },
  defensa: {
    nombre: 'Mejor defensa de la final', descarga: 'Descargar mejor defensa', palabra: 'DEFENSA', encima: 'Mejor', tope: 176,
    numeros: ['rebotes', 'tapones'], emoji: '🛡️',
    sinElegir: 'Sin elegir: el flyer lleva al de más rebotes y tapones de la final. Elige a otro si no fue el mejor defensa.',
    ayuda: 'El mejor defensa sale de los dos equipos de la final y el flyer lleva sus rebotes y tapones de ese partido. Elige al jugador y sube su foto: acomódala con «Ajustar recorte», lo que ves es lo que se descarga.',
  },
};

// Los números del partido que lleva el flyer: los del premio y solo los que no están en 0
export const numerosDelPremio = (tipo: TipoPremio, linea: FiguraFlyer['linea']) =>
  numerosDe(linea).filter((n) => PREMIOS[tipo].numeros.includes(n.clave));

// El partido de la final contado desde el equipo del premiado: «Final · 2 nov» y «58 – 55 ante SPELLMAN». Sin equipo
// conocido se cuenta desde el campeón.
export function resultadoDeLaFinal(final: FinalDeCategoria, idEquipo?: number | null): readonly [string, string] {
  const [propio, rival] = idEquipo === final.vice.id_equipo ? [final.vice, final.campeon] : [final.campeon, final.vice];
  const etiqueta = [final.ronda, final.fecha && fechaCorta(final.fecha)].filter(Boolean).join(' · ');
  return [etiqueta, `${propio.marcador} – ${rival.marcador} ante ${rival.nombre_equipo}`];
}

// Una opción del selector de jugador: el nombre y sus cifras de la final, para elegir con los números a la vista
const CORTO: Record<string, string> = { puntos: 'pts', triples: 'tri', rebotes: 'reb', asistencias: 'ast', tapones: 'tap' };
export function etiquetaCandidato(tipo: TipoPremio, f: FiguraFlyer) {
  const cifras = numerosDelPremio(tipo, f.linea).map((n) => `${n.valor} ${CORTO[n.clave]}`).join(', ');
  return `${f.jugador.nombre} · ${cifras || 'sin cifras'}${tipo === 'defensa' && f.equipo ? ` · ${f.equipo.nombre_equipo}` : ''}`;
}

// «a, b y c»
const enumerar = (partes: string[]) => (partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}` : (partes[0] ?? ''));

// Descripción para Instagram: el premio, el jugador con su equipo, sus números de la final y el resultado
export function textoPremio(tipo: TipoPremio, torneo: string, premio: Pick<PremiosDeCategoria, 'categoria' | 'final'>, f: FiguraFlyer) {
  const cifras = enumerar(numerosDelPremio(tipo, f.linea).map((n) => cuenta(n.valor, n.unidad[0], n.unidad[1])));
  const [, resultado] = resultadoDeLaFinal(premio.final, f.equipo?.id_equipo);
  const quien = f.equipo ? `${f.jugador.nombre} (${f.equipo.nombre_equipo})` : f.jugador.nombre;
  const { nombre, emoji } = PREMIOS[tipo];
  return [
    `${emoji} ${nombre} de ${etiquetaCategoria(premio.categoria)} en ${torneo}: ${quien}${cifras ? `, con ${cifras}` : ''} en la final (${resultado}).`,
    ENLACE,
    ETIQUETAS,
  ].join('\n\n');
}
