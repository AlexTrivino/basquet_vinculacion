# Análisis Maestro de Integración (Frontend ↔ Backend)

Este documento detalla exhaustivamente cómo cada endpoint, esquema (DTO) y campo de la base de datos de Flask se mapeará con las interfaces y flujos de usuario en React. Es la única fuente de la verdad para garantizar que **absolutamente todos** los endpoints y campos sean consumidos, garantizando escalabilidad y nula redundancia de código.

---

## 1. Dominio: Torneos (`/api/torneos`)

**Endpoints Disponibles:**
- `GET /` : Lista todos los torneos.
- `GET /<id>` : Detalle de un torneo.
- `POST /` : Crea torneo (`nombre`, `fecha_inicio`, `fecha_fin`).
- `PUT /<id>` : Actualiza torneo (incluye `estado`).
- `DELETE /<id>` : Soft delete.
- `GET /<id>/posiciones` : Devuelve la tabla FIBA calculada (Puntos a favor, en contra, etc).

**Mapeo Frontend:**
- **UI Pública (`/` y `/torneos/:id`)**:
  - Consumirá `GET /` para renderizar el grid de torneos (filtrando en React por `estado = 'en_curso'`).
  - La vista detallada consumirá `GET /<id>/posiciones` para mostrar el ranking oficial.
- **Panel Admin (`/admin/torneos`)**:
  - Consumirá el CRUD completo.
  - Interfaz TypeScript requerida: `Torneo` y `PosicionFIBA` (de `api.types.ts`).

---

## 2. Dominio: Categorías (`/api/categorias`)

**Endpoints Disponibles:**
- `GET /` : Lista categorías base.
- `GET /<id>` : Detalle de categoría.

**Campos Clave:** `nombre_categoria`, `genero_categoria`, `edad_minima`, `edad_maxima`.

**Mapeo Frontend:**
- **Wizard de Delegado (`/delegado/inscripcion`)**: 
  - Al iniciar la inscripción, se llama a `GET /` para poblar un `<select>` o `<radio-group>`.
  - Los campos `edad_minima` y `edad_maxima` se guardarán en el estado de React para validar posteriormente la edad de los jugadores en la pantalla de Plantilla sin tener que consultar al servidor repetidamente.

---

## 3. Dominio: Equipos (`/api/equipos`)

**Endpoints Disponibles:**
- `GET /` y `GET /<id>`
- `POST /` : Crea equipo (`nombre_equipo`). *Nota: El ID del delegado lo inyecta el backend.*
- `PUT /<id>` : Actualiza nombre.
- `DELETE /<id>` : Soft delete.

**Mapeo Frontend:**
- **Flujo de Delegado (`/delegado/equipos`)**:
  - Pantalla "Mis Equipos". Llama a `GET /` (el backend ya filtra por el token del delegado).
  - Al crear, llama a `POST /`. **Nota:** El backend y frontend restringen la creación a un máximo de **3 equipos** por delegado.
  - La opción de Desactivar Equipo está oculta para el delegado (solo para super_admin). 
  - **Nota Analítica:** No existe un endpoint explícito como `/api/equipos/<id>/logo`. El backend probablemente asuma que los logos se manejan via bucket (ej. Supabase Storage) y luego el string se actualiza via PUT, o requiere desarrollo de este endpoint.

---

## 4. Dominio: Inscripciones (`/api/inscripciones`)

**Endpoints Disponibles:**
- `GET /` : Lista inscripciones (con resúmenes anidados de Torneo, Equipo, Categoría).
- `POST /` : Crea solicitud (`id_torneo`, `id_equipo`, `id_categoria`).
- `PATCH /<id>/estado` : Cambia a `aprobado` o `rechazado`.
- `POST /<id>/comprobante` : Sube PDF/Imagen (FormData).

**Mapeo Frontend:**
- **Wizard de Delegado (Paso 2 y 3)**:
  - Una vez seleccionado el equipo, lanza `POST /`.
  - Inmediatamente captura el `id_inscripcion` retornado y renderiza un `<input type="file">`.
  - Al seleccionar archivo, lanza `POST /<id>/comprobante` enviando FormData.
- **Panel Admin (`/admin/auditoria`)**:
  - DataGrid consumiendo `GET /` (filtrando `estado_inscripcion = 'pendiente'`).
  - Botones "Aprobar" / "Rechazar" conectados a `PATCH /<id>/estado`.

---

## 5. Dominio: Jugadores y Plantillas (`/api/jugadores` y `/api/plantillas`)

**Endpoints Jugadores:**
- `GET`, `POST`, `PUT`, `DELETE`.
- `POST /<id>/foto` : Para subir foto.
*Campos:* `nombres`, `apellidos`, `genero`, `documento_identificacion`, `fecha_nacimiento`, `correo`, `telefono`.

**Endpoints Plantillas:**
- `GET /` : Nómina del equipo (`id_equipo`, `id_torneo`). Devuelve `jugador` anidado.
- `POST /` : Asigna jugador a torneo (`id_jugador`, `id_torneo`, `id_equipo`, `numero_camiseta`).
- `DELETE /<id>` : Quita de nómina.

**Mapeo Frontend:**
- **Gestor de Roster Delegado (`/delegado/plantilla`)**:
  - **REGLA ESTRICTA:** Solo se habilita la gestión si el equipo tiene una inscripción `aprobada`. Si está 'pendiente', el backend devolverá `422`.
  - UI dividida en 2: "Base de datos de mis jugadores" y "Nómina para este torneo".
  - **Nuevo Jugador**: Formulario conectado a `POST /api/jugadores`. (La subida de foto vía `POST /<id>/foto` está deshabilitada temporalmente por feature flag).
  - **Inclusión**: Botón "Añadir a Roster" lanza `POST /api/plantillas` enviando el `id_jugador` y `numero_camiseta`.
  - **Validaciones:** El backend devolverá `409 Conflict` si el `numero_camiseta` ya está en uso en el mismo equipo/torneo, o si el jugador ya está inscrito en la misma categoría. Sin embargo, permite inscripciones multicategoría.

---

## 6. Dominio: Partidos (`/api/partidos`)

**Endpoints Disponibles:**
- `GET /` y `GET /<id>` : Devuelven resúmenes anidados de `equipo_local`, `equipo_visitante` y `torneo`.
- `POST /` : Programa partido (`fecha`, `hora`, `fase`, `ubicacion`, `id_torneo`, `ids_equipos`).
- `PUT /<id>` : Actualiza partido (`estado`, marcadores, logística).

**Mapeo Frontend:**
- **Público**: Calendario interactivo usando `GET /` filtrando por `id_torneo`.
- **Admin**: Formularios de programación (Generador de Fixture). 

---

## 7. Dominio: Estadísticas y Reportes (`/api/estadisticas` y `/api/reportes`)

**Endpoints Disponibles:**
- `GET /api/estadisticas/dashboard` : Retorna métricas.
- `POST /api/estadisticas/bulk` : Carga masiva (Ya Integrado).
- `GET /api/reportes/partido/<id>/planilla` : Descarga PDF oficial.

**Mapeo Frontend:**
- **Admin Dashboard (`/admin/dashboard`)**:
  - Tarjetas (Cards) superiores consumirán `GET /dashboard`.
- **Descargas**:
  - Botón secundario en lista de partidos que lance un `window.open` hacia `GET /api/reportes/partido/<id>/planilla`.

---

## Directrices de Calidad y Mapeo Estricto

1. **Correspondencia Zod ↔ Marshmallow:** El frontend jamás enviará campos que Marshmallow no espere, y respetará los límites (ej. `max=100`).
2. **Uso de Relaciones Anidadas:** Las interfaces React usarán los campos anidados (`partido.equipo_local.nombre`) provenientes del backend, erradicando consultas innecesarias N+1.
