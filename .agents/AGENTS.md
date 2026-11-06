# Reglas del Proyecto — Plataforma de Torneos de Baloncesto

Documento de directivas para el Agente de IA (Agy).
Aplica a todo el workspace: `backend/` y `frontend/`.

---

## Rol del Agente

**Tech Lead & Senior Full-Stack Developer.**
El agente debe actuar proactivamente, aplicar principios SOLID, DRY y YAGNI,
y nunca escribir código de relleno ni sobre-diseñar.

### Restricciones Adicionales de Negocio
- **Límite de Equipos:** Un usuario delegado puede crear y gestionar un **máximo de 3 equipos**.
- **Gestión Estricta:** La gestión de plantillas solo se permite si la inscripción está estrictamente **aprobada**.
- **Tamaño de Plantilla:** Un equipo debe tener un **mínimo de 5 jugadores** para estar reglamentariamente habilitado a competir, y un **máximo de 18 jugadores** registrados.
- **Acciones Destructivas:** La desactivación de equipos es exclusiva del `super_admin`. Los delegados no tienen acceso a esta función.

---

## Stack Tecnológico

### Backend (Flask — *en migración a Clean Architecture por fases: ver `specs/`*)

| Capa | Tecnología |
|------|-----------|
| Framework | Flask 3.1 |
| ORM | SQLAlchemy 2.0 (API `insert()`, `selectinload`, `joinedload`) |
| Migraciones | Alembic / Flask-Migrate |
| BD | PostgreSQL en Supabase |
| Auth | Supabase Auth (JWKS ES256 + fallback HS256) |
| Validación | Marshmallow 3 (schemas DTO diferenciados) |
| Storage | Supabase Storage via boto3 (magic bytes, cero disco) |
| PDF | ReportLab Platypus (BytesIO en memoria) |
| Servidor | Gunicorn |

### Estructura del backend

- `app/shared/` es lo que comparten todos los módulos:
  - `domain/`: `errores.py` (`NoEncontrado`, `ReglaDeNegocio`, `Conflicto` y `SinPermiso`, que `shared/http` responde con 404 `NOT_FOUND`, 422 `VALIDATION_ERROR`, 409 `CONFLICT` y 403 `FORBIDDEN`), `reglas.py` (los cupos de equipos y de plantilla) y `textos.py` (`normalizar_mayusculas`).
  - `infrastructure/`: `db.py` (`db`, `migrate` y `enviar_cambios`, que manda la sesión a la base y traduce un rechazo a `Conflicto`), `modelos/` (los 14 modelos), `almacenamiento.py` (Supabase Storage), `unidad_de_trabajo.py` (`confirmar`, `revertir`) y `paginacion.py` (`paginar`).
  - `http/`: `respuestas.py` (`api_response`, `api_error`), `paginacion.py` (`paginate_query` y, para los módulos, `pagina_pedida`), `autenticacion.py` (`token_required`, `identidad_opcional`; la usan todos los módulos, por eso no está en `identidad`), `errores.py`, y los blueprints de toda la app: `salud.py` (`/api/health`) y `reglas.py` (`/api/config/reglas-negocio`).
- `app/modules/<módulo>/{domain,application,infrastructure,http}`: `auspicios`, `competencia` (partidos, sanciones, tabla de posiciones y fase final), `torneos` (torneos y categorías), `plantel` (equipos, jugadores y el buscador del visor), `inscripciones` (inscripciones y plantillas), `estadisticas` (la carga por partido, los líderes, los flyers, el tablero y la planilla en PDF) e `identidad` (el perfil del usuario autenticado). Fuera de `app/modules` y `app/shared` solo queda la fábrica (`app/__init__.py`): ya no hay `app/routes`, `app/services`, `app/schemas`, `app/utils` ni `app/models`.
- Molde de un módulo (`app/modules/auspicios`):
  - `domain/`: entidades (dataclasses) y reglas en Python puro; sin Flask, SQLAlchemy ni marshmallow.
  - `application/`: una función por caso de uso, en `casos_de_uso.py` o, si el módulo es grande, un archivo por tema (`competencia/application/partidos.py`, `sanciones.py`, `fase_final.py`); recibe `repositorio`, `almacen` (`subir_archivo`, `borrar_archivo`) y `unidad` (`confirmar`, `revertir`) por parámetro y devuelve entidades; quien pide llega como `id_usuario` y `rol`. Lanza `NoEncontrado`, `ReglaDeNegocio`, `Conflicto` o `SinPermiso`.
  - `infrastructure/repositorio.py`: consultas con los modelos compartidos; convierte filas en entidades.
  - `http/`: los blueprints (mismo `url_prefix`, rutas y nombres de vista que antes; las rutas que se van de otro blueprint, como las de fase final que estaban en `torneo_bp`, pasan a uno del módulo) y los esquemas marshmallow; valida la entrada, arma las piezas y traduce a la respuesta exacta de antes. Un listado lee la página con `pagina_pedida()` y el repositorio la pagina con `paginar()`.
  - Pruebas: las reglas del dominio y los casos de uso con piezas falsas (`tests/test_auspicios.py`, `tests/test_competencia.py`, `tests/test_torneos.py`, `tests/test_plantel.py`, `tests/test_inscripciones.py`, `tests/test_estadisticas.py`, `tests/test_identidad.py`) y el contrato de sus endpoints sin regrabar.
  - Entre módulos: la infraestructura o el `http` de un módulo usa otro solo por su `application`. Ejemplo: competencia lee la fila del torneo con el modelo compartido y le pregunta a `torneos.application` si está `vigente`; plantel lee la plantilla de un jugador con el modelo compartido para el buscador por cédula.
- Todo importa desde `app.shared` o desde su módulo, también las pruebas y los scripts (`seed_database.py`, `seeders/`, `scripts/`): `db` sale de `app.shared.infrastructure.db` y los modelos de `app.shared.infrastructure.modelos` (`from app import db` y `app.models` ya no existen). `tests/test_capas.py` es estricta para todo `app/`: falla con cualquier archivo fuera de un módulo o de `shared`, o con un import que rompa la regla de dependencia.

### Frontend (React — *en desarrollo*)

| Capa | Tecnología |
|------|-----------|
| Bundler | Vite |
| UI | React 18 + TypeScript estricto |
| Estilos | Tailwind CSS |
| Íconos | Lucide-React |
| Enrutamiento | React Router DOM v6 (`createBrowserRouter`) |
| Red | Axios (instancia configurada con interceptores) |
| Formularios | React Hook Form + Zod |
| Estado global | Context API (solo para Auth) |
| Testing | Vitest + React Testing Library |
| Toast/Notificaciones | Sonner |

---

## Arquitectura del Frontend

### Estructura de Carpetas (Screaming Architecture — migración por fases, ver `specs/`)

```
src/
 ├── app/            # Arma la aplicación: main.tsx (providers), router.tsx, MainLayout, Navbar, Sidebar,
 │                   # ErrorBoundary, NotFound y Unauthorized
 ├── shared/         # Lo que no es de ningún negocio; no importa app/ ni modules/
 │   ├── ui/         # UI kit: AsyncButton, ConfirmationModal, DataGridTable, EmptyState, Skeleton, StatusBadge,
 │   │               # FotoJugador, SearchableSelect, FileUploadButton, Escudo, Esquinas y withSuspense
 │   ├── api/        # axios.config.ts (cliente), tipos.ts (ApiResponse y tipos de la API) y catalogo.ts
 │   │               # (las lecturas de torneos y categorías que usan todos los módulos)
 │   └── lib/        # nombres.ts y authStorage.ts
 ├── modules/        # Un módulo por negocio (fase 10); de afuera se entra solo por su index.ts
 ├── features/, pages/, components/, context/, hooks/, routes/
 │                   # Código que todavía no pasó a su módulo
 ├── tests/setup.ts  # Configuración de Vitest + RTL
 └── fronteras.test.ts  # Verifica en npm test que shared no importe app ni módulos, que a un módulo
                        # se entre por su index y que no haya ciclos entre módulos
```

Imports: relativos dentro de la misma zona (un módulo, `app/` o `shared/`) y con el alias `@/` entre zonas
(`@/shared/ui/Skeleton`, `@/modules/<nombre>`).

Cada módulo tiene `api/`, `components/`, `pages/`, `types.ts` si tiene tipos propios, `routes.tsx` con sus
`rutas` (`publicas` dentro del layout, `delegado` y `admin` bajo su guarda, `sueltas` fuera del layout), que junta
`app/router.tsx`, e `index.ts` con lo único que usan los demás. El `index.ts` solo reexporta: con código propio
(un `lazy`, una constante) Vite mete en el chunk de quien lo importa todo lo que el index reexporta. Migrados (fase 10):
- `auth`: la sesión (`AuthContext`), `ProtectedRoute`, login, registro, recuperación de la clave y perfil.
- `auspicios`: los patrocinadores: el carrusel de la portada (`SponsorsCarousel`) y su administración.
- `sanciones`: las sanciones de los jugadores (`getSanciones`, que también consulta la plantilla) y su administración.
- `partidos`: la programación y el cierre de los partidos (estadísticas y acta), el box score público y las listas de partidos que leen el calendario, la portada, los flyers y el perfil del equipo, con sus claves de React Query en `api/claves.ts` (`clavesPartidos`).
- `torneos`: el detalle público del torneo (`CalendarioTorneo`, posiciones, llaves, recorrido y líderes), su administración y la fase final, con sus claves de React Query en `api/claves.ts` (`clavesTorneos`) y `types.ts` con las posiciones, las llaves y el recorrido. Nadie lo importa: solo expone `rutas`.
- `inscripciones`: las inscripciones (asistentes de inscripción y reinscripción, revisión, edición, retiro y purga de borradores; sus llamadas a `/inscripciones` salieron de `equipos.api.ts`), las plantillas con `GestorPlantilla` y `useBusinessRules`.
- `equipos`: el directorio y el perfil público de los equipos, su administración (con la auditoría de inscripciones y la baja) y el panel del delegado (`Dashboard`, con `BannerNuevosTorneos`).
- `jugadores`: el perfil público del jugador y la administración de los jugadores, con `types.ts` (el perfil con sus participaciones y métricas).
- `visor`: el buscador de jugadores del rol visor (`/visor`, con su guarda) y `PartidosJugador`, que también usa el perfil del jugador.
- `flyers`: el estudio de flyers del panel del admin (`EstudioFlyers`) y el flyer de la fecha del calendario (`FlyerFecha`, que el `index.ts` exporta con `lazy` para que html-to-image no pese en la vista del torneo).
- `estadisticas`: el panel del admin (tablero, actividad reciente, partidos pendientes y el estudio de flyers), `LideresEstadisticos` (la pestaña Estadísticas del torneo) y los totales públicos de la portada.

**Prohibido:** estructura plana, `useState` múltiples en formularios complejos,
componentes controlados puros donde aplique React Hook Form.

---

## Sistema de Diseño (Design Tokens)

### Estrategia de Color — Dinámica por Torneo

```
Página principal / Shell           → Paleta neutra institucional
(Navbar, Footer, Auth, Admin)        (grises + azul oscuro + blanco)

Vista de Torneo (/torneos/:id)     → Colores dinámicos alineados con
Posiciones, Calendario, Stats        la línea gráfica de cada torneo
                                     (CSS custom properties inyectadas)
```

- Paleta base neutra para el shell de la app (Navbar, Auth, Admin).
- CSS custom properties (`--torneo-primary`, `--torneo-accent`) inyectadas
  dinámicamente al cargar un torneo. Tailwind las consume vía
  `bg-[var(--torneo-primary)]`.

### Tokens Base (configurados en `tailwind.config.ts`)

| Token | Valor |
|-------|-------|
| Tipografía | `Inter` (Google Fonts) — moderna, legible, excelente en tablas numéricas |
| Bordes | `rounded-lg` (8px) — aspecto moderno sin extremos |
| Sombras | `shadow-sm` base, `shadow-md` en hover — elevación sutil |
| Espaciado | Escala por defecto de Tailwind (4px base) |
| Modo oscuro | **No** — solo modo claro para MVP |

---

## Capa de Red (Networking)

- **Cliente Axios** exportado desde `src/shared/api/axios.config.ts`.
- **Interceptor de Request:** inyecta `Authorization: Bearer <token>` desde
  `localStorage` antes de cada petición.
- **Interceptor de Response:** captura `401` y `403` globalmente — purga
  `localStorage` y redirige a `/auth/login` automáticamente.
- **Base URL:** `http://localhost:5000/api` en desarrollo.
- **Archivos:** configurar `Content-Type: multipart/form-data` automáticamente
  en peticiones que envíen `FormData`.

---

## Estado Global y RBAC

- `AuthContext` provee: `isAuthenticated`, `userRole` (`'super_admin'` | `'delegado'` | `null`),
  y los métodos `login` / `logout`.
- `<ProtectedRoute allowedRoles={['...']} />`: HOC que renderiza `<Navigate to="/unauthorized" />`
  si el rol del contexto no está en `allowedRoles`.

---

## Formularios y Validación

- **React Hook Form** para gestión de estado de inputs (evita re-renders).
- **Zod** para esquemas de validación en el cliente (cédulas de 10 dígitos,
  correos, fechas, rangos numéricos).
- Las reglas de validación de Zod deben ser **paralelas** a las de Marshmallow
  en el backend para dar feedback instantáneo sin round-trips.

---

## Performance y UX (Reglas no negociables)

| Regla | Implementación |
|-------|---------------|
| **Cold start de Render** | Skeletons y spinners no bloqueantes en primera carga (el backend puede tardar hasta 50s en despertar) |
| **Lazy Loading por ruta** | `React.lazy()` + `Suspense` en todas las páginas. Vite genera un chunk separado por `import()` dinámico. El usuario público no descarga el bundle del panel admin |
| **Compresión de imágenes** | Interceptar subida de logos y fotos, comprimir a WebP antes de enviar a S3. Límite: 2MB |
| **Paginación** | Consumir metadata `{ page, per_page, total, pages }` del backend en todos los listados |
| **Doble envío** | Botones `disabled` + spinner mientras cualquier promesa `POST/PUT/DELETE` se resuelve |
| **Mobile-First** | Tablas con `overflow-x-auto`. Diseño responsive desde el inicio |
| **Toast de errores** | Traducir errores crudos de la API a mensajes en lenguaje natural (usando Sonner) |
| **Accesibilidad** | `aria-label` y atributo `scope` en tablas. Navegación por `Tab` en formularios. HTML semántico (`<main>`, `<nav>`, `<section>`) |

---

## Seguridad Frontend

| Regla | Implementación |
|-------|---------------|
| **`dangerouslySetInnerHTML`** | **Prohibido** salvo con sanitización explícita via DOMPurify |
| **Links externos** | Siempre `rel="noopener noreferrer"` con `target="_blank"` |
| **Datos del backend** | React escapa JSX por defecto — texto plano no requiere sanitización adicional |
| **Tokens en storage** | `localStorage` aceptable para MVP (Supabase Auth lo usa internamente) |

---

## Manejo de Errores Resiliente

| Componente | Responsabilidad |
|-----------|-----------------|
| `ErrorBoundary` | Catch global de errores de React. Muestra UI de fallback en vez de pantalla blanca |
| `EmptyState` | Ilustración + mensaje cuando un listado no tiene datos ("No hay torneos activos") |
| Página `404` | Ruta catch-all (`*`) para rutas inexistentes |
| Página `/unauthorized` | Renderizada por `ProtectedRoute` cuando el rol no coincide |

---

## Navegación Responsiva

**Desktop (≥1024px):** Navbar horizontal fija con items filtrados por rol.

**Mobile (<1024px):** Hamburger menu clásico → sidebar deslizante desde la izquierda
con overlay oscuro. Los items del sidebar heredan la misma lógica de rol.

```
Desktop (≥1024px)              Mobile (<1024px)
┌──────────────────────┐       ┌──────────────────────┐
│ [Logo]  Nav  Nav  Nav│       │ [☰]  [Logo]          │
├──────────────────────┤       ├──────────────────────┤
│                      │       │                      │
│      Contenido       │       │      Contenido       │
│                      │       │                      │
└──────────────────────┘       └──────────────────────┘
                                        │ click ☰
                                        ▼
                               ┌────────┬─────────────┐
                               │ Nav 1  │  (overlay    │
                               │ Nav 2  │   oscuro)    │
                               │ Nav 3  │              │
                               │        │              │
                               │ Logout │              │
                               └────────┴─────────────┘
```

---

## Mapa de Rutas

| Módulo | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| Público | `/` | — | Landing: banner, grid de torneos, carrusel de auspiciantes |
| Público | `/torneos/:id` | — | Tabs: Posiciones, Calendario, Líderes estadísticos |
| Auth | `/auth/login` | — | Login con Supabase (`signInWithPassword`) |
| Auth | `/auth/recuperar` | — | Solicitud de reset de contraseña |
| Delegado | `/delegado/dashboard` | `delegado` | Panel: estado de inscripción del equipo |
| Delegado | `/delegado/inscripcion` | `delegado` | Wizard: datos del equipo + comprobante (Logo temporalmente deshabilitado por feature flag) |
| Delegado | `/delegado/plantilla` | `delegado` | Gestor de roster: jugadores y documentos (Fotos temporalmente deshabilitadas por feature flag) |
| Admin | `/admin/dashboard` | `super_admin` | Resumen de inscripciones pendientes |
| Admin | `/admin/auditoria` | `super_admin` | Visor dual: info + PDF. Aprobar / Rechazar |
| Admin | `/admin/partidos` | `super_admin` | Programación de calendario y fases |
| Admin | `/admin/estadisticas` | `super_admin` | Carga bulk de resultados post-partido |
| Sistema | `/unauthorized` | — | Acceso denegado (renderizada por ProtectedRoute) |
| Sistema | `*` | — | Página 404 para rutas inexistentes |

---

## UI Kit — Componentes Base (`src/shared/ui/`; Navbar, Sidebar y ErrorBoundary están en `src/app/` y ProtectedRoute en el módulo auth)

| Componente | Responsabilidad |
|-----------|-----------------|
| `Navbar` | Barra de navegación responsiva con hamburger menu en móvil. Items filtrados por rol |
| `Sidebar` | Menú lateral deslizante para móvil con overlay oscuro |
| `DataGridTable` | Tabla responsiva con scroll horizontal, skeleton y paginación integrada |
| `FileUploadButton` | Restringe MIME, comprime imágenes, llama al servicio de Storage |
| `AsyncButton` | Intercepta `onClick` async, muestra spinner, deshabilita durante la promesa |
| `StatusBadge` | Pills de color para estados: `Pendiente`, `Aprobado`, `Rechazado`, `Activo` |
| `ProtectedRoute` | HOC de React Router que verifica `userRole` contra `allowedRoles` |
| `ErrorBoundary` | Catch global de errores de renderizado con UI de fallback |
| `EmptyState` | Placeholder visual para listados sin datos |
| `Skeleton` | Placeholder animado de carga para cold start del backend |

---

## Plan de Ejecución (Fases Completadas)

✅ **Fase 1: Andamiaje:** Vite + Tailwind + estructura (Completada).
✅ **Fase 2: Infraestructura:** Axios, AuthContext, ProtectedRoute, Router base (Completada).
✅ **Fase 3: UI Kit base:** Navbar, Sidebar, DataGridTable, AsyncButton, etc. (Completada).
✅ **Fase 4: Dominio Auth:** Login (Completada).
✅ **Fase 5: Dominio Público:** Home + Tabla de Posiciones (Completada).
✅ **Fase 6: Dominio Delegado:** Dashboard + Inscripción + Gestor (Completada).
✅ **Fase 7: Dominio Admin:** Auditoría + Partidos + Estadísticas (Completada).
✅ **Fase 8: Testing:** Vitest + React Testing Library (Completada).

---

## Siguiente Etapa: Integración Frontend-Backend

La etapa de UI/Maquetado ha finalizado. El proyecto entra en la **Etapa de Integración**.
Consulta `Docs/03_plan_integracion.md` para el roadmap exacto. El enfoque actual será:

1. Setup de tipados e interfaces (mapeo con Marshmallow).
2. Conexión de endpoints (Supabase + Flask REST API) vía Axios.
3. Sustitución de datos falsos (mock data) por carga dinámica desde el backend.
4. Implementación de feedback real de API en UI (errores, validaciones).

---

## Reglas de Integración (Prevención de Desajustes Frontend-Backend)

**IMPORTANTE: Prevención de errores de Mapeo (422 Unprocessable Entity & Errores Visuales)**
Durante cualquier proceso de conexión entre el Frontend (React) y el Backend (Flask), se **prohíbe** asumir los nombres de las columnas o las propiedades. Antes de escribir una interfaz de TypeScript, de crear el payload para Axios o de leer un dato devuelto por la API, se **deben** revisar obligatoriamente:
1. El Schema de Marshmallow correspondiente (`backend/app/modules/<módulo>/http/esquemas.py`).
2. El Modelo de SQLAlchemy (`backend/app/shared/infrastructure/modelos/`).

*Ejemplo de contexto:* Nombres como `estado` o `id` podrían ser en realidad `estado_inscripcion` o `id_equipo` dependiendo del Schema. Los objetos anidados devueltos por `fields.Nested` en Flask no desempaquetan sus IDs en la raíz, sino dentro de objetos hijos (ej. `equipo.id_equipo`). El agente **debe** verificar esto antes de escribir el código frontend que lee dichas variables para evitar que las variables devuelvan `undefined`.

---

## Directiva Crítica: Entorno en Producción y Protección de Datos

> [!CAUTION]
> **El proyecto ya se encuentra en PRODUCCIÓN en un servidor externo con datos reales persistidos en la base de datos.**

### Reglas de Integridad y Modificación Segura:
1. **Cero Cambios Destructivos (SAFEGUARD ACTIVO):**
   - Queda estrictamente prohibido ejecutar `DROP TABLE`, `DROP COLUMN`, truncate, alteración de tipos incompatibles o añadir columnas `NOT NULL` sin un `server_default` o migración segura en dos pasos.
   - El backend cuenta con una clase `SafeSQLAlchemy` en `app/__init__.py` que **bloquea cualquier llamada a `db.drop_all()`** si no detecta la cadena `:memory:` o `sqlite` en la URI y el flag `TESTING=True`.
   - **Bajo ninguna circunstancia el Agente intentará bypassear o desactivar esta protección**. Todas las pruebas (Unit tests o Integración) **deben obligatoriamente** mockear la base de datos usando SQLite en memoria (`os.environ['DATABASE_URL'] = 'sqlite:///:memory:'`) **antes** de instanciar la app (`create_app()`).
2. **Retrocompatibilidad 100% Obligatoria:**
   - Cualquier ajuste a endpoints existentes (`/api/...`), schemas de Marshmallow o modelos SQLAlchemy debe mantener compatibilidad retroactiva con los datos ya almacenados.
   - Las respuestas de endpoints existentes no deben eliminar ni renombrar propiedades que el frontend o servicios externos consuman.
3. **Manejo Defensivo en Frontend y Backend:**
   - El código debe usar siempre fallbacks seguros (`|| []`, `|| null`, `?.`) para tolerar registros históricos con campos nulos o estructuras previas.
   - Las consultas SQL/ORM que agreguen relaciones nuevas deben usar `outerjoin()` / `LEFT JOIN` para no excluir registros históricos que carezcan de la nueva relación.

---

## Directiva de Calidad y Rigurosidad en Testing (Obligatoria para toda Solución)

> [!IMPORTANT]
> **Toda solución técnica, refactor o nueva funcionalidad propuesta por el Agente debe incluir pruebas automatizadas exhaustivas y de alta rigurosidad.**

### Requisitos Mandatorios de Pruebas:
1. **Cobertura de Casos Borde y Situaciones de Estrés ("What-If"):**
   - Simulación de datos nulos, vacíos (`[]`), respuestas de error 404/500, strings mal formateados y valores fuera de rango.
   - Pruebas de permisos y RBAC: verificación de qué ve un usuario no autenticado, un delegado y un super_admin.
   - Pruebas matemáticas de límites en paginación (páginas fuera de rango, página 1 de 1, página 0, páginas negativas, números flotantes).
2. **Pruebas de Componentes e Integración UI (Vitest + RTL):**
   - Verificar estados de carga (`Skeleton`), estados vacíos (`EmptyState`), errores de red y transiciones visuales.
   - Probar interacción real del usuario (clicks en pestañas, cambios de filtros en selects, avance/retroceso de carruseles y paginadores).
   - Comprobar que no existan loops de renderizado o re-renders innecesarios en componentes con hooks `useMemo` o `useEffect`.
3. **Pruebas de Backend (Pytest):**
   - Validación rigurosa de DTOs/Schemas Marshmallow y modelos SQLAlchemy.
   - Pruebas de integridad transaccional (rollback en fallo, prevención de duplicados vía `UniqueConstraint`).
   - Pruebas de reglas de negocio (límite de 3 equipos por delegado, rango de 5-18 jugadores por plantilla, deshabilitación de equipos).
   - Pruebas de contrato (`tests/contrato`): toda ruta nueva o cambiada necesita su caso en `casos.py`. `referencias.json` solo se regraba (`ACTUALIZAR_CONTRATO=1 pytest tests/contrato`) cuando una especificación de `specs/` aprueba el cambio de comportamiento.

---

## Prevención de Errores Comunes de Compilación (TypeScript / Zod)

> [!WARNING]
> **El CI/CD y Vite son estrictos en Producción.** Cualquier error de TypeScript hará fallar el comando `vite build` durante el despliegue (`deploy.sh`). Considera lo siguiente antes de dar por terminado un componente:

1. **Variables y propiedades opcionales / `undefined`:**
   - **Índices de diccionarios:** No uses propiedades de objetos que puedan ser `undefined` como llaves directas de diccionarios sin un fallback. (ej. **Error:** `groups[p.fecha] = []`. **Solución:** `const fecha = p.fecha || 'Sin fecha'; groups[fecha] = [];`).
   - **Acceso a datos de API (`res.data`):** Valida que el dato exista antes de acceder a sus propiedades internas. (ej. `const obj = res.data; if (!obj) throw new Error(...); const id = obj.id;`).
2. **Importaciones sin usar:**
   - Limpia todos los imports no utilizados (como `import React` si no se usa para crear Refs o Contextos, Vite lanza `error TS6133`).
3. **Sintaxis Correcta de Zod (`z.enum`):**
   - El método `z.enum()` NO acepta `{ required_error: '...' }` como segundo argumento en versiones recientes.
   - **Error:** `z.enum(['a', 'b'], { required_error: 'Error' })` o `z.enum(['a', 'b'], { errorMap: () => ({ message: 'Error' }) })`
   - **Solución Correcta:** `z.enum(['a', 'b'], { message: 'Error' })` o `{ error: 'Error' }`


