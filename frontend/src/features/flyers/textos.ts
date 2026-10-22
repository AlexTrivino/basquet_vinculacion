import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { FiguraFlyer, ResultadoFlyer } from './api/flyers.api';
import type { Partido } from '../../types/api.types';

// Lema del organizador, tomado de su flyer de programación
export const LEMA = '¡Es momento de revivir el pasado!';
// Microcopy vertical del borde derecho: qué es la valoración de la franja y, si hay empate, quién lo gana
export const VALORACION = 'Valoración = puntos + rebotes + asistencias + tapones';
export const DESEMPATE = 'Empate: gana la mayor valoración = pts + reb + ast + tap';

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

// Programación (partidos por jugar) o resultados (todos jugados) de una fecha
export function textoPartidos(fecha: string, filas: ResultadoFlyer[]) {
  if (filas.every((r) => r.estado.startsWith('finalizado'))) return textoResultados(fecha, filas);
  const primera = horaCartel(filas.find((r) => r.hora)?.hora ?? null);
  const lineas = filas.map((r) => `${horaCartel(r.hora) ?? 'Hora por definir'} · ${r.categoria}: ${r.local.nombre_equipo} vs ${r.visitante.nombre_equipo}`);
  return [
    `🏀 ${mayuscula(fechaLarga(fecha))}: ${cuenta(filas.length, 'partido', 'partidos')} en el Coliseo Pablo Delgado Álava${primera ? ` desde las ${primera}` : ''}.`,
    lineas.join('\n'),
    `${LEMA} Te esperamos.`,
    ETIQUETAS,
  ].join('\n\n');
}

// ── Líderes: una pieza por cada estadística que se carga en el acta ──
export const ESTADISTICAS = [
  { clave: 'puntos', titulo: ['Mayor', '', 'Encestador'], nombre: 'Mayor encestador', unidad: ['punto', 'puntos'], emoji: '🔥' },
  { clave: 'triples', titulo: ['Mayor', '', 'Triplista'], nombre: 'Mayor triplista', unidad: ['triple', 'triples'], emoji: '🎯' },
  { clave: 'rebotes', titulo: ['Mayor', '', 'Rebotero'], nombre: 'Mayor rebotero', unidad: ['rebote', 'rebotes'], emoji: '💪' },
  { clave: 'asistencias', titulo: ['Mayor', '', 'Asistidor'], nombre: 'Mayor asistidor', unidad: ['asistencia', 'asistencias'], emoji: '🤝' },
  { clave: 'tapones', titulo: ['Mayor', '', 'Taponero'], nombre: 'Mayor taponero', unidad: ['tapón', 'tapones'], emoji: '🚫' },
  { clave: 'tiros_libres', titulo: ['Rey del', '', 'Tiro libre'], nombre: 'Rey del tiro libre', unidad: ['tiro libre', 'tiros libres'], emoji: '🏀' },
] as const;
export type EstadisticaLider = (typeof ESTADISTICAS)[number];

// Los n mejores en una estadística (sin ceros); en empate, la mejor valoración
export function topJugadores(jugadores: FiguraFlyer[], clave: EstadisticaLider['clave'], idCategoria?: number, n = 3) {
  return jugadores
    .filter((j) => (idCategoria === undefined || j.id_categoria === idCategoria) && j.linea[clave] > 0)
    .sort((a, b) => b.linea[clave] - a.linea[clave] || b.valoracion - a.valoracion)
    .slice(0, n);
}

export function textoLideres(encabezado: string, lideres: { estadistica: EstadisticaLider; figura: FiguraFlyer }[]) {
  const lineas = lideres.map(
    ({ estadistica: e, figura: f }) =>
      `${e.emoji} ${e.nombre}: ${f.jugador.nombre}${f.equipo ? ` (${f.equipo.nombre_equipo})` : ''}, ${cuenta(f.linea[e.clave], e.unidad[0], e.unidad[1])}`
  );
  return [`📊 ${encabezado}`, lineas.join('\n'), ENLACE, ETIQUETAS].join('\n\n');
}

// 'Juvenil (masculino)'; si el nombre ya dice el género no se repite (igual que flyers_service._etiqueta)
export function etiquetaCategoria(c?: { nombre_categoria?: string; genero_categoria?: string } | null) {
  if (!c?.nombre_categoria) return null;
  const genero = (c.genero_categoria ?? '').trim();
  return !genero || c.nombre_categoria.toLowerCase().includes(genero.toLowerCase()) ? c.nombre_categoria : `${c.nombre_categoria} (${genero})`;
}

// Partido del calendario público → fila del flyer
export function filaDePartido(p: Partido): ResultadoFlyer {
  const lado = (e: Partido['equipo_local'], marcador: number) => ({
    id_equipo: e?.id_equipo ?? 0,
    nombre_equipo: e?.nombre_equipo ?? 'Por definir',
    url_logo: e?.url_logo ?? null,
    marcador,
  });
  return {
    id_partido: p.id_partido ?? p.id ?? 0,
    hora: p.hora ? p.hora.slice(0, 5) : null,
    categoria: etiquetaCategoria(p.categoria),
    fase: p.fase ?? '',
    llave: p.llave ?? null,
    estado: p.estado,
    local: lado(p.equipo_local, p.marcador_local ?? 0),
    visitante: lado(p.equipo_visitante, p.marcador_visitante ?? 0),
    figura: null,
  };
}

export function textoFiguras(fecha: string, figuras: FiguraFlyer[]) {
  const filas = figuras.map((f) => `${f.categoria}: ${f.jugador.nombre} (${f.equipo?.nombre_equipo ?? 'sin equipo'}), valoración ${f.valoracion}`);
  return [`🏆 Figuras del torneo al ${fechaCorta(fecha)}: la mejor valoración de cada categoría.`, filas.join('\n'), ENLACE, ETIQUETAS].join('\n\n');
}
