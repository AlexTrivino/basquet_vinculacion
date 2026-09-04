"""
Schemas de Marshmallow para la entidad Partido (Patrón DTO — Decisión #13).

Los schemas de salida usan campos ``Nested`` para incluir el nombre y
logo de ambos equipos enfrentados directamente en el payload, eliminando
peticiones adicionales del frontend para el calendario de partidos.
"""
from marshmallow import Schema, fields, validate


# ── Schemas auxiliares anidados ───────────────────────────────────

class _EquipoEnPartidoSchema(Schema):
    """Resumen de equipo para serialización anidada en Partido."""

    id_equipo = fields.Integer()
    nombre_equipo = fields.String()
    url_logo = fields.String(allow_none=True)


class _TorneoEnPartidoSchema(Schema):
    """Resumen de torneo para serialización anidada en Partido."""

    id_torneo = fields.Integer()
    nombre = fields.String()
    estado = fields.String()
    fecha_inicio = fields.Date(allow_none=True)
    fecha_fin = fields.Date(allow_none=True)


class _CategoriaEnPartidoSchema(Schema):
    """Resumen de categoría para serialización anidada en Partido."""
    
    id_categoria = fields.Integer()
    nombre_categoria = fields.String()
    genero_categoria = fields.String()


# ── Schemas de entrada ────────────────────────────────────────────

class PartidoCreateSchema(Schema):
    """Validación de entrada para programar un nuevo partido."""

    fecha = fields.Date(required=True)
    hora = fields.Time(required=True)
    fase = fields.String(
        required=True,
        validate=validate.Length(min=2, max=50),
    )
    ubicacion = fields.String(
        load_default='Coliseo Pablo Delgado Álava',
        validate=validate.Length(max=150),
    )
    id_torneo = fields.Integer(required=True)
    id_categoria = fields.Integer(required=True)
    id_equipo_local = fields.Integer(required=True)
    id_equipo_visitante = fields.Integer(required=True)
    url_planilla_fiba = fields.String(allow_none=True, load_default=None)


class PartidoUpdateSchema(Schema):
    """Validación de actualización parcial de un partido.

    Permite modificar logística (fecha, hora, ubicación), estado
    del partido y marcadores. No se permite cambiar los equipos
    ni el torneo una vez programado el encuentro.
    """

    fecha = fields.Date()
    hora = fields.Time()
    ubicacion = fields.String(validate=validate.Length(max=150))
    fase = fields.String(validate=validate.Length(min=2, max=50))
    id_equipo_local = fields.Integer()
    id_equipo_visitante = fields.Integer()
    estado = fields.String(
        validate=validate.OneOf(
            ['programado', 'en_curso', 'finalizado', 'finalizado_wo', 'suspendido', 'anulado'],
            error="Estado inválido. Valores permitidos: programado, en_curso, finalizado, finalizado_wo, suspendido, anulado.",
        ),
    )
    marcador_local = fields.Integer(
        validate=validate.Range(min=0, error='El marcador no puede ser negativo.'),
    )
    marcador_visitante = fields.Integer(
        validate=validate.Range(min=0, error='El marcador no puede ser negativo.'),
    )
    url_planilla_fiba = fields.String(allow_none=True)


# ── Schemas de salida (DTO) ───────────────────────────────────────

class PartidoPublicSchema(Schema):
    """Serialización para vistas públicas (calendario, resultados).

    Incluye resúmenes anidados de ambos equipos y del torneo
    para que el frontend no necesite peticiones adicionales.
    """

    id_partido = fields.Integer(dump_only=True)
    fecha = fields.Date()
    hora = fields.Time()
    estado = fields.String()
    marcador_local = fields.Integer()
    marcador_visitante = fields.Integer()
    fase = fields.String()
    id_categoria = fields.Integer()
    ubicacion = fields.String()
    url_planilla_fiba = fields.String(allow_none=True)
    stats_local_procesadas = fields.Boolean()
    stats_visitante_procesadas = fields.Boolean()
    # Relaciones anidadas — requieren joinedload en el servicio
    torneo = fields.Nested(_TorneoEnPartidoSchema)
    categoria = fields.Nested(_CategoriaEnPartidoSchema)
    equipo_local = fields.Nested(_EquipoEnPartidoSchema)
    equipo_visitante = fields.Nested(_EquipoEnPartidoSchema)


class PartidoAdminSchema(Schema):
    """Serialización completa para el panel de administración."""

    id_partido = fields.Integer(dump_only=True)
    fecha = fields.Date()
    hora = fields.Time()
    estado = fields.String()
    marcador_local = fields.Integer()
    marcador_visitante = fields.Integer()
    fase = fields.String()
    id_categoria = fields.Integer()
    ubicacion = fields.String()
    url_planilla_fiba = fields.String(allow_none=True)
    stats_local_procesadas = fields.Boolean()
    stats_visitante_procesadas = fields.Boolean()
    # FKs para referencia interna
    id_torneo = fields.Integer()
    id_equipo_local = fields.Integer()
    id_equipo_visitante = fields.Integer()
    # Relaciones anidadas
    torneo = fields.Nested(_TorneoEnPartidoSchema)
    categoria = fields.Nested(_CategoriaEnPartidoSchema)
    equipo_local = fields.Nested(_EquipoEnPartidoSchema)
    equipo_visitante = fields.Nested(_EquipoEnPartidoSchema)
    # Auditoría
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
