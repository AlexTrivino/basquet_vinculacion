"""
Schemas de Marshmallow para la entidad Jugador (Patrón DTO — Decisión #13).

Validaciones de negocio en schemas de entrada:
    - Cédula ecuatoriana: exactamente 10 dígitos numéricos.
    - ``fecha_nacimiento``: debe ser una fecha en el pasado.
"""
from datetime import date

from marshmallow import Schema, ValidationError, fields, validate, validates, validates_schema


# ── Schemas de entrada ────────────────────────────────────────────

class JugadorCreateSchema(Schema):
    """Validación de entrada para registrar un jugador."""

    nombres = fields.String(
        required=True,
        validate=validate.Length(min=2, max=100),
    )
    apellidos = fields.String(
        required=True,
        validate=validate.Length(min=2, max=100),
    )
    genero = fields.String(
        required=True,
        validate=validate.OneOf(
            ['masculino', 'femenino'],
            error="Valor inválido. Use 'masculino' o 'femenino'.",
        ),
    )
    documento_identificacion = fields.String(
        required=True,
        validate=validate.Length(
            equal=10,
            error='La cédula debe tener exactamente 10 dígitos.',
        ),
    )
    fecha_nacimiento = fields.Date(required=True)
    correo = fields.Email(allow_none=True, load_default=None)
    telefono = fields.String(
        allow_none=True,
        load_default=None,
        validate=validate.Length(max=20),
    )
    url_foto = fields.String(allow_none=True, load_default=None)

    @validates('documento_identificacion')
    def validar_cedula(self, valor):
        """Verifica que la cédula contenga solo dígitos."""
        if not valor.isdigit():
            raise ValidationError('La cédula debe contener solo dígitos numéricos.')

    @validates('fecha_nacimiento')
    def validar_fecha_pasado(self, valor):
        """Verifica que la fecha de nacimiento sea anterior a hoy."""
        if valor >= date.today():
            raise ValidationError(
                'La fecha de nacimiento debe ser una fecha en el pasado.'
            )


class JugadorUpdateSchema(Schema):
    """Validación de actualización parcial de un jugador. Todos los campos son opcionales.

    Incluye ``nombres``, ``apellidos``, ``documento_identificacion`` y
    ``fecha_nacimiento`` para corregir errores de tipeo en el registro inicial.
    """

    nombres = fields.String(validate=validate.Length(min=2, max=100))
    apellidos = fields.String(validate=validate.Length(min=2, max=100))
    documento_identificacion = fields.String(
        validate=validate.Length(
            equal=10,
            error='La cédula debe tener exactamente 10 dígitos.',
        ),
    )
    fecha_nacimiento = fields.Date()
    correo = fields.Email(allow_none=True)
    telefono = fields.String(allow_none=True, validate=validate.Length(max=20))
    url_foto = fields.String(allow_none=True)

    @validates('documento_identificacion')
    def validar_cedula(self, valor):
        """Verifica que la cédula contenga solo dígitos."""
        if not valor.isdigit():
            raise ValidationError('La cédula debe contener solo dígitos numéricos.')

    @validates('fecha_nacimiento')
    def validar_fecha_pasado(self, valor):
        """Verifica que la fecha de nacimiento sea anterior a hoy."""
        if valor >= date.today():
            raise ValidationError(
                'La fecha de nacimiento debe ser una fecha en el pasado.'
            )


# ── Schemas de salida (DTO) ───────────────────────────────────────

class JugadorPublicSchema(Schema):
    """Serialización para vistas públicas (plantillas, estadísticas).

    Excluye correo y teléfono (datos personales sensibles) y timestamps.
    """

    id_jugador = fields.Integer(dump_only=True)
    nombres = fields.String()
    apellidos = fields.String()
    genero = fields.String()
    documento_identificacion = fields.String()
    fecha_nacimiento = fields.Date()
    url_foto = fields.String(allow_none=True)
    estado = fields.String()


class JugadorAdminSchema(Schema):
    """Serialización completa para el panel de administración."""

    id_jugador = fields.Integer(dump_only=True)
    nombres = fields.String()
    apellidos = fields.String()
    genero = fields.String()
    documento_identificacion = fields.String()
    fecha_nacimiento = fields.Date()
    url_foto = fields.String(allow_none=True)
    correo = fields.String(allow_none=True)
    telefono = fields.String(allow_none=True)
    estado = fields.String()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
