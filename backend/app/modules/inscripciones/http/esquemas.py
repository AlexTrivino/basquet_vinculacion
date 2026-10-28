"""
Esquemas marshmallow de inscripciones y plantillas, movidos tal cual de app/schemas/inscripcion_schema.py
y app/schemas/plantilla_schema.py. Serializan las entidades del dominio.

Inscripciones (con el resumen de su torneo, equipo y categoría, para que el frontend no pida más):
    - ``InscripcionCreateSchema``, ``InscripcionReinscribirSchema``, ``InscripcionEstadoSchema`` e
      ``InscripcionEditarSchema``: entrada.
    - ``InscripcionPublicSchema``: sin el comprobante ni el correo del delegado.
    - ``InscripcionAdminSchema``: completa, para el super_admin.
Plantillas:
    - ``PlantillaCreateSchema`` y ``PlantillaUpdateSchema``: entrada.
    - ``PlantillaPublicSchema``: el jugador sin datos personales.
    - ``PlantillaPrivadaSchema``: con ellos, para el delegado del equipo y el super_admin.
    - ``PlantillaAdminSchema``: completa.
"""
from marshmallow import Schema, fields, validate


# ══ Inscripciones ═════════════════════════════════════════════════

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


class _EquipoPublicoSchema(Schema):
    """Equipo sin el correo del delegado (dato personal)."""
    id_equipo = fields.Integer()
    nombre_equipo = fields.String()
    url_logo = fields.String(allow_none=True)


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


class InscripcionReinscribirSchema(Schema):
    """Validación de entrada para reinscribir un equipo en un nuevo torneo."""
    id_torneo = fields.Integer(required=True)
    id_equipo = fields.Integer(required=True)
    id_categoria = fields.Integer(required=True)
    clonar_plantilla = fields.Boolean(missing=False)


class InscripcionEstadoSchema(Schema):
    """Validación para el cambio de estado por parte del Admin o Sistema (PATCH)."""

    estado_inscripcion = fields.String(
        required=True,
        validate=validate.OneOf(
            ['borrador', 'pendiente', 'aprobado', 'rechazado'],
            error="Estado inválido. Valores permitidos: 'borrador', 'pendiente', 'aprobado', 'rechazado'.",
        ),
    )


class InscripcionEditarSchema(Schema):
    """Validación para la edición de torneo y categoría por parte del Admin (PATCH)."""
    id_torneo = fields.Integer(required=True)
    id_categoria = fields.Integer(required=True)


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
    equipo = fields.Nested(_EquipoPublicoSchema)
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


# ══ Plantillas ════════════════════════════════════════════════════

# ── Schema auxiliar anidado ───────────────────────────────────────

class _JugadorEnPlantillaPublicoSchema(Schema):
    """Resumen público del jugador: sin datos personales."""

    id_jugador = fields.Integer()
    nombre = fields.String()
    genero = fields.String()
    url_foto = fields.String(allow_none=True)


class _JugadorEnPlantillaSchema(Schema):
    """Resumen completo del jugador (solo para el delegado del equipo y el admin)."""

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
    id_categoria = fields.Integer(required=True)
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
    id_categoria = fields.Integer()
    # Relación anidada — requiere joinedload en el servicio
    jugador = fields.Nested(_JugadorEnPlantillaPublicoSchema)


class PlantillaPrivadaSchema(PlantillaPublicSchema):
    """La misma nómina con los datos personales del jugador (cédula, contacto, documentos).

    Solo para el delegado dueño del equipo y el super_admin.
    """

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
