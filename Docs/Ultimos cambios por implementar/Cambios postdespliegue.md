# 📋 Cambios Propuestos por el Cliente — Plataforma Torneos Baloncesto Manta
Este documento hace referencia a [[Borrador de cambios por hacer]]
> **Fecha de registro:** 10 de agosto de 2026  
> **Estado:** Análisis y organización  
> **Contexto:** El proyecto está en **producción** con datos reales. Todo cambio debe ser retrocompatible y seguro.

---

## Índice de Bloques Temáticos

| Bloque         | Tema                                                          | Puntos Originales | Dificultad Global |
| -------------- | ------------------------------------------------------------- | ----------------- | ----------------- |
| [A](#bloque-a) | Cambio del Modelo de Negocio de Equipos (Atomicidad)          | 8, 11, 16         | 🔴 Alta           |
| [B](#bloque-b) | Reestructuración del Ciclo de Vida de Torneos e Inscripciones | 5, 6              | 🔴 Alta           |
| [C](#bloque-c) | Estadísticas por Torneo y Categoría                           | 4, 10             | 🟡 Media          |
| [D](#bloque-d) | Remodelación de la Vista Pública de Torneos                   | 2, 12             | 🟡 Media          |
| [E](#bloque-e) | Gestión de Auspiciantes (CRUD + Carrusel Infinito)            | 1                 | 🟢 Baja-Media     |
| [F](#bloque-f) | Mejoras de UX en Formularios e Interfaz                       | 3, 7, 13, 15      | 🟢 Baja           |
| [G](#bloque-g) | Dashboard de Administrador Mejorado                           | 9                 | 🟡 Media          |
| [H](#bloque-h) | Pendientes para Consultar con el Cliente                      | 12, 14, 16, 17    | ⚪ Bloqueado       |

---

## Bloque A: Cambio del Modelo de Negocio de Equipos (Atomicidad) {#bloque-a}

> **Puntos originales:** 8, 11, 16  
> **Dificultad:** 🔴 Alta — Cambio de arquitectura fundamental

### Descripción del Cambio

Actualmente los equipos están implícitamente ligados a un solo torneo a través de la inscripción. El cliente solicita que **los equipos sean entidades atómicas e independientes** que existen fuera de los torneos:

- Un equipo es un objeto por sí mismo, con identidad propia.
- Un mismo equipo puede participar en **distintos torneos**, **distintas categorías**, **distintos años** y con **distintos jugadores** en cada participación.
- Un delegado puede re-inscribir su equipo en otro torneo (incluso simultáneamente si se confirma con el cliente).
- Se debe diferenciar claramente entre **crear un equipo** e **inscribir un equipo en un torneo**.

### Certezas Actuales
- Un equipo puede inscribirse en **múltiples torneos simultáneamente** si el delegado lo desea.
- Falta confirmar: **límites de equipos por delegado** y **límites de inscripciones activas simultáneas**

### Análisis de Impacto Técnico

> [!CAUTION]
> Este es el cambio con mayor impacto en todo el sistema. Redefine la relación `Equipo ↔ Inscripcion ↔ Torneo` y afecta prácticamente todas las capas.

| Capa | Componentes Afectados | Detalle |
|------|----------------------|---------|
| **Modelo** | [equipo.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/models/equipo.py) | Los equipos ya son atómicos a nivel de modelo (no tienen FK a torneo), pero la lógica de negocio los trata como ligados a una sola inscripción. Se debe ajustar el `CheckConstraint` para soportar soft delete extendido. |
| **Modelo** | [inscripcion.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/models/inscripcion.py) | La `UniqueConstraint(id_torneo, id_equipo, id_categoria)` ya permite un equipo en múltiples torneos/categorías. **No requiere cambio de constraint**, pero la lógica de servicio que asume "1 equipo = 1 inscripción" sí debe cambiar. |
| **Servicio** | [inscripcion_service.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/services/inscripcion_service.py) | La validación de "límite de 3 equipos" debe reinterpretarse. ¿Son 3 equipos creados o 3 inscripciones activas? Esto depende de la respuesta del cliente. |
| **Servicio** | [equipo_service.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/services/equipo_service.py) | Separar la lógica de "crear equipo" de "inscribir equipo". Actualmente el wizard del delegado hace ambas cosas en un flujo unificado. |
| **Frontend** | [Dashboard.tsx (delegado)](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/delegado/Dashboard.tsx) | Remodelación total. Actualmente muestra inscripciones como si fueran equipos. Debe mostrar: (1) lista de equipos del delegado, (2) inscripciones activas de cada equipo, (3) opción de crear nuevo equipo, (4) opción de inscribir equipo existente en nuevo torneo. |
| **Frontend** | [Inscripcion.tsx](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/delegado/Inscripcion.tsx) | El wizard actual combina creación de equipo + inscripción. Se debe dividir en dos flujos: creación de equipo (nombre, logo) e inscripción (selección de torneo, categoría, comprobante). |
| **Rutas** | [router.tsx](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/routes/router.tsx) | Nuevas rutas: `/delegado/equipos/nuevo`, `/delegado/equipos/:id/inscribir`. |
| **Migración BD** | Alembic | No se requieren cambios destructivos en tablas. Los cambios son de **lógica**, no de schema. La constraint existente ya soporta múltiples inscripciones por equipo. |

---

## Bloque B: Reestructuración del Ciclo de Vida de Torneos e Inscripciones {#bloque-b}

> **Puntos originales:** 5, 6  
> **Dificultad:** 🔴 Alta — Cambios de reglas de negocio críticas + nueva entidad

### B.1: Bloqueo de inscripciones y cambios cuando un torneo pasa a "en curso"

**Regla nueva:** Una vez que un torneo cambia su estado a `en_curso`:
- **Se cierran** las inscripciones de equipos (ni nuevas, ni modificaciones).
- **Se cierran** los cambios en plantillas inscritas en ese torneo.
- **Solo el administrador** puede hacer modificaciones a inscripciones/plantillas de un torneo en curso.
- **Tampoco** se admiten nuevas inscripciones cuando el torneo está `finalizado`.

**Estado actual:** El backend permite inscripciones a torneos `programado` y `en_curso`. Se debe restringir para que solo `programado` admita nuevas inscripciones de delegados.

#### Impacto Técnico

| Capa | Componentes Afectados | Detalle |
|------|----------------------|---------|
| **Servicio** | [inscripcion_service.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/services/inscripcion_service.py) | Añadir validación: si `torneo.estado != 'programado'`, bloquear inscripciones de delegados. El super_admin debe poder saltarse esta restricción. |
| **Servicio** | [plantilla_service.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/services/plantilla_service.py) | Añadir validación: si el torneo asociado está `en_curso` o `finalizado`, bloquear operaciones CRUD de plantilla para delegados. Solo super_admin puede modificar. |
| **Frontend** | Dashboard Delegado, Plantilla Delegado | Deshabilitar acciones de edición/inscripción con mensajes informativos cuando el torneo no está en fase `programado`. Mostrar banners tipo "El torneo ya está en curso, contacta al administrador para cambios." |

---

### B.2: Eliminación de equipos (dos modalidades desde panel de admin)

El administrador tendrá **dos acciones** sobre equipos:

**Opción 1 — Retirar equipo de un torneo** (soft delete contextual):
- El equipo "desaparece" del torneo: no cuenta como participante, no suma en contadores.
- Los datos históricos **se preservan**: si el equipo jugó partidos, esos resultados siguen apareciendo en el historial.
- La inscripción asociada pasa a un estado especial (ej. `retirado`) que los queries de conteo excluyen.
- Cómo se visualiza el equipo en partidos históricos: **pregunta pendiente para el cliente** (badge "Retirado", nombre tachado, etc.).

**Opción 2 — Eliminar equipo permanentemente** (soft delete global):
- El equipo se marca como `eliminado` (nuevo estado) en la tabla `equipos`.
- Desaparece del directorio de equipos, de todos los torneos, de todos los listados.
- Los datos asociados (plantillas, inscripciones, estadísticas) **no se borran físicamente** para mantener integridad referencial, pero se excluyen de todas las consultas.

> [!IMPORTANT]
> **Recomendación técnica:** Soft delete en ambos casos. Se recomienda:
> - **Para el torneo:** Añadir estado `retirado` a `inscripciones.estado_inscripcion`.
> - **Para el equipo global:** Añadir estado `eliminado` al `CheckConstraint` de `equipos.estado` (actualmente solo acepta `activo` | `inactivo`).
> - Actualizar el método `Equipo.activos()` y todos los queries de conteo para excluir `eliminado`.

#### Impacto Técnico

| Capa | Componentes Afectados | Detalle |
|------|----------------------|---------|
| **Modelo** | [inscripcion.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/models/inscripcion.py) | Añadir `'retirado'` al `CheckConstraint` de `estado_inscripcion`. Migración Alembic segura (ALTER CHECK CONSTRAINT, no destructiva). |
| **Modelo** | [equipo.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/models/equipo.py) | Añadir `'eliminado'` al `CheckConstraint` de `estado`. Actualizar `activos()` para excluir tanto `inactivo` como `eliminado`. |
| **Servicio** | [equipo_service.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/services/equipo_service.py) | Dos nuevos métodos: `retirar_de_torneo(id_equipo, id_torneo)` y `eliminar_permanente(id_equipo)`. Ambos solo para `super_admin`. |
| **Rutas** | [equipo_bp.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/routes/equipo_bp.py) | Nuevos endpoints: `DELETE /api/equipos/:id/torneo/:id_torneo` (retirar) y `DELETE /api/equipos/:id` (eliminar permanente). |
| **Servicio** | [standings.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/services/standings.py) | Los queries de tabla de posiciones y conteo de equipos deben **excluir** inscripciones en estado `retirado`. |
| **Frontend** | [AdminEquipos.tsx](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/admin/AdminEquipos.tsx) | Añadir botones de acción: "Retirar de Torneo" (con selector de torneo) y "Eliminar Permanentemente" (con modal de confirmación peligrosa). |
| **Frontend** | Todos los listados públicos, contadores, directorio | Asegurar que equipos con `estado = 'eliminado'` e inscripciones con `estado = 'retirado'` no aparezcan en contadores, listados ni selects. |
| **Migración BD** | Alembic | Dos migraciones seguras: (1) ampliar CHECK de `inscripciones.estado_inscripcion`, (2) ampliar CHECK de `equipos.estado`. Ambas son ADD VALUE, no destructivas. |

---

### B.3: Solicitud de Actualización de Plantilla (nueva entidad)

**Regla nueva:** Los delegados **no pueden editar** directamente la plantilla de su equipo una vez aprobada. Si necesitan hacer cambios, deben enviar una **solicitud de actualización de plantilla** que el admin aprobará o rechazará.

**Flujo propuesto:**
1. Delegado ve su plantilla actual como **solo lectura** (sin botones de editar dorsal, eliminar jugador, etc.).
2. Si necesita un cambio, accede a "Solicitar Actualización de Plantilla".
3. Se le presenta un wizard de 2 pasos:
   - **Paso 1:** Subir nuevo comprobante de pago (los datos del equipo son los mismos).
   - **Paso 2:** Formulario de plantilla pre-cargado con la plantilla actual. Puede añadir/eliminar jugadores.
4. Al enviar, se crea un registro en la nueva tabla `solicitudes_plantilla` con estado `pendiente`.
5. El admin revisa y aprueba/rechaza desde su panel de auditoría.
6. **Solo se puede solicitar** si el torneo está en estado `programado` (no `en_curso` ni `finalizado`).

**Restricciones adicionales:**
- Se elimina la opción de editar dorsales desde la interfaz de plantilla del delegado.
- Se actualizan los textos informativos del wizard para indicar que los errores de datos deben reportarse al admin.
- La edición directa de plantilla queda reservada **exclusivamente al super_admin**.

#### Impacto Técnico

| Capa | Componentes Afectados | Detalle |
|------|----------------------|---------|
| **Nuevo Modelo** | `solicitud_plantilla.py` [NUEVO] | Tabla `solicitudes_plantilla` con campos: `id`, `id_inscripcion` (FK), `estado` (`pendiente` \| `aprobada` \| `rechazada`), `url_comprobante_pago`, `cambios_propuestos` (JSON con adds/removes), `created_at`, `updated_at`. |
| **Nuevo Servicio** | `solicitud_plantilla_service.py` [NUEVO] | Lógica de creación, validación (torneo debe estar en `programado`), aprobación (aplica cambios a tabla `plantillas`) y rechazo. |
| **Nuevo Schema** | `solicitud_plantilla_schema.py` [NUEVO] | Marshmallow schema para validación de input. |
| **Nueva Ruta** | `solicitud_plantilla_bp.py` [NUEVO] | `POST /api/solicitudes-plantilla`, `GET /api/solicitudes-plantilla` (para admin), `PUT /api/solicitudes-plantilla/:id/aprobar`, `PUT /api/solicitudes-plantilla/:id/rechazar`. |
| **Frontend** | [Plantilla.tsx (delegado)](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/delegado/Plantilla.tsx) | Convertir a vista **solo lectura**. Eliminar botones de edición de dorsal y eliminación de jugadores. Añadir botón "Solicitar Actualización". |
| **Frontend** | Nueva página `SolicitudPlantilla.tsx` [NUEVO] | Wizard de 2 pasos: comprobante + editor de plantilla. Se reutiliza la lógica del formulario de plantilla actual. |
| **Frontend** | [Auditoria.tsx (admin)](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/admin/Auditoria.tsx) | Añadir pestaña o sección para revisar solicitudes de actualización de plantilla (similar al flujo actual de auditoría de inscripciones). |
| **Rutas Frontend** | [router.tsx](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/routes/router.tsx) | Nueva ruta: `/delegado/solicitud-plantilla`. |
| **Migración BD** | Alembic | Nueva tabla `solicitudes_plantilla`. Migración no destructiva (CREATE TABLE). |

---

## Bloque C: Estadísticas por Torneo y Categoría {#bloque-c}

> **Puntos originales:** 4, 10  
> **Dificultad:** 🟡 Media — El modelo actual ya soporta el desglose, falta el filtrado

### Descripción del Cambio

Las estadísticas de los jugadores deben calcularse y mostrarse **por participación específica** (torneo + categoría), no solo globales.

**En el perfil del jugador:**
- En la parte superior del área de tarjetas de estadísticas se muestran **dos selectores (dropdowns)**.
- **Selector 1 — Torneo:** Lista de torneos en los que participó el jugador. Por defecto seleccionado el **último torneo**.
- **Selector 2 — Categoría:** Lista de categorías disponibles **filtradas por el torneo seleccionado**. Bloqueado hasta que se seleccione un torneo. Por defecto seleccionada la **última categoría** en la que participó.
- Al cambiar torneo, se actualizan las categorías disponibles.
- Al cambiar categoría, se recalculan las estadísticas mostradas.
- Las tarjetas de estadísticas reflejan solo la participación del jugador en **ese torneo y esa categoría específica**.

**En la vista pública de torneos (punto 10):**
- En el futuro se crearán vistas con estadísticas agregadas por categoría y por equipo.
- Por ahora, se documenta la intención para que la base de datos y queries soporten esta granularidad.

### Estado Actual del Backend

El servicio [jugador_profile_service.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/services/jugador_profile_service.py) ya calcula `estadisticas_por_torneo` (líneas 106-133). El modelo [Estadistica](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/models/estadistica.py) tiene FK a `Partido`, y `Partido` tiene FK a `id_categoria`, por lo que **el desglose por categoría es posible sin cambios de schema** — solo requiere un JOIN adicional con `Partido.id_categoria`.

### Análisis de Impacto Técnico

| Capa | Componentes Afectados | Detalle |
|------|----------------------|---------|
| **Servicio** | [jugador_profile_service.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/services/jugador_profile_service.py) | Ampliar la sección "Estadísticas desglosadas por Torneo" para incluir el desglose por categoría. Cambiar el GROUP BY a `(Partido.id_torneo, Partido.id_categoria)`. Devolver `estadisticas_por_torneo_categoria` como un dict anidado. |
| **Schema** | [stats_schema.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/schemas/stats_schema.py) | Añadir schema para la respuesta de estadísticas filtradas, si no existe. |
| **Ruta (opcional)** | [stats_bp.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/routes/stats_bp.py) o [jugador_bp.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/routes/jugador_bp.py) | Opción A: Incluir el desglose en la respuesta existente de `/api/jugadores/:id/perfil`. Opción B: Nuevo endpoint `GET /api/jugadores/:id/estadisticas?torneo=X&categoria=Y`. La Opción A es más eficiente (una sola llamada), ya que las participaciones del jugador ya contienen los IDs de torneo y categoría. |
| **Frontend** | [JugadorProfile.tsx](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/public/JugadorProfile.tsx) | Añadir dos `<select>` encima de las tarjetas de estadísticas. Estado local para torneo y categoría seleccionados. Filtrar las estadísticas mostradas según la combinación seleccionada. Default = último torneo + última categoría de las `participaciones`. |
| **Migración BD** | — | **No se requieren cambios de schema.** Todo es resoluble con queries. |

---

## Bloque D: Remodelación de la Vista Pública de Torneos {#bloque-d}

> **Puntos originales:** 2, 12  
> **Dificultad:** 🟡 Media — Reestructuración de UI + habilitación de históricos

### D.1: Historial de Torneos Pasados (Punto 2)

**Cambio:** El botón "Ver torneos anteriores" que actualmente está **deshabilitado** en el [Home](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/public/Home.tsx) (líneas 148-162) debe habilitarse para permitir navegar al detalle de torneos finalizados con toda su información: posiciones, calendario, resultados, estadísticas.

**Implicación:** No se necesita un cambio de backend — el endpoint `GET /api/torneos` ya devuelve torneos finalizados. El cambio es puramente de UI:
- Habilitar el botón y convertirlo en navegador (probablemente a una página `/torneos/historico` o expandiendo los tabs de años para mostrar más de 2 años).
- Asegurar que [TorneoDetail.tsx](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/public/TorneoDetail.tsx) funcione correctamente con torneos en estado `finalizado` (incluyendo tabs de posiciones, calendario y estadísticas con datos reales).

### D.2: Reestructuración del Orden de Tabs en Vista de Torneo (Punto 12)

**Cambio de orden propuesto:** Al ingresar a `/torneos/:id`, el orden de visualización será:
1. **Calendario general** (partidos programados/jugados) — ⚠️ **Confirmar con el cliente** qué entiende por "calendario general" (¿todas las categorías juntas o filtrado por categoría?).
2. **Posiciones** (tabla de posiciones por categoría).
3. **Estadísticas** — separadas por:
   - Categoría (con selector de categoría tipo dropdown/tabs).
   - Dentro de cada categoría: rankings de máximos goleadores, triplistas, etc. — ⚠️ **Confirmar con el cliente** la lista exacta de estadísticas.

#### Impacto Técnico

| Capa | Componentes Afectados | Detalle |
|------|----------------------|---------|
| **Frontend** | [Home.tsx](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/public/Home.tsx) | Habilitar botón de historial. Implementar navegación a torneos de años anteriores (expandir tabs de años o nueva vista). |
| **Frontend** | [TorneoDetail.tsx](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/public/TorneoDetail.tsx) | Reordenar tabs: Calendario → Posiciones → Estadísticas. Añadir selector de categoría en la pestaña de Estadísticas con sub-rankings (goleadores, triplistas, etc.). |
| **Backend** | [stats_bp.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/routes/stats_bp.py) | Posible nuevo endpoint o parámetro: `GET /api/torneos/:id/estadisticas?categoria=X&tipo=goleadores`. Alternativamente, filtrar en frontend si los datos ya vienen completos. |
| **Backend** | [standings.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/services/standings.py) | Verificar que el servicio de posiciones funcione correctamente para torneos finalizados. |

---

## Bloque E: Gestión de Auspiciantes (CRUD + Carrusel Infinito) {#bloque-e}

> **Punto original:** 1  
> **Dificultad:** 🟢 Baja-Media

### Descripción del Cambio

**Interfaz de admin (CRUD):**
- Nueva sección en el panel de admin para gestionar patrocinadores/auspiciantes.
- El admin puede **crear** un nuevo auspiciante (nombre + logo/imagen).
- El admin puede **editar** auspiciantes existentes (cambiar nombre o logo).
- El admin puede **eliminar** auspiciantes.
- Se aprovecha la tabla `patrocinadores` existente.
- En esta iteración, los patrocinadores se gestionan de forma **global** (no asociados a un torneo específico en la interfaz pública). La tabla `patrocinadores_torneos` se mantiene pero no se usa activamente en este MVP.

**Carrusel público en Home:**
- Banda de logos que se mueve infinitamente (animación CSS de marquee infinito).
- Siempre debe estar mostrando al menos un logo (loop infinito, sin espacios vacíos).
- **Si no hay ningún auspiciante registrado**, la banda/sección no se muestra (ni siquiera el contenedor vacío).
- Reemplaza la banda hardcodeada actual (que actualmente no existe en la Home — es creación nueva).

### Análisis de Impacto Técnico

| Capa | Componentes Afectados | Detalle |
|------|----------------------|---------|
| **Backend** | [patrocinador.py](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/backend/app/models/patrocinador.py) | El modelo ya existe con `nombre_patrocinador`, `url_logo_patrocinador`, `url_imagen_promocional`. No requiere cambios. |
| **Backend** | Rutas (posible nueva) | Verificar si existe CRUD para patrocinadores. Si no, crear: `GET /api/patrocinadores`, `POST /api/patrocinadores`, `PUT /api/patrocinadores/:id`, `DELETE /api/patrocinadores/:id`. Los GET son públicos, el resto requiere `super_admin`. |
| **Frontend** | Nueva página `AdminPatrocinadores.tsx` [NUEVO] | CRUD simple con: tabla/grid de patrocinadores, formulario modal para crear/editar (nombre + upload de logo), botón de eliminar con confirmación. |
| **Frontend** | [Home.tsx](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/public/Home.tsx) | Nuevo componente `<CarruselAuspiciantes />` insertado debajo del hero o antes del grid de torneos. Usa CSS `@keyframes` para animación de marquee infinito. Renderizado condicional: solo aparece si `patrocinadores.length > 0`. |
| **Frontend** | [router.tsx](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/routes/router.tsx) | Nueva ruta admin: `/admin/patrocinadores`. |
| **Migración BD** | — | **No se requieren cambios.** La tabla `patrocinadores` ya existe. |

---

## Bloque F: Mejoras de UX en Formularios e Interfaz {#bloque-f}

> **Puntos originales:** 3, 7, 13, 15  
> **Dificultad:** 🟢 Baja — Cambios puntuales de UI/texto

### F.1: Poder borrar documentos subidos antes de enviar inscripción (Punto 3)

**Cambio:** En el formulario de inscripción de equipo (wizard del delegado), permitir al delegado **limpiar/borrar** los archivos que ha subido (logo del equipo, comprobante de inscripción) antes de enviar la inscripción. Funcionalidad similar a la que ya existe en el formulario de ingreso de jugadores.

**Detalle:** Añadir un botón "×" o "Limpiar" junto a la preview del archivo subido. Al hacer click, limpia el campo del formulario y la preview, permitiendo subir otro archivo.

| Capa | Componentes Afectados |
|------|----------------------|
| **Frontend** | Componentes del wizard de inscripción (features/equipos) — añadir botón de limpieza de archivo junto a previews de logo y comprobante. |

### F.2: Cambiar todos los textos "clubes" por "equipos" (Punto 3)

**Cambio:** Reemplazo global de la palabra "clubes" por "equipos" en todo el frontend.

**Ubicaciones detectadas:** Dashboard delegado (línea 131: "Datos del Club y Comprobante", línea 159: "Datos del Club"), textos informativos del wizard, posiblemente en componentes de features.

| Capa | Componentes Afectados |
|------|----------------------|
| **Frontend** | Búsqueda global de "club" / "Club" / "clubes" / "Clubes" y reemplazo por "equipo" / "Equipo" / "equipos" / "Equipos" respectivamente. Solo cambios de texto, sin lógica. |

### F.3: Nombre del equipo, torneo y categoría más visible en el wizard (Punto 7)

**Cambio:** Durante el wizard de inscripción, hacer más prominente y visible la información de contexto: nombre del equipo, torneo seleccionado y categoría. Actualmente puede no ser evidente para el delegado en qué contexto está trabajando.

**Implementación sugerida:** Banner fijo tipo breadcrumb o header contextual en la parte superior del wizard: `Equipo: [Nombre] → Torneo: [Nombre] → Categoría: [Nombre]`.

| Capa | Componentes Afectados |
|------|----------------------|
| **Frontend** | Wizard de inscripción — añadir header contextual con los datos seleccionados. |

### F.4: Estados en mayúsculas en tarjetas de torneos (Punto 13)

**Cambio:** En las tarjetas de torneos de la página principal (Home), el texto de estados (`programado`, `en_curso`, `finalizado`) debe mostrarse en **mayúsculas completas** (ej. `PROGRAMADO`, `EN CURSO`, `FINALIZADO`).

| Capa | Componentes Afectados |
|------|----------------------|
| **Frontend** | [TorneoCardHome](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/features/torneos/components/TorneoCardHome.tsx) — añadir `uppercase` al texto de estado o transformar con `.toUpperCase()`. |

### F.5: Estado reactivo de inscripción en tarjeta del delegado (Punto 15)

**Cambio:** La tarjeta del equipo en el dashboard del delegado actualmente muestra "Rechazado" en algunos casos donde la inscripción está "Pendiente". Debe ser **reactiva** y mostrar el estado real de la inscripción en todo momento.

**Estado actual:** En [Dashboard.tsx (delegado)](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/delegado/Dashboard.tsx) línea 64, se usa un StatusBadge con lógica ternaria que podría tener un fallthrough incorrecto. El mapeo actual es:
```
borrador → 'Borrador'  
pendiente → 'Pendiente'  
aprobado → 'Aprobado'  
default → 'Rechazado'  ← Aquí está el bug
```

**Fix:** Mapear correctamente todos los estados posibles y mostrar labels descriptivos: "Inscripción Pendiente", "Inscripción Aprobada", "Inscripción Rechazada".

| Capa | Componentes Afectados |
|------|----------------------|
| **Frontend** | [Dashboard.tsx (delegado)](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/delegado/Dashboard.tsx) — Corregir la lógica de mapeo de estados en las líneas 64, 221, 281. Usar un switch/map exhaustivo en lugar de ternarios anidados con fallthrough. |

---

## Bloque G: Dashboard de Administrador Mejorado {#bloque-g}

> **Punto original:** 9  
> **Dificultad:** 🟡 Media

### Descripción del Cambio

El dashboard actual del admin ([Dashboard.tsx](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/admin/Dashboard.tsx)) es básico: 4 tarjetas de conteo estáticas. El cliente quiere:

- **Tarjetas clickeables** que naveguen a la sección correspondiente (actualmente algunas tienen `to: '#'`).
- **Partidos recientes** que necesitan ingreso de estadísticas (acceso rápido).
- **Accesos directos** a información relevante.
- **Diseño más dinámico** que comunique funcionalidad.

### Sugerencias para el Dashboard de Admin

Basándome en las funcionalidades del sistema, los endpoints existentes y las necesidades operativas del administrador, sugiero la siguiente estructura:

#### Sección 1 — Tarjetas KPI (fila superior, todas clickeables)
| Tarjeta | Dato | Navega a | Estado Actual |
|---------|------|----------|---------------|
| Inscripciones Pendientes | `stats.inscripciones_pendientes` | `/admin/auditoria` | ✅ Ya existe |
| Partidos Hoy/Próximos | `stats.partidos_hoy` | `/admin/partidos` | ✅ Ya existe |
| Equipos Inscritos | `stats.equipos_totales` | `/admin/equipos` | ⚠️ Existe pero `to: '#'` |
| Torneos Activos | Count real de torneos `en_curso` | `/admin/torneos` | ⚠️ Hardcodeado a `'1'` |
| Solicitudes de Plantilla Pendientes | Count de `solicitudes_plantilla` en estado `pendiente` | `/admin/auditoria?tab=plantillas` | 🆕 Nuevo (cuando se implemente B.3) |

#### Sección 2 — Partidos Pendientes de Estadísticas (acceso rápido)
- Lista de los **últimos 5-10 partidos finalizados** que no tienen estadísticas registradas (`stats_local_procesadas = false OR stats_visitante_procesadas = false`).
- Cada item muestra: fecha, equipos, marcador, con botón directo "Cargar Estadísticas" que navega a `/admin/partidos` con el partido seleccionado.
- Endpoint existente: se puede derivar de `GET /api/partidos` con filtros.

#### Sección 3 — Actividad Reciente (timeline)
- Últimas 5-8 acciones del sistema:
  - Nuevas inscripciones recibidas
  - Inscripciones aprobadas/rechazadas
  - Partidos finalizados
  - Solicitudes de plantilla recibidas
- Implementación: un nuevo endpoint `GET /api/admin/actividad-reciente` que haga UNION de las tablas relevantes ordenadas por `created_at DESC`.

#### Sección 4 — Accesos Rápidos (grid de iconos)
- Crear Torneo → `/admin/torneos`
- Programar Partido → `/admin/partidos`
- Auditar Inscripciones → `/admin/auditoria`
- Gestionar Auspiciantes → `/admin/patrocinadores` (cuando se implemente Bloque E)
- Ver Directorio de Equipos → `/admin/equipos`
- Ver Jugadores → `/admin/jugadores`

### Análisis de Impacto Técnico

| Capa | Componentes Afectados | Detalle |
|------|----------------------|---------|
| **Backend** | Endpoint de dashboard stats existente | Ampliar la respuesta para incluir: count real de torneos activos, count de partidos sin estadísticas, count de solicitudes de plantilla pendientes. |
| **Backend (nuevo)** | `GET /api/admin/actividad-reciente` [NUEVO] | Endpoint que consulta las últimas N acciones relevantes (inscripciones, aprobaciones, partidos finalizados) ordenadas por fecha. |
| **Frontend** | [Dashboard.tsx (admin)](file:///c:/Users/Alex1/Proyectos/Basquet_vinculacion/frontend/src/pages/admin/Dashboard.tsx) | Remodelación completa: tarjetas clickeables, sección de partidos pendientes de stats, timeline de actividad, grid de accesos rápidos. |

---

## Bloque H: Pendientes para Consultar con el Cliente {#bloque-h}

> Estos puntos requieren **confirmación del cliente** antes de poder diseñar la solución técnica.

---

### H.1: Visualización de equipos retirados en partidos históricos (del Punto 5)

> **Contexto:** Cuando el admin retira un equipo de un torneo en curso, los partidos que ese equipo ya jugó se preservan. Pero ¿cómo se ve ese equipo en el historial?

**Preguntas para el cliente:**
1. ¿El equipo retirado debe aparecer con un **indicador visual** en los partidos históricos? Opciones:
   - Badge "RETIRADO" junto al nombre
   - Nombre tachado/atenuado
   - Sin indicador, aparece exactamente igual
2. ¿Los puntos/goles de partidos ya jugados por un equipo retirado le siguen contando al equipo rival en las posiciones? ¿O esos partidos se anulan?
3. ¿Un equipo retirado puede ser "re-admitido" en el mismo torneo por el admin, o la acción es irreversible?

---

### H.2: Orden y contenido del Calendario en Vista de Torneo (del Punto 12)

> **Contexto:** El cliente dijo que lo primero debería ser el "calendario general" pero no detalló qué incluye.

**Preguntas para el cliente:**
1. ¿El "calendario general" muestra **todos los partidos de todas las categorías** mezclados en orden cronológico, o tiene filtros por categoría?
2. ¿El calendario muestra solo los partidos futuros/pendientes, o también los ya jugados con sus resultados?
3. ¿Hay alguna vista específica de calendario (tipo grilla semanal, lista cronológica, vista por jornada/fecha)?

---

### H.3: Lista exacta de estadísticas a mostrar por categoría (del Punto 12)

> **Contexto:** El cliente mencionó "goleadores, triplistas, etc." pero no la lista completa.

**Preguntas para el cliente:**

Actualmente el modelo de `Estadistica` registra por partido y jugador:
- `puntos_anotados` (dobles)
- `triples_anotados`
- `faltas_cometidas`
- `rebotes`
- `asistencias`
- `tiros_libres_anotados`
- `tapones`
- `robos`
- `valoracion`

**Pregunta:** De las siguientes categorías de ranking, ¿cuáles desea mostrar en la vista pública del torneo?
1. ✅ Máximos goleadores (puntos totales = puntos_anotados + triples_anotados × 3)
2. ✅ Máximos triplistas (triples_anotados)
3. ¿Máximos reboteadores?
4. ¿Máximos asistidores?
5. ¿Máximos taponeros?
6. ¿Máximos en robos?
7. ¿Ranking de tiros libres?
8. ¿Ranking de valoración?
9. ¿Algún otro ranking compuesto (MVP, doble-doble, etc.)?

---

### H.4: Redes Sociales (Punto 14)

> **Contexto:** El cliente mencionó implementar links a redes sociales pero sin detalles.

**Preguntas para el cliente:**
1. ¿Qué redes sociales manejan? (Instagram, Facebook, TikTok, Twitter/X, YouTube, WhatsApp)
2. ¿Los links van en el **footer** de toda la app, en el **hero** de la Home, o en ambos?
3. ¿Son links estáticos (hardcodeados) o el admin debería poder actualizarlos desde el panel?
4. ¿Se quieren mostrar los últimos posts o solo los íconos con link?

---

### H.5: Límites de Equipos e Inscripciones por Delegado (del Punto 16)

> **Contexto:** Con el nuevo modelo atómico de equipos (Bloque A), la regla actual de "máximo 3 equipos por delegado" necesita redefinirse.

**Preguntas para el cliente:**
1. ¿Cuántos **equipos** puede **crear** un delegado? (¿Sigue siendo 3?)
2. ¿Cuántas **inscripciones activas** puede tener un delegado simultáneamente? (Un equipo en 3 torneos = ¿cuenta como 3 o como 1?)
3. ¿Un delegado puede inscribir el mismo equipo en dos categorías del mismo torneo simultáneamente? (Ej. Equipo "Los Tiburones" en Sub-18 y en Libre del mismo torneo)
4. ¿Un delegado puede inscribir el mismo equipo en un nuevo torneo **mientras aún está participando** en otro torneo en curso?

---

### H.6: Mejora de correos enviados (Punto 17)

> **Contexto:** Punto dejado para revisión futura.

**Preguntas para el cliente:**
1. ¿Qué correos se envían actualmente? (Confirmación de inscripción, aprobación/rechazo, etc.)
2. ¿Qué mejoras específicas se buscan? (Diseño visual, contenido, frecuencia, nuevos tipos de notificación)
3. ¿Se quiere incluir el logo del torneo en los correos?
4. ¿Se quieren correos de notificación para: partidos programados, resultados, sanciones?

---

## Resumen de Priorización por Facilidad de Implementación

| Prioridad | Bloque | Descripción | Esfuerzo Estimado | Dependencias |
|-----------|--------|-------------|-------------------|--------------|
| 1️⃣ | **F** | Mejoras de UX puntuales (textos, estados, archivos) | 1-2 días | Ninguna |
| 2️⃣ | **E** | CRUD Auspiciantes + Carrusel | 2-3 días | Ninguna |
| 3️⃣ | **C** | Estadísticas por torneo/categoría en perfil de jugador | 2-3 días | Ninguna |
| 4️⃣ | **D** | Vista pública de torneos (historial + reordenamiento) | 3-4 días | Depende de H.2 y H.3 |
| 5️⃣ | **G** | Dashboard admin mejorado | 3-4 días | Parcialmente depende de B.3 |
| 6️⃣ | **B** | Ciclo de vida torneos + eliminación + solicitudes plantilla | 5-7 días | Depende de H.1 y H.5 |
| 7️⃣ | **A** | Atomicidad de equipos + sistema inscripción multi-torneo | 5-8 días | Depende de H.5, y debería implementarse después de B |

> [!TIP]
> **Recomendación de ejecución:** Empezar por los bloques F y E (quick wins que el cliente notará inmediatamente), luego C y D (valor visible con esfuerzo moderado), y finalmente B y A (cambios estructurales que requieren respuestas del cliente antes de iniciar).

> [!WARNING]
> Los bloques A y B están **mutuamente dependientes** en algunos aspectos (ej. el concepto de "equipo atómico" afecta cómo se diseñan las inscripciones y el ciclo de vida). Se recomienda **resolverlos juntos** una vez se tengan las respuestas del cliente de la sección H.
