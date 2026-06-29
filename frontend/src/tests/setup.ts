import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Limpia el DOM después de cada suite/test para evitar efectos secundarios
afterEach(() => {
  cleanup();
});
