import { lazy } from 'react';

// El flyer de la fecha (y html-to-image) se descarga aparte, solo cuando el admin elige una fecha del calendario.
// Vive en su propio archivo para que el index.ts sea solo reexportaciones: un index con código propio hace que
// la vista del torneo arrastre al chunk de los flyers.
export const FlyerFecha = lazy(() => import('./FlyerFecha'));
