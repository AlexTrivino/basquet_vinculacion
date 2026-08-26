# Re-inscripción de Equipos Existentes a Nuevos Torneos

## Contexto del Problema

Cuando un equipo ya aprobado en un torneo anterior quiere participar en un **nuevo torneo**, actualmente no existe un flujo dedicado. El wizard existente (`InscripcionWizard`) **crea un equipo nuevo** cada vez, lo cual:

- Duplica la entidad `Equipo` innecesariamente
- Pierde el historial del equipo (participaciones, partidos, estadísticas)
- Obliga a re-registrar jugadores desde cero

El modelo de datos **ya soporta** múltiples inscripciones del mismo equipo (gracias al `UniqueConstraint` en `(id_torneo, id_equipo, id_categoria)`), pero no existe un flujo de UI ni lógica de backend para aprovecharlo.

---

## Decisiones de Diseño (Resueltas en la Entrevista)

|#|Decisión|Resultado|
|---|---|---|
|1|Entidad re-inscrita|Equipo existente (reutilizar `id_equipo`)|
|2|Plantilla|Copia automática del último torneo, filtrada por género|
|3|Torneos elegibles|Solo estado `programado`|
|4|UI delegado|Banner dinámico en Dashboard|
|5|Comprobante|Nuevo comprobante por cada torneo|
|6|Flujo UX|Wizard simplificado de 2 pasos|
|7|Rechazo|Solo elimina inscripción, NUNCA el equipo|
|8|Vista Dashboard|Tarjetas agrupadas por equipo|
|9|Límite de 3|Aplica a equipos distintos, no inscripciones|
|10|Multi-categoría|Permitido, con plantillas separadas por categoría|
|11|Migración BD|`id_categoria` nullable en `plantillas`|
|12|Copia por género|Filtrar por `genero_categoria` de la categoría destino|
|13|Estado inicial|`borrador`|

---

## User Review Required

IMPORTANT

**Migración de BD en Producción**: Se agregará `id_categoria` como columna nullable a `plantillas`. Los registros históricos tendrán `NULL` y seguirán funcionando. Esta migración es no destructiva.

WARNING

**Cambio en el flujo de rechazo**: `_eliminar_datos_inscripcion_y_equipo()` se refactorizará para detectar si el equipo tiene otras inscripciones aprobadas. Si las tiene, solo eliminará la inscripción rechazada (y la plantilla **de ese torneo/categoría**), sin tocar el equipo ni sus jugadores.

---

## Proposed Changes

### Fase 1: Migración de BD — `id_categoria` en Plantillas

> **Objetivo**: Permitir que un equipo tenga plantillas diferentes por categoría dentro del mismo torneo.

#### [MODIFY] plantilla.py

- Agregar columna `id_categoria = db.Column(db.Integer, db.ForeignKey('categorias.id_categoria'), nullable=True)`
- Agregar relación `categoria = db.relationship('Categoria', ...)`
- El campo es **nullable** para retrocompatibilidad con datos existentes

#### [NEW] Migración Alembic

- `alembic revision --autogenerate -m "add_id_categoria_to_plantillas"`
- Columna nullable, sin `server_default`, sin riesgo para datos existentes

---

### Fase 2: Endpoint Backend de Re-inscripción

> **Objetivo**: Crear un endpoint `POST /api/inscripciones/reinscribir` que reciba un equipo existente + torneo + categoría + comprobante, y opcionalmente copie la plantilla anterior.

#### [MODIFY] inscripcion_bp.py

Nuevo endpoint: `POST /api/inscripciones/reinscribir`

- **Autenticación**: `@token_required(allowed_roles=['super_admin', 'delegado'])`
- **Payload** (multipart/form-data):
    - `id_equipo` (int, requerido) — el equipo existente
    - `id_torneo` (int, requerido) — el torneo nuevo
    - `id_categoria` (int, requerido) — la categoría seleccionada
    - `archivo` (file, requerido) — comprobante de pago
    - `copiar_plantilla` (bool, opcional, default `true`) — si copiar jugadores
- **Validaciones del backend**:
    1. El equipo pertenece al delegado autenticado (`equipo.id_usuario == g.usuario_id`)
    2. El equipo está activo
    3. El torneo está en estado `programado`
    4. No existe ya una inscripción para `(id_torneo, id_equipo, id_categoria)` → 409
    5. El equipo tiene al menos una inscripción previa aprobada (es "re-inscripción", no primera vez)
- **Lógica**:
    1. Crear `Inscripcion` en estado `borrador`
    2. Subir comprobante a Supabase Storage
    3. Si `copiar_plantilla=true`:
        - Buscar la plantilla más reciente del equipo que coincida con el `genero_categoria` destino
        - Clonar cada `Plantilla` entry con el nuevo `id_torneo` + `id_categoria`
        - Los jugadores NO se duplican (se referencian por `id_jugador`)
    4. Responder con la inscripción creada

#### [MODIFY] inscripcion_service.py

Nueva función: `reinscribir_equipo(id_equipo, id_torneo, id_categoria, copiar_plantilla=True)`

- Encapsula las validaciones de negocio
- Lógica de copia inteligente de plantilla:

python

def _copiar_plantilla_anterior(id_equipo, id_torneo_destino, id_categoria_destino):

    """Copia la plantilla más reciente del equipo que coincida con el género."""

    from app.models.categoria import Categoria

    # Obtener género de la categoría destino

    cat_destino = db.session.get(Categoria, id_categoria_destino)

    genero_destino = cat_destino.genero_categoria

    # Buscar la inscripción aprobada más reciente del mismo género

    ultima_inscripcion = (

        Inscripcion.query

        .join(Categoria, Inscripcion.id_categoria == Categoria.id_categoria)

        .filter(

            Inscripcion.id_equipo == id_equipo,

            Inscripcion.estado_inscripcion == 'aprobado',

            Categoria.genero_categoria == genero_destino,

            Inscripcion.id_torneo != id_torneo_destino,

        )

        .order_by(Inscripcion.fecha_inscripcion.desc())

        .first()

    )

    if not ultima_inscripcion:

        return 0  # Sin plantilla previa compatible

    # Clonar entradas activas

    plantillas_origen = Plantilla.query.filter_by(

        id_equipo=id_equipo,

        id_torneo=ultima_inscripcion.id_torneo,

        estado='activo',

    ).all()

    copiadas = 0

    for p in plantillas_origen:

        nueva = Plantilla(

            id_jugador=p.id_jugador,

            id_equipo=id_equipo,

            id_torneo=id_torneo_destino,

            id_categoria=id_categoria_destino,

            numero_camiseta=p.numero_camiseta,

            estado='activo',

        )

        db.session.add(nueva)

        copiadas += 1

    return copiadas

---

### Fase 3: Refactor Seguro del Flujo de Rechazo

> **Objetivo**: Evitar que el rechazo de una re-inscripción destruya el equipo y sus jugadores históricos.

#### [MODIFY] inscripcion_service.py

Refactorizar `cambiar_estado_inscripcion()` y `_eliminar_datos_inscripcion_y_equipo()`:

python

def cambiar_estado_inscripcion(id_inscripcion, nuevo_estado):

    inscripcion = db.session.get(Inscripcion, id_inscripcion)

    if inscripcion is None:

        return None

    if nuevo_estado == 'rechazado':

        equipo = inscripcion.equipo

        # ¿Tiene el equipo OTRAS inscripciones aprobadas?

        otras_aprobadas = (

            Inscripcion.query

            .filter(

                Inscripcion.id_equipo == inscripcion.id_equipo,

                Inscripcion.id_inscripcion != id_inscripcion,

                Inscripcion.estado_inscripcion.in_(['aprobado', 'pendiente', 'borrador']),

            )

            .count()

        )

        if otras_aprobadas > 0:

            # Re-inscripción: eliminar SOLO la inscripción y plantilla del torneo

            _eliminar_solo_inscripcion(inscripcion)

        else:

            # Primera inscripción: eliminar todo (comportamiento actual)

            _eliminar_datos_inscripcion_y_equipo(inscripcion)

        return 'DELETED'

    inscripcion.estado_inscripcion = nuevo_estado

    db.session.commit()

    return obtener_inscripcion_por_id(id_inscripcion)

Nueva función `_eliminar_solo_inscripcion()`:

- Elimina plantillas del equipo **solo para ese torneo**
- Elimina la inscripción
- **NO toca** el equipo, sus jugadores, ni archivos del jugador
- Solo limpia el comprobante de pago de esa inscripción

---

### Fase 4: Endpoint de Torneos Disponibles para Re-inscripción

> **Objetivo**: Proveer al frontend la lista de torneos `programado` donde el equipo aún no está inscrito.

#### [MODIFY] torneo_bp.py

Nuevo endpoint: `GET /api/torneos/disponibles-reinscripcion`

- **Auth**: `@token_required(allowed_roles=['delegado'])`
- **Respuesta**: Lista de torneos en estado `programado` con sus categorías, excluyendo combinaciones `(torneo, categoría)` donde el equipo ya tenga inscripción
- **Query params**: `id_equipo` (requerido)

---

### Fase 5: Frontend — Banner Dinámico en Dashboard del Delegado

> **Objetivo**: Notificar proactivamente al delegado cuando hay torneos nuevos disponibles para sus equipos.

#### [MODIFY] Dashboard.tsx

Agregar un componente `<BannerNuevosTorneos />` que:

1. Consulta `GET /api/torneos/disponibles-reinscripcion?id_equipo=X` para cada equipo aprobado del delegado
2. Si hay torneos disponibles, muestra un banner animado:

┌─────────────────────────────────────────────────────────────┐

│ 🏆 ¡Nuevos Torneos Disponibles!                            │

│                                                             │

│ «Copa Apertura 2027» está aceptando inscripciones           │

│                                                             │

│ [Inscribir «Los Delfines»]  [Inscribir «Tiburones BBC»]    │

└─────────────────────────────────────────────────────────────┘

3. Si hay múltiples torneos, mostrar uno por fila
4. Los botones navegan a `/delegado/reinscripcion/:idEquipo/:idTorneo`

#### [MODIFY] Dashboard.tsx

Refactorizar la vista de tarjetas del Dashboard para **agrupar por equipo**:

┌─ Los Delfines BBC ──────────────────────────────────┐

│  🏆 Copa Verano 2026  │  ✅ Aprobado  │ [Plantilla] │

│  🏆 Copa Apertura 2027│  ⏳ Pendiente │ [Bloqueada] │

└─────────────────────────────────────────────────────┘

┌─ Tiburones BBC ─────────────────────────────────────┐

│  🏆 Copa Verano 2026  │  ✅ Aprobado  │ [Plantilla] │

└─────────────────────────────────────────────────────┘

---

### Fase 6: Frontend — Wizard Simplificado de Re-inscripción

> **Objetivo**: Flujo de 2 pasos para re-inscribir un equipo existente.

#### [NEW] ReInscripcionWizard.tsx

Componente nuevo de 2 pasos:

**Paso 1 — Torneo + Categoría + Comprobante:**

- Header con logo y nombre del equipo (ya existente, no editable)
- Selector de torneo (pre-filtrado a los que están en `programado` y el equipo no esté ya inscrito)
- Selector de categoría (dinámico según el torneo seleccionado)
- Upload de comprobante de pago
- Checkbox: "Copiar plantilla del torneo anterior" (checked por defecto)

**Paso 2 — Revisión de Plantilla:**

- Si se copió plantilla: mostrar la lista de jugadores copiados con opción de quitar
- Botón para agregar jugadores nuevos (reutilizando el `GestorPlantilla` existente)
- Indicador de mínimo/máximo de jugadores (10-18)
- Botón "Enviar a Revisión" que llama a `finalizar-borrador`

#### [NEW] Reinscripcion.tsx

Página wrapper que:

- Lee `idEquipo` e `idTorneo` desde los params de ruta
- Carga datos del equipo y del torneo
- Renderiza `<ReInscripcionWizard />`

#### [MODIFY] Router — Agregar ruta `/delegado/reinscripcion/:idEquipo/:idTorneo`

#### [MODIFY] equipos.api.ts

Nueva función:

typescript

export async function reinscribirEquipo(formData: FormData): Promise<ApiResponse<Inscripcion>> {

  const response = await axiosInstance.post('/inscripciones/reinscribir', formData, {

    headers: { 'Content-Type': 'multipart/form-data' },

  });

  return response.data;

}

export async function getTorneosDisponiblesReinscripcion(idEquipo: number): Promise<ApiResponse<Torneo[]>> {

  const response = await axiosInstance.get('/torneos/disponibles-reinscripcion', {

    params: { id_equipo: idEquipo },

  });

  return response.data;

}

---

### Fase 7: Testing y Verificación

#### Backend (Pytest)

- **Test de re-inscripción exitosa**: Equipo aprobado en Torneo A se reinscribe en Torneo B con copia de plantilla
- **Test de copia filtrada por género**: Equipo con plantilla masculina no la copia al inscribirse en categoría femenina
- **Test de rechazo seguro**: Rechazar re-inscripción no elimina el equipo (pero sí la plantilla del torneo nuevo)
- **Test de rechazo primera inscripción**: Sigue eliminando equipo + jugadores (comportamiento actual)
- **Test de duplicado**: Intentar re-inscribirse en el mismo `(torneo, equipo, categoría)` devuelve 409
- **Test de torneo no programado**: Intentar re-inscribirse en torneo `en_curso` o `finalizado` devuelve 422

#### Frontend (Vitest)

- **Test de BannerNuevosTorneos**: Verifica que aparece solo cuando hay torneos disponibles
- **Test de ReInscripcionWizard**: Flujo completo de 2 pasos con mocks
- **Test de Dashboard agrupado**: Verifica agrupación por equipo con múltiples inscripciones

#### Manual

- Verificar en el navegador:
    1. Login como delegado con equipo aprobado
    2. Crear torneo nuevo desde admin → verificar que aparece el banner
    3. Ejecutar el wizard de re-inscripción completo
    4. Verificar que la plantilla fue copiada correctamente
    5. Verificar rechazo de re-inscripción no destruye equipo

---

## Verification Plan

### Automated Tests

bash

# Backend

cd backend && pytest tests/ -v

# Frontend  

cd frontend && npx vitest run

### Manual Verification

- Login como delegado → verificar banner de torneos nuevos
- Ejecutar flujo completo de re-inscripción end-to-end
- Verificar rechazo seguro de re-inscripción
- Verificar que la migración no afecta datos existentes