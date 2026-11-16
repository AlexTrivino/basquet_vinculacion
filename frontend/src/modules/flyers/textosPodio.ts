import { parseISO } from 'date-fns';
import { partidoClave, type PodioDeCategoria, type PuestoDelPodio } from '@/modules/partidos';
import { cuenta, ENLACE, ETIQUETAS, etiquetaCategoria, fechaCartel } from './textos';

export const LUGARES = { 1: 'Campeón', 2: 'Vicecampeón', 3: 'Tercer lugar' } as const;
const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' } as const;

// El nombre del campeonato suele traer la sede tras un guion («… EXALUMNOS - SEDE MANTA»): el encabezado del flyer lleva
// el título y el pie, el nombre completo con un punto medio en lugar del guion
const SEDE = /\s+[-–—]\s+/;
export const pieDelTorneo = (nombre: string) => nombre.split(SEDE).join(' · ');

// El título en líneas para el encabezado: las palabras se juntan hasta LETRAS por línea, hay NUMERO_LINEAS como mucho
// (lo que sobra se suma a la última) y un año suelto se quita porque las fechas ya lo dicen
const LETRAS = 14;
const NUMERO_LINEAS = 4;
export function lineasDelTorneo(nombre: string) {
  const palabras = nombre.split(SEDE)[0].trim().split(/\s+/).filter((p, _, todas) => todas.length === 1 || !/^\d{4}$/.test(p));
  const lineas: string[] = [];
  for (const p of palabras) {
    const ultima = lineas.length - 1;
    if (ultima >= 0 && (lineas.length === NUMERO_LINEAS || lineas[ultima].length + 1 + p.length <= LETRAS)) lineas[ultima] += ` ${p}`;
    else lineas.push(p);
  }
  return lineas;
}

// «31 OCT – 2 NOV 2026»; si el torneo dura un día, «2 NOV 2026»
export function fechasDelTorneo(inicio: string, fin: string) {
  const rango = inicio === fin ? fechaCartel(fin) : `${fechaCartel(inicio)} – ${fechaCartel(fin)}`;
  return `${rango} ${parseISO(fin).getFullYear()}`;
}

// Lo que cuenta el flyer de cada puesto: una etiqueta y debajo el dato. El campeón y el tercero cuentan el partido que
// los puso ahí; el subcampeón, su ataque si fue el mejor (perder la final no es el gancho) y si no, la final.
export function ganchoDelPuesto(puesto: PuestoDelPodio): readonly [string, string] {
  if (puesto.lugar === 2 && puesto.sellos.includes('mas_puntos')) {
    return ['Mejor ataque del torneo', `${cuenta(puesto.PF, 'punto', 'puntos')} en ${cuenta(puesto.PJ, 'partido', 'partidos')}`];
  }
  return partidoClave(puesto);
}

// Descripción para Instagram: los tres puestos con su dato, el enlace y las etiquetas de la ciudad
export function textoPodio(torneo: string, podio: PodioDeCategoria) {
  const filas = podio.puestos.map((p) => {
    const [etiqueta, dato] = ganchoDelPuesto(p);
    return `${MEDALLAS[p.lugar]} ${LUGARES[p.lugar]}: ${p.equipo.nombre_equipo} (${etiqueta}: ${dato})`;
  });
  return [`🏆 Podio de ${etiquetaCategoria(podio.categoria)} en ${torneo}`, filas.join('\n'), ENLACE, ETIQUETAS].join('\n\n');
}
