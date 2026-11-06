# Fase 10 · Frontend: módulos y cierre

## Problema

Después de la fase 9, el negocio sigue repartido entre `features/`, `pages/`, `components/`, `context/`, `hooks/`, `routes/` y `types/`: una pantalla vive en `pages/` y su lógica en una o más features, 19 imports cruzan de una feature a otra y nada dice qué puede usar una feature de otra. Las llamadas a `/inscripciones` están en `equipos.api.ts`, `getPartidosByTorneo` (que llama a `/partidos`) en `torneos.api.ts`, y el calendario del torneo y el estudio de flyers repiten a mano la clave `['torneos', id, 'partidos', undefined]`.

## Qué entrega

- Los 12 módulos del plan en `src/modules/<nombre>/`: `api/`, `components/`, `pages/`, `types.ts` si tiene tipos propios, `routes.tsx` si tiene pantallas e `index.ts`, lo único que se importa desde afuera.
- `app/router.tsx` junta las `rutas` de cada módulo: mismas URLs, mismas guardas y la misma carga diferida.
- Un grafo sin ciclos. De abajo hacia arriba: auth, auspicios y sanciones; inscripciones; visor y partidos; equipos; jugadores y flyers; estadísticas; torneos y portada. Para lograrlo, estas piezas cambian de lugar sin cambiar su código:
  - las doce llamadas a `/inscripciones` salen de `equipos.api.ts` a `inscripciones/api/inscripciones.api.ts`;
  - `getPartidosByTorneo` pasa a partidos, y `postEstadisticasBulk` también: la usa solo el modal que finaliza un partido;
  - `LideresEstadisticos` y `getLideresEstadisticos` pasan a estadísticas, como dice el plan, y el panel del admin (`pages/admin/Dashboard`, que muestra el tablero y la actividad reciente) también;
  - el Footer y Contacto pasan a portada: el Footer solo lo usa la portada, y el layout toma de ahí el botón de WhatsApp.
- Las claves de React Query de partidos y de torneos, en el `api/claves.ts` de cada módulo: el calendario, el detalle del torneo y el estudio de flyers usan la misma `clavesPartidos.delTorneo`.
- `PartidosList` pasa a llamarse `CalendarioTorneo`, como en el plan.
- Los tipos que usa un solo módulo pasan de `shared/api/tipos.ts` a su `types.ts`; los que usan varios se quedan en `shared`.
- La prueba de fronteras, estricta para todo `src/` y sin trinquete: fuera de `app/`, `shared/` y `modules/` solo quedan `index.css`, `vite-env.d.ts`, `fronteras.test.ts` y `tests/`.
- `.agents/AGENTS.md`, el README y `DESIGN.md` con la estructura nueva.

## Fuera de alcance

- Cambiar comportamiento o aspecto: mismas rutas, mismas pantallas y las mismas claves de React Query (solo cambia dónde se escriben).
- Las claves del catálogo y de los demás módulos siguen escritas en cada componente.
- Se conserva la rareza anotada en la fase 9: `TorneosAdmin.test.tsx` mockea una ruta que no existe.

## Criterios de aceptación

- [x] No quedan `pages/`, `features/`, `components/`, `context/`, `hooks/`, `routes/` ni `types/`.
- [x] La prueba de fronteras es estricta y pasa, y falla con un import a una carpeta interna de otro módulo, con un ciclo entre módulos o con un archivo fuera de `app`, `shared` y `modules`.
- [x] Cada módulo va en su commit con `npm test` y `npm run build` en verde, sin código de más en el chunk inicial y con la prueba de humo igual a la del build de antes de la fase 9.
- [x] `.agents/AGENTS.md`, el README y `DESIGN.md` describen los módulos.
