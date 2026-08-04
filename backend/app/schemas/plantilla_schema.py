"""
Schemas de Marshmallow para la entidad Plantilla (Patrón DTO — Decisión #13).

El ``PlantillaPublicSchema`` usa campos ``Nested`` para incluir
la información del jugador directamente, evitando N+1 en el cliente.
"""
from marshmallow import Schema, fields, validate


# ── Schema auxiliar anidado ───────────────────────────────────────

class _JugadorEnPlantillaSchema(Schema):
    """Resumen del jugador para serialización anidada en Plantilla."""

    id_jugador = fields.Integer()
    nombre = fields.String()
    genero = fields.String()
    documento_identificacion = fields.String()
    fecha_nacimiento = fields.Date()
    telefono = fields.String(allow_none=True)
    correo = fields.String(allow_none=True)
    url_foto = fields.String(allow_none=True)
    url_cedula = fields.String(allow_none=True)
    url_acta_bachiller = fields.String(allow_none=True)


# ── Schemas de entrada ────────────────────────────────────────────

class PlantillaCreateSchema(Schema):
    """Validación de entrada para agregar un jugador a la plantilla de un torneo."""

    id_jugador = fields.Integer(required=True)
    id_torneo = fields.Integer(required=True)
    id_equipo = fields.Integer(required=True)
    numero_camiseta = fields.Integer(
        allow_none=True,
        load_default=None,
        validate=validate.Range(
            min=0, max=99,
            error='El número de camiseta debe estar entre 0 y 99.',
        ),
    )


class PlantillaUpdateSchema(Schema):
    """Validación de entrada para actualizar el número de camiseta de una plantilla."""

    numero_camiseta = fields.Integer(
        required=True,
        validate=validate.Range(
            min=0, max=99,
            error='El número de camiseta debe estar entre 0 y 99.',
        ),
    )


# ── Schemas de salida (DTO) ───────────────────────────────────────

class PlantillaPublicSchema(Schema):
    """Serialización para vistas públicas (nómina del equipo en torneo).

    Incluye resumen anidado del jugador para que el frontend
    no necesite peticiones adicionales.
    """

    id_plantilla = fields.Integer(dump_only=True)
    numero_camiseta = fields.Integer(allow_none=True)
    estado = fields.String()
    id_equipo = fields.Integer()
    id_torneo = fields.Integer()
    # Relación anidada — requiere joinedload en el servicio
    jugador = fields.Nested(_JugadorEnPlantillaSchema)


class PlantillaAdminSchema(Schema):
    """Serialización completa para el panel de administración."""

    id_plantilla = fields.Integer(dump_only=True)
    numero_camiseta = fields.Integer(allow_none=True)
    estado = fields.String()
    id_jugador = fields.Integer()
    id_equipo = fields.Integer()
    id_torneo = fields.Integer()
    jugador = fields.Nested(_JugadorEnPlantillaSchema)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
