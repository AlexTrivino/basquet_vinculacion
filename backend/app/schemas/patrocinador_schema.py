from marshmallow import Schema, fields, validate, EXCLUDE

class PatrocinadorSchema(Schema):
    """Schema para serialización y validación de Patrocinador."""
    class Meta:
        unknown = EXCLUDE

    id_patrocinador = fields.Int(dump_only=True)
    nombre_patrocinador = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100),
        error_messages={"required": "El nombre del patrocinador es obligatorio."}
    )
    url_logo_patrocinador = fields.Str(allow_none=True)
    url_imagen_promocional = fields.Str(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

# Instancias
patrocinador_schema = PatrocinadorSchema()
patrocinadores_schema = PatrocinadorSchema(many=True)
