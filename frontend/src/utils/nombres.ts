const PARTICULAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'SAN', 'SANTA', 'Y']);

// "JUAN CARLOS PÉREZ LOOR" → apellidos "PÉREZ LOOR", nombres "JUAN CARLOS".
// Con partículas (DE, LA, SAN...) o más de cuatro palabras no se adivina el corte: va todo como apellidos.
export function partirNombre(nombre: string) {
  const p = nombre.split(/\s+/);
  if (p.length >= 2 && p.length <= 4 && !p.some((w) => PARTICULAS.has(w.toUpperCase()))) {
    const corte = p.length === 4 ? 2 : 1;
    return { apellidos: p.slice(corte).join(' '), nombres: p.slice(0, corte).join(' ') };
  }
  return { apellidos: nombre, nombres: '' };
}
