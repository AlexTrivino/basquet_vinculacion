# Arquitectura y Directivas de Desarrollo Frontend
**Proyecto:** Plataforma de Torneos de Baloncesto
**Core:** React 18+ inicializado con Vite y TypeScript estricto.

## 1. Stack Tecnológico Estricto
- **Enrutamiento:** React Router DOM v6 (`createBrowserRouter`).
- **Estilos:** Tailwind CSS + UI Kit genérico (Lucide-React para íconos).
- **Manejo de Estado:** Context API nativo (exclusivo para Autenticación) y estado local.
- **Capa de Red:** Axios (`src/shared/api/axios.config.ts`).
- **Formularios:** React Hook Form (gestión de estado de inputs) + Zod (validación de esquemas).

## 2. Arquitectura de Carpetas (Screaming Architecture)
Cada pantalla vive en el módulo de negocio al que pertenece; `app/` arma la aplicación y `shared/` no conoce a ningún módulo:

```text
src/
 ├─ app/         # main.tsx (providers), router.tsx (junta las rutas de los módulos), layout, Navbar, Sidebar y errores.
 ├─ shared/      # ui/ (UI kit, Escudo), api/ (Axios, tipos, catálogo de torneos y categorías) y lib/ (helpers puros).
 └─ modules/     # auth, auspicios, sanciones, inscripciones, visor, partidos, equipos, jugadores, flyers,
                 # estadisticas, torneos y portada; cada uno con api/, components/, pages/, routes.tsx e index.ts,
                 # lo único que importan los demás.
```

## 3. Directivas de la Capa de Red (Networking & Seguridad)

El frontend se comunica con una API REST en Flask. La URL base se inyecta vía variables de entorno (`VITE_API_URL`), por defecto apuntando a `/api` en producción a través del proxy inverso de Nginx.

- **El Cliente Axios:** Exportado desde `src/shared/api/axios.config.ts`.
- **Interceptor de Request:** Inyecta automáticamente el header: `Authorization: Bearer <token>` extraído de `localStorage`.
- **Interceptor de Response:** Captura globalmente errores `401 Unauthorized` o `403 Forbidden`, purga la sesión y fuerza redirección a `/auth/login`.

## 4. Gestión de Estado y Control de Acceso (RBAC)

- **AuthContext:** Provee a toda la app las variables: `isAuthenticated` (boolean), `userRole` ('super_admin', 'delegado', o null), y los métodos de login/logout.
- **Rutas Protegidas:** Componente contenedor `<ProtectedRoute allowedRoles={['...']} />`. Renderiza `<Navigate to="/unauthorized" />` si no hay permisos.

## 5. Directivas de Rendimiento y UI

- **Formularios Complejos:** Construidos con **React Hook Form** para evitar re-renders. Validaciones tipadas delegadas a **Zod**.
- **UX Asíncrona:** Mutaciones deshabilitan botones de envío (estado *disabled* + *spinner*) durante la espera de la red.
- **Manejo de Archivos:** Las peticiones que envíen archivos (`FormData`) configuran automáticamente el header `Content-Type: multipart/form-data` eliminando el predeterminado de JSON.
