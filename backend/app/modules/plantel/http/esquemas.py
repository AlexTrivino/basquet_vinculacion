"""
Esquemas marshmallow de equipos y jugadores, movidos tal cual de app/schemas/equipo_schema.py
y app/schemas/jugador_schema.py. Serializan las entidades del dominio.

Equipos:
    - ``EquipoCreateSchema``: Validación de entrada para delegados (POST).
    - ``EquipoUpdateSchema``: Validación de actualización parcial (PUT).
    - ``EquipoPublicSchema``: Serialización para vistas públicas.
    - ``EquipoAdminSchema``: Serialización completa para panel de administración.
Jugadores (cédula ecuatoriana de 10 dígitos y fecha de nacimiento en el pasado):
    - ``JugadorCreateSchema`` y ``JugadorUpdateSchema``: entrada.
    - ``JugadorPublicSchema``: sin datos personales.
    - ``JugadorAdminSchema``: completo, para el super_admin y el delegado del jugador.
"""
from datetime import date

from marshmallow import Schema, ValidationError, fields, post_load, validate, validates, validates_schema


# ══ Equipos ═══════════════════════════════════════════════════════

# ── Schemas auxiliares anidados ───────────────────────────────────

class _UsuarioResumenSchema(Schema):
    id_usuario = fields.String()
    nombre = fields.String()
    correo = fields.String()

class _TorneoResumenSchema(Schema):
    id_torneo = fields.Integer()
    nombre = fields.String()

class _CategoriaResumenSchema(Schema):
    id_categoria = fields.Integer()
    nombre_categoria = fields.String()

class _InscripcionResumenSchema(Schema):
    id_inscripcion = fields.Integer()
    estado_inscripcion = fields.String()
    torneo = fields.Nested(_TorneoResumenSchema)
    categoria = fields.Nested(_CategoriaResumenSchema)


# ── Schemas de entrada ────────────────────────────────────────────

class EquipoCreateSchema(Schema):
    """Validación de entrada para registrar un equipo.

    El campo ``id_usuario`` NO se recibe del cliente — se extrae de
    ``flask.g.usuario_id`` (JWT) en la capa de rutas/servicio
    para garantizar que un delegado solo cree equipos a su nombre.
    """

    nombre_equipo = fields.String(
        required=True,
        validate=validate.Length(
            min=2, max=100,
            error='El nombre del equipo debe tener entre 2 y 100 caracteres.',
        ),
    )


class EquipoUpdateSchema(Schema):
    """Validación de actualización parcial de un equipo.

    Todos los campos son opcionales. Las URLs de archivos
    (logo, foto) se actualizan mediante el servicio de Storage S3
    en la Fase 4; aquí solo se acepta el nombre.
    """

    nombre_equipo = fields.String(
        validate=validate.Length(
            min=2, max=100,
            error='El nombre del equipo debe tener entre 2 y 100 caracteres.',
        ),
    )
    estado = fields.String(
        validate=validate.OneOf(
            ['activo', 'inactivo', 'aprobado', 'rechazado', 'pendiente'],
            error='Estado de equipo inválido.',
        ),
    )


# ── Schemas de salida (DTO) ───────────────────────────────────────

class EquipoPublicSchema(Schema):
    """Serialización para vistas públicas (tablas de posición, calendario).

    Excluye ``id_usuario`` (FK sensible al delegado) y timestamps
    de auditoría internos.
    """

    id_equipo = fields.Integer(dump_only=True)
    nombre_equipo = fields.String()
    estado = fields.String()
    url_logo = fields.String(allow_none=True)
    url_foto_equipo = fields.String(allow_none=True)
    id_usuario = fields.String()


class EquipoAdminSchema(Schema):
    """Serialización completa para el panel de administración.

    Incluye la FK al delegado propietario y timestamps de auditoría
    para trazabilidad completa.
    """

    id_equipo = fields.Integer(dump_only=True)
    nombre_equipo = fields.String()
    estado = fields.String()
    url_logo = fields.String(allow_none=True)
    url_foto_equipo = fields.String(allow_none=True)
    id_usuario = fields.String()
    usuario = fields.Nested(
        _UsuarioResumenSchema,
        dump_only=True
    )
    inscripciones = fields.List(
        fields.Nested(_InscripcionResumenSchema),
        dump_only=True
    )
    created_at = fields.DateTime()
    updated_at = fields.DateTime()


# ══ Jugadores ═════════════════════════════════════════════════════

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

    Sin datos personales: ni cédula, fecha de nacimiento, correo, teléfono
    ni enlaces a documentos. Esos solo van en ``JugadorAdminSchema``.
    """

    id_jugador = fields.Integer(dump_only=True)
    nombre = fields.String()
    genero = fields.String()
    url_foto = fields.String(allow_none=True)
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
        return [{
            'id_plantilla': p.id_plantilla,
            'numero_camiseta': p.numero_camiseta,
            'id_equipo': p.id_equipo,
            'nombre_equipo': p.nombre_equipo,
            'id_torneo': p.id_torneo,
            'nombre_torneo': p.nombre_torneo,
        } for p in obj.plantillas if p.estado == 'activo']
