import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { FiguraFlyer, ResultadoFlyer } from './api/flyers.api';

// Convenciones de cartel en Ecuador: 11 OCT, 17H00 y punto de miles
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
export const cifra = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 });
export const fechaCartel = (f: string) => {
  const d = parseISO(f);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
};
export const diaSemana = (f: string) => format(parseISO(f), 'EEEE', { locale: es });
export const horaCartel = (h: string | null) => h?.replace(':', 'H') ?? null;
const fechaLarga = (f: string) => format(parseISO(f), "EEEE d 'de' MMMM", { locale: es });
const fechaCorta = (f: string) => format(parseISO(f), "d 'de' MMMM", { locale: es });

// Gancho de los resultados: los puntos de los partidos jugados ese día (los W.O. no cuentan)
export function puntosDelDia(resultados: ResultadoFlyer[]) {
  const jugados = resultados.filter((r) => r.estado === 'finalizado');
  return { partidos: jugados.length, puntos: jugados.reduce((s, r) => s + r.local.marcador + r.visitante.marcador, 0) };
}

// Caption de Steban: emoji + gancho + detalle + enlace + etiquetas de la ciudad
const ETIQUETAS = '#BaloncestoManta #Manta #Manabí #Básquet';
const ENLACE = 'Estadísticas completas en baloncestomanta.com';
const cuenta = (n: number, uno: string, varios: string) => `${cifra.format(n)} ${n === 1 ? uno : varios}`;
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function textoResultados(fecha: string, resultados: ResultadoFlyer[]) {
  const { partidos, puntos } = puntosDelDia(resultados);
  const gancho = partidos
    ? `${cuenta(puntos, 'punto', 'puntos')} en ${cuenta(partidos, 'partido', 'partidos')}`
    : 'resultados del día';
  const filas = resultados.map(
    (r) => `${r.local.nombre_equipo} ${r.local.marcador}-${r.visitante.marcador} ${r.visitante.nombre_equipo}${r.estado === 'finalizado_wo' ? ' (W.O.)' : ''}`
  );
  return [`🏀 ${mayuscula(fechaLarga(fecha))} en el Coliseo Pablo Delgado Álava: ${gancho}.`, filas.join('\n'), 'Resultados y posiciones en baloncestomanta.com', ETIQUETAS].join('\n\n');
}

export function textoFigura(encabezado: string, f: FiguraFlyer) {
  const { puntos, rebotes, asistencias, tapones } = f.linea;
  const donde = f.partidos !== undefined ? `en ${cuenta(f.partidos, 'partido', 'partidos')}` : f.partido ? `en ${f.partido}` : '';
  // El equipo va entre paréntesis salvo que el encabezado ya lo nombre (figura del equipo)
  const quien = f.equipo && !encabezado.includes(f.equipo.nombre_equipo) ? `${f.jugador.nombre} (${f.equipo.nombre_equipo})` : f.jugador.nombre;
  return [
    `🔥 ${encabezado}: ${quien}, con ${puntos} puntos, ${rebotes} rebotes, ${asistencias} asistencias y ${tapones} tapones ${donde}. Valoración: ${f.valoracion}.`.replace(' .', '.'),
    ENLACE,
    ETIQUETAS,
  ].join('\n\n');
}

export function textoFiguras(fecha: string, figuras: FiguraFlyer[]) {
  const filas = figuras.map((f) => `${f.categoria}: ${f.jugador.nombre} (${f.equipo?.nombre_equipo ?? 'sin equipo'}), valoración ${f.valoracion}`);
  return [`🏆 Figuras del torneo al ${fechaCorta(fecha)}: la mejor valoración de cada categoría.`, filas.join('\n'), ENLACE, ETIQUETAS].join('\n\n');
}
