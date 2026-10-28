"""Rutas de /api/patrocinadores: validan la entrada, arman las piezas y llaman a los casos de uso."""
from flask import Blueprint, request
from marshmallow import ValidationError

from app.modules.auspicios.application import casos_de_uso as casos
from app.modules.auspicios.http.esquemas import patrocinador_schema, patrocinadores_schema
from app.modules.auspicios.infrastructure.repositorio import RepositorioPatrocinadores
from app.shared.http.autenticacion import token_required
from app.shared.http.respuestas import api_error, api_response
from app.shared.infrastructure import almacenamiento
from app.shared.infrastructure.almacenamiento import MAX_LOGO_PATROCINADOR, TIPOS_IMAGEN, validar_archivo
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

patrocinador_bp = Blueprint('patrocinadores', __name__, url_prefix='/api/patrocinadores')


def _piezas():
    return {'repositorio': RepositorioPatrocinadores(), 'almacen': almacenamiento, 'unidad': UnidadDeTrabajo()}


def _datos_del_formulario():
    """(datos, None) o (None, respuesta 422)."""
    try:
        return patrocinador_schema.load(request.form), None
    except ValidationError as err:
        return None, api_error('VALIDATION_ERROR', 'Datos inválidos', status=422, data=err.messages)


def _logo(archivo):
    """((stream, nombre, mime), None) o (None, respuesta 400) si el archivo no es una imagen permitida."""
    try:
        return (archivo.stream, archivo.filename, validar_archivo(archivo.stream, TIPOS_IMAGEN, MAX_LOGO_PATROCINADOR)), None
    except ValueError as e:
        return None, api_error('INVALID_FILE', str(e), status=400)


@patrocinador_bp.route('', methods=['GET'])
def get_patrocinadores():
    """Lista de patrocinadores (público)."""
    return api_response(data=patrocinadores_schema.dump(casos.listar(RepositorioPatrocinadores())))


@patrocinador_bp.route('', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def create_patrocinador():
    """Crea un patrocinador con su logo (formulario multipart)."""
    datos, error = _datos_del_formulario()
    if error:
        return error
    archivo_logo = request.files.get('logo')
    if not archivo_logo or not archivo_logo.filename:
        return api_error('MISSING_FILE', 'El archivo del logo es obligatorio.', status=422)
    logo, error = _logo(archivo_logo)
    if error:
        return error
    try:
        nuevo = casos.crear(datos, logo, **_piezas())
    except casos.NoSeGuardo:
        return api_error('DB_ERROR', 'Error al guardar el patrocinador en la base de datos.', status=500)
    return api_response(message='Patrocinador creado exitosamente.', data=patrocinador_schema.dump(nuevo), status=201)


@patrocinador_bp.route('/<int:id_patrocinador>', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def update_patrocinador(id_patrocinador):
    """Actualiza un patrocinador; el logo es opcional."""
    piezas = _piezas()
    casos.obtener(id_patrocinador, piezas['repositorio'])  # el 404 va antes que la validación, como siempre
    datos, error = _datos_del_formulario()
    if error:
        return error
    logo = None
    archivo_logo = request.files.get('logo')
    if archivo_logo and archivo_logo.filename:
        logo, error = _logo(archivo_logo)
        if error:
            return error
    try:
        patrocinador = casos.actualizar(id_patrocinador, datos, logo, **piezas)
    except casos.NoSeGuardo:
        return api_error('DB_ERROR', 'Error al actualizar el patrocinador en la base de datos.', status=500)
    return api_response(message='Patrocinador actualizado exitosamente.', data=patrocinador_schema.dump(patrocinador))


@patrocinador_bp.route('/<int:id_patrocinador>', methods=['DELETE'])
@token_required(allowed_roles=['super_admin'])
def delete_patrocinador(id_patrocinador):
    """Elimina un patrocinador y, si la base confirma, su logo."""
    try:
        casos.eliminar(id_patrocinador, **_piezas())
    except casos.NoSeGuardo:
        return api_error('DB_ERROR', 'Error al eliminar el patrocinador de la base de datos.', status=500)
    return api_response(message='Patrocinador eliminado exitosamente.')
