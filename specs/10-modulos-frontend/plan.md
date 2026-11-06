# Fase 10 · Plan

## Qué recibe cada módulo

| Módulo | Recibe |
| --- | --- |
| auth | `features/auth`, `pages/auth`, `context/AuthContext` y `routes/ProtectedRoute` |
| auspicios | `features/patrocinadores`, `pages/admin/AdminPatrocinadores` y `components/SponsorsCarousel` |
| sanciones | `features/sanciones` y `pages/admin/AdminSanciones` |
| partidos | `features/partidos`, `pages/admin/AdminPartidos`, `getPartidosByTorneo` (de torneos) y `postEstadisticasBulk` (de estadísticas) |
| torneos | `features/torneos` (salvo `LideresEstadisticos`), `TorneoDetail`, `TorneosAdmin` y `FaseFinal`; `PartidosList` pasa a `CalendarioTorneo` |
| inscripciones | `features/plantillas`, los asistentes y modales de inscripción de `features/equipos`, `pages/delegado` (Inscripción, Plantilla, Reinscripción), `hooks/useBusinessRules` y las llamadas a `/inscripciones` de `equipos.api.ts` |
| equipos | lo demás de `features/equipos` (`equipos.api.ts`, `AuditoriaEquipos`, `DesactivarEquipoModal`, `ModalRetirarEquipo`), `DirectorioEquipos`, `EquipoProfile`, `AdminEquipos`, `Auditoria` y el panel del delegado con `BannerNuevosTorneos` |
| jugadores | `features/jugadores`, `JugadorProfile` y `AdminJugadores` |
| visor | `features/visor` y `pages/visor` |
| flyers | `features/flyers` |
| estadisticas | `features/estadisticas`, `LideresEstadisticos` (con `getLideresEstadisticos`) y `pages/admin/Dashboard` |
| portada | `features/landing`, `Home`, `components/Footer`, `components/Contacto` y `types/model-viewer.d.ts` |

Adentro de cada módulo: las llamadas en `api/`, los componentes en `components/`, las pantallas en `pages/`; `AuthContext`, `ProtectedRoute`, `useBusinessRules` y `textos.ts` (flyers) quedan en la raíz de su módulo.

## Grafo

```
auth, auspicios, sanciones
inscripciones  -> auth, sanciones
visor          -> inscripciones
partidos       -> inscripciones
equipos        -> auth, inscripciones, partidos
jugadores      -> auth, equipos, inscripciones, sanciones, visor
flyers         -> partidos
estadisticas   -> auth, flyers, partidos
torneos        -> auth, inscripciones, estadisticas, flyers, partidos
portada        -> auspicios, auth, equipos, estadisticas, partidos
```

Todos usan `shared`. Mientras un módulo no está migrado, el que lo usa lo importa por su carpeta vieja; la prueba de fronteras solo cuenta los ciclos entre módulos ya migrados.

## Rutas

Cada `routes.tsx` exporta `rutas`, con las páginas cargadas con `lazy` y `withSuspense` como hoy:

- `publicas`: van dentro de `MainLayout` (con su `ProtectedRoute` si la ruta la tiene sola, como `/visor` y `/perfil`);
- `delegado` y `admin`: hijas de `/delegado` y `/admin`, cuya guarda queda en `app/router.tsx`;
- `sueltas`: fuera del layout (las de `/auth`).

## Claves de React Query

- `modules/partidos/api/claves.ts`: `todos` (`['partidos']`, lo que invalidan las altas, ediciones y la fase final), `lista` (la tabla del admin), `delEquipo`, `pendientesDeEstadisticas` y `programados` (el panel del admin), `delTorneo` (`['torneos', id, 'partidos', categoría]`: calendario, detalle del torneo y estudio de flyers), `boxScore` y `estadisticas`.
- `modules/torneos/api/claves.ts`: `todos` (`['torneos']`), `detalle`, `posiciones`, `recorrido` y `faseFinal`.
- Los arreglos son los de hoy, letra por letra; el tipo `as const` los deja iguales.

## Cómo se mueve cada módulo

1. Lo que cambia de archivo (las llamadas que pasan a otro módulo, `LideresEstadisticos`) se copia tal cual y el origen deja de tenerlo.
2. `scratchpad/front/mudanza.py` hace los `git mv` y reescribe los imports de todo `src/`: desde afuera de un módulo, `@/modules/<nombre>`; los `vi.mock` siguen apuntando al archivo exacto. El mismo script dice qué nombres pide cada importador, y con eso se escribe el `index.ts`.
3. `routes.tsx` del módulo y sus rutas fuera de `app/router.tsx`.
4. Los tipos que solo usa el módulo, de `shared/api/tipos.ts` a su `types.ts`.
5. `npm test`, `npm run build`, el tamaño del chunk inicial y la prueba de humo (`scratchpad/front/humo.cjs`) contra el build de `6294037`; trinquete en lo que quede; `.agents/AGENTS.md`; commit.

Al final se borran las carpetas viejas y sus `.gitkeep`, la prueba de fronteras pierde el trinquete y gana la regla de que no haya archivos fuera de `app`, `shared` y `modules`, y se actualizan `.agents/AGENTS.md`, el README, `DESIGN.md` y `Docs/04_estructura_carpetas.md`.
