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
from app.utils.storage import subir_archivo, TIPOS_DOCUMENTO, validar_archivo, MAX_CALENDARIO_TORNEO

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

    Query params opcionales: ``page`` (default 1), ``per_page`` (default 20), ``anio`` (opcional).
    """
    anio_param = request.args.get('anio')
    anio = int(anio_param) if anio_param and anio_param.isdigit() else None
    
    query = torneo_service.listar_torneos_activos(anio=anio)
    items, pagination = paginate_query(query)
    return api_response(
        data=_public_many.dump(items),
        pagination=pagination,
    )


# ── GET /api/torneos/admin ────────────────────────────────────────
@torneo_bp.route('/admin', methods=['GET'])
@token_required(allowed_roles=['super_admin'])
def listar_torneos_admin():
    """Lista todos los torneos (incluyendo anulados e inactivos) para administradores.
    
    Query params opcionales: ``page`` (default 1), ``per_page`` (default 20).
    """
    from app.models.torneo import Torneo
    query = Torneo.query.order_by(Torneo.fecha_inicio.desc())
    items, pagination = paginate_query(query)
    return api_response(
        data=_admin_schema.dump(items, many=True),
        pagination=pagination,
    )


# ── GET /api/torneos/disponibles-reinscripcion ────────────────────

@torneo_bp.route('/disponibles-reinscripcion', methods=['GET'])
@token_required(allowed_roles=['delegado'])
def torneos_disponibles_reinscripcion():
    """Obtiene todos los torneos que están en estado 'programado' (disponibles para inscribirse)."""
    from app.models.torneo import Torneo
    torneos = Torneo.query.filter_by(estado='programado').order_by(Torneo.fecha_inicio.desc()).all()
    return api_response(data=_public_many.dump(torneos))


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
        return api_error('VALIDATION_ERROR', 'Datos de torneo inválidos', 422, data=err.messages)

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
    """Soft delete de un torneo (inactivo). Requiere rol ``super_admin``."""
    torneo = torneo_service.eliminar_torneo(id_torneo)
    if torneo is None:
        return api_error('NOT_FOUND', 'Torneo no encontrado.', 404)
    return api_response(message='Torneo eliminado exitosamente.')


# ── PUT /api/torneos/<id>/anular ───────────────────────────────────

@torneo_bp.route('/<int:id_torneo>/anular', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def anular_torneo_route(id_torneo):
    """Anula un torneo en curso. Requiere rol ``super_admin``."""
    torneo = torneo_service.anular_torneo(id_torneo)
    if torneo is None:
        return api_error('NOT_FOUND', 'Torneo no encontrado o ya inactivo/anulado.', 404)
    return api_response(message='Torneo anulado exitosamente.')


# ── POST /api/torneos/<id>/categorias ──────────────────────────────

@torneo_bp.route('/<int:id_torneo>/categorias', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def agregar_categoria_route(id_torneo):
    """Agrega una nueva categoría a un torneo. Requiere rol ``super_admin``."""
    from app.schemas.categoria_schema import CategoriaCreateSchema
    from app.services import categoria_service
    
    torneo = torneo_service.obtener_torneo_por_id(id_torneo)
    if torneo is None:
        return api_error('NOT_FOUND', 'Torneo no encontrado.', 404)

    json_data = request.get_json(silent=True)
    if not json_data:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)

    try:
        data = CategoriaCreateSchema().load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', 'Datos inválidos', 422, data=err.messages)

    data['id_torneo'] = id_torneo
    cat = categoria_service.agregar_categoria(data)
    from app.schemas.categoria_schema import CategoriaPublicSchema
    return api_response(
        data=CategoriaPublicSchema().dump(cat),
        message='Categoría agregada exitosamente.',
        status=201
    )


# ── DELETE /api/categorias/<id> ────────────────────────────────────

@torneo_bp.route('/categorias/<int:id_categoria>', methods=['DELETE'])
@token_required(allowed_roles=['super_admin'])
def eliminar_categoria_route(id_categoria):
    """Elimina una categoría de un torneo (si no hay inscritos)."""
    from app.services import categoria_service
    try:
        res = categoria_service.eliminar_categoria(id_categoria)
        if not res:
            return api_error('NOT_FOUND', 'Categoría no encontrada.', 404)
        return api_response(message='Categoría eliminada exitosamente.')
    except ValueError as e:
        return api_error('CONFLICT', str(e), 409)


# ── POST /api/torneos/<id>/calendario ─────────────────────────────

@torneo_bp.route('/<int:id_torneo>/calendario', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def subir_calendario(id_torneo):
    """Sube un archivo Excel de calendario y lo asocia al torneo."""
    if 'file' not in request.files:
        return api_error('BAD_REQUEST', 'No se proporcionó ningún archivo.', 400)
    
    file = request.files['file']
    if file.filename == '':
        return api_error('BAD_REQUEST', 'El archivo no tiene nombre.', 400)

    torneo = torneo_service.obtener_torneo_por_id(id_torneo)
    if not torneo:
        return api_error('NOT_FOUND', 'Torneo no encontrado.', 404)

    try:
        # Validación de magic bytes y tamaño
        mime = validar_archivo(file.stream, TIPOS_DOCUMENTO, MAX_CALENDARIO_TORNEO)
        
        # Subir a storage
        url_publica = subir_archivo(
            file_stream=file.stream,
            nombre_original=file.filename,
            carpeta=f'torneos/{id_torneo}/calendario',
            mime_type=mime
        )
        
        # Actualizar base de datos
        torneo = torneo_service.actualizar_torneo(torneo, {'url_calendario_excel': url_publica})
        
        return api_response(
            data={'url': url_publica},
            message='Calendario subido exitosamente.'
        )
    except ValueError as e:
        return api_error('BAD_REQUEST', str(e), 400)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return api_error('SERVER_ERROR', 'Error al procesar el archivo.', 500)

@torneo_bp.route('/<int:id_torneo>/posiciones', methods=['GET'])
def tabla_de_posiciones(id_torneo):
    """Retorna la tabla de posiciones del torneo. Acceso público.

    Ejecuta el motor estadístico completo:
        1. Una query a ``partidos`` para traer encuentros finalizados.
        2. Procesamiento en memoria (defaultdict, cero queries adicionales).
        3. Una query con ``in_`` para enriquecer con nombres y logos de equipos.

    Retorna la lista ordenada por: Puntos DESC → DIF DESC → PF DESC.
    """
    torneo = torneo_service.obtener_torneo_por_id(id_torneo)
    if torneo is None:
        return api_error('NOT_FOUND', 'Torneo no encontrado.', 404)

    from app.services.standings import recalcular_tabla
    cat_param = request.args.get('id_categoria')
    id_categoria = int(cat_param) if cat_param and cat_param.isdigit() else None
    posiciones = recalcular_tabla(id_torneo, id_categoria)

    return api_response(
        data=posiciones,
        message=f'Tabla de posiciones del torneo "{torneo.nombre}".',
    )
