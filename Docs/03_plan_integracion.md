# Plan de Integración Frontend-Backend

## Fase 1: Setup de Tipados API (Single Source of Truth)
Crear `src/types/api.types.ts`.
- Mapear las interfaces exactas según `app/schemas/`. 
- Definir wrappers de respuesta (`ApiResponse<T>`, `PaginatedResponse<T>`).

## Fase 2: Conexión de Vistas Públicas
- **Home / Torneos:** Reemplazar `mockTorneos` con llamada a `GET /api/torneos`.
- **Posiciones:** Conectar a `GET /api/torneos/<id>/posiciones`.
- **Calendario Público:** Conectar a `GET /api/partidos?id_torneo=<id>`.

## Fase 3: Flujo del Delegado (Riesgo Identificado)
**⚠️ Riesgo Crítico en el Flujo de Inscripción:**
El UI/Wizard actual puede estar solicitando "Nombre Equipo, Categoría y Entrenador" en un solo paso. Sin embargo, el backend requiere IDs explícitos en `InscripcionCreateSchema` (`id_torneo`, `id_equipo`, `id_categoria`). 
*Solución:* El Agente deberá modificar el frontend para que el flujo de inscripción del delegado primero cree o seleccione un equipo (`POST /api/equipos`), y luego despache `POST /api/inscripciones`.

- **Dashboard:** `GET /api/inscripciones` (El backend ya filtra por el `g.usuario_id` del delegado).
- **Gestión de Plantilla:** `GET /api/plantillas` y `POST /api/jugadores` -> `POST /api/plantillas`.

## Fase 4: Dominio Super Admin
- **Auditoría de Equipos:** Consumir `GET /api/inscripciones` y enlazar botones de Aprobar/Rechazar a `PATCH /api/inscripciones/<id>/estado`.
- **Programación de Partidos:** Conectar UI a `POST /api/partidos`.
- **Carga de Resultados:** Conectar tabla a `POST /api/estadisticas/bulk` y `PUT /api/partidos/<id>`.

## Fase 5: Manejo de Errores Globales
Asegurar que los errores `422 VALIDATION_ERROR`, `409 CONFLICT` y `502 STORAGE_ERROR` emitidos por los controladores de Flask sean capturados e insertados en el componente Toast (`sonner`) de manera legible.
