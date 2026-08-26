"""
Schemas de Marshmallow para la entidad Torneo (Patrón DTO — Decisión #13).

Define schemas diferenciados según el consumidor:
    - ``TorneoCreateSchema``: Validación de entrada (POST).
    - ``TorneoUpdateSchema``: Validación de actualización parcial (PUT).
    - ``TorneoPublicSchema``: Serialización para vistas públicas.
    - ``TorneoAdminSchema``: Serialización para el panel de administración.
"""
from marshmallow import Schema, fields, validate, validates_schema, ValidationError, EXCLUDE
from app.schemas.categoria_schema import CategoriaCreateSchema, CategoriaPublicSchema

# ── Schemas de entrada (carga / validación) ───────────────────────

class TorneoCreateSchema(Schema):
    """Validación de datos para la creación de un torneo.

    Campos requeridos: ``nombre``, ``fecha_inicio``, ``fecha_fin``.
    Regla de negocio: ``fecha_fin`` >= ``fecha_inicio``.
    """
    class Meta:
        unknown = EXCLUDE

    nombre = fields.String(
        required=True,
        validate=validate.Length(
            min=1, max=100,
            error='El nombre debe tener entre 1 y 100 caracteres.',
        ),
    )
    fecha_inicio = fields.Date(required=True)
    fecha_fin = fields.Date(required=True)
    categorias = fields.List(fields.Nested(CategoriaCreateSchema), required=False, missing=list)
    url_calendario_excel = fields.String(allow_none=True)

    @validates_schema
    def validar_rango_fechas(self, data, **kwargs):
        """Verifica que la fecha de fin no sea anterior a la de inicio."""
        inicio = data.get('fecha_inicio')
        fin = data.get('fecha_fin')
        if inicio and fin and fin < inicio:
            raise ValidationError(
                'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
                field_name='fecha_fin',
            )


class TorneoUpdateSchema(Schema):
    """Validación de datos para la actualización parcial de un torneo.

    Todos los campos son opcionales. Si se proveen ambas fechas,
    se valida coherencia. La validación cruzada contra los valores
    existentes en BD se realiza en la capa de servicios.

    Nota: ``estado`` solo acepta transiciones válidas. El valor
    ``'inactivo'`` NO se permite aquí (se gestiona via DELETE / soft delete).
    """
    
    class Meta:
        unknown = EXCLUDE

    nombre = fields.String(
        validate=validate.Length(
            min=1, max=100,
            error='El nombre debe tener entre 1 y 100 caracteres.',
        ),
    )
    fecha_inicio = fields.Date()
    fecha_fin = fields.Date()
    estado = fields.String(
        validate=validate.OneOf(
            ['programado', 'en_curso', 'finalizado', 'anulado'],
            error='Estado inválido. Valores permitidos: programado, en_curso, finalizado, anulado.',
        ),
    )
    url_calendario_excel = fields.String(allow_none=True)

    @validates_schema
    def validar_rango_fechas(self, data, **kwargs):
        """Verifica coherencia de fechas cuando ambas están presentes."""
        inicio = data.get('fecha_inicio')
        fin = data.get('fecha_fin')
        if inicio and fin and fin < inicio:
            raise ValidationError(
                'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
                field_name='fecha_fin',
            )


# ── Schemas de salida (serialización / DTO) ───────────────────────

class TorneoPublicSchema(Schema):
    """Serialización para vistas públicas (landing, calendario).

    Expone solo los campos necesarios para el usuario final.
    Excluye timestamps de auditoría y datos internos.
    """

    id_torneo = fields.Integer(dump_only=True)
    nombre = fields.String()
    fecha_inicio = fields.Date()
    fecha_fin = fields.Date()
    estado = fields.String()
    url_calendario_excel = fields.String(dump_only=True)
    categorias = fields.Nested(CategoriaPublicSchema, many=True, dump_only=True)


class TorneoAdminSchema(Schema):
    """Serialización para el panel de administración.

    Expone todos los campos, incluyendo timestamps de auditoría
    para trazabilidad completa.
    """

    id_torneo = fields.Integer(dump_only=True)
    nombre = fields.String()
    fecha_inicio = fields.Date()
    fecha_fin = fields.Date()
    estado = fields.String()
    url_calendario_excel = fields.String(dump_only=True)
    categorias = fields.Nested(CategoriaPublicSchema, many=True, dump_only=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
