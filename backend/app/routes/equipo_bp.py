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
from app.utils.storage import subir_archivo, borrar_archivo, validar_archivo, TIPOS_IMAGEN
from app import db

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
    equipo = equipo_service.obtener_equipo_por_id(id_equipo, incluir_inactivos=True)
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


# ── PUT /api/equipos/<id>/reactivar ───────────────────────────────

@equipo_bp.route('/<int:id_equipo>/reactivar', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def reactivar_equipo_route(id_equipo):
    try:
        equipo = equipo_service.reactivar_equipo(id_equipo)
    except ValueError as e:
        return api_error('CONFLICT', str(e), 409)

    if not equipo: return api_error('NOT_FOUND', 'Equipo no encontrado o ya activo.', 404)
    return api_response(message='Equipo reactivado exitosamente.')


# ── GET /api/equipos/admin/list ───────────────────────────────────

@equipo_bp.route('/admin/list', methods=['GET'])
@token_required(allowed_roles=['super_admin'])
def listar_equipos_admin_route():
    id_torneo = request.args.get('id_torneo', type=int)
    id_categoria = request.args.get('id_categoria', type=int)
    search_query = request.args.get('search', type=str)
    query = equipo_service.listar_equipos_admin(id_torneo, id_categoria, search_query)
    items, pagination = paginate_query(query)
    
    _admin_many = EquipoAdminSchema(many=True)
    return api_response(data=_admin_many.dump(items), pagination=pagination)


# ── Multimedia ────────────────────────────────────────────────────

@equipo_bp.route('/<int:id_equipo>/logo', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def subir_logo_equipo(id_equipo):
    equipo = equipo_service.obtener_equipo_por_id(id_equipo)
    if not equipo:
        return api_error('NOT_FOUND', 'Equipo no encontrado.', 404)
        
    if g.usuario_rol != 'super_admin' and equipo.id_usuario != g.usuario_id:
        return api_error('FORBIDDEN', 'No tienes permiso para modificar este equipo.', 403)
        
    file = request.files.get('file') or request.files.get('logo')
    if not file:
        return api_error('BAD_REQUEST', 'No se proporcionó un archivo.', 400)
        
    try:
        if equipo.url_logo:
            try:
                borrar_archivo(equipo.url_logo)
            except Exception:
                pass
                
        mime_type = validar_archivo(file.stream, TIPOS_IMAGEN)
        url = subir_archivo(file.stream, file.filename, f'equipos/{id_equipo}/logo', mime_type)
        equipo.url_logo = url
        db.session.commit()
        return api_response({'url': url}, message='Logo subido exitosamente.')
    except ValueError as e:
        return api_error('VALIDATION_ERROR', str(e), 422)
    except RuntimeError as e:
        return api_error('SERVER_ERROR', str(e), 500)
    except Exception as e:
        db.session.rollback()
        return api_error('SERVER_ERROR', 'Error interno al subir el logo.', 500)


@equipo_bp.route('/<int:id_equipo>/logo', methods=['DELETE'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def eliminar_logo_equipo(id_equipo):
    equipo = equipo_service.obtener_equipo_por_id(id_equipo)
    if not equipo:
        return api_error('NOT_FOUND', 'Equipo no encontrado.', 404)
        
    if g.usuario_rol != 'super_admin' and equipo.id_usuario != g.usuario_id:
        return api_error('FORBIDDEN', 'No tienes permiso para modificar este equipo.', 403)
        
    if not equipo.url_logo:
        return api_error('BAD_REQUEST', 'El equipo no tiene logo.', 400)
        
    try:
        borrar_archivo(equipo.url_logo)
        equipo.url_logo = None
        db.session.commit()
        return api_response(message='Logo eliminado exitosamente.')
    except RuntimeError as e:
        return api_error('SERVER_ERROR', str(e), 500)
    except Exception as e:
        db.session.rollback()
        return api_error('SERVER_ERROR', 'Error interno al borrar el logo.', 500)


@equipo_bp.route('/<int:id_equipo>/banner', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def subir_banner_equipo(id_equipo):
    equipo = equipo_service.obtener_equipo_por_id(id_equipo)
    if not equipo:
        return api_error('NOT_FOUND', 'Equipo no encontrado.', 404)
        
    if g.usuario_rol != 'super_admin' and equipo.id_usuario != g.usuario_id:
        return api_error('FORBIDDEN', 'No tienes permiso para modificar este equipo.', 403)
        
    file = request.files.get('file') or request.files.get('banner')
    if not file:
        return api_error('BAD_REQUEST', 'No se proporcionó un archivo.', 400)
        
    try:
        if equipo.url_foto_equipo:
            try:
                borrar_archivo(equipo.url_foto_equipo)
            except Exception:
                pass
                
        mime_type = validar_archivo(file.stream, TIPOS_IMAGEN)
        url = subir_archivo(file.stream, file.filename, f'equipos/{id_equipo}/banner', mime_type)
        equipo.url_foto_equipo = url
        db.session.commit()
        return api_response({'url': url}, message='Banner subido exitosamente.')
    except ValueError as e:
        return api_error('VALIDATION_ERROR', str(e), 422)
    except RuntimeError as e:
        return api_error('SERVER_ERROR', str(e), 500)
    except Exception as e:
        db.session.rollback()
        return api_error('SERVER_ERROR', 'Error interno al subir el banner.', 500)


@equipo_bp.route('/<int:id_equipo>/banner', methods=['DELETE'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def eliminar_banner_equipo(id_equipo):
    equipo = equipo_service.obtener_equipo_por_id(id_equipo)
    if not equipo:
        return api_error('NOT_FOUND', 'Equipo no encontrado.', 404)
        
    if g.usuario_rol != 'super_admin' and equipo.id_usuario != g.usuario_id:
        return api_error('FORBIDDEN', 'No tienes permiso para modificar este equipo.', 403)
        
    if not equipo.url_foto_equipo:
        return api_error('BAD_REQUEST', 'El equipo no tiene banner.', 400)
        
    try:
        borrar_archivo(equipo.url_foto_equipo)
        equipo.url_foto_equipo = None
        db.session.commit()
        return api_response(message='Banner eliminado exitosamente.')
    except RuntimeError as e:
        return api_error('SERVER_ERROR', str(e), 500)
    except Exception as e:
        db.session.rollback()
        return api_error('SERVER_ERROR', 'Error interno al borrar el banner.', 500)
