"""
Blueprint de rutas para la gestión de Plantillas (nóminas de equipos).

Rutas de lectura: públicas.
Rutas de escritura: protegidas con allowed_roles=['super_admin', 'delegado'].

Regla de negocio en rutas de delegado:
    Un delegado solo puede agregar/eliminar jugadores de equipos
    que le pertenezcan (verificado cruzando g.usuario_id con equipo.id_usuario).
"""
from flask import Blueprint, g, request
from marshmallow import ValidationError

from app.schemas.plantilla_schema import (
    PlantillaAdminSchema,
    PlantillaCreateSchema,
    PlantillaPublicSchema,
    PlantillaUpdateSchema,
)
from app.services import plantilla_service
from app.utils.auth_middleware import token_required
from app.utils.pagination import paginate_query
from app.utils.response import api_error, api_response

plantilla_bp = Blueprint('plantillas', __name__, url_prefix='/api/plantillas')

_public_schema = PlantillaPublicSchema()
_public_many = PlantillaPublicSchema(many=True)
_admin_schema = PlantillaAdminSchema()
_create_schema = PlantillaCreateSchema()
_update_schema = PlantillaUpdateSchema()


@plantilla_bp.route('', methods=['GET'])
def listar_plantilla():
    """Lista la nómina activa de un equipo en un torneo con paginación.

    Query params opcionales: ``id_equipo``, ``id_torneo``.
    """
    id_equipo = request.args.get('id_equipo', type=int)
    id_torneo = request.args.get('id_torneo', type=int)
    id_categoria = request.args.get('id_categoria', type=int)
    query = plantilla_service.listar_plantilla(id_equipo=id_equipo, id_torneo=id_torneo, id_categoria=id_categoria)
    items, pagination = paginate_query(query)
    return api_response(data=_public_many.dump(items), pagination=pagination)


@plantilla_bp.route('/<int:id_plantilla>', methods=['GET'])
def obtener_entrada(id_plantilla):
    """Obtiene una entrada de plantilla por su ID."""
    entrada = plantilla_service.obtener_entrada_plantilla(id_plantilla)
    if entrada is None:
        return api_error('NOT_FOUND', 'Entrada de plantilla no encontrada.', 404)
    return api_response(data=_public_schema.dump(entrada))


@plantilla_bp.route('', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def agregar_jugador():
    """Agrega un jugador a la nómina de un equipo en un torneo.

    Ejecuta 3 validaciones en el servicio:
        1. Inscripción del equipo aprobada en el torneo.
        2. Edad del jugador dentro del rango de la categoría.
        3. El jugador no pertenece ya a otra plantilla de la misma categoría en el torneo.

    Para delegados, verifica además que el equipo le pertenezca.
    """
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)

    try:
        data = _create_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)

    # ── Verificación de propiedad para delegados ─────────────────
    if g.usuario_rol == 'delegado':
        from app import db
        from app.models.equipo import Equipo
        equipo = db.session.get(Equipo, data['id_equipo'])
        if equipo is None or equipo.id_usuario != g.usuario_id:
            return api_error(
                'FORBIDDEN',
                'No tienes permiso para agregar jugadores a este equipo.',
                403,
            )

    try:
        entrada = plantilla_service.crear_plantilla(data, usuario_rol=g.usuario_rol)
    except ValueError as e:
        mensaje = str(e)
        # Distinguir conflicto de negocio (409) de error de validación de formato (422)
        es_conflicto = (
            'ya pertenece' in mensaje
            or 'ya registrado' in mensaje
            or 'ya está inscrito' in mensaje
            or 'ya está en uso' in mensaje
        )
        return api_error(
            'CONFLICT' if es_conflicto else 'VALIDATION_ERROR',
            mensaje,
            409 if es_conflicto else 422,
        )

    return api_response(
        data=_admin_schema.dump(entrada),
        message='Jugador agregado a la plantilla exitosamente.',
        status=201,
    )


@plantilla_bp.route('/<int:id_plantilla>', methods=['PATCH'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def actualizar_camiseta(id_plantilla):
    """Actualiza el número de camiseta de una entrada de plantilla.

    Para delegados, verifica que el equipo de la entrada le pertenezca.
    """
    entrada = plantilla_service.obtener_entrada_plantilla(id_plantilla)
    if entrada is None:
        return api_error('NOT_FOUND', 'Entrada de plantilla no encontrada.', 404)

    if g.usuario_rol == 'delegado':
        from app import db
        from app.models.equipo import Equipo
        equipo = db.session.get(Equipo, entrada.id_equipo)
        if equipo is None or equipo.id_usuario != g.usuario_id:
            return api_error(
                'FORBIDDEN',
                'No tienes permiso para modificar la plantilla de este equipo.',
                403,
            )

    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)

    try:
        data = _update_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)

    try:
        entrada_actualizada = plantilla_service.actualizar_numero_camiseta(
            id_plantilla, data['numero_camiseta'], usuario_rol=g.usuario_rol
        )
    except ValueError as e:
        return api_error('CONFLICT', str(e), 409)

    return api_response(
        data=_admin_schema.dump(entrada_actualizada),
        message='Número de camiseta actualizado exitosamente.',
    )


@plantilla_bp.route('/<int:id_plantilla>', methods=['DELETE'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def remover_jugador(id_plantilla):
    """Soft delete de una entrada de plantilla.

    Para delegados, verifica que el equipo de la entrada le pertenezca.
    """
    if g.usuario_rol == 'delegado':
        entrada = plantilla_service.obtener_entrada_plantilla(id_plantilla)
        if entrada is None:
            return api_error('NOT_FOUND', 'Entrada de plantilla no encontrada.', 404)

        from app import db
        from app.models.equipo import Equipo
        equipo = db.session.get(Equipo, entrada.id_equipo)
        if equipo is None or equipo.id_usuario != g.usuario_id:
            return api_error(
                'FORBIDDEN',
                'No tienes permiso para modificar la plantilla de este equipo.',
                403,
            )

    try:
        resultado = plantilla_service.eliminar_plantilla(id_plantilla, usuario_rol=g.usuario_rol)
    except ValueError as e:
        return api_error('VALIDATION_ERROR', str(e), 400)
    if resultado is None:
        return api_error('NOT_FOUND', 'Entrada de plantilla no encontrada.', 404)

    return api_response(message='Jugador removido de la plantilla exitosamente.')
