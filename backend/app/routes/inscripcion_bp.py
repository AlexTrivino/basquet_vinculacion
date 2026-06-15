"""
Blueprint de rutas para la gestión de Inscripciones.

Rutas de lectura: protegidas (solo usuarios autenticados con rol válido).
    - ``GET /api/inscripciones``: super_admin ve todas; delegado ve las de sus equipos.
Rutas de escritura:
    - ``POST /api/inscripciones``: super_admin y delegado.
    - ``PATCH /api/inscripciones/<id>/estado``: exclusivo super_admin.
"""
from flask import Blueprint, g, request
from marshmallow import ValidationError

from app.schemas.inscripcion_schema import (
    InscripcionAdminSchema,
    InscripcionCreateSchema,
    InscripcionEstadoSchema,
    InscripcionPublicSchema,
)
from app.services import inscripcion_service
from app.utils.auth_middleware import token_required
from app.utils.pagination import paginate_query
from app.utils.response import api_error, api_response

inscripcion_bp = Blueprint(
    'inscripciones', __name__, url_prefix='/api/inscripciones'
)

# ── Schemas reutilizables ─────────────────────────────────────────
_public_schema = InscripcionPublicSchema()
_public_many = InscripcionPublicSchema(many=True)
_admin_schema = InscripcionAdminSchema()
_admin_many = InscripcionAdminSchema(many=True)
_create_schema = InscripcionCreateSchema()
_estado_schema = InscripcionEstadoSchema()


# ── GET /api/inscripciones ────────────────────────────────────────

@inscripcion_bp.route('', methods=['GET'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def listar_inscripciones():
    """Lista inscripciones con paginación y filtros opcionales.

    Filtros disponibles via query params:
        - ``id_torneo`` (int): filtra por torneo.
        - ``estado`` (str): filtra por estado_inscripcion.

    Comportamiento por rol:
        - ``super_admin``: ve todas las inscripciones del sistema.
        - ``delegado``: ve solo las inscripciones de sus propios equipos.
          El filtrado se aplica en la query para evitar fuga de datos.
    """
    id_torneo = request.args.get('id_torneo', type=int)
    estado = request.args.get('estado')

    query = inscripcion_service.listar_inscripciones(
        id_torneo=id_torneo, estado=estado
    )

    # ── Filtro de propietario para delegados ──────────────────────
    # Un delegado solo ve inscripciones de sus propios equipos.
    # Se aplica a nivel de query (no post-fetch) para que la
    # paginación sea siempre coherente con los datos filtrados.
    if g.usuario_rol == 'delegado':
        from app.models.equipo import Equipo
        from app.models.inscripcion import Inscripcion
        query = query.join(Equipo, Inscripcion.id_equipo == Equipo.id_equipo).filter(
            Equipo.id_usuario == g.usuario_id
        )

    items, pagination = paginate_query(query)
    schema = _admin_many if g.usuario_rol == 'super_admin' else _public_many
    return api_response(data=schema.dump(items), pagination=pagination)


# ── POST /api/inscripciones ───────────────────────────────────────

@inscripcion_bp.route('', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def crear_inscripcion():
    """Registra un equipo en un torneo bajo una categoría.

    Responde ``409 Conflict`` si el equipo ya está inscrito en esa
    categoría del torneo (violación del UniqueConstraint).
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
        inscripcion = inscripcion_service.crear_inscripcion(data)
    except ValueError as e:
        # ValueError de duplicado → 409; de entidad inválida → 422
        mensaje = str(e)
        es_conflicto = 'ya está inscrito' in mensaje
        return api_error(
            'CONFLICT' if es_conflicto else 'VALIDATION_ERROR',
            mensaje,
            409 if es_conflicto else 422,
        )

    return api_response(
        data=_admin_schema.dump(inscripcion),
        message='Inscripción registrada exitosamente.',
        status=201,
    )


# ── PATCH /api/inscripciones/<id>/estado ─────────────────────────

@inscripcion_bp.route('/<int:id_inscripcion>/estado', methods=['PATCH'])
@token_required(allowed_roles=['super_admin'])
def cambiar_estado(id_inscripcion):
    """Aprueba o rechaza una inscripción. Exclusivo para super_admin.

    Recibe ``estado_inscripcion`` en el body: ``pendiente``,
    ``aprobado`` o ``rechazado``.
    """
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error(
            'BAD_REQUEST',
            'El cuerpo de la solicitud debe ser JSON válido.',
            400,
        )

    try:
        data = _estado_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)

    inscripcion = inscripcion_service.cambiar_estado_inscripcion(
        id_inscripcion, data['estado_inscripcion']
    )

    if inscripcion is None:
        return api_error('NOT_FOUND', 'Inscripción no encontrada.', 404)

    return api_response(
        data=_admin_schema.dump(inscripcion),
        message=f"Estado actualizado a '{data['estado_inscripcion']}' exitosamente.",
    )
