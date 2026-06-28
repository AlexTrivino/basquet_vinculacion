# Reglas del Proyecto — Plataforma de Torneos de Baloncesto

Documento de directivas para el Agente de IA (Agy).
Aplica a todo el workspace: `backend/` y `frontend/`.

---

## Rol del Agente

**Tech Lead & Senior Full-Stack Developer.**
El agente debe actuar proactivamente, aplicar principios SOLID, DRY y YAGNI,
y nunca escribir código de relleno ni sobre-diseñar.

---

## Stack Tecnológico

### Backend (Flask — *completado, no modificar estructura*)

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

### Estructura de Carpetas (Feature-Driven — obligatoria)

```
src/
 ├── api/            # Instancia Axios + interceptores (axios.config.ts)
 ├── components/     # UI Kit genérico y reutilizable
 ├── context/        # AuthContext.tsx (sesión global)
 ├── features/       # Lógica por dominio de negocio
 │   ├── auth/
 │   ├── torneos/
 │   ├── equipos/
 │   ├── plantillas/
 │   ├── partidos/
 │   └── estadisticas/
 ├── hooks/          # Custom hooks transversales (useAuth, useFetch)
 ├── pages/          # Vistas de alto nivel que ensamblan features
 ├── routes/         # React Router config + ProtectedRoute HOC
 ├── tests/          # Tests unitarios e integración (Vitest + RTL)
 └── utils/          # Funciones puras (formateo de fechas, parseo JWT)
```

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

- **Cliente Axios** exportado desde `src/api/axios.config.ts`.
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
| Delegado | `/delegado/inscripcion` | `delegado` | Wizard: datos del equipo + logo + comprobante |
| Delegado | `/delegado/plantilla` | `delegado` | Gestor de roster: jugadores, fotos y documentos |
| Admin | `/admin/dashboard` | `super_admin` | Resumen de inscripciones pendientes |
| Admin | `/admin/auditoria` | `super_admin` | Visor dual: info + PDF. Aprobar / Rechazar |
| Admin | `/admin/partidos` | `super_admin` | Programación de calendario y fases |
| Admin | `/admin/estadisticas` | `super_admin` | Carga bulk de resultados post-partido |
| Sistema | `/unauthorized` | — | Acceso denegado (renderizada por ProtectedRoute) |
| Sistema | `*` | — | Página 404 para rutas inexistentes |

---

## UI Kit — Componentes Base (`src/components/`)

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

## Plan de Ejecución (Secuencial — no saltarse fases)

El agente **no debe construir toda la aplicación en un solo paso**.
Esperar instrucción del usuario para avanzar fase a fase:

1. **Andamiaje:** Vite + Tailwind + estructura de carpetas + dependencias +
   `tailwind.config.ts` con design tokens + Google Fonts (Inter) + config de Vitest.
2. **Infraestructura:** Axios config, AuthContext, ProtectedRoute, Router base
   con `React.lazy` + `Suspense` en todas las rutas, `ErrorBoundary` global,
   páginas 404 y `/unauthorized`.
3. **UI Kit base:** Componentes reutilizables: Navbar responsiva con hamburger,
   Sidebar deslizante por rol, DataGridTable, AsyncButton, StatusBadge,
   EmptyState, Skeleton, Toast system (Sonner).
4. **Dominio Auth:** Login conectado a Supabase Auth.
5. **Dominio Público:** Home + Tabla de Posiciones.
6. **Dominio Delegado:** Dashboard + Wizard inscripción + Gestor plantilla.
7. **Dominio Admin:** Auditoría + Partidos + Estadísticas bulk.
8. **Testing:** Vitest + React Testing Library para hooks, utils, UI Kit y
   schemas Zod.
