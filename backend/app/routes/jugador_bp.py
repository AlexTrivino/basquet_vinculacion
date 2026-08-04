"""
Blueprint de rutas para la gestión de Jugadores.

Rutas de lectura: públicas (sin autenticación).
Rutas de escritura: protegidas con allowed_roles=['super_admin', 'delegado'].
"""
from flask import Blueprint, g, request
from marshmallow import ValidationError
import threading

from app.schemas.jugador_schema import (
    JugadorAdminSchema,
    JugadorCreateSchema,
    JugadorPublicSchema,
    JugadorUpdateSchema,
)
from app.services import jugador_service
from app.services import jugador_profile_service
from app.services import plantilla_service
from app.utils.auth_middleware import token_required
from app.utils.pagination import paginate_query
from app.utils.response import api_error, api_response

jugador_bp = Blueprint('jugadores', __name__, url_prefix='/api/jugadores')

_public_schema = JugadorPublicSchema()
_public_many = JugadorPublicSchema(many=True)
_admin_schema = JugadorAdminSchema()
_admin_many = JugadorAdminSchema(many=True)
_create_schema = JugadorCreateSchema()
_update_schema = JugadorUpdateSchema()


def _delegado_tiene_acceso_jugador(id_jugador: int, id_usuario: str) -> bool:
    """Verifica si un delegado tiene permiso para gestionar los datos de un jugador.

    Un delegado puede gestionar a un jugador si:
    1. El jugador está activo en alguna plantilla de un equipo del delegado, Ó
    2. El jugador no está registrado en ninguna plantilla activa de ningún equipo (jugador libre o nuevo).
    """
    from app import db
    from app.models.plantilla import Plantilla
    from app.models.equipo import Equipo

    plantillas = (
        db.session.query(Plantilla.id_plantilla, Equipo.id_usuario)
        .join(Equipo, Plantilla.id_equipo == Equipo.id_equipo)
        .filter(Plantilla.id_jugador == id_jugador, Plantilla.estado == 'activo')
        .all()
    )

    if not plantillas:
        return True

    return any(p.id_usuario == id_usuario for p in plantillas)


@jugador_bp.route('', methods=['GET'])
def listar_jugadores():
    """Lista jugadores con paginación y filtros opcionales.
    Query params: ``?genero=``, ``?search=``, ``?id_torneo=``, ``?id_equipo=``, ``?estado=``.
    """
    genero = request.args.get('genero')
    search = request.args.get('search') or request.args.get('q')
    id_torneo = request.args.get('id_torneo', type=int)
    id_equipo = request.args.get('id_equipo', type=int)
    estado = request.args.get('estado')

    query = jugador_service.listar_jugadores_admin(
        search=search,
        id_torneo=id_torneo,
        id_equipo=id_equipo,
        genero=genero,
        estado=estado,
    )
    items, pagination = paginate_query(query)

    admin_mode = (
        request.args.get('admin') == 'true'
        or estado is not None
        or search is not None
        or id_torneo is not None
        or id_equipo is not None
    )
    schema = _admin_many if admin_mode else _public_many
    return api_response(data=schema.dump(items), pagination=pagination)


@jugador_bp.route('/buscar', methods=['GET'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def buscar_jugador():
    """Busca un jugador por su número de cédula/documento de identidad.
    
    Parámetros query:
        - cedula (str, requerido): Cédula a buscar.
        - id_torneo (int, opcional): Si se incluye, valida si el jugador ya está
          inscrito en una plantilla activa dentro del torneo.
    """
    cedula = request.args.get('cedula', '').strip()
    if not cedula:
        return api_error('BAD_REQUEST', 'El parámetro cedula es requerido.', 400)

    jugador = jugador_service.obtener_jugador_por_cedula(cedula)
    if jugador is None:
        return api_response(data=None, message='Jugador no registrado.')

    jugador_data = _admin_schema.dump(jugador)

    id_torneo = request.args.get('id_torneo')
    if id_torneo is not None and id_torneo.strip() != '':
        try:
            id_torneo_int = int(id_torneo)
            info_torneo = plantilla_service.verificar_jugador_en_torneo(
                id_jugador=jugador.id_jugador,
                id_torneo=id_torneo_int,
            )
            jugador_data.update(info_torneo)
        except (ValueError, TypeError):
            return api_error('BAD_REQUEST', 'El parámetro id_torneo debe ser un número entero válido.', 400)

    return api_response(data=jugador_data)


@jugador_bp.route('/<int:id_jugador>', methods=['GET'])
def obtener_jugador(id_jugador):
    """Obtiene los detalles públicos de un jugador por su ID."""
    jugador = jugador_service.obtener_jugador_por_id(id_jugador, incluir_inactivos=True)
    if jugador is None:
        return api_error('NOT_FOUND', 'Jugador no encontrado.', 404)
    return api_response(data=_admin_schema.dump(jugador))


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
    except jugador_service.JugadorDuplicadoError as e:
        return api_error(
            'CONFLICT', 
            str(e), 
            409, 
            data=_admin_schema.dump(e.jugador) if e.jugador else None
        )
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
    """Actualiza datos editables de un jugador."""
    jugador = jugador_service.obtener_jugador_por_id(id_jugador, incluir_inactivos=True)
    if jugador is None:
        return api_error('NOT_FOUND', 'Jugador no encontrado.', 404)

    if g.usuario_rol == 'delegado' and not _delegado_tiene_acceso_jugador(id_jugador, g.usuario_id):
        return api_error('FORBIDDEN', 'No tienes permiso para modificar a este jugador.', 403)

    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)

    try:
        data = _update_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)

    if not data:
        return api_error('VALIDATION_ERROR', 'No se proporcionaron campos para actualizar.', 422)

    try:
        jugador = jugador_service.actualizar_jugador(jugador, data)
    except jugador_service.JugadorDuplicadoError as e:
        return api_error('CONFLICT', str(e), 409)

    return api_response(
        data=_admin_schema.dump(jugador),
        message='Jugador actualizado exitosamente.',
    )


@jugador_bp.route('/<int:id_jugador>', methods=['DELETE'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def eliminar_jugador(id_jugador):
    """Soft delete de un jugador."""
    from app.utils.storage import borrar_archivo
    
    jugador = jugador_service.obtener_jugador_por_id(id_jugador)
    if not jugador:
        return api_error('NOT_FOUND', 'Jugador no encontrado.', 404)

    if g.usuario_rol == 'delegado' and not _delegado_tiene_acceso_jugador(id_jugador, g.usuario_id):
        return api_error('FORBIDDEN', 'No tienes permiso para eliminar a este jugador.', 403)
        
    foto_vieja = jugador.url_foto
    cedula_vieja = jugador.url_cedula
    acta_vieja = jugador.url_acta_bachiller
    
    # Efectuar Soft Delete
    jugador = jugador_service.eliminar_jugador(id_jugador)
    
    if foto_vieja:
        threading.Thread(target=borrar_archivo, args=(foto_vieja,)).start()
    if cedula_vieja:
        threading.Thread(target=borrar_archivo, args=(cedula_vieja,)).start()
    if acta_vieja:
        threading.Thread(target=borrar_archivo, args=(acta_vieja,)).start()
        
    return api_response(message='Jugador eliminado exitosamente.')


# ── POST /api/jugadores/<id>/foto ─────────────────────────────────

@jugador_bp.route('/<int:id_jugador>/foto', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def subir_foto_jugador(id_jugador):
    """Sube la foto de perfil de un jugador a Supabase Storage.

    Acepta: JPEG, PNG, WebP. Máximo 4 MB.
    """
    from app.utils.storage import TIPOS_IMAGEN, MAX_FOTO_JUGADOR, subir_archivo, validar_archivo, borrar_archivo

    jugador = jugador_service.obtener_jugador_por_id(id_jugador)
    if jugador is None:
        return api_error('NOT_FOUND', 'Jugador no encontrado.', 404)

    if g.usuario_rol == 'delegado' and not _delegado_tiene_acceso_jugador(id_jugador, g.usuario_id):
        return api_error('FORBIDDEN', 'No tienes permiso para modificar los documentos de este jugador.', 403)

    if 'archivo' not in request.files:
        return api_error(
            'BAD_REQUEST',
            "No se encontró el campo 'archivo'. Usa multipart/form-data.",
            400,
        )

    archivo = request.files['archivo']
    if archivo.filename == '':
        return api_error('BAD_REQUEST', 'No se seleccionó ningún archivo.', 400)

    try:
        mime = validar_archivo(
            archivo.stream,
            tipos_aceptados=TIPOS_IMAGEN,
            max_bytes=MAX_FOTO_JUGADOR,
        )
    except ValueError as e:
        return api_error('UNSUPPORTED_MEDIA_TYPE', str(e), 415)

    try:
        url = subir_archivo(
            file_stream=archivo.stream,
            nombre_original=archivo.filename,
            carpeta=f'jugadores/{id_jugador}/fotos',
            mime_type=mime,
        )
    except RuntimeError as e:
        return api_error('STORAGE_ERROR', str(e), 502)

    foto_vieja = jugador.url_foto
    jugador = jugador_service.actualizar_jugador(jugador, {'url_foto': url})

    if foto_vieja:
        threading.Thread(target=borrar_archivo, args=(foto_vieja,)).start()

    return api_response(
        data=_admin_schema.dump(jugador),
        message='Foto de jugador actualizada exitosamente.',
        status=201,
    )


# ── POST /api/jugadores/<id>/cedula ───────────────────────────────

@jugador_bp.route('/<int:id_jugador>/cedula', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def subir_cedula_jugador(id_jugador):
    """Sube la foto o documento de cédula de un jugador a Supabase Storage.

    Acepta: JPEG, PNG, WebP, PDF. Máximo 4 MB.
    """
    from app.utils.storage import TIPOS_PERMITIDOS, MAX_DOCUMENTO_JUGADOR, subir_archivo, validar_archivo, borrar_archivo

    jugador = jugador_service.obtener_jugador_por_id(id_jugador)
    if jugador is None:
        return api_error('NOT_FOUND', 'Jugador no encontrado.', 404)

    if g.usuario_rol == 'delegado' and not _delegado_tiene_acceso_jugador(id_jugador, g.usuario_id):
        return api_error('FORBIDDEN', 'No tienes permiso para modificar los documentos de este jugador.', 403)

    if 'archivo' not in request.files:
        return api_error(
            'BAD_REQUEST',
            "No se encontró el campo 'archivo'. Usa multipart/form-data.",
            400,
        )

    archivo = request.files['archivo']
    if archivo.filename == '':
        return api_error('BAD_REQUEST', 'No se seleccionó ningún archivo.', 400)

    try:
        mime = validar_archivo(
            archivo.stream,
            tipos_aceptados=TIPOS_PERMITIDOS,
            max_bytes=MAX_DOCUMENTO_JUGADOR,
        )
    except ValueError as e:
        return api_error('UNSUPPORTED_MEDIA_TYPE', str(e), 415)

    try:
        url = subir_archivo(
            file_stream=archivo.stream,
            nombre_original=archivo.filename,
            carpeta=f'jugadores/{id_jugador}/cedulas',
            mime_type=mime,
        )
    except RuntimeError as e:
        return api_error('STORAGE_ERROR', str(e), 502)

    cedula_vieja = jugador.url_cedula
    jugador = jugador_service.actualizar_jugador(jugador, {'url_cedula': url})

    if cedula_vieja:
        threading.Thread(target=borrar_archivo, args=(cedula_vieja,)).start()

    return api_response(
        data=_admin_schema.dump(jugador),
        message='Documento de cédula actualizado exitosamente.',
        status=201,
    )


# ── POST /api/jugadores/<id>/acta ─────────────────────────────────

@jugador_bp.route('/<int:id_jugador>/acta', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def subir_acta_jugador(id_jugador):
    """Sube el acta de bachiller de un jugador a Supabase Storage.

    Acepta: JPEG, PNG, WebP, PDF. Máximo 4 MB.
    """
    from app.utils.storage import TIPOS_PERMITIDOS, MAX_DOCUMENTO_JUGADOR, subir_archivo, validar_archivo, borrar_archivo

    jugador = jugador_service.obtener_jugador_por_id(id_jugador)
    if jugador is None:
        return api_error('NOT_FOUND', 'Jugador no encontrado.', 404)

    if g.usuario_rol == 'delegado' and not _delegado_tiene_acceso_jugador(id_jugador, g.usuario_id):
        return api_error('FORBIDDEN', 'No tienes permiso para modificar los documentos de este jugador.', 403)

    if 'archivo' not in request.files:
        return api_error(
            'BAD_REQUEST',
            "No se encontró el campo 'archivo'. Usa multipart/form-data.",
            400,
        )

    archivo = request.files['archivo']
    if archivo.filename == '':
        return api_error('BAD_REQUEST', 'No se seleccionó ningún archivo.', 400)

    try:
        mime = validar_archivo(
            archivo.stream,
            tipos_aceptados=TIPOS_PERMITIDOS,
            max_bytes=MAX_DOCUMENTO_JUGADOR,
        )
    except ValueError as e:
        return api_error('UNSUPPORTED_MEDIA_TYPE', str(e), 415)

    try:
        url = subir_archivo(
            file_stream=archivo.stream,
            nombre_original=archivo.filename,
            carpeta=f'jugadores/{id_jugador}/actas',
            mime_type=mime,
        )
    except RuntimeError as e:
        return api_error('STORAGE_ERROR', str(e), 502)

    acta_vieja = jugador.url_acta_bachiller
    jugador = jugador_service.actualizar_jugador(jugador, {'url_acta_bachiller': url})

    if acta_vieja:
        threading.Thread(target=borrar_archivo, args=(acta_vieja,)).start()

    return api_response(
        data=_admin_schema.dump(jugador),
        message='Acta de bachiller actualizada exitosamente.',
        status=201,
    )


# ── GET /api/jugadores/<id>/perfil ────────────────────────────────

@jugador_bp.route('/<int:id_jugador>/perfil', methods=['GET'])
def obtener_perfil_jugador(id_jugador):
    """Obtiene el perfil consolidado (datos, equipo, estadísticas promediadas)."""
    perfil = jugador_profile_service.obtener_perfil_publico(id_jugador)
    if not perfil:
        return api_error('NOT_FOUND', 'Jugador no encontrado.', 404)
    return api_response(data=perfil)

