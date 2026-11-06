"""Rutas de /api/torneos: lectura pública y escritura de super_admin. Validan la entrada y llaman a los casos de uso."""
import traceback

from flask import Blueprint, request
from marshmallow import ValidationError

from app.modules.torneos.application import casos_de_uso as casos
from app.modules.torneos.http.esquemas import (
    CategoriaCreateSchema, CategoriaPublicSchema, TorneoAdminSchema, TorneoCreateSchema, TorneoPublicSchema, TorneoUpdateSchema,
)
from app.modules.torneos.infrastructure.repositorio import RepositorioTorneos
from app.shared.domain.errores import ErrorDeDominio, ReglaDeNegocio
from app.shared.http.autenticacion import token_required
from app.shared.http.paginacion import pagina_pedida
from app.shared.http.respuestas import api_error, api_response
from app.shared.infrastructure import almacenamiento
from app.shared.infrastructure.almacenamiento import MAX_CALENDARIO_TORNEO, TIPOS_DOCUMENTO, validar_archivo
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

torneo_bp = Blueprint('torneos', __name__, url_prefix='/api/torneos')

_public_schema = TorneoPublicSchema()
_public_many = TorneoPublicSchema(many=True)
_admin_schema = TorneoAdminSchema()
_create_schema = TorneoCreateSchema()
_update_schema = TorneoUpdateSchema()


def _piezas():
    return {'repositorio': RepositorioTorneos(), 'unidad': UnidadDeTrabajo()}


@torneo_bp.route('', methods=['GET'])
def listar_torneos():
    """Torneos vigentes con paginación. Query params opcionales: ``page``, ``per_page`` y ``anio``."""
    anio_param = request.args.get('anio')
    anio = int(anio_param) if anio_param and anio_param.isdecimal() else None
    items, pagination = casos.listar(anio, *pagina_pedida(), RepositorioTorneos())
    return api_response(data=_public_many.dump(items), pagination=pagination)


@torneo_bp.route('/admin', methods=['GET'])
@token_required(allowed_roles=['super_admin'])
def listar_torneos_admin():
    """Todos los torneos, también los inactivos y anulados, con paginación (``page``, ``per_page``)."""
    items, pagination = casos.listar_todos(*pagina_pedida(), RepositorioTorneos())
    return api_response(data=_admin_schema.dump(items, many=True), pagination=pagination)


@torneo_bp.route('/disponibles-reinscripcion', methods=['GET'])
@token_required(allowed_roles=['delegado'])
def torneos_disponibles_reinscripcion():
    """Los torneos programados, que son los que aceptan inscripciones."""
    return api_response(data=_public_many.dump(casos.abiertos_a_inscripcion(RepositorioTorneos())))


@torneo_bp.route('/<int:id_torneo>', methods=['GET'])
def obtener_torneo(id_torneo):
    """Detalle público de un torneo vigente."""
    return api_response(data=_public_schema.dump(casos.obtener(id_torneo, RepositorioTorneos())))


@torneo_bp.route('', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def crear_torneo():
    """Crea un torneo con sus categorías."""
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo de la solicitud debe ser JSON válido.', 400)
    try:
        data = _create_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', 'Datos de torneo inválidos', 422, data=err.messages)
    torneo = casos.crear(data, **_piezas())
    return api_response(data=_admin_schema.dump(torneo), message='Torneo creado exitosamente.', status=201)


@torneo_bp.route('/<int:id_torneo>', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def actualizar_torneo(id_torneo):
    """Actualiza un torneo vigente."""
    piezas = _piezas()
    casos.obtener(id_torneo, piezas['repositorio'])  # el 404 va antes que la validación, como siempre
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo de la solicitud debe ser JSON válido.', 400)
    try:
        data = _update_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)
    if not data:
        return api_error('VALIDATION_ERROR', 'No se proporcionaron campos para actualizar.', 422)
    torneo = casos.actualizar(id_torneo, data, **piezas)
    return api_response(data=_admin_schema.dump(torneo), message='Torneo actualizado exitosamente.')


@torneo_bp.route('/<int:id_torneo>', methods=['DELETE'])
@token_required(allowed_roles=['super_admin'])
def eliminar_torneo(id_torneo):
    """Baja lógica: el torneo pasa a inactivo."""
    casos.dar_de_baja(id_torneo, **_piezas())
    return api_response(message='Torneo eliminado exitosamente.')


@torneo_bp.route('/<int:id_torneo>/anular', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def anular_torneo_route(id_torneo):
    """Anula un torneo vigente."""
    casos.anular(id_torneo, **_piezas())
    return api_response(message='Torneo anulado exitosamente.')


@torneo_bp.route('/<int:id_torneo>/categorias', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def agregar_categoria_route(id_torneo):
    """Agrega una categoría a un torneo vigente."""
    piezas = _piezas()
    casos.obtener(id_torneo, piezas['repositorio'])  # el 404 va antes que la validación, como siempre
    json_data = request.get_json(silent=True)
    if not json_data:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)
    try:
        data = CategoriaCreateSchema().load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', 'Datos inválidos', 422, data=err.messages)
    categoria = casos.agregar_categoria(id_torneo, data, **piezas)
    return api_response(data=CategoriaPublicSchema().dump(categoria), message='Categoría agregada exitosamente.', status=201)


@torneo_bp.route('/categorias/<int:id_categoria>', methods=['DELETE'])
@token_required(allowed_roles=['super_admin'])
def eliminar_categoria_route(id_categoria):
    """Elimina una categoría que no tenga equipos inscritos."""
    casos.eliminar_categoria(id_categoria, **_piezas())
    return api_response(message='Categoría eliminada exitosamente.')


@torneo_bp.route('/<int:id_torneo>/calendario', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def subir_calendario(id_torneo):
    """Sube el archivo del calendario (Excel o PDF) y lo asocia al torneo."""
    if 'file' not in request.files:
        return api_error('BAD_REQUEST', 'No se proporcionó ningún archivo.', 400)
    archivo = request.files['file']
    if archivo.filename == '':
        return api_error('BAD_REQUEST', 'El archivo no tiene nombre.', 400)
    piezas = _piezas()
    casos.obtener(id_torneo, piezas['repositorio'])  # el 404 va antes de validar el archivo, como siempre
    try:
        mime = validar_archivo(archivo.stream, TIPOS_DOCUMENTO, MAX_CALENDARIO_TORNEO)
        url = casos.subir_calendario(id_torneo, archivo.stream, archivo.filename, mime, almacen=almacenamiento, **piezas)
    except (ValueError, ReglaDeNegocio) as e:  # como siempre: un archivo que no sirve o unas fechas incoherentes son 400
        return api_error('BAD_REQUEST', str(e), 400)
    except ErrorDeDominio:
        raise
    except Exception:
        traceback.print_exc()
        return api_error('SERVER_ERROR', 'Error al procesar el archivo.', 500)
    return api_response(data={'url': url}, message='Calendario subido exitosamente.')
