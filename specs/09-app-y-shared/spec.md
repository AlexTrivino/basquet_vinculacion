# Fase 9 · Frontend: app y shared

## Problema

En `src/` conviven sin orden el armado de la aplicación (`main.tsx`, `routes/router.tsx`, el layout con su barra y su menú lateral, las páginas de error), el kit de interfaz (`components/`), el cliente de la API (`api/axios.config.ts`), los tipos (`types/api.types.ts`) y dos utilidades (`utils/`), al lado de las features.

Además, piezas que no son de ningún negocio viven dentro de una feature y las demás las importan desde ahí: `Escudo` está en `features/torneos/components/PartidosList.tsx` (lo usan equipos, flyers, jugadores y el visor) y `Esquinas` en `features/landing/SeccionPartidos.tsx` (la usa el perfil del equipo).

Y casi todas las pantallas leen la lista de torneos y la de categorías (`getTorneos`, `getTorneosAdmin`, `getTorneosDisponiblesReinscripcion` y `getCategorias`) desde `features/torneos` y `features/categorias`. Cuando torneos sea un módulo, sus pantallas usarán partidos, flyers, estadísticas e inscripciones, y esos módulos usarán la lista de torneos: se necesitarían mutuamente.

## Qué entrega

- `src/app/`: `main.tsx` (los providers: ErrorBoundary, React Query, Auth, el router y el Toaster), `router.tsx`, `MainLayout.tsx`, `Navbar.tsx`, `Sidebar.tsx`, `ErrorBoundary.tsx`, `NotFound.tsx` y `Unauthorized.tsx`. `index.html` carga `/src/app/main.tsx`.
- `src/shared/ui/`: AsyncButton, ConfirmationModal, DataGridTable, EmptyState, Skeleton, StatusBadge, FotoJugador, SearchableSelect y FileUploadButton, con sus pruebas; `Escudo` (sale de PartidosList), `Esquinas` (sale de SeccionPartidos) y `withSuspense` (sale del router, para que cada módulo arme sus rutas con carga diferida en la fase 10).
- `src/shared/api/`: `axios.config.ts` (el cliente), `tipos.ts` (hoy `types/api.types.ts`: `ApiResponse`, la paginación y los tipos de la API; en la fase 10 cada módulo se lleva los que solo usa él) y `catalogo.ts` (las cuatro lecturas de torneos y categorías que usan todos).
- `src/shared/lib/`: `nombres.ts` y `authStorage.ts`.
- Los imports apuntan a la ubicación nueva: con `@/` entre zonas y relativos dentro de la misma.

## Fuera de alcance

- Cambiar comportamiento o aspecto: mismos componentes, mismas rutas y mismas claves de React Query. Las pruebas que mockeaban `torneos.api` para la lista de torneos mockean `catalogo`.
- El Footer y Contacto no van a `app`, aunque el plan ponía el Footer ahí: el Footer solo lo usa la portada, Contacto lo usan el Footer y el layout (el botón de WhatsApp), y un módulo no puede importar `app`. Van a portada en la fase 10; hasta entonces siguen en `components/`.
- Se deja como está, para otra especificación: `TorneosAdmin.test.tsx` mockea `'../../../features/torneos/api/torneos.api'`, una ruta que sale de `src` y no existe, así que esa prueba usa la API real.

## Criterios de aceptación

- [x] `npm test` (tsc y vitest, con la prueba de fronteras) y `npm run build` en verde.
- [x] `shared` solo importa paquetes y `shared`: la prueba de fronteras lo exige para `app` y `modules`, y un grep, para el código viejo.
- [x] El chunk inicial (el `index` y lo que precarga) no crece en código: pasa de 403.019 a 403.116 bytes, y los 97 de más son el mapa de precarga de Vite, que nombra los chunks nuevos (Escudo, Esquinas, el catálogo) en las rutas que los usan.
- [x] El trinquete de imports entre features baja a lo que quede.
- [x] README, `.agents/AGENTS.md` y la skill de frontend describen `app/` y `shared/`.
