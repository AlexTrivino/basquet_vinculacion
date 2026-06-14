"""
Blueprint de rutas para la gestión de Equipos.

Rutas de lectura: públicas (sin autenticación).
Rutas de escritura: protegidas con allowed_roles=['super_admin', 'delegado'].

Regla de negocio en rutas de escritura:
    - Los delegados solo operan sobre sus propios equipos.
    - Los super_admin pueden operar sobre cualquier equipo.
    La distinción se delega al servicio mediante ``verificar_propietario``.
"""
from flask import Blueprint, g, request
from marshmallow import ValidationError

from app.schemas.equipo_schema import (
    EquipoAdminSchema,
    EquipoCreateSchema,
    EquipoPublicSchema,
    EquipoUpdateSchema,
)
from app.services import equipo_service
from app.utils.auth_middleware import token_required
from app.utils.pagination import paginate_query
from app.utils.response import api_error, api_response

equipo_bp = Blueprint('equipos', __name__, url_prefix='/api/equipos')

# ── Schemas reutilizables ─────────────────────────────────────────
_public_schema = EquipoPublicSchema()
_public_many = EquipoPublicSchema(many=True)
_admin_schema = EquipoAdminSchema()
_create_schema = EquipoCreateSchema()
_update_schema = EquipoUpdateSchema()


# ── GET /api/equipos ──────────────────────────────────────────────

@equipo_bp.route('', methods=['GET'])
def listar_equipos():
    """Lista equipos activos con paginación.

    Query params opcionales: ``page`` (default 1), ``per_page`` (default 20).
    """
    query = equipo_service.listar_equipos_activos()
    items, pagination = paginate_query(query)
    return api_response(
        data=_public_many.dump(items),
        pagination=pagination,
    )


# ── GET /api/equipos/<id> ─────────────────────────────────────────

@equipo_bp.route('/<int:id_equipo>', methods=['GET'])
def obtener_equipo(id_equipo):
    """Obtiene los detalles públicos de un equipo por su ID."""
    equipo = equipo_service.obtener_equipo_por_id(id_equipo)
    if equipo is None:
        return api_error('NOT_FOUND', 'Equipo no encontrado.', 404)
    return api_response(data=_public_schema.dump(equipo))


# ── POST /api/equipos ─────────────────────────────────────────────

@equipo_bp.route('', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def crear_equipo():
    """Registra un nuevo equipo.

    El ``id_usuario`` se extrae del JWT — no del body del request.
    """
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error(
            'BAD_REQUEST',
            'El cuerpo de la solicitud debe ser JSON válido.',
            400,
        )

    try:
        data = _create_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)

    try:
        equipo = equipo_service.crear_equipo(data)
    except ValueError as e:
        return api_error('CONFLICT', str(e), 409)

    return api_response(
        data=_admin_schema.dump(equipo),
        message='Equipo registrado exitosamente.',
        status=201,
    )


# ── PUT /api/equipos/<id> ─────────────────────────────────────────

@equipo_bp.route('/<int:id_equipo>', methods=['PUT'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def actualizar_equipo(id_equipo):
    """Actualiza un equipo existente.

    Los delegados solo pueden editar sus propios equipos.
    Los super_admin pueden editar cualquier equipo.
    """
    equipo = equipo_service.obtener_equipo_por_id(id_equipo)
    if equipo is None:
        return api_error('NOT_FOUND', 'Equipo no encontrado.', 404)

    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error(
            'BAD_REQUEST',
            'El cuerpo de la solicitud debe ser JSON válido.',
            400,
        )

    try:
        data = _update_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)

    if not data:
        return api_error(
            'VALIDATION_ERROR',
            'No se proporcionaron campos para actualizar.',
            422,
        )

    # Los super_admin no requieren verificación de propiedad
    es_admin = g.usuario_rol == 'super_admin'

    try:
        equipo = equipo_service.actualizar_equipo(
            equipo, data, verificar_propietario=not es_admin
        )
    except PermissionError as e:
        return api_error('FORBIDDEN', str(e), 403)

    return api_response(
        data=_admin_schema.dump(equipo),
        message='Equipo actualizado exitosamente.',
    )


# ── DELETE /api/equipos/<id> ──────────────────────────────────────

@equipo_bp.route('/<int:id_equipo>', methods=['DELETE'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def eliminar_equipo(id_equipo):
    """Soft delete de un equipo.

    Los delegados solo pueden eliminar sus propios equipos.
    Los super_admin pueden eliminar cualquier equipo.
    """
    es_admin = g.usuario_rol == 'super_admin'

    try:
        equipo = equipo_service.eliminar_equipo(
            id_equipo, verificar_propietario=not es_admin
        )
    except PermissionError as e:
        return api_error('FORBIDDEN', str(e), 403)

    if equipo is None:
        return api_error('NOT_FOUND', 'Equipo no encontrado.', 404)

    return api_response(message='Equipo eliminado exitosamente.')
