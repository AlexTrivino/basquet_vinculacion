"""
Schemas de Marshmallow para la entidad Inscripción (Patrón DTO — Decisión #13).

Los schemas de salida usan campos ``Nested`` para incluir el nombre del
Torneo, Equipo y Categoría directamente, eliminando peticiones adicionales
del frontend (evita N+1 en el cliente).
"""
from marshmallow import Schema, fields, validate


# ── Schemas auxiliares anidados ───────────────────────────────────
# Exponen solo los campos necesarios de cada relación.
# Evitan importar schemas externos y mantienen el módulo cohesivo.

class _TorneoResumenSchema(Schema):
    id_torneo = fields.Integer()
    nombre = fields.String()
    estado = fields.String()
    fecha_inicio = fields.Date(allow_none=True)
    fecha_fin = fields.Date(allow_none=True)


class _UsuarioResumenSchema(Schema):
    nombre = fields.String()
    correo = fields.String()


class _EquipoResumenSchema(Schema):
    id_equipo = fields.Integer()
    nombre_equipo = fields.String()
    url_logo = fields.String(allow_none=True)
    usuario = fields.Nested(_UsuarioResumenSchema)


class _CategoriaResumenSchema(Schema):
    id_categoria = fields.Integer()
    nombre_categoria = fields.String()
    genero_categoria = fields.String()
    edad_minima = fields.Integer()
    edad_maxima = fields.Integer(allow_none=True)


# ── Schemas de entrada ────────────────────────────────────────────

class InscripcionCreateSchema(Schema):
    """Validación de entrada para registrar una inscripción.

    El servicio verifica en BD que el torneo, equipo y categoría
    existan y estén activos antes de insertar.
    """

    id_torneo = fields.Integer(required=True)
    id_equipo = fields.Integer(required=True)
    id_categoria = fields.Integer(required=True)


class InscripcionEstadoSchema(Schema):
    """Validación para el cambio de estado por parte del Admin o Sistema (PATCH)."""

    estado_inscripcion = fields.String(
        required=True,
        validate=validate.OneOf(
            ['borrador', 'pendiente', 'aprobado', 'rechazado'],
            error="Estado inválido. Valores permitidos: 'borrador', 'pendiente', 'aprobado', 'rechazado'.",
        ),
    )


# ── Schemas de salida (DTO) ───────────────────────────────────────

class InscripcionPublicSchema(Schema):
    """Serialización para vistas públicas.

    Incluye resúmenes anidados de Torneo, Equipo y Categoría
    para que el frontend no necesite peticiones adicionales.
    Excluye el comprobante de pago (dato sensible) y timestamps.
    """

    id_inscripcion = fields.Integer(dump_only=True)
    fecha_inscripcion = fields.DateTime()
    estado_inscripcion = fields.String()
    grupo = fields.String(allow_none=True)
    # Relaciones anidadas — requieren joinedload en el servicio
    torneo = fields.Nested(_TorneoResumenSchema)
    equipo = fields.Nested(_EquipoResumenSchema)
    categoria = fields.Nested(_CategoriaResumenSchema)


class InscripcionAdminSchema(Schema):
    """Serialización completa para el panel de administración.

    Incluye la URL del comprobante de pago, timestamps de auditoría
    y todos los campos de trazabilidad.
    """

    id_inscripcion = fields.Integer(dump_only=True)
    fecha_inscripcion = fields.DateTime()
    estado_inscripcion = fields.String()
    grupo = fields.String(allow_none=True)
    url_comprobante_pago = fields.String(allow_none=True)
    # FKs para referencia interna del admin
    id_torneo = fields.Integer()
    id_equipo = fields.Integer()
    id_categoria = fields.Integer()
    # Relaciones anidadas
    torneo = fields.Nested(_TorneoResumenSchema)
    equipo = fields.Nested(_EquipoResumenSchema)
    categoria = fields.Nested(_CategoriaResumenSchema)
    # Auditoría
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
