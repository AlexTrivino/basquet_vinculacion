# Arquitectura y Directivas de Desarrollo Frontend
**Proyecto:** Plataforma de Torneos de Baloncesto
**Core:** React 18+ inicializado con Vite y TypeScript estricto.

## 1. Stack Tecnológico Estricto
- **Enrutamiento:** React Router DOM v6 (`createBrowserRouter`).
- **Estilos:** Tailwind CSS + UI Kit genérico (Lucide-React para íconos).
- **Manejo de Estado:** Context API nativo (exclusivo para Autenticación) y estado local.
- **Capa de Red:** Axios (`src/api/axios.config.ts`).
- **Formularios:** React Hook Form (gestión de estado de inputs) + Zod (validación de esquemas).

## 2. Arquitectura de Carpetas (Feature-Driven Development)
El código se organiza separando la infraestructura de los dominios de negocio:

```text
src/
 ├─ api/         # Instancia global de Axios e interceptores (axios.config.ts).
 ├─ components/  # UI genérica y reutilizable (Button, Modal, DataGrid, StatusBadge).
 ├─ context/     # AuthContext.tsx (Manejo de estado de sesión global).
 ├─ features/    # Agrupación por dominio de negocio:
 │   ├─ auth/
 │   ├─ categorias/
 │   ├─ equipos/
 │   ├─ estadisticas/
 │   ├─ jugadores/
 │   ├─ partidos/
 │   ├─ patrocinadores/
 │   ├─ plantillas/
 │   ├─ sanciones/
 │   └─ torneos/
 ├─ hooks/       # Custom hooks transversales (ej. useAuth).
 ├─ pages/       # Vistas de alto nivel que ensamblan los features para el Router.
 ├─ routes/      # Configuración centralizada de React Router y Guardias (HOCs).
 └─ utils/       # Funciones puras (formateo de fechas, parseo de JWT, helpers).
```

## 3. Directivas de la Capa de Red (Networking & Seguridad)

El frontend se comunica con una API REST en Flask. La URL base se inyecta vía variables de entorno (`VITE_API_URL`), por defecto apuntando a `/api` en producción a través del proxy inverso de Nginx.

- **El Cliente Axios:** Exportado desde `src/api/axios.config.ts`.
- **Interceptor de Request:** Inyecta automáticamente el header: `Authorization: Bearer <token>` extraído de `localStorage`.
- **Interceptor de Response:** Captura globalmente errores `401 Unauthorized` o `403 Forbidden`, purga la sesión y fuerza redirección a `/auth/login`.

## 4. Gestión de Estado y Control de Acceso (RBAC)

- **AuthContext:** Provee a toda la app las variables: `isAuthenticated` (boolean), `userRole` ('super_admin', 'delegado', o null), y los métodos de login/logout.
- **Rutas Protegidas:** Componente contenedor `<ProtectedRoute allowedRoles={['...']} />`. Renderiza `<Navigate to="/unauthorized" />` si no hay permisos.

## 5. Directivas de Rendimiento y UI

- **Formularios Complejos:** Construidos con **React Hook Form** para evitar re-renders. Validaciones tipadas delegadas a **Zod**.
- **UX Asíncrona:** Mutaciones deshabilitan botones de envío (estado *disabled* + *spinner*) durante la espera de la red.
- **Manejo de Archivos:** Las peticiones que envíen archivos (`FormData`) configuran automáticamente el header `Content-Type: multipart/form-data` eliminando el predeterminado de JSON.
