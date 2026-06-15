"""
Blueprint de rutas para la gestión de Jugadores.

Rutas de lectura: públicas (sin autenticación).
Rutas de escritura: protegidas con allowed_roles=['super_admin', 'delegado'].
"""
from flask import Blueprint, request
from marshmallow import ValidationError

from app.schemas.jugador_schema import (
    JugadorAdminSchema,
    JugadorCreateSchema,
    JugadorPublicSchema,
    JugadorUpdateSchema,
)
from app.services import jugador_service
from app.utils.auth_middleware import token_required
from app.utils.pagination import paginate_query
from app.utils.response import api_error, api_response

jugador_bp = Blueprint('jugadores', __name__, url_prefix='/api/jugadores')

_public_schema = JugadorPublicSchema()
_public_many = JugadorPublicSchema(many=True)
_admin_schema = JugadorAdminSchema()
_create_schema = JugadorCreateSchema()
_update_schema = JugadorUpdateSchema()


@jugador_bp.route('', methods=['GET'])
def listar_jugadores():
    """Lista jugadores activos con paginación. Query param: ``?genero=``."""
    genero = request.args.get('genero')
    query = jugador_service.listar_jugadores_activos(genero=genero)
    items, pagination = paginate_query(query)
    return api_response(data=_public_many.dump(items), pagination=pagination)


@jugador_bp.route('/<int:id_jugador>', methods=['GET'])
def obtener_jugador(id_jugador):
    """Obtiene los detalles públicos de un jugador por su ID."""
    jugador = jugador_service.obtener_jugador_por_id(id_jugador)
    if jugador is None:
        return api_error('NOT_FOUND', 'Jugador no encontrado.', 404)
    return api_response(data=_public_schema.dump(jugador))


@jugador_bp.route('', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def crear_jugador():
    """Registra un nuevo jugador. Responde 409 si la cédula ya existe."""
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)

    try:
        data = _create_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)

    try:
        jugador = jugador_service.crear_jugador(data)
    except ValueError as e:
        return api_error('CONFLICT', str(e), 409)

    return api_response(
        data=_admin_schema.dump(jugador),
        message='Jugador registrado exitosamente.',
        status=201,
    )


@jugador_bp.route('/<int:id_jugador>', methods=['PUT'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def actualizar_jugador(id_jugador):
    """Actualiza datos editables de un jugador (no cédula ni fecha nacimiento)."""
    jugador = jugador_service.obtener_jugador_por_id(id_jugador)
    if jugador is None:
        return api_error('NOT_FOUND', 'Jugador no encontrado.', 404)

    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)

    try:
        data = _update_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)

    if not data:
        return api_error('VALIDATION_ERROR', 'No se proporcionaron campos para actualizar.', 422)

    jugador = jugador_service.actualizar_jugador(jugador, data)
    return api_response(
        data=_admin_schema.dump(jugador),
        message='Jugador actualizado exitosamente.',
    )


@jugador_bp.route('/<int:id_jugador>', methods=['DELETE'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def eliminar_jugador(id_jugador):
    """Soft delete de un jugador."""
    jugador = jugador_service.eliminar_jugador(id_jugador)
    if jugador is None:
        return api_error('NOT_FOUND', 'Jugador no encontrado.', 404)
    return api_response(message='Jugador eliminado exitosamente.')
