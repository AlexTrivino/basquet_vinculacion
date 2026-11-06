/**
 * Fronteras del frontend (constitución, regla 4), leídas del código con import.meta.glob.
 *
 * Estricto para lo nuevo:
 *  - a un módulo se entra solo por su index (`@/modules/<nombre>`);
 *  - `shared` no importa `modules` ni `app`; los módulos no importan `app`;
 *  - sin ciclos entre módulos.
 * Trinquete para lo viejo: los imports de una feature a archivos de otra solo pueden bajar.
 */
import { describe, expect, it } from 'vitest';

const IMPORTS_ENTRE_FEATURES = 10; // trinquete: cuando baje, bájalo aquí en el mismo commit

const FUENTES = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const IMPORT = /\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;

function normalizar(ruta: string): string {
  const partes: string[] = [];
  for (const parte of ruta.split('/')) {
    if (parte === '..') partes.pop();
    else if (parte && parte !== '.') partes.push(parte);
  }
  return `/${partes.join('/')}`;
}

/** Archivo al que apunta un import relativo o con `@/`; null si es un paquete de npm. */
function resolver(origen: string, especificador: string): string | null {
  if (!especificador.startsWith('.') && !especificador.startsWith('@/')) return null;
  const base = normalizar(especificador.startsWith('@/') ? `/src/${especificador.slice(2)}` : `${origen.slice(0, origen.lastIndexOf('/'))}/${especificador}`);
  return ['', '.ts', '.tsx', '/index.ts', '/index.tsx'].map((extension) => base + extension).find((ruta) => ruta in FUENTES) ?? base;
}

/** Zona (`modules`, `shared`, `app`, `features`…) y, si corresponde, el nombre del módulo o la feature. */
function zona(ruta: string): { zona: string; nombre?: string } {
  const [, , primera, segunda, tercera] = ruta.split('/');
  return { zona: primera, nombre: tercera === undefined ? undefined : segunda };
}

const IMPORTS = Object.entries(FUENTES).flatMap(([origen, codigo]) =>
  [...codigo.matchAll(IMPORT)].flatMap((coincidencia) => {
    const destino = resolver(origen, coincidencia[1]);
    return destino ? [{ origen, destino, de: zona(origen), a: zona(destino) }] : [];
  }),
);

function violacion({ destino, de, a }: (typeof IMPORTS)[number]): string | null {
  const mismoModulo = de.zona === 'modules' && de.nombre === a.nombre;
  if (a.zona === 'modules' && !mismoModulo && !/^\/src\/modules\/[^/]+\/index\.tsx?$/.test(destino)) return 'entra a un módulo sin pasar por su index';
  if (de.zona === 'shared' && (a.zona === 'modules' || a.zona === 'app')) return 'shared no importa modules ni app';
  if (de.zona === 'modules' && a.zona === 'app') return 'un módulo no importa app';
  return null;
}

function cicloEntreModulos(): string[] | null {
  const grafo = new Map<string, Set<string>>();
  for (const { de, a } of IMPORTS) {
    if (de.zona === 'modules' && a.zona === 'modules' && de.nombre && a.nombre && de.nombre !== a.nombre) {
      grafo.set(de.nombre, (grafo.get(de.nombre) ?? new Set()).add(a.nombre));
    }
  }
  const terminados = new Set<string>();
  const visitar = (nodo: string, camino: string[]): string[] | null => {
    if (camino.includes(nodo)) return [...camino.slice(camino.indexOf(nodo)), nodo];
    if (terminados.has(nodo)) return null;
    for (const siguiente of grafo.get(nodo) ?? []) {
      const ciclo = visitar(siguiente, [...camino, nodo]);
      if (ciclo) return ciclo;
    }
    terminados.add(nodo);
    return null;
  };
  for (const nodo of grafo.keys()) {
    const ciclo = visitar(nodo, []);
    if (ciclo) return ciclo;
  }
  return null;
}

describe('fronteras del frontend', () => {
  it('lee el código fuente', () => {
    expect(Object.keys(FUENTES).length).toBeGreaterThan(50);
  });

  it('respeta las reglas de módulos, shared y app', () => {
    const violaciones = IMPORTS.flatMap((i) => {
      const motivo = violacion(i);
      return motivo ? [`${i.origen} → ${i.destino}: ${motivo}`] : [];
    });
    expect(violaciones).toEqual([]);
  });

  it('no tiene ciclos entre módulos', () => {
    expect(cicloEntreModulos()).toBeNull();
  });

  it('no suma imports entre features viejas', () => {
    const entreFeatures = IMPORTS.filter(({ de, a }) => de.zona === 'features' && a.zona === 'features' && de.nombre && a.nombre && de.nombre !== a.nombre);
    expect(entreFeatures.length, 'Si bajó, actualiza IMPORTS_ENTRE_FEATURES; si subió, importa desde el index de un módulo').toBe(IMPORTS_ENTRE_FEATURES);
  });
});
