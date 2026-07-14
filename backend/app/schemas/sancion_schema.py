from marshmallow import Schema, fields
from app.schemas.jugador_schema import JugadorPublicSchema
from app.schemas.partido_schema import PartidoPublicSchema

class SancionSchema(Schema):
    id_sancion = fields.Int(dump_only=True)
    motivo = fields.Str(required=True)
    fecha = fields.Date(required=True)
    estado = fields.Str(dump_only=True)
    id_jugador = fields.Int(required=True)
    id_partido = fields.Int(required=True)
    created_at = fields.DateTime(dump_only=True)
    
    # Nested fields para interfaces
    jugador = fields.Nested(JugadorPublicSchema(only=['id_jugador', 'nombre']), dump_only=True)
    partido = fields.Nested(PartidoPublicSchema(only=['id_partido', 'fecha', 'estado']), dump_only=True)
