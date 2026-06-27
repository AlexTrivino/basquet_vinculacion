"""
Schemas de Marshmallow para el Bulk DTO de Estadísticas y Sanciones (Fase 7).

Diseño de payload:
    El frontend envía las estadísticas de TODOS los jugadores de un equipo
    en UNA sola petición (Bulk DTO), evitando N requests individuales
    y saturación de la red en el momento de cierre de partido.

Estructura del payload esperado::

    {
        "id_partido": 12,
        "id_equipo": 3,
        "estadisticas_jugadores": [
            {
                "id_jugador": 45,
                "puntos": 18,
                "triples": 2,
                "faltas": 3,
                "rebotes": 5,
                "asistencias": 4,
                "sancion_tipo": "descalificante"   ← opcional
            },
            ...
        ]
    }
"""
from marshmallow import Schema, fields, validate


# ── Schema de un jugador individual dentro del bulk ───────────────

class _EstadisticaJugadorSchema(Schema):
    """Estadísticas de un jugador para una sola entrada del bulk array."""

    id_jugador = fields.Integer(required=True)

    puntos = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0, error='Los puntos no pueden ser negativos.'),
    )
    triples = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0, error='Los triples no pueden ser negativos.'),
    )
    faltas = fields.Integer(
        load_default=0,
        validate=validate.Range(
            min=0, max=6,
            error='Las faltas deben estar entre 0 y 6 (límite FIBA).',
        ),
    )
    rebotes = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0, error='Los rebotes no pueden ser negativos.'),
    )
    asistencias = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0, error='Las asistencias no pueden ser negativas.'),
    )

    # Sanción opcional: si está presente, se crea un registro en la tabla Sanciones
    # dentro del mismo bloque transaccional del bulk insert.
    sancion_tipo = fields.String(
        load_default=None,
        allow_none=True,
        validate=validate.OneOf(
            ['tecnica', 'antideportiva', 'descalificante'],
            error="Tipo de sanción inválido. Valores: 'tecnica', 'antideportiva', 'descalificante'.",
        ),
    )


# ── Schema raíz del Bulk DTO ──────────────────────────────────────

class EstadisticasBulkSchema(Schema):
    """Schema de entrada para el ingreso masivo de estadísticas de un partido.

    Valida el contexto del partido y el equipo en la raíz,
    y la lista de jugadores con sus estadísticas individuales.
    """

    id_partido = fields.Integer(required=True)
    id_equipo = fields.Integer(required=True)
    estadisticas_jugadores = fields.List(
        fields.Nested(_EstadisticaJugadorSchema),
        required=True,
        validate=validate.Length(
            min=1,
            error='El array de estadísticas no puede estar vacío.',
        ),
    )


# ── Schemas de salida (respuesta de confirmación) ─────────────────

class EstadisticaPublicSchema(Schema):
    """Serialización de una estadística individual para confirmación de bulk."""

    id_estadistica = fields.Integer(dump_only=True)
    id_partido = fields.Integer()
    id_jugador = fields.Integer()
    puntos_anotados = fields.Integer()
    triples_anotados = fields.Integer()
    faltas_cometidas = fields.Integer()
    rebotes = fields.Integer()
    asistencias = fields.Integer()
    created_at = fields.DateTime()
