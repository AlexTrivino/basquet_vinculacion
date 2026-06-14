"""
Schemas de Marshmallow para la entidad Categoría (Patrón DTO — Decisión #13).

Las categorías son datos estáticos (seeders). Solo se expone
un schema de lectura pública; no existen schemas de escritura
porque el Admin no gestiona categorías desde el panel.
"""
from marshmallow import Schema, fields


class CategoriaPublicSchema(Schema):
    """Serialización para la selección de categoría en formularios.

    Expone todos los campos relevantes para que el frontend
    pueda poblar selects y aplicar validaciones de edad en cliente.
    """

    id_categoria = fields.Integer(dump_only=True)
    nombre_categoria = fields.String()
    genero_categoria = fields.String()
    edad_minima = fields.Integer()
    edad_maxima = fields.Integer(allow_none=True)
