# Arquitectura y Contratos

## Stack Tecnológico

**Backend (REST API):**
- **Framework:** Flask 3.1
- **ORM:** SQLAlchemy 2.0
- **Base de Datos:** PostgreSQL (alojada en Supabase)
- **Validación/DTOs:** Marshmallow 3
- **Autenticación:** Supabase Auth (Validación de JWT vía decorador `@token_required`)

**Frontend (SPA):**
- **Framework UI:** React 18 + TypeScript estricto
- **Bundler:** Vite
- **Estilos:** Tailwind CSS
- **Ruteo:** React Router DOM v6
- **Capa de Red:** Axios

## Estrategia de Autenticación
1. **Frontend:** Mantiene el JWT (`access_token`) y el rol (`user_role`) en `localStorage`.
2. **Contexto:** `AuthContext.tsx` expone `isAuthenticated` y `userRole` (`super_admin` | `delegado`).
3. **Capa de Red:** `axios.config.ts` intercepta toda petición e inyecta `Authorization: Bearer <token>`. Si el backend responde `401` o `403`, el interceptor purga la sesión y redirige a `/auth/login`.
4. **Backend:** El decorador `@token_required(allowed_roles=[...])` valida el JWT de Supabase contra sus llaves (JWKS) e inyecta `g.usuario_id` y `g.usuario_rol`.

## Patrón DTO y Contratos (Marshmallow ↔ TypeScript)
El backend utiliza esquemas diferenciados para evitar sobre-exposición de datos (Ej: `InscripcionPublicSchema` vs `InscripcionAdminSchema`).
- **Resúmenes anidados:** El backend utiliza relaciones anidadas (ej. `TorneoResumenSchema` dentro de `InscripcionPublicSchema`) para enviar objetos listos para la UI y evitar N+1 queries en el cliente.
- **Form-Data:** Los archivos (ej. comprobante de pago) se envían vía `multipart/form-data` al backend, y Axios elimina automáticamente el `Content-Type` de JSON en la cabecera cuando detecta un `FormData`.
