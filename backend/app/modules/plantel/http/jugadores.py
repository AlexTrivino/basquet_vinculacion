"""Rutas de /api/jugadores. La lectura es pública, pero los datos personales (cédula, fecha de nacimiento, correo,
teléfono y documentos) solo llegan al super_admin o al delegado de un equipo del jugador. Escriben super_admin y delegados.
"""
from flask import Blueprint, g, request
from marshmallow import ValidationError

from app.modules.plantel.application import jugadores as casos
from app.modules.plantel.domain.jugador import CedulaRepetida
from app.modules.plantel.http.esquemas import (
    JugadorAdminSchema, JugadorCreateSchema, JugadorParaVincularSchema, JugadorPublicSchema, JugadorUpdateSchema,
)
from app.modules.plantel.infrastructure.repositorio import RepositorioJugadores
from app.shared.http.autenticacion import identidad_opcional, token_required
from app.shared.http.paginacion import pagina_pedida
from app.shared.http.respuestas import api_error, api_response
from app.shared.infrastructure import almacenamiento
from app.shared.infrastructure.almacenamiento import (
    MAX_DOCUMENTO_JUGADOR, MAX_FOTO_JUGADOR, TIPOS_IMAGEN, TIPOS_PERMITIDOS, validar_archivo,
)
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

jugador_bp = Blueprint('jugadores', __name__, url_prefix='/api/jugadores')

_public_schema = JugadorPublicSchema()
_public_many = JugadorPublicSchema(many=True)
_admin_schema = JugadorAdminSchema()
_admin_many = JugadorAdminSchema(many=True)
_vincular_schema = JugadorParaVincularSchema()
_create_schema = JugadorCreateSchema()
_update_schema = JugadorUpdateSchema()

# Documento → (tipos aceptados, tamaño máximo, mensaje al subirlo)
DOCUMENTOS = {
    'foto': (TIPOS_IMAGEN, MAX_FOTO_JUGADOR, 'Foto de jugador actualizada exitosamente.'),
    'cedula': (TIPOS_PERMITIDOS, MAX_DOCUMENTO_JUGADOR, 'Documento de cédula actualizado exitosamente.'),
    'acta': (TIPOS_PERMITIDOS, MAX_DOCUMENTO_JUGADOR, 'Acta de bachiller actualizada exitosamente.'),
}


def _piezas():
    return {'repositorio': RepositorioJugadores(), 'unidad': UnidadDeTrabajo()}


def _para_quien_pide(jugador, repositorio):
    """El jugador completo para el super_admin o su delegado; para otro delegado, lo justo para vincularlo."""
    completo = casos.ve_privados(jugador.id_jugador, g.usuario_id, g.usuario_rol, repositorio)
    return (_admin_schema if completo else _vincular_schema).dump(jugador)


@jugador_bp.route('', methods=['GET'])
def listar_jugadores():
    """Jugadores con paginación y filtros opcionales: ``genero``, ``search`` (o ``q``), ``id_torneo``, ``id_equipo``,
    ``id_categoria`` y ``estado``. El listado completo es solo para el super_admin."""
    _, rol = identidad_opcional()
    items, pagination, completo = casos.listar(
        *pagina_pedida(), rol, RepositorioJugadores(),
        search=request.args.get('search') or request.args.get('q'),
        id_torneo=request.args.get('id_torneo', type=int),
        id_equipo=request.args.get('id_equipo', type=int),
        id_categoria=request.args.get('id_categoria', type=int),
        genero=request.args.get('genero'),
        estado=request.args.get('estado'),
    )
    return api_response(data=(_admin_many if completo else _public_many).dump(items), pagination=pagination)


@jugador_bp.route('/buscar', methods=['GET'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def buscar_jugador():
    """Busca un jugador activo por su cédula (``cedula``, requerido). Con ``id_torneo`` (y ``id_categoria``, opcional)
    dice además si ya está en una plantilla activa de ese torneo. Los datos personales, solo para el super_admin o su
    delegado."""
    cedula = request.args.get('cedula', '').strip()
    if not cedula:
        return api_error('BAD_REQUEST', 'El parámetro cedula es requerido.', 400)

    repositorio = RepositorioJugadores()
    jugador = casos.buscar_por_cedula(cedula, repositorio)
    if jugador is None:
        return api_response(data=None, message='Jugador no registrado.')

    jugador_data = _para_quien_pide(jugador, repositorio)

    id_torneo = request.args.get('id_torneo')
    id_categoria_param = request.args.get('id_categoria')
    if id_torneo is not None and id_torneo.strip() != '':
        try:
            id_torneo_int = int(id_torneo)
            id_categoria_int = int(id_categoria_param) if id_categoria_param else None
            jugador_data.update(casos.en_torneo(jugador.id_jugador, id_torneo_int, id_categoria_int, RepositorioJugadores()))
        except (ValueError, TypeError):
            return api_error('BAD_REQUEST', 'El parámetro id_torneo debe ser un número entero válido.', 400)

    return api_response(data=jugador_data)


@jugador_bp.route('/<int:id_jugador>', methods=['GET'])
def obtener_jugador(id_jugador):
    """Un jugador: completo para el super_admin o su delegado (aunque esté inactivo), público para el resto."""
    jugador, completo = casos.ficha(id_jugador, *identidad_opcional(), RepositorioJugadores())
    return api_response(data=(_admin_schema if completo else _public_schema).dump(jugador))


@jugador_bp.route('', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def crear_jugador():
    """Registra un jugador. Si la cédula ya existe, 409 con el jugador que la tiene (sus datos personales, solo para
    el super_admin o su delegado)."""
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)
    try:
        data = _create_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)
    piezas = _piezas()
    try:
        jugador = casos.crear(data, **piezas)
    except CedulaRepetida as e:
        return api_error('CONFLICT', str(e), 409, data=_para_quien_pide(e.jugador, piezas['repositorio']) if e.jugador else None)
    return api_response(data=_admin_schema.dump(jugador), message='Jugador registrado exitosamente.', status=201)


@jugador_bp.route('/<int:id_jugador>', methods=['PUT'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def actualizar_jugador(id_jugador):
    """Cambia los datos de un jugador, también inactivo; un delegado, de un jugador libre o de los suyos."""
    piezas = _piezas()
    casos.para_gestionar(id_jugador, g.usuario_id, g.usuario_rol, 'No tienes permiso para modificar a este jugador.',
                         piezas['repositorio'], incluir_inactivos=True)
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)
    try:
        data = _update_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)
    if not data:
        return api_error('VALIDATION_ERROR', 'No se proporcionaron campos para actualizar.', 422)
    jugador = casos.actualizar(id_jugador, data, **piezas)
    return api_response(data=_admin_schema.dump(jugador), message='Jugador actualizado exitosamente.')


@jugador_bp.route('/<int:id_jugador>', methods=['DELETE'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def eliminar_jugador(id_jugador):
    """Baja lógica; su foto, su cédula y su acta se borran de Storage en segundo plano."""
    piezas = _piezas()
    casos.para_gestionar(id_jugador, g.usuario_id, g.usuario_rol, 'No tienes permiso para eliminar a este jugador.',
                         piezas['repositorio'])
    casos.dar_de_baja(id_jugador, almacen=almacenamiento, **piezas)
    return api_response(message='Jugador eliminado exitosamente.')


# ── Foto, cédula y acta ───────────────────────────────────────────

def _subir_documento(id_jugador, tipo):
    """El archivo llega por multipart/form-data en el campo 'archivo'."""
    tipos, max_bytes, mensaje = DOCUMENTOS[tipo]
    piezas = _piezas()
    casos.para_gestionar(id_jugador, g.usuario_id, g.usuario_rol,
                         'No tienes permiso para modificar los documentos de este jugador.', piezas['repositorio'])
    if 'archivo' not in request.files:
        return api_error('BAD_REQUEST', "No se encontró el campo 'archivo'. Usa multipart/form-data.", 400)
    archivo = request.files['archivo']
    if archivo.filename == '':
        return api_error('BAD_REQUEST', 'No se seleccionó ningún archivo.', 400)
    try:
        mime = validar_archivo(archivo.stream, tipos_aceptados=tipos, max_bytes=max_bytes)
    except ValueError as e:
        return api_error('UNSUPPORTED_MEDIA_TYPE', str(e), 415)
    try:
        jugador = casos.reemplazar_documento(id_jugador, tipo, archivo.stream, archivo.filename, mime,
                                             almacen=almacenamiento, **piezas)
    except RuntimeError as e:
        return api_error('STORAGE_ERROR', str(e), 502)
    return api_response(data=_admin_schema.dump(jugador), message=mensaje, status=201)


@jugador_bp.route('/<int:id_jugador>/foto', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def subir_foto_jugador(id_jugador):
    """Foto de perfil: JPEG, PNG o WebP de hasta 4 MB."""
    return _subir_documento(id_jugador, 'foto')


@jugador_bp.route('/<int:id_jugador>/cedula', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def subir_cedula_jugador(id_jugador):
    """Cédula: JPEG, PNG, WebP o PDF de hasta 4 MB."""
    return _subir_documento(id_jugador, 'cedula')


@jugador_bp.route('/<int:id_jugador>/acta', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def subir_acta_jugador(id_jugador):
    """Acta de bachiller: JPEG, PNG, WebP o PDF de hasta 4 MB."""
    return _subir_documento(id_jugador, 'acta')


@jugador_bp.route('/<int:id_jugador>/perfil', methods=['GET'])
def obtener_perfil_jugador(id_jugador):
    """Perfil consolidado (datos, equipos y estadísticas); sin los datos personales salvo para el super_admin o su delegado."""
    return api_response(data=casos.perfil(id_jugador, *identidad_opcional(), RepositorioJugadores()))
