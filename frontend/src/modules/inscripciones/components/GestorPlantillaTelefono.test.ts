import { describe, it, expect } from 'vitest';
import { jugadorSchema } from './GestorPlantilla';

const jugador = { documento_identificacion: '1310000001', nombre: 'ANA MERO', fecha_nacimiento: '2000-01-01', numero_camiseta: 7 };

describe('teléfono del formulario de plantilla', () => {
  it('acepta vacío (jugador que ya existe: el backend no le da su teléfono a otro delegado) o 10 dígitos', () => {
    expect(jugadorSchema.safeParse({ ...jugador, telefono: '' }).success).toBe(true);
    expect(jugadorSchema.safeParse({ ...jugador, telefono: '0991112233' }).success).toBe(true);
  });

  it('rechaza un número incompleto o con letras', () => {
    expect(jugadorSchema.safeParse({ ...jugador, telefono: '09911' }).success).toBe(false);
    expect(jugadorSchema.safeParse({ ...jugador, telefono: '099111223x' }).success).toBe(false);
  });
});
