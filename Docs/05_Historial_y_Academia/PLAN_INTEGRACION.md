# Plan de Integración Frontend-Backend

Este documento detalla la hoja de ruta estructurada en fases para conectar el Frontend React (Fases 1-8) con la API REST Flask del Backend. El objetivo es reemplazar la *mock data* con llamadas HTTP reales mediante Axios, garantizando el tipado estricto (TypeScript) en cada capa.

---

## 🎯 Estrategia General

- **TypeScript First:** Se crearán interfaces (`interfaces/` o dentro de cada `api/*.ts`) que mapeen 1:1 con las respuestas y *schemas* de Marshmallow documentados en `api_referencia.md`.
- **Capa de Red Centralizada:** Todo llamado a la API se encapsulará en funciones asíncronas dentro de `src/features/<dominio>/api/`.
- **Manejo de Errores Global:** Axios ya cuenta con interceptores que purgan la sesión en `401/403`. Ahora, mapearemos los `error_code` del backend (`VALIDATION_ERROR`, etc.) a mensajes traducidos usando `sonner` (Toasts).
- **Hooks Personalizados:** Se recomienda el uso de SWR o React Query para fetching, caché y revalidación (opcional, pero altamente recomendado) o en su defecto `useEffect` aislados en custom hooks (ej. `useTorneos`).

---

## 🗺️ Fases de Integración

### Fase 9: Setup de Tipados Base y Servicios API
**Objetivo:** Establecer los contratos de datos y preparar las firmas de las funciones HTTP.

- **Acciones:**
  1. Crear `src/types/api.types.ts` con la respuesta estándar (ej. `ApiResponse<T>`, `PaginatedResponse<T>`).
  2. Generar las interfaces base: `Torneo`, `Equipo`, `Inscripcion`, `Jugador`, `Plantilla`, `Partido`, `Estadisticas`.
  3. Asegurar que `axios.config.ts` inyecte correctamente el `Authorization: Bearer <token>`.

---

### Fase 10: Integración del Dominio Público (Home y Detalles)
**Objetivo:** Alimentar las vistas públicas de los fanáticos con datos reales de los torneos.

- **Conexiones:**
  - **`Home.tsx`**: Consumir `GET /api/torneos` para reemplazar `mockTorneos`. Usar la paginación para limitar la vista.
  - **`TorneoDetail.tsx`**: Consumir `GET /api/torneos/<id>` para información del torneo.
  - **`PosicionesTable.tsx`**: Consumir `GET /api/torneos/<id>/posiciones` (Motor FIBA). Las columnas (Equipo, PJ, PG, PP, Puntos) ya coinciden con la lógica del backend.
  - **`Calendario` (Tab)**: Consumir `GET /api/partidos?id_torneo=<id>` para listar los partidos programados.

---

### Fase 11: Integración del Dominio Delegado
**Objetivo:** Permitir a los delegados crear equipos, gestionar su inscripción y administrar su plantilla.

- **Conexiones:**
  - **`Dashboard.tsx`**: Consumir `GET /api/equipos` (filtrado al usuario por el backend) e `GET /api/inscripciones` para determinar el estado ("Pendiente", "Aprobado", "Rechazado") de su equipo actual y pasarlo a `StatusBadge`.
  - **`InscripcionWizard.tsx`**: 
    1. Reemplazar la simulación por `POST /api/equipos` (Crear equipo).
    2. Luego, llamar a `POST /api/inscripciones` (`InscripcionCreateSchema`) atando el equipo al torneo activo.
    3. (Pendiente/Futuro): Enviar el comprobante de pago mediante `POST /api/inscripciones/<id>/comprobante` (FormData, `multipart/form-data`).
  - **`GestorPlantilla.tsx`**: 
    1. Consumir `GET /api/plantillas` para reemplazar el `mockJugadores`.
    2. En el Modal de "Añadir Jugador" (a crear), consumir `POST /api/jugadores` y posteriormente `POST /api/plantillas`.

---

### Fase 12: Integración del Dominio Super Admin
**Objetivo:** Dar vida al panel de control maestro.

- **Conexiones:**
  - **`Dashboard.tsx` (Admin)**: Consumir un resumen (puede requerir múltiples llamadas `GET` a inscripciones pendientes, partidos, etc., si no existe un endpoint de `/api/dashboard/stats`).
  - **`AuditoriaEquipos.tsx`**: 
    1. Consumir `GET /api/inscripciones` (filtrando pendientes).
    2. Enlazar `AsyncButton` de Aprobar/Rechazar a `PATCH /api/inscripciones/<id>/estado` con `{ "estado": "aprobado" | "rechazado" }`.
  - **`GestorPartidos.tsx`**: Consumir `POST /api/partidos` para programar partidos.
  - **`CargaResultados.tsx`**: 
    1. Enlazar el `<select>` a `GET /api/partidos` (filtrando `estado=programado|en_curso`).
    2. Enlazar el submit a `POST /api/estadisticas/bulk` con el payload de `EstadisticasBulkSchema`.
    3. Enlazar a `PUT /api/partidos/<id>` para cambiar el estado a `finalizado` y registrar el `marcador_local` y `marcador_visitante`.

---

### Fase 13: Pulido, QA y Reportes PDF
**Objetivo:** Afinar la experiencia de usuario y conectar features avanzadas.

- **Acciones:**
  - **Manejo de Errores Globales:** Asegurar que los errores como `VALIDATION_ERROR` o `STORAGE_ERROR` se traduzcan limpiamente mediante Sonner Toast.
  - **Validaciones Cruzadas:** Alinear estrictamente las validaciones Zod (ej. límite de 6 faltas, número de camiseta) con las del backend.
  - **Reportes:** Implementar la descarga de la planilla PDF FIBA (`GET /api/reportes/partido/<id>/planilla`) manejando el Blob type en Axios para forzar la descarga de archivo.

---

## 🚧 Identificación de Bloqueos (Q&A)

Antes de escribir código, se han identificado las siguientes consideraciones para asegurar el éxito:

1. **Dashboard Admin:** No existe un endpoint `/api/admin/dashboard/stats`. Para armar las tarjetas de resumen del Admin, ¿hacemos peticiones separadas (una a inscripciones, otra a partidos, etc.) o preferimos crear un endpoint sumarizado en el backend para evitar sobrecarga en la red?
2. **Rol en el Frontend:** En la Fase 4 extraemos el rol desde `app_metadata.role` en el JWT de Supabase. El backend verifica que el usuario exista en la tabla `usuarios` (vía error `USER_NOT_FOUND`). ¿El registro del usuario en la tabla `usuarios` y la asignación del rol en Supabase se maneja manualmente en la BD o existe un trigger/función en Supabase que lo hace automáticamente tras el signup? (Esto es importante por si requerimos registrar delegados desde el frontend).
3. **Flujo de Inscripción:** Actualmente el `InscripcionWizard` recoge Nombre de Equipo, Categoría y Entrenador. El backend espera un `id_torneo`, `id_equipo` y `id_categoria`. Para crear esto: ¿Primero disparamos `POST /api/equipos`, extraemos el `id_equipo`, y luego disparamos `POST /api/inscripciones` pasándole el torneo activo? ¿Existe un endpoint que diga "cuál es el torneo activo actualmente" o lo hardcodeamos temporalmente?
4. **Mutación de Datos (Caching):** ¿Deseas que instalemos `@tanstack/react-query` o `swr` para manejar la invalidación de caché automáticamente (ej. recargar la tabla tras aprobar a un equipo) o prefieres que gestionemos el fetching "a mano" con `useEffect` y estados locales para no añadir más dependencias al proyecto?
