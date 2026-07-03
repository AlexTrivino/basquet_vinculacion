"""
Blueprint de rutas para la gestión de Partidos.

Rutas de lectura: públicas (sin autenticación).
Rutas de escritura: exclusivas de ``super_admin``.
"""
from flask import Blueprint, request
from marshmallow import ValidationError

from app.schemas.partido_schema import (
    PartidoAdminSchema,
    PartidoCreateSchema,
    PartidoPublicSchema,
    PartidoUpdateSchema,
)
from app.services import partido_service
from app.utils.auth_middleware import token_required
from app.utils.pagination import paginate_query
from app.utils.response import api_error, api_response
from app.utils.storage import TIPOS_DOCUMENTO, validar_archivo, subir_archivo, borrar_archivo
from app import db

partido_bp = Blueprint('partidos', __name__, url_prefix='/api/partidos')

_public_schema = PartidoPublicSchema()
_public_many = PartidoPublicSchema(many=True)
_admin_schema = PartidoAdminSchema()
_create_schema = PartidoCreateSchema()
_update_schema = PartidoUpdateSchema()


@partido_bp.route('', methods=['GET'])
def listar_partidos():
    """Lista partidos con paginación y filtros opcionales.

    Query params: ``id_torneo``, ``estado``.
    """
    id_torneo = request.args.get('id_torneo', type=int)
    estado = request.args.get('estado')
    query = partido_service.listar_partidos(id_torneo=id_torneo, estado=estado)
    items, pagination = paginate_query(query)
    return api_response(data=_public_many.dump(items), pagination=pagination)


@partido_bp.route('/<int:id_partido>', methods=['GET'])
def obtener_partido(id_partido):
    """Obtiene los detalles de un partido por su ID."""
    partido = partido_service.obtener_partido_por_id(id_partido)
    if partido is None:
        return api_error('NOT_FOUND', 'Partido no encontrado.', 404)
    return api_response(data=_public_schema.dump(partido))


@partido_bp.route('/<int:id_partido>/estadisticas', methods=['GET'])
def obtener_estadisticas_partido(id_partido):
    """Obtiene el box score de un partido, separando local y visitante y asegurando
    que se muestren todos los jugadores activos de la plantilla, incluso con 0."""
    partido = partido_service.obtener_partido_por_id(id_partido)
    if partido is None:
        return api_error('NOT_FOUND', 'Partido no encontrado.', 404)
        
    data = partido_service.obtener_box_score(partido)
    return api_response(data)


@partido_bp.route('/<int:id_partido>/acta', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def subir_acta_partido(id_partido):
    """Sube el acta oficial (PDF) de un partido y la asocia en la BD."""
    file = request.files.get('acta')
    if not file:
        return api_error('BAD_REQUEST', 'No se encontró el archivo de acta.', 400)
        
    partido = partido_service.obtener_partido_por_id(id_partido)
    if not partido:
        return api_error('NOT_FOUND', 'Partido no encontrado.', 404)
        
    try:
        if partido.url_planilla_fiba:
            try:
                borrar_archivo(partido.url_planilla_fiba)
            except Exception as e:
                pass # Continue even if delete fails
                
        mime_type = validar_archivo(file.stream, TIPOS_DOCUMENTO)
        url = subir_archivo(file.stream, file.filename, f'actas_fiba/{id_partido}', mime_type)
        
        partido.url_planilla_fiba = url
        db.session.commit()
        
        return api_response({'url': url}, message='Acta subida correctamente.')
    except ValueError as e:
        return api_error('VALIDATION_ERROR', str(e), 422)
    except Exception as e:
        db.session.rollback()
        return api_error('SERVER_ERROR', f'Error al procesar el archivo: {str(e)}', 500)


@partido_bp.route('/<int:id_partido>/acta', methods=['DELETE'])
@token_required(allowed_roles=['super_admin'])
def eliminar_acta_partido(id_partido):
    """Elimina el acta oficial (PDF) de un partido permanentemente."""
    partido = partido_service.obtener_partido_por_id(id_partido)
    if not partido:
        return api_error('NOT_FOUND', 'Partido no encontrado.', 404)
        
    if not partido.url_planilla_fiba:
        return api_error('BAD_REQUEST', 'El partido no tiene un acta subida.', 400)
        
    try:
        borrar_archivo(partido.url_planilla_fiba)
        partido.url_planilla_fiba = None
        db.session.commit()
        return api_response(None, message='Acta eliminada exitosamente.')
    except Exception as e:
        db.session.rollback()
        return api_error('SERVER_ERROR', f'Error al eliminar el archivo: {str(e)}', 500)


@partido_bp.route('', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def crear_partido():
    """Programa un nuevo partido. Verifica inscripciones aprobadas de ambos equipos."""
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)

    try:
        data = _create_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)

    try:
        partido = partido_service.crear_partido(data)
    except ValueError as e:
        return api_error('VALIDATION_ERROR', str(e), 422)

    return api_response(
        data=_admin_schema.dump(partido),
        message='Partido programado exitosamente.',
        status=201,
    )


@partido_bp.route('/<int:id_partido>', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def actualizar_partido(id_partido):
    """Actualiza logística o marcadores de un partido.

    Cuando el estado cambia a ``'finalizado'``, se activa automáticamente
    el motor de posiciones (``standings.recalcular_tabla``).
    """
    partido = partido_service.obtener_partido_por_id(id_partido)
    if partido is None:
        return api_error('NOT_FOUND', 'Partido no encontrado.', 404)

    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)

    try:
        data = _update_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)

    if not data:
        return api_error('VALIDATION_ERROR', 'No se proporcionaron campos para actualizar.', 422)

    partido = partido_service.actualizar_partido(partido, data)
    return api_response(
        data=_admin_schema.dump(partido),
        message='Partido actualizado exitosamente.',
    )
