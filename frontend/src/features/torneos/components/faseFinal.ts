import type { FormatoFaseFinal } from '../../../types/api.types';

// Espejo de services/llaves_service.FORMATOS: cuántos clasifican y cómo se cruzan
export const CUPOS: Record<FormatoFaseFinal, number> = { dos_grupos_cruces: 4, un_grupo_semis: 4, tres_final_directa: 3 };

export const NOMBRE_FORMATO: Record<FormatoFaseFinal, string> = {
  dos_grupos_cruces: 'Dos grupos con cruces',
  un_grupo_semis: 'Un grupo, semifinales 1-4 y 2-3',
  tres_final_directa: 'Tres equipos, final directa',
};

export const LEYENDA_CRUCES: Record<FormatoFaseFinal, string> = {
  dos_grupos_cruces: 'Cuartos de final: 1.º A vs 4.º B · 2.º B vs 3.º A · 1.º B vs 4.º A · 2.º A vs 3.º B. Los primeros de grupo solo pueden encontrarse en la final.',
  un_grupo_semis: 'Semifinales: 1.º vs 4.º y 2.º vs 3.º. Los perdedores juegan por el tercer puesto y los ganadores, la final.',
  tres_final_directa: 'El 1.º pasa directo a la final. El 2.º y el 3.º juegan un repechaje por el otro cupo.',
};

// Colores de las líneas del recorrido: oro y crema para los de arriba, luego tintas que se distinguen sobre marino
export const COLORES_LINEA = ['#D6B36A', '#F1E7D0', '#29A9E1', '#B49BF7', '#7FD3A8', '#F59E8B', '#9ED0FF', '#E8C1F2', '#FFD166', '#8FD3C7'];

export const SITUACION: Record<string, { texto: string; clase: string }> = {
  clasificado: { texto: 'Clasificado', clase: 'bg-oro text-marino' },
  zona: { texto: 'En zona', clase: 'bg-crema/15 text-crema' },
  depende: { texto: 'Depende de otros', clase: 'bg-white/10 text-slate-300' },
  eliminado: { texto: 'Eliminado', clase: 'bg-white/5 text-slate-500' },
};

// '2026-09-16' → '16 sep'
export const fechaCorta = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }).replace('.', '');
