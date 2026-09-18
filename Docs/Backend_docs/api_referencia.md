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

### Usuarios
| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/usuarios/me` | 🔒 | Todos | Obtener perfil del usuario autenticado |
| `PUT` | `/api/usuarios/me` | 🔒 | Todos | Actualizar perfil del usuario |

---

### Torneos
| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/torneos` | Público | — | Listar torneos activos (paginado) |
| `GET` | `/api/torneos/admin` | 🔒 | `super_admin` | Listar todos los torneos sin filtros |
| `GET` | `/api/torneos/disponibles-reinscripcion` | 🔒 | `delegado` | Torneos abiertos para inscripción |
| `GET` | `/api/torneos/<id>` | Público | — | Detalle de un torneo |
| `POST` | `/api/torneos` | 🔒 | `super_admin` | Crear torneo |
| `PUT` | `/api/torneos/<id>` | 🔒 | `super_admin` | Actualizar torneo |
| `PUT` | `/api/torneos/<id>/anular` | 🔒 | `super_admin` | Anular torneo |
| `DELETE` | `/api/torneos/<id>` | 🔒 | `super_admin` | Soft delete de torneo |
| `GET` | `/api/torneos/<id>/posiciones` | Público | — | Tabla de posiciones FIBA |
| `GET` | `/api/torneos/<id>/lideres` | Público | — | Tabla de líderes estadísticos |
| `POST` | `/api/torneos/<id>/categorias` | 🔒 | `super_admin` | Añadir categoría al torneo |
| `DELETE` | `/api/torneos/categorias/<id>` | 🔒 | `super_admin` | Quitar categoría del torneo |
| `POST` | `/api/torneos/<id>/calendario` | 🔒 | `super_admin` | Subir calendario (Excel/CSV) |

---

### Categorías
| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/categorias` | Público | — | Listar categorías disponibles |

---

### Equipos
| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/equipos` | Público | — | Listar equipos activos |
| `GET` | `/api/equipos/admin/list` | 🔒 | `super_admin` | Listado total de equipos |
| `GET` | `/api/equipos/<id>` | Público | — | Detalle de un equipo |
| `POST` | `/api/equipos` | 🔒 | `super_admin`, `delegado` | Crear equipo |
| `PUT` | `/api/equipos/<id>` | 🔒 | `super_admin`, `delegado` | Actualizar equipo |
| `PUT` | `/api/equipos/<id>/reactivar` | 🔒 | `super_admin` | Reactivar equipo desactivado |
| `DELETE` | `/api/equipos/<id>` | 🔒 | `super_admin` | Soft delete de equipo |
| `POST` | `/api/equipos/<id>/logo` | 🔒 | `super_admin`, `delegado` | Subir logo del equipo |
| `DELETE` | `/api/equipos/<id>/logo` | 🔒 | `super_admin`, `delegado` | Eliminar logo del equipo |
| `POST` | `/api/equipos/<id>/banner` | 🔒 | `super_admin`, `delegado` | Subir banner del equipo |

---

### Inscripciones
| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/inscripciones` | 🔒 | `super_admin`, `delegado` | Listar inscripciones |
| `GET` | `/api/inscripciones/publicas` | Público | — | Listar inscripciones aprobadas |
| `POST` | `/api/inscripciones` | 🔒 | `super_admin`, `delegado` | Crear borrador |
| `POST` | `/api/inscripciones/completa` | 🔒 | `super_admin` | Inscribir y aprobar directo |
| `POST` | `/api/inscripciones/reinscribir` | 🔒 | `delegado` | Reinscribir con clonado plantilla |
| `PATCH` | `/api/inscripciones/<id>/editar` | 🔒 | `super_admin`, `delegado` | Editar borrador |
| `POST` | `/api/inscripciones/<id>/finalizar-borrador`| 🔒 | `delegado` | Enviar a revisión |
| `DELETE` | `/api/inscripciones/<id>` | 🔒 | `delegado` | Eliminar borrador |
| `PATCH` | `/api/inscripciones/<id>/estado` | 🔒 | `super_admin` | Aprobar/rechazar inscripción |
| `PUT` | `/api/inscripciones/<id>/retirar` | 🔒 | `super_admin`, `delegado` | Retirar equipo del torneo |
| `POST` | `/api/inscripciones/<id>/comprobante` | 🔒 | `super_admin`, `delegado` | Subir comprobante |
| `POST` | `/api/inscripciones/purgar-expiradas` | 🔒 | `super_admin` | Limpiar borradores antiguos |

---

### Jugadores
| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/jugadores` | 🔒 | `super_admin`, `delegado` | Listar jugadores |
| `GET` | `/api/jugadores/buscar` | 🔒 | `super_admin`, `delegado` | Búsqueda por nombre/cédula |
| `GET` | `/api/jugadores/<id>` | 🔒 | `super_admin`, `delegado` | Detalle de un jugador |
| `GET` | `/api/jugadores/<id>/perfil` | Público | — | Perfil público de estadísticas |
| `POST` | `/api/jugadores` | 🔒 | `super_admin`, `delegado` | Registrar jugador |
| `PUT` | `/api/jugadores/<id>` | 🔒 | `super_admin`, `delegado` | Actualizar jugador |
| `DELETE` | `/api/jugadores/<id>` | 🔒 | `super_admin`, `delegado` | Soft delete de jugador |
| `POST` | `/api/jugadores/<id>/foto` | 🔒 | `super_admin`, `delegado` | Subir foto de perfil |
| `POST` | `/api/jugadores/<id>/cedula` | 🔒 | `super_admin`, `delegado` | Subir documento identidad |
| `POST` | `/api/jugadores/<id>/acta` | 🔒 | `super_admin`, `delegado` | Subir acta de compromiso |

---

### Plantillas
| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/plantillas` | 🔒 | `super_admin`, `delegado` | Listar plantillas |
| `GET` | `/api/plantillas/<id>` | 🔒 | `super_admin`, `delegado` | Detalle de una plantilla |
| `POST` | `/api/plantillas` | 🔒 | `super_admin`, `delegado` | Agregar jugador a nómina |
| `PATCH` | `/api/plantillas/<id>` | 🔒 | `super_admin`, `delegado` | Actualizar número camiseta |
| `DELETE` | `/api/plantillas/<id>` | 🔒 | `super_admin`, `delegado` | Quitar jugador de nómina |

---

### Partidos
| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/partidos` | Público | — | Listar partidos |
| `GET` | `/api/partidos/<id>` | Público | — | Detalle de un partido |
| `GET` | `/api/partidos/<id>/estadisticas`| Público | — | Estadísticas del partido |
| `POST` | `/api/partidos` | 🔒 | `super_admin` | Programar partido |
| `PUT` | `/api/partidos/<id>` | 🔒 | `super_admin` | Actualizar partido |
| `DELETE` | `/api/partidos/<id>` | 🔒 | `super_admin` | Anular partido |
| `POST` | `/api/partidos/<id>/restaurar` | 🔒 | `super_admin` | Restaurar partido anulado |
| `POST` | `/api/partidos/<id>/acta` | 🔒 | `super_admin` | Subir acta escaneada |
| `DELETE` | `/api/partidos/<id>/acta` | 🔒 | `super_admin` | Eliminar acta escaneada |

---

### Estadísticas (Dashboard y Bulk)
| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/estadisticas/dashboard` | 🔒 | `super_admin` | KPIs para dashboard admin |
| `GET` | `/api/estadisticas/dashboard/actividad-reciente`| 🔒 | `super_admin` | Log de actividad reciente |
| `POST` | `/api/estadisticas/bulk` | 🔒 | `super_admin`, `delegado` | Ingreso masivo de stats |

---

### Patrocinadores
| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/patrocinadores` | Público | — | Listar patrocinadores activos |
| `POST` | `/api/patrocinadores` | 🔒 | `super_admin` | Crear patrocinador |
| `PUT` | `/api/patrocinadores/<id>` | 🔒 | `super_admin` | Actualizar patrocinador |
| `DELETE`| `/api/patrocinadores/<id>` | 🔒 | `super_admin` | Eliminar patrocinador |

---

### Sanciones
| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/sanciones/` | 🔒 | `super_admin` | Listar sanciones |
| `POST` | `/api/sanciones/` | 🔒 | `super_admin` | Registrar sanción disciplinaria |
| `PUT` | `/api/sanciones/<id>` | 🔒 | `super_admin` | Actualizar sanción |

---

### Reportes
| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| `GET` | `/api/reportes/partido/<id>/planilla` | 🔒 | `super_admin`, `delegado` | Descarga PDF planilla FIBA |

---

## Códigos de Error Generales
| Código | HTTP | Descripción |
|--------|------|-------------|
| `MISSING_TOKEN` | 401 | Header `Authorization: Bearer` ausente |
| `TOKEN_EXPIRED` | 401 | JWT expirado |
| `INVALID_TOKEN` | 401 | Firma JWT inválida |
| `USER_NOT_FOUND`| 401 | UUID del token no existe |
| `USER_INACTIVE` | 403 | Cuenta desactivada |
| `FORBIDDEN` | 403 | Rol insuficiente |
| `NOT_FOUND` | 404 | Recurso no encontrado |
| `VALIDATION_ERROR` | 422 | Error de validación Marshmallow/Negocio |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Archivo no soportado |
| `STORAGE_ERROR` | 502 | Error en Supabase Storage |
| `SERVER_CONFIG_ERROR`| 500 | Configuración faltante del servidor |
