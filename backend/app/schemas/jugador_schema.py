"""
Schemas de Marshmallow para la entidad Jugador (Patrón DTO — Decisión #13).

Validaciones de negocio en schemas de entrada:
    - Cédula ecuatoriana: exactamente 10 dígitos numéricos.
    - ``fecha_nacimiento``: debe ser una fecha en el pasado.
"""
from datetime import date

from marshmallow import Schema, ValidationError, fields, validate, validates, validates_schema, post_load


# ── Schemas de entrada ────────────────────────────────────────────

class JugadorCreateSchema(Schema):
    """Validación de entrada para registrar un jugador."""

    nombre = fields.String(
        required=False,
        validate=validate.Length(min=2, max=200),
    )
    nombres = fields.String(
        required=False,
        validate=validate.Length(min=2, max=100),
    )
    apellidos = fields.String(
        required=False,
        validate=validate.Length(min=2, max=100),
    )
    genero = fields.String(
        required=False,
        allow_none=True,
        load_default=None,
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
        required=True,
        validate=validate.Length(
            equal=10,
            error='El teléfono debe tener exactamente 10 dígitos.',
        ),
    )
    url_foto = fields.String(allow_none=True, load_default=None)
    url_cedula = fields.String(allow_none=True, load_default=None)
    url_acta_bachiller = fields.String(allow_none=True, load_default=None)

    @validates('documento_identificacion')
    def validar_cedula(self, valor):
        """Verifica que la cédula contenga solo dígitos."""
        if not valor.isdigit():
            raise ValidationError('La cédula debe contener solo dígitos numéricos.')

    @validates('telefono')
    def validar_telefono(self, valor):
        """Verifica que el teléfono contenga solo dígitos."""
        if valor is not None and not valor.isdigit():
            raise ValidationError('El teléfono debe contener solo dígitos numéricos.')

    @validates('fecha_nacimiento')
    def validar_fecha_pasado(self, valor):
        """Verifica que la fecha de nacimiento sea anterior a hoy."""
        if valor >= date.today():
            raise ValidationError(
                'La fecha de nacimiento debe ser una fecha en el pasado.'
            )

    @validates_schema
    def validar_nombre_completo(self, data, **kwargs):
        """Verifica que se proporcione 'nombre' o 'nombres' y 'apellidos'."""
        if not data.get('nombre') and not (data.get('nombres') and data.get('apellidos')):
            raise ValidationError('Debe ingresar el nombre del jugador.', 'nombre')

    @post_load
    def unificar_nombres_apellidos(self, data, **kwargs):
        """Une nombres y apellidos en el campo ``nombre``."""
        if data.get('nombre'):
            data['nombre'] = data['nombre'].strip()
            data.pop('nombres', None)
            data.pop('apellidos', None)
        else:
            nombres = data.pop('nombres', '').strip()
            apellidos = data.pop('apellidos', '').strip()
            data['nombre'] = f'{nombres} {apellidos}'.strip()
        return data


class JugadorUpdateSchema(Schema):
    """Validación de actualización parcial de un jugador. Todos los campos son opcionales.

    Incluye ``nombre``, ``nombres``, ``apellidos``, ``documento_identificacion`` y
    ``fecha_nacimiento`` para corregir errores de tipeo en el registro inicial.
    """

    nombre = fields.String(validate=validate.Length(min=2, max=200))
    nombres = fields.String(validate=validate.Length(min=2, max=100))
    apellidos = fields.String(validate=validate.Length(min=2, max=100))
    genero = fields.String(
        allow_none=True,
        validate=validate.OneOf(
            ['masculino', 'femenino'],
            error="Valor inválido. Use 'masculino' o 'femenino'.",
        ),
    )
    documento_identificacion = fields.String(
        validate=validate.Length(
            equal=10,
            error='La cédula debe tener exactamente 10 dígitos.',
        ),
    )
    fecha_nacimiento = fields.Date()
    correo = fields.Email(allow_none=True)
    telefono = fields.String(
        allow_none=True,
        validate=validate.Length(
            equal=10,
            error='El teléfono debe tener exactamente 10 dígitos.',
        ),
    )
    url_foto = fields.String(allow_none=True)
    url_cedula = fields.String(allow_none=True)
    url_acta_bachiller = fields.String(allow_none=True)
    estado = fields.String(
        allow_none=True,
        validate=validate.OneOf(
            ['activo', 'inactivo'],
            error="Valor inválido. Use 'activo' o 'inactivo'.",
        ),
    )

    @validates('documento_identificacion')
    def validar_cedula(self, valor):
        """Verifica que la cédula contenga solo dígitos."""
        if not valor.isdigit():
            raise ValidationError('La cédula debe contener solo dígitos numéricos.')

    @validates('telefono')
    def validar_telefono(self, valor):
        """Verifica que el teléfono contenga solo dígitos."""
        if valor is not None and not valor.isdigit():
            raise ValidationError('El teléfono debe contener solo dígitos numéricos.')

    @validates('fecha_nacimiento')
    def validar_fecha_pasado(self, valor):
        """Verifica que la fecha de nacimiento sea anterior a hoy."""
        if valor >= date.today():
            raise ValidationError(
                'La fecha de nacimiento debe ser una fecha en el pasado.'
            )

    @post_load
    def unificar_nombres_apellidos(self, data, **kwargs):
        """Une nombres y apellidos si se envían para actualizar."""
        if 'nombre' in data:
            data['nombre'] = data['nombre'].strip()
            data.pop('nombres', None)
            data.pop('apellidos', None)
        elif 'nombres' in data and 'apellidos' in data:
            data['nombre'] = f"{data.pop('nombres')} {data.pop('apellidos')}".strip()
        elif 'nombres' in data or 'apellidos' in data:
            raise ValidationError('Debe enviar nombres y apellidos juntos si desea actualizar el nombre.')
        return data


# ── Schemas de salida (DTO) ───────────────────────────────────────

class JugadorPublicSchema(Schema):
    """Serialización para vistas públicas (plantillas, estadísticas).

    Excluye correo y teléfono (datos personales sensibles) y timestamps.
    """

    id_jugador = fields.Integer(dump_only=True)
    nombre = fields.String()
    genero = fields.String()
    documento_identificacion = fields.String()
    fecha_nacimiento = fields.Date()
    url_foto = fields.String(allow_none=True)
    url_cedula = fields.String(allow_none=True)
    url_acta_bachiller = fields.String(allow_none=True)
    estado = fields.String()


class JugadorAdminSchema(Schema):
    """Serialización completa para el panel de administración."""

    id_jugador = fields.Integer(dump_only=True)
    nombre = fields.String()
    genero = fields.String()
    documento_identificacion = fields.String()
    fecha_nacimiento = fields.Date()
    url_foto = fields.String(allow_none=True)
    url_cedula = fields.String(allow_none=True)
    url_acta_bachiller = fields.String(allow_none=True)
    correo = fields.String(allow_none=True)
    telefono = fields.String(allow_none=True)
    estado = fields.String()
    plantillas = fields.Method('get_plantillas_info', dump_only=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()

    def get_plantillas_info(self, obj):
        """Retorna la lista resumida de asignaciones en plantillas activas."""
        if not hasattr(obj, 'plantillas') or not obj.plantillas:
            return []
        res = []
        for p in obj.plantillas:
            if getattr(p, 'estado', 'activo') == 'activo':
                torneo_obj = getattr(p, 'torneo', None)
                nombre_tor = getattr(torneo_obj, 'nombre', getattr(torneo_obj, 'nombre_torneo', None)) if torneo_obj else None
                equipo_obj = getattr(p, 'equipo', None)
                nombre_eq = getattr(equipo_obj, 'nombre_equipo', getattr(equipo_obj, 'nombre', None)) if equipo_obj else None
                res.append({
                    'id_plantilla': p.id_plantilla,
                    'numero_camiseta': p.numero_camiseta,
                    'id_equipo': p.id_equipo,
                    'nombre_equipo': nombre_eq,
                    'id_torneo': p.id_torneo,
                    'nombre_torneo': nombre_tor,
                })
        return res
