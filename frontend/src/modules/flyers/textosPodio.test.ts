import { describe, expect, it } from 'vitest';
import type { PodioDeCategoria, PuestoDelPodio } from '@/modules/partidos';
import { ENLACE, ETIQUETAS } from './textos';
import { fechasDelTorneo, ganchoDelPuesto, LUGARES, lineasDelTorneo, pieDelTorneo, textoPodio } from './textosPodio';

const NOMBRE = 'CAMPEONATO NACIONAL INTERCOLEGIAL EXALUMNOS - SEDE MANTA';

const equipo = (id: number, nombre: string) => ({ id_equipo: id, nombre_equipo: nombre, url_logo: null });
const JAVIER = equipo(1, 'COLEGIO JAVIER');
const SPELLMAN = equipo(2, 'SPELLMAN');
const ANDINO = equipo(3, 'ANDINO 2.0');
const PIERREGROSSE = equipo(4, 'JULIO PIERREGROSSE');

const puesto = (lugar: 1 | 2 | 3, e: typeof JAVIER, extra: Partial<PuestoDelPodio> = {}): PuestoDelPodio => ({
  lugar, equipo: e, PJ: 6, PG: 4, PP: 2, PF: 300, PC: 250, sellos: [], partido: null, foto: null, url_foto_equipo: null, ...extra,
});
const partido = (ronda: string, propio: number, rival: number, contra: typeof JAVIER) => ({ ronda, fecha: '2026-11-02', propio, rival, wo: false, equipo_rival: contra });

const MAS40: PodioDeCategoria = {
  categoria: { id_categoria: 9, nombre_categoria: 'INFANTIL +40', genero_categoria: 'masculino' },
  puestos: [
    puesto(1, JAVIER, { PG: 6, PP: 0, sellos: ['invicto'], partido: partido('Final', 58, 55, SPELLMAN) }),
    puesto(2, SPELLMAN, { PF: 342, sellos: ['mas_puntos'], partido: partido('Final', 55, 58, JAVIER) }),
    puesto(3, ANDINO, { partido: partido('Tercer puesto', 52, 44, PIERREGROSSE) }),
  ],
};

describe('el título del campeonato en el flyer del podio', () => {
  it('el encabezado lleva el nombre en líneas y sin la sede', () => {
    expect(lineasDelTorneo(NOMBRE)).toEqual(['CAMPEONATO', 'NACIONAL', 'INTERCOLEGIAL', 'EXALUMNOS']);
  });

  it('junta palabras cortas en una línea, hasta 14 letras', () => {
    expect(lineasDelTorneo('LIGA DE BASQUET')).toEqual(['LIGA DE', 'BASQUET']);
    expect(lineasDelTorneo('COPA MANTA')).toEqual(['COPA MANTA']);
  });

  it('un año suelto se quita porque las fechas ya lo dicen, salvo que sea todo el nombre', () => {
    expect(lineasDelTorneo('LIGA 2026 DE BASQUET')).toEqual(['LIGA DE', 'BASQUET']);
    expect(lineasDelTorneo('2026')).toEqual(['2026']);
  });

  it('nunca pasa de cuatro líneas: lo que sobra se suma a la última', () => {
    const lineas = lineasDelTorneo('UNO DOS TRES CUATRO CINCO SEIS SIETE OCHO NUEVE DIEZ');
    expect(lineas).toHaveLength(4);
    expect(lineas[3]).toBe('OCHO NUEVE DIEZ');
  });

  it('el pie lleva el nombre completo con un punto medio donde estaba el guion', () => {
    expect(pieDelTorneo(NOMBRE)).toBe('CAMPEONATO NACIONAL INTERCOLEGIAL EXALUMNOS · SEDE MANTA');
    expect(pieDelTorneo('COPA MANTA')).toBe('COPA MANTA');
    expect(pieDelTorneo('SUB-15 INTERCOLEGIAL')).toBe('SUB-15 INTERCOLEGIAL'); // un guion pegado a una palabra no es la sede
  });

  it('las fechas van como en un cartel, con el año al final', () => {
    expect(fechasDelTorneo('2026-10-31', '2026-11-02')).toBe('31 OCT – 2 NOV 2026');
    expect(fechasDelTorneo('2026-11-02', '2026-11-02')).toBe('2 NOV 2026');
  });
});

describe('lo que cuenta cada puesto', () => {
  it('el campeón y el tercero cuentan el partido que los puso ahí', () => {
    expect(ganchoDelPuesto(MAS40.puestos[0])).toEqual(['Final · 2 nov', '58 – 55 ante SPELLMAN']);
    expect(ganchoDelPuesto(MAS40.puestos[2])).toEqual(['Tercer puesto · 2 nov', '52 – 44 ante JULIO PIERREGROSSE']);
  });

  it('el subcampeón cuenta su ataque si fue el mejor: perder la final no es el gancho', () => {
    expect(ganchoDelPuesto(MAS40.puestos[1])).toEqual(['Mejor ataque del torneo', '342 puntos en 6 partidos']);
  });

  it('si el subcampeón no tuvo el mejor ataque, cuenta la final', () => {
    expect(ganchoDelPuesto({ ...MAS40.puestos[1], sellos: [] })).toEqual(['Final · 2 nov', '55 – 58 ante COLEGIO JAVIER']);
  });

  it('sin llaves se cuenta la campaña en la tabla', () => {
    expect(ganchoDelPuesto(puesto(1, JAVIER, { PJ: 4, PG: 4, PP: 0 }))).toEqual(['1.º de la tabla', '4 ganados de 4']);
  });

  it('los nombres de los puestos', () => {
    expect(LUGARES).toEqual({ 1: 'Campeón', 2: 'Vicecampeón', 3: 'Tercer lugar' });
  });
});

describe('textoPodio (la descripción para Instagram)', () => {
  const texto = textoPodio(NOMBRE, MAS40);

  it('abre con el podio de la categoría en el torneo y trae los tres puestos con su dato', () => {
    expect(texto.startsWith(`🏆 Podio de INFANTIL +40 (masculino) en ${NOMBRE}`)).toBe(true);
    expect(texto).toContain('🥇 Campeón: COLEGIO JAVIER (Final · 2 nov: 58 – 55 ante SPELLMAN)');
    expect(texto).toContain('🥈 Vicecampeón: SPELLMAN (Mejor ataque del torneo: 342 puntos en 6 partidos)');
    expect(texto).toContain('🥉 Tercer lugar: ANDINO 2.0 (Tercer puesto · 2 nov: 52 – 44 ante JULIO PIERREGROSSE)');
  });

  it('cierra con el enlace y las etiquetas de la ciudad', () => {
    expect(texto.endsWith(`${ENLACE}\n\n${ETIQUETAS}`)).toBe(true);
  });

  it('un podio con solo dos puestos (sin tercer puesto jugado) trae solo esos', () => {
    const dos = textoPodio(NOMBRE, { ...MAS40, puestos: MAS40.puestos.slice(0, 2) });
    expect(dos).toContain('🥈');
    expect(dos).not.toContain('🥉');
  });
});
