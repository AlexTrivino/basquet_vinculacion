/// <reference types="vite/client" />

// Declaraciones de módulos CSS para TypeScript strict
declare module '*.css' {
  const content: string;
  export default content;
}
