import type { DetailedHTMLProps, HTMLAttributes } from 'react';

// Tipos JSX mínimos para el web component <model-viewer> (@google/model-viewer).
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src: string;
        alt: string;
        'auto-rotate'?: boolean;
        'rotation-per-second'?: string;
        'interaction-prompt'?: 'auto' | 'none';
        'camera-orbit'?: string;
        'environment-image'?: string;
        exposure?: string;
        loading?: 'auto' | 'lazy' | 'eager';
      };
    }
  }
}
