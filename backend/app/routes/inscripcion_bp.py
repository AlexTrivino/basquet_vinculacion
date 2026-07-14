"""
Blueprint de rutas para la gestión de Inscripciones.

Rutas de lectura: protegidas (solo usuarios autenticados con rol válido).
    - ``GET /api/inscripciones``: super_admin ve todas; delegado ve las de sus equipos.
Rutas de escritura:
    - ``POST /api/inscripciones``: super_admin y delegado.
    - ``PATCH /api/inscripciones/<id>/estado``: exclusivo super_admin.
"""
from flask import Blueprint, g, request, current_app
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
from app.models.inscripcion import Inscripcion as InscripcionModel

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


# ── GET /api/inscripciones/publicas ───────────────────────────────

@inscripcion_bp.route('/publicas', methods=['GET'])
def listar_inscripciones_publicas():
    id_torneo = request.args.get('id_torneo', type=int)
    id_equipo = request.args.get('id_equipo', type=int)

    query = inscripcion_service.listar_inscripciones(id_torneo=id_torneo, estado='aprobado')
    if id_equipo:
        query = query.filter(InscripcionModel.id_equipo == id_equipo)

    items, pagination = paginate_query(query)
    return api_response(data=_public_many.dump(items), pagination=pagination)


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
    id_categoria = request.args.get('id_categoria', type=int)

    query = inscripcion_service.listar_inscripciones(
        id_torneo=id_torneo, estado=estado, id_categoria=id_categoria
    )

    # ── Filtro de propietario para delegados ──────────────────────
    # Un delegado solo ve inscripciones de sus propios equipos.
    # Se aplica a nivel de query (no post-fetch) para que la
    # paginación sea siempre coherente con los datos filtrados.
    if g.usuario_rol == 'delegado':
        from app.models.equipo import Equipo
        from app.models.inscripcion import Inscripcion
        query = query.join(Equipo, Inscripcion.id_equipo == Equipo.id_equipo).filter(
            Equipo.id_usuario == g.usuario_id,
            Equipo.estado == 'activo'
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

    # Caso rechazo: el equipo e inscripción fueron eliminados físicamente
    if inscripcion == 'DELETED':
        return api_response(
            message='Inscripción rechazada. El equipo y sus datos asociados fueron eliminados permanentemente.',
        )

    return api_response(
        data=_admin_schema.dump(inscripcion),
        message=f"Estado actualizado a '{data['estado_inscripcion']}' exitosamente.",
    )


# ── POST /api/inscripciones/<id>/comprobante ──────────────────────

@inscripcion_bp.route('/<int:id_inscripcion>/comprobante', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def subir_comprobante(id_inscripcion):
    """Sube el comprobante de pago de una inscripción a Supabase Storage.

    Acepta: PDF, JPEG, PNG, WebP. Límite de tamaño gestionado por
    ``MAX_CONTENT_LENGTH`` de Flask (sin doble lectura del stream).

    Para delegados: solo pueden subir comprobante de inscripciones
    de equipos propios.
    """
    from app import db
    from app.models.equipo import Equipo
    from app.models.inscripcion import Inscripcion as InscripcionModel
    from app.utils.storage import TIPOS_DOCUMENTO, TIPOS_IMAGEN, MAX_COMPROBANTE, subir_archivo, validar_archivo

    # ── SELECT único: verificar existencia y cargar objeto ────────
    # Este mismo objeto se muta en memoria más adelante (patrón
    # SELECT → validar → mutar → commit).
    registro = db.session.get(InscripcionModel, id_inscripcion)
    if registro is None:
        return api_error('NOT_FOUND', 'Inscripción no encontrada.', 404)

    # ── Verificar propiedad del delegado ──────────────────────────
    if g.usuario_rol == 'delegado':
        equipo = db.session.get(Equipo, registro.id_equipo)
        if equipo is None or equipo.id_usuario != g.usuario_id:
            return api_error(
                'FORBIDDEN',
                'No tienes permiso para subir documentos de esta inscripción.',
                403,
            )

    # ── Verificar que se envió un archivo ─────────────────────────
    if 'archivo' not in request.files:
        return api_error(
            'BAD_REQUEST',
            "No se encontró el campo 'archivo' en la solicitud. "
            "Usa multipart/form-data con el campo 'archivo'.",
            400,
        )

    archivo = request.files['archivo']
    if archivo.filename == '':
        return api_error('BAD_REQUEST', 'No se seleccionó ningún archivo.', 400)

    # ── Validar por magic bytes (sin consumo doble de memoria) ────
    try:
        mime = validar_archivo(
            archivo.stream,
            tipos_aceptados=TIPOS_DOCUMENTO | TIPOS_IMAGEN,
            max_bytes=MAX_COMPROBANTE,
        )
    except ValueError as e:
        return api_error('UNSUPPORTED_MEDIA_TYPE', str(e), 415)

    # ── Subir en memoria a Supabase Storage ───────────────────────
    try:
        url = subir_archivo(
            file_stream=archivo.stream,
            nombre_original=archivo.filename,
            carpeta=f'inscripciones/{id_inscripcion}',
            mime_type=mime,
        )
    except RuntimeError as e:
        return api_error('STORAGE_ERROR', str(e), 502)

    # ── Mutar objeto en memoria y commit único ────────────────────
    # Sin segundo SELECT: reutilizamos ``registro`` del SELECT inicial.
    registro.url_comprobante_pago = url
    db.session.commit()

    return api_response(
        data={'url_comprobante_pago': url},
        message='Comprobante subido exitosamente.',
        status=201,
    )

# ── POST /api/inscripciones/completa ──────────────────────────────

@inscripcion_bp.route('/completa', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def crear_inscripcion_completa():
    """Registra un equipo, la inscripción y sube el comprobante atómicamente.
    """
    from app import db
    from app.models.equipo import Equipo
    from app.models.inscripcion import Inscripcion as InscripcionModel
    from app.utils.storage import TIPOS_DOCUMENTO, TIPOS_IMAGEN, MAX_COMPROBANTE, subir_archivo, validar_archivo, borrar_archivo
    from app.utils.text_utils import normalizar_mayusculas

    nombre_equipo = request.form.get('nombre_equipo')
    id_torneo = request.form.get('id_torneo')
    id_categoria = request.form.get('id_categoria')

    if not all([nombre_equipo, id_torneo, id_categoria]):
        return api_error('BAD_REQUEST', 'Faltan datos obligatorios (nombre_equipo, id_torneo, id_categoria).', 400)

    if 'archivo' not in request.files:
        return api_error('BAD_REQUEST', 'No se encontró el campo archivo.', 400)

    archivo = request.files['archivo']
    if archivo.filename == '':
        return api_error('BAD_REQUEST', 'No se seleccionó ningún archivo.', 400)

    try:
        mime = validar_archivo(
            archivo.stream,
            tipos_aceptados=TIPOS_DOCUMENTO | TIPOS_IMAGEN,
            max_bytes=MAX_COMPROBANTE,
        )
    except ValueError as e:
        return api_error('UNSUPPORTED_MEDIA_TYPE', str(e), 415)

    url_archivo = None
    try:
        # ── Validación de Límite de 3 Equipos ──────────────────────────
        equipos_activos = Equipo.query.filter_by(
            id_usuario=g.usuario_id, estado='activo'
        ).count()

        if equipos_activos >= 3:
            return api_error('CONFLICT', 'No puedes administrar más de 3 equipos simultáneamente. Límite alcanzado.', 409)

        # Transacción de base de datos
        datos_equipo = normalizar_mayusculas({'nombre_equipo': nombre_equipo}, ['nombre_equipo'])
        nuevo_equipo = Equipo(
            nombre_equipo=datos_equipo['nombre_equipo'],
            id_usuario=g.usuario_id
        )
        db.session.add(nuevo_equipo)
        db.session.flush()

        nueva_inscripcion = InscripcionModel(
            id_torneo=int(id_torneo),
            id_equipo=nuevo_equipo.id_equipo,
            id_categoria=int(id_categoria),
            estado_inscripcion='pendiente'
        )
        db.session.add(nueva_inscripcion)
        db.session.flush()

        # Subir archivo
        url_archivo = subir_archivo(
            file_stream=archivo.stream,
            nombre_original=archivo.filename,
            carpeta=f'inscripciones/{nueva_inscripcion.id_inscripcion}',
            mime_type=mime,
        )

        nueva_inscripcion.url_comprobante_pago = url_archivo
        
        # Commit de la transacción
        db.session.commit()

        return api_response(
            data=_admin_schema.dump(nueva_inscripcion),
            message='Inscripción y comprobante procesados exitosamente.',
            status=201
        )

    except Exception as e:
        db.session.rollback()
        current_app.logger.exception(f'Error en inscripción: {e}')
        # Si falló después de subir el archivo, lo borramos de S3
        if url_archivo:
            try:
                borrar_archivo(url_archivo)
            except Exception:
                pass

        return api_error('SERVER_ERROR', 'Ocurrió un error inesperado al procesar la inscripción.', 500)


