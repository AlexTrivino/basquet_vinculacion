# Fase 9 · Plan

## A dónde va cada archivo

| Hoy | Después |
| --- | --- |
| `main.tsx`, `routes/router.tsx` | `app/main.tsx`, `app/router.tsx` |
| `components/{MainLayout,Navbar,Sidebar,ErrorBoundary}.tsx` | `app/` |
| `pages/errors/{NotFound,Unauthorized}.tsx` | `app/` |
| `components/{AsyncButton,ConfirmationModal,DataGridTable,EmptyState,Skeleton,StatusBadge,FotoJugador,SearchableSelect,FileUploadButton}.tsx` y las pruebas de AsyncButton y StatusBadge | `shared/ui/` |
| `Escudo` de `features/torneos/components/PartidosList.tsx` | `shared/ui/Escudo.tsx` |
| `Esquinas` de `features/landing/SeccionPartidos.tsx` | `shared/ui/Esquinas.tsx` |
| `withSuspense` de `routes/router.tsx` | `shared/ui/withSuspense.tsx` |
| `api/axios.config.ts` | `shared/api/axios.config.ts` |
| `types/api.types.ts` | `shared/api/tipos.ts` |
| `getTorneos`, `getTorneosAdmin` y `getTorneosDisponiblesReinscripcion` de `features/torneos/api/torneos.api.ts`; `getCategorias` de `features/categorias/api/categorias.api.ts` | `shared/api/catalogo.ts` (y se borra `features/categorias`) |
| `utils/{nombres,authStorage}.ts` | `shared/lib/` |

Se quedan donde están: `index.css`, `vite-env.d.ts`, `fronteras.test.ts`, `tests/setup.ts` y `types/model-viewer.d.ts` (va a portada en la fase 10). Se borran los `.gitkeep` de `api/` y `utils/`, que quedan vacías.

## Cómo se mueve

- Las piezas que salen de un archivo (`Escudo`, `Esquinas`, `withSuspense` y las cuatro lecturas del catálogo) se copian tal cual a su archivo nuevo y el archivo de origen las importa de ahí.
- Lo demás va con `git mv`, sin tocar el código de los componentes.
- Un script reescribe los imports de todo `src/` (también `import()` y `vi.mock`): resuelve cada especificador contra la ubicación vieja y lo vuelve a escribir desde la nueva, relativo dentro de la misma zona y con `@/` entre zonas. Un import que trae piezas que se fueron a archivos distintos se parte en uno por archivo.
- Las pruebas que mockeaban `torneos.api` para la lista de torneos mockean `@/shared/api/catalogo`; donde la pantalla también usa `getCategorias` real, el mock conserva lo original con `importOriginal`.

## Comprobaciones

- `npm test` y `npm run build`.
- Tamaño del chunk inicial antes y después con `dist/index.html` (el `index` y su `modulepreload`).
- Grep: nada en `shared/` importa `features/`, `pages/`, `components/`, `context/`, `hooks/`, `routes/` ni `utils/`.

## Resultado

- 23 archivos con `git mv`, cuatro piezas sacadas a `shared` (`Escudo`, `Esquinas`, `withSuspense` y el catálogo) y `features/categorias` borrada; 71 archivos con los imports reescritos.
- El trinquete de imports entre features bajó de 33 a 19: eran las lecturas del catálogo y `Escudo`.
- Las 80 pruebas pasan sin cambiar nada más que los mocks del catálogo (4 archivos).
- Prueba de humo: el build de antes y el de después, con la API simulada devolviendo listas vacías, muestran el mismo texto y ningún error en las 42 rutas que recorren un visitante, el admin, un delegado y un visor.
- El chunk inicial pasa de 403.019 a 403.116 bytes: los 97 de más son nombres e índices de chunks en el mapa de precarga; el código es el mismo.
