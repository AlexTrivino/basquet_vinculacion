"""
Schemas de Marshmallow para la entidad Equipo (Patrón DTO — Decisión #13).

Define schemas diferenciados según el consumidor:
    - ``EquipoCreateSchema``: Validación de entrada para delegados (POST).
    - ``EquipoUpdateSchema``: Validación de actualización parcial (PUT).
    - ``EquipoPublicSchema``: Serialización para vistas públicas (sin IDs sensibles).
    - ``EquipoAdminSchema``: Serialización completa para panel de administración.
"""
from marshmallow import Schema, fields, validate


# ── Schemas auxiliares anidados ───────────────────────────────────

class _UsuarioResumenSchema(Schema):
    id_usuario = fields.String()
    nombre = fields.String()
    correo = fields.String()

class _TorneoResumenSchema(Schema):
    id_torneo = fields.Integer()
    nombre = fields.String()

class _CategoriaResumenSchema(Schema):
    id_categoria = fields.Integer()
    nombre_categoria = fields.String()

class _InscripcionResumenSchema(Schema):
    id_inscripcion = fields.Integer()
    estado_inscripcion = fields.String()
    torneo = fields.Nested(_TorneoResumenSchema)
    categoria = fields.Nested(_CategoriaResumenSchema)


# ── Schemas de entrada ────────────────────────────────────────────

class EquipoCreateSchema(Schema):
    """Validación de entrada para registrar un equipo.

    El campo ``id_usuario`` NO se recibe del cliente — se extrae de
    ``flask.g.usuario_id`` (JWT) en la capa de rutas/servicio
    para garantizar que un delegado solo cree equipos a su nombre.
    """

    nombre_equipo = fields.String(
        required=True,
        validate=validate.Length(
            min=2, max=100,
            error='El nombre del equipo debe tener entre 2 y 100 caracteres.',
        ),
    )


class EquipoUpdateSchema(Schema):
    """Validación de actualización parcial de un equipo.

    Todos los campos son opcionales. Las URLs de archivos
    (logo, foto) se actualizan mediante el servicio de Storage S3
    en la Fase 4; aquí solo se acepta el nombre.
    """

    nombre_equipo = fields.String(
        validate=validate.Length(
            min=2, max=100,
            error='El nombre del equipo debe tener entre 2 y 100 caracteres.',
        ),
    )
    estado = fields.String(
        validate=validate.OneOf(
            ['activo', 'inactivo', 'aprobado', 'rechazado', 'pendiente'],
            error='Estado de equipo inválido.',
        ),
    )


# ── Schemas de salida (DTO) ───────────────────────────────────────

class EquipoPublicSchema(Schema):
    """Serialización para vistas públicas (tablas de posición, calendario).

    Excluye ``id_usuario`` (FK sensible al delegado) y timestamps
    de auditoría internos.
    """

    id_equipo = fields.Integer(dump_only=True)
    nombre_equipo = fields.String()
    estado = fields.String()
    url_logo = fields.String(allow_none=True)
    url_foto_equipo = fields.String(allow_none=True)
    id_usuario = fields.String()


class EquipoAdminSchema(Schema):
    """Serialización completa para el panel de administración.

    Incluye la FK al delegado propietario y timestamps de auditoría
    para trazabilidad completa.
    """

    id_equipo = fields.Integer(dump_only=True)
    nombre_equipo = fields.String()
    estado = fields.String()
    url_logo = fields.String(allow_none=True)
    url_foto_equipo = fields.String(allow_none=True)
    id_usuario = fields.String()
    usuario = fields.Nested(
        _UsuarioResumenSchema,
        dump_only=True
    )
    inscripciones = fields.List(
        fields.Nested(_InscripcionResumenSchema),
        dump_only=True
    )
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
