"""
Blueprint de rutas para la gestión de Torneos.

Rutas de lectura: públicas (sin autenticación).
Rutas de escritura: protegidas con ``@token_required(allowed_roles=['super_admin'])``.

Todas las respuestas usan ``api_response`` / ``api_error`` (Decisión #11).
Los listados usan ``paginate_query`` (Decisión #12).
La serialización usa schemas diferenciados (Decisión #13).
"""
from flask import Blueprint, request
from marshmallow import ValidationError

from app.schemas.torneo_schema import (
    TorneoAdminSchema,
    TorneoCreateSchema,
    TorneoPublicSchema,
    TorneoUpdateSchema,
)
from app.services import torneo_service
from app.utils.auth_middleware import token_required
from app.utils.pagination import paginate_query
from app.utils.response import api_error, api_response

torneo_bp = Blueprint('torneos', __name__, url_prefix='/api/torneos')

# ── Schemas (instancias reutilizables, sin overhead por request) ──
_public_schema = TorneoPublicSchema()
_public_many = TorneoPublicSchema(many=True)
_admin_schema = TorneoAdminSchema()
_create_schema = TorneoCreateSchema()
_update_schema = TorneoUpdateSchema()


# ── GET /api/torneos ──────────────────────────────────────────────

@torneo_bp.route('', methods=['GET'])
def listar_torneos():
    """Lista todos los torneos activos con paginación.

    Query params opcionales: ``page`` (default 1), ``per_page`` (default 20).
    """
    query = torneo_service.listar_torneos_activos()
    items, pagination = paginate_query(query)
    return api_response(
        data=_public_many.dump(items),
        pagination=pagination,
    )


# ── GET /api/torneos/<id> ─────────────────────────────────────────

@torneo_bp.route('/<int:id_torneo>', methods=['GET'])
def obtener_torneo(id_torneo):
    """Obtiene los detalles públicos de un torneo por su ID."""
    torneo = torneo_service.obtener_torneo_por_id(id_torneo)
    if torneo is None:
        return api_error('NOT_FOUND', 'Torneo no encontrado.', 404)
    return api_response(data=_public_schema.dump(torneo))


# ── POST /api/torneos ─────────────────────────────────────────────

@torneo_bp.route('', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def crear_torneo():
    """Crea un nuevo torneo. Requiere rol ``super_admin``."""
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

    torneo = torneo_service.crear_torneo(data)
    return api_response(
        data=_admin_schema.dump(torneo),
        message='Torneo creado exitosamente.',
        status=201,
    )


# ── PUT /api/torneos/<id> ─────────────────────────────────────────

@torneo_bp.route('/<int:id_torneo>', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def actualizar_torneo(id_torneo):
    """Actualiza un torneo existente. Requiere rol ``super_admin``."""
    torneo = torneo_service.obtener_torneo_por_id(id_torneo)
    if torneo is None:
        return api_error('NOT_FOUND', 'Torneo no encontrado.', 404)

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

    try:
        torneo = torneo_service.actualizar_torneo(torneo, data)
    except ValueError as e:
        return api_error('VALIDATION_ERROR', str(e), 422)

    return api_response(
        data=_admin_schema.dump(torneo),
        message='Torneo actualizado exitosamente.',
    )


# ── DELETE /api/torneos/<id> ──────────────────────────────────────

@torneo_bp.route('/<int:id_torneo>', methods=['DELETE'])
@token_required(allowed_roles=['super_admin'])
def eliminar_torneo(id_torneo):
    """Soft delete de un torneo. Requiere rol ``super_admin``."""
    torneo = torneo_service.eliminar_torneo(id_torneo)
    if torneo is None:
        return api_error('NOT_FOUND', 'Torneo no encontrado.', 404)
    return api_response(message='Torneo eliminado exitosamente.')
