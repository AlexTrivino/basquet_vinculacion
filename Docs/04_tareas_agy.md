# Tareas para el Agente Ejecutor (AGY CLI)

Esta cola de tareas está diseñada de manera atómica para evitar regresiones. El agente debe ejecutar una tarea a la vez, validando que el build de Vite (`npm run build`) no falle antes de continuar a la siguiente.

### Tarea 1 (Inmediata y Atómica)
**Objetivo:** Crear la base de tipados (TypeScript) centralizada para coincidir con los contratos de Marshmallow.
**Acción:** 
1. Crea el archivo `frontend/src/types/api.types.ts`.
2. Escribe las interfaces `ApiResponse<T>` y `PaginatedResponse<T>` para el manejo estándar de respuestas.
3. Lee `backend/app/schemas/inscripcion_schema.py` y `torneo_schema.py` para escribir las interfaces equivalentes en TS: `TorneoResumen`, `EquipoResumen`, `CategoriaResumen` e `InscripcionPublic`.
4. No toques ningún componente visual en este paso.

### Tarea 2
**Objetivo:** Eliminar la mock data en la Home (Vista Pública de Torneos).
**Acción:** 
1. Crea el servicio `src/features/torneos/api/getTorneos.ts` usando la instancia de Axios configurada en `axios.config.ts`.
2. Modifica el componente visual correspondiente (Home/Lista de Torneos) para invocar este servicio dentro de un `useEffect` (o SWR/React Query si el proyecto lo decide).
3. Muestra el `<Skeleton />` mientras los datos cargan.

### Tarea 3
**Objetivo:** Refactorizar el formulario de Inscripción del Delegado.
**Acción:**
1. Modifica la UI de inscripción. El delegado debe tener un selector de "Mis Equipos" o un botón para "Crear Nuevo Equipo" (que dispara a `POST /api/equipos`).
2. Las categorías deben filtrarse dinámicamente según el Torneo seleccionado (usar `watch()` de React Hook Form para pasar el `id_torneo` al query).
3. Una vez que el delegado tenga un `id_equipo`, el submit principal del formulario debe ejecutar `POST /api/inscripciones` con los datos estrictos que pide `InscripcionCreateSchema` (`id_torneo`, `id_equipo`, `id_categoria`).
4. Conectar el error `409 CONFLICT` del backend a un Toast de error.

### Tarea 4
**Objetivo:** Integrar el cambio de estado de Inscripción en el panel Admin.
**Acción:**
1. Enlazar el botón `Aprobar` del UI Kit `AsyncButton` en la tabla de Auditoría para que dispare un `PATCH /api/inscripciones/<id>/estado` con `{ "estado_inscripcion": "aprobado" }`.
2. Manejar la mutación de estado localmente (actualizando el badge) sin recargar la página.
