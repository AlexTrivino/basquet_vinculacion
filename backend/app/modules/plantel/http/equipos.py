"""Rutas de /api/equipos: lectura pública y escritura de super_admin y delegados (un delegado, solo sobre sus equipos).
Validan la entrada y llaman a los casos de uso."""
from flask import Blueprint, g, request
from marshmallow import ValidationError

from app.modules.plantel.application import equipos as casos
from app.modules.plantel.http.esquemas import EquipoAdminSchema, EquipoCreateSchema, EquipoPublicSchema, EquipoUpdateSchema
from app.modules.plantel.infrastructure.repositorio import RepositorioEquipos
from app.shared.domain.errores import ReglaDeNegocio
from app.shared.http.autenticacion import token_required
from app.shared.http.paginacion import pagina_pedida
from app.shared.http.respuestas import api_error, api_response
from app.shared.infrastructure import almacenamiento
from app.shared.infrastructure.almacenamiento import MAX_BANNER_EQUIPO, MAX_LOGO_EQUIPO, TIPOS_IMAGEN, validar_archivo
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

equipo_bp = Blueprint('equipos', __name__, url_prefix='/api/equipos')

_public_schema = EquipoPublicSchema()
_public_many = EquipoPublicSchema(many=True)
_admin_schema = EquipoAdminSchema()
_create_schema = EquipoCreateSchema()
_update_schema = EquipoUpdateSchema()
MAX_BYTES = {'logo': MAX_LOGO_EQUIPO, 'banner': MAX_BANNER_EQUIPO}


def _piezas():
    return {'repositorio': RepositorioEquipos(), 'unidad': UnidadDeTrabajo()}


@equipo_bp.route('', methods=['GET'])
def listar_equipos():
    """Equipos activos con paginación (``page``, ``per_page``)."""
    items, pagination = casos.listar(*pagina_pedida(), RepositorioEquipos())
    return api_response(data=_public_many.dump(items), pagination=pagination)


@equipo_bp.route('/<int:id_equipo>', methods=['GET'])
def obtener_equipo(id_equipo):
    """Detalle público de un equipo, también inactivo."""
    return api_response(data=_public_schema.dump(casos.obtener(id_equipo, RepositorioEquipos(), incluir_inactivos=True)))


@equipo_bp.route('', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def crear_equipo():
    """Registra un equipo a nombre de quien lo pide: el ``id_usuario`` sale del JWT, no del body."""
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo de la solicitud debe ser JSON válido.', 400)
    try:
        data = _create_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)
    equipo = casos.crear(data, g.usuario_id, **_piezas())
    return api_response(data=_admin_schema.dump(equipo), message='Equipo registrado exitosamente.', status=201)


@equipo_bp.route('/<int:id_equipo>', methods=['PUT'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def actualizar_equipo(id_equipo):
    """Cambia el nombre o el estado de un equipo activo; un delegado, solo de los suyos."""
    piezas = _piezas()
    casos.obtener(id_equipo, piezas['repositorio'])  # el 404 va antes que la validación y el permiso después, como siempre
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo de la solicitud debe ser JSON válido.', 400)
    try:
        data = _update_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)
    if not data:
        return api_error('VALIDATION_ERROR', 'No se proporcionaron campos para actualizar.', 422)
    equipo = casos.actualizar(id_equipo, data, g.usuario_id, g.usuario_rol, **piezas)
    return api_response(data=_admin_schema.dump(equipo), message='Equipo actualizado exitosamente.')


@equipo_bp.route('/<int:id_equipo>', methods=['DELETE'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def eliminar_equipo(id_equipo):
    """Baja lógica de un equipo; un delegado, solo de los suyos."""
    casos.dar_de_baja(id_equipo, g.usuario_id, g.usuario_rol, **_piezas())
    return api_response(message='Equipo eliminado exitosamente.')


@equipo_bp.route('/<int:id_equipo>/reactivar', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def reactivar_equipo_route(id_equipo):
    """Un equipo inactivo vuelve a 'activo' si su delegado no tiene otro activo."""
    casos.reactivar(id_equipo, **_piezas())
    return api_response(message='Equipo reactivado exitosamente.')


@equipo_bp.route('/admin/list', methods=['GET'])
@token_required(allowed_roles=['super_admin'])
def listar_equipos_admin_route():
    """Todos los equipos con su delegado y sus inscripciones. Filtros: ``id_torneo``, ``id_categoria``, ``search`` y ``estado``."""
    items, pagination = casos.listar_para_administrar(
        *pagina_pedida(), RepositorioEquipos(),
        id_torneo=request.args.get('id_torneo', type=int),
        id_categoria=request.args.get('id_categoria', type=int),
        search=request.args.get('search', type=str),
        estado=request.args.get('estado', type=str),
    )
    return api_response(data=_admin_schema.dump(items, many=True), pagination=pagination)


# ── Logo y banner ─────────────────────────────────────────────────

def _subir_imagen(id_equipo, tipo):
    """El archivo llega en el campo 'file' o en uno con el nombre del tipo ('logo' o 'banner')."""
    piezas = _piezas()
    casos.para_gestionar(id_equipo, g.usuario_id, g.usuario_rol, piezas['repositorio'])
    file = request.files.get('file') or request.files.get(tipo)
    if not file:
        return api_error('BAD_REQUEST', 'No se proporcionó un archivo.', 400)
    try:
        url = casos.reemplazar_imagen(
            id_equipo, tipo, file.stream, file.filename,
            lambda stream: validar_archivo(stream, TIPOS_IMAGEN, max_bytes=MAX_BYTES[tipo]),
            almacen=almacenamiento, **piezas,
        )
    except ValueError as e:
        return api_error('VALIDATION_ERROR', str(e), 422)
    except RuntimeError as e:
        return api_error('SERVER_ERROR', str(e), 500)
    except Exception:
        piezas['unidad'].revertir()
        return api_error('SERVER_ERROR', f'Error interno al subir el {tipo}.', 500)
    return api_response({'url': url}, message=f'{tipo.capitalize()} subido exitosamente.')


def _quitar_imagen(id_equipo, tipo):
    piezas = _piezas()
    casos.para_gestionar(id_equipo, g.usuario_id, g.usuario_rol, piezas['repositorio'])
    try:
        casos.quitar_imagen(id_equipo, tipo, almacen=almacenamiento, **piezas)
    except ReglaDeNegocio as e:  # como siempre: un equipo sin esa imagen es 400
        return api_error('BAD_REQUEST', str(e), 400)
    except RuntimeError as e:
        return api_error('SERVER_ERROR', str(e), 500)
    except Exception:
        piezas['unidad'].revertir()
        return api_error('SERVER_ERROR', f'Error interno al borrar el {tipo}.', 500)
    return api_response(message=f'{tipo.capitalize()} eliminado exitosamente.')


@equipo_bp.route('/<int:id_equipo>/logo', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def subir_logo_equipo(id_equipo):
    return _subir_imagen(id_equipo, 'logo')


@equipo_bp.route('/<int:id_equipo>/logo', methods=['DELETE'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def eliminar_logo_equipo(id_equipo):
    return _quitar_imagen(id_equipo, 'logo')


@equipo_bp.route('/<int:id_equipo>/banner', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def subir_banner_equipo(id_equipo):
    return _subir_imagen(id_equipo, 'banner')


@equipo_bp.route('/<int:id_equipo>/banner', methods=['DELETE'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def eliminar_banner_equipo(id_equipo):
    return _quitar_imagen(id_equipo, 'banner')
