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


# ── POST /api/inscripciones/<id>/comprobante ──────────────────────

@inscripcion_bp.route('/<int:id_inscripcion>/comprobante', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def subir_comprobante(id_inscripcion):
    """Sube el comprobante de pago de una inscripción a Supabase Storage.

    Acepta: PDF, JPEG, PNG, WebP. Máximo 5 MB.
    El tipo MIME se verifica por **magic bytes** (contenido real del archivo),
    no por la extensión declarada por el cliente.

    Para delegados: solo pueden subir comprobante de inscripciones
    de equipos propios.
    """
    from app.utils.storage import (
        TIPOS_DOCUMENTO,
        TIPOS_IMAGEN,
        subir_archivo,
        validar_archivo,
    )

    # ── Verificar existencia de la inscripción ────────────────────
    inscripcion = inscripcion_service.obtener_inscripcion_por_id(id_inscripcion)
    if inscripcion is None:
        return api_error('NOT_FOUND', 'Inscripción no encontrada.', 404)

    # ── Verificar propiedad del delegado ──────────────────────────
    if g.usuario_rol == 'delegado':
        from app import db
        from app.models.equipo import Equipo
        equipo = db.session.get(Equipo, inscripcion.id_equipo)
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

    # ── Validar por magic bytes (PDF o imagen) ────────────────────
    try:
        mime = validar_archivo(
            archivo.stream,
            tipos_aceptados=TIPOS_DOCUMENTO | TIPOS_IMAGEN,
            max_bytes=5 * 1024 * 1024,  # 5 MB
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

    # ── Persistir la URL en la BD ─────────────────────────────────
    from app import db
    inscripcion_obj = inscripcion_service.obtener_inscripcion_por_id(id_inscripcion)
    # Acceso directo al objeto base para actualizar sin recargar relaciones
    from app.models.inscripcion import Inscripcion as InscripcionModel
    registro = db.session.get(InscripcionModel, id_inscripcion)
    registro.url_comprobante_pago = url
    db.session.commit()

    return api_response(
        data={'url_comprobante_pago': url},
        message='Comprobante subido exitosamente.',
        status=201,
    )

