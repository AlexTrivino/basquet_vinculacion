# Referencia de la API — Sistema de Torneos de Baloncesto

## Convenciones Generales

### Autenticación

Todas las rutas protegidas requieren el header:

```
Authorization: Bearer <jwt_token>
```

El token es emitido por Supabase Auth. El backend valida la firma mediante JWKS (ES256/RS256) con fallback a HS256.

### Formato de Respuesta

Todas las respuestas siguen el formato estandarizado:

**Éxito:**
```json
{
  "success": true,
  "message": "Operación exitosa.",
  "data": { ... },
  "pagination": { "page": 1, "per_page": 20, "total": 47, "pages": 3 }
}
```

**Error:**
```json
{
  "success": false,
  "error_code": "VALIDATION_ERROR",
  "message": "Descripción legible del error."
}
```

### Paginación

Todos los endpoints GET de listado aceptan:

| Parámetro | Default | Máximo | Descripción |
|-----------|---------|--------|-------------|
| `page` | 1 | — | Número de página |
| `per_page` | 20 | 50 | Registros por página |

---

## Endpoints

### Health Check

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/health` | Público | Estado del servidor y conexión a BD |

---

### Torneos

| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/torneos` | Público | — | Listar torneos activos (paginado) |
| `GET` | `/api/torneos/<id>` | Público | — | Detalle de un torneo |
| `POST` | `/api/torneos` | 🔒 | `super_admin` | Crear torneo |
| `PUT` | `/api/torneos/<id>` | 🔒 | `super_admin` | Actualizar torneo |
| `DELETE` | `/api/torneos/<id>` | 🔒 | `super_admin` | Soft delete de torneo |
| `GET` | `/api/torneos/<id>/posiciones` | Público | — | Tabla de posiciones FIBA |

**Schema de creación (`TorneoCreateSchema`):**
```json
{
  "nombre": "Copa Salesiana 2025",
  "descripcion": "Torneo intercolegial",
  "fecha_inicio": "2025-06-01",
  "fecha_fin": "2025-07-15",
  "ubicacion": "Coliseo Salesiano, Manta"
}
```

**Validaciones:** `fecha_fin >= fecha_inicio` (Marshmallow `@validates_schema`).

---

### Categorías

| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/categorias` | Público | — | Listar categorías disponibles |

> Las categorías son de solo lectura y se cargan via seeders.

---

### Equipos

| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/equipos` | Público | — | Listar equipos activos (paginado) |
| `GET` | `/api/equipos/<id>` | Público | — | Detalle de un equipo |
| `POST` | `/api/equipos` | 🔒 | `super_admin`, `delegado` | Crear equipo |
| `PUT` | `/api/equipos/<id>` | 🔒 | `super_admin`, `delegado` | Actualizar equipo |
| `DELETE` | `/api/equipos/<id>` | 🔒 | `super_admin`, `delegado` | Soft delete de equipo |

**Nota:** Los delegados solo pueden modificar/eliminar equipos propios (`equipo.id_usuario == g.usuario_id`).

---

### Inscripciones

| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/inscripciones` | 🔒 | `super_admin`, `delegado` | Listar inscripciones (filtrado por rol) |
| `POST` | `/api/inscripciones` | 🔒 | `super_admin`, `delegado` | Inscribir equipo en torneo |
| `PATCH` | `/api/inscripciones/<id>/estado` | 🔒 | `super_admin` | Aprobar/rechazar inscripción |
| `POST` | `/api/inscripciones/<id>/comprobante` | 🔒 | `super_admin`, `delegado` | Subir comprobante de pago |

**Schema de creación (`InscripcionCreateSchema`):**
```json
{
  "id_torneo": 1,
  "id_equipo": 3,
  "id_categoria": 2
}
```

**Comprobante de pago:**
- Content-Type: `multipart/form-data`
- Campo: `archivo`
- Tipos aceptados: JPEG, PNG, WebP, PDF (validados por magic bytes)
- Límite: 5 MB (configurado en `MAX_CONTENT_LENGTH`)

**Constraint de unicidad:** `(id_torneo, id_equipo, id_categoria)` — impide doble inscripción.

---

### Jugadores

| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/jugadores` | 🔒 | `super_admin`, `delegado` | Listar jugadores (paginado) |
| `GET` | `/api/jugadores/<id>` | 🔒 | `super_admin`, `delegado` | Detalle de un jugador |
| `POST` | `/api/jugadores` | 🔒 | `super_admin`, `delegado` | Registrar jugador |
| `PUT` | `/api/jugadores/<id>` | 🔒 | `super_admin`, `delegado` | Actualizar datos del jugador |
| `DELETE` | `/api/jugadores/<id>` | 🔒 | `super_admin`, `delegado` | Soft delete de jugador |
| `POST` | `/api/jugadores/<id>/foto` | 🔒 | `super_admin`, `delegado` | Subir foto de perfil |

**Schema de creación (`JugadorCreateSchema`):**
```json
{
  "nombres": "Carlos",
  "apellidos": "Mendoza García",
  "documento_identificacion": "1234567890",
  "fecha_nacimiento": "2005-03-15"
}
```

**Validaciones:** Cédula con formato válido. `fecha_nacimiento` en el pasado.

**Foto de perfil:**
- Content-Type: `multipart/form-data`
- Campo: `archivo`
- Tipos aceptados: JPEG, PNG, WebP (solo imágenes, sin PDF)
- Límite: 5 MB (aplicado globalmente)

---

### Plantillas (Nóminas)

| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/plantillas` | 🔒 | `super_admin`, `delegado` | Listar plantillas (paginado) |
| `POST` | `/api/plantillas` | 🔒 | `super_admin`, `delegado` | Agregar jugador a nómina |
| `PUT` | `/api/plantillas/<id>` | 🔒 | `super_admin`, `delegado` | Actualizar (ej. número de camiseta) |
| `DELETE` | `/api/plantillas/<id>` | 🔒 | `super_admin`, `delegado` | Quitar jugador de nómina |

**Schema de creación (`PlantillaCreateSchema`):**
```json
{
  "id_jugador": 45,
  "id_equipo": 3,
  "id_torneo": 1,
  "numero_camiseta": 7
}
```

**Validaciones FIBA implementadas en el servicio:**
1. Jugador no duplicado en el mismo equipo/torneo.
2. Jugador no inscrito en otro equipo del mismo torneo.
3. Número de camiseta único dentro del equipo/torneo.

---

### Partidos

| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/partidos` | Público | — | Listar partidos (paginado, filtro `?id_torneo=`) |
| `GET` | `/api/partidos/<id>` | Público | — | Detalle de un partido |
| `POST` | `/api/partidos` | 🔒 | `super_admin` | Programar partido |
| `PUT` | `/api/partidos/<id>` | 🔒 | `super_admin` | Actualizar marcadores/estado |
| `DELETE` | `/api/partidos/<id>` | 🔒 | `super_admin` | Soft delete de partido |

**Schema de actualización (`PartidoUpdateSchema`):**
```json
{
  "estado": "finalizado",
  "marcador_local": 78,
  "marcador_visitante": 65
}
```

**Estados válidos:** `programado`, `en_curso`, `finalizado`, `finalizado_wo`, `suspendido`.

**Efecto colateral:** Al actualizar un partido a estado `finalizado` o `finalizado_wo`, el servicio puede disparar el recálculo de la tabla de posiciones.

---

### Estadísticas (Bulk)

| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `POST` | `/api/estadisticas/bulk` | 🔒 | `super_admin`, `delegado` | Ingreso masivo de stats de un equipo |

**Schema (`EstadisticasBulkSchema`):**
```json
{
  "id_partido": 12,
  "id_equipo": 3,
  "estadisticas_jugadores": [
    {
      "id_jugador": 45,
      "puntos": 18,
      "triples": 2,
      "faltas": 3,
      "rebotes": 5,
      "asistencias": 4,
      "sancion_tipo": "descalificante"
    }
  ]
}
```

**Validaciones:**
- `faltas`: 0–6 (límite FIBA).
- `sancion_tipo` (opcional): `tecnica`, `antideportiva`, `descalificante`.
- **Anti-spoofing:** set difference contra Plantillas con `in_` para verificar que todos los jugadores pertenecen al equipo declarado.

**Garantías transaccionales:**
- Bulk INSERT con `db.session.execute(insert())` — un solo INSERT multi-row.
- Sanciones insertadas en el mismo bloque transaccional (`flush()` + `commit()`).
- Rollback completo si cualquier fila falla.

---

### Reportes

| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/reportes/partido/<id>/planilla` | 🔒 | `super_admin`, `delegado` | Descarga PDF de planilla FIBA |

**Respuesta:** Archivo PDF (`application/pdf`) como attachment.

**Requisito:** El partido debe estar en estado `finalizado` o `finalizado_wo`.

**Contenido del PDF:**
- Encabezado con nombre del torneo y metadatos del partido.
- Marcador final.
- Tabla de estadísticas del equipo local (jugadores, puntos, triples, faltas, rebotes, asistencias).
- Tabla de estadísticas del equipo visitante.
- Fila de totales por equipo.

---

## Códigos de Error

| Código | HTTP | Descripción |
|--------|------|-------------|
| `MISSING_TOKEN` | 401 | Header `Authorization: Bearer` ausente |
| `TOKEN_EXPIRED` | 401 | JWT expirado |
| `INVALID_TOKEN` | 401 | Firma JWT inválida |
| `USER_NOT_FOUND` | 401 | UUID del token no existe en tabla `usuarios` |
| `USER_INACTIVE` | 403 | Cuenta del usuario desactivada |
| `FORBIDDEN` | 403 | Rol insuficiente para la operación |
| `NOT_FOUND` | 404 | Recurso no encontrado |
| `VALIDATION_ERROR` | 422 | Datos no pasan validación Marshmallow o de negocio |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Archivo con tipo MIME no permitido (por magic bytes) |
| `STORAGE_ERROR` | 502 | Error al subir archivo a Supabase Storage |
| `SERVER_CONFIG_ERROR` | 500 | Variable de entorno faltante en el servidor |
