"""Rutas de la foto del ganador en el flyer del podio, bajo /api/torneos: las usa el super_admin desde el Estudio de flyers."""
from flask import Blueprint, request

from app.modules.competencia.application import fotos_podio as casos
from app.modules.competencia.infrastructure.repositorio import RepositorioPartidos
from app.shared.http.autenticacion import token_required
from app.shared.http.respuestas import api_error, api_response
from app.shared.infrastructure import almacenamiento, imagenes
from app.shared.infrastructure.almacenamiento import MAX_FOTO_PODIO, TIPOS_IMAGEN, validar_archivo
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

foto_podio_bp = Blueprint('fotos_podio', __name__, url_prefix='/api/torneos')

RUTA = '/categorias/<int:id_categoria>/podio/<int:id_equipo>/foto'


def _piezas():
    return {'repositorio': RepositorioPartidos(), 'unidad': UnidadDeTrabajo()}


def _validar_foto(stream):
    return validar_archivo(stream, tipos_aceptados=TIPOS_IMAGEN, max_bytes=MAX_FOTO_PODIO)


@foto_podio_bp.route(RUTA, methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def subir_foto_route(id_categoria, id_equipo):
    """Sube la foto del equipo en el podio de la categoría, o reemplaza la que tenía (multipart, campo ``foto``)."""
    archivo = request.files.get('foto')
    if not archivo:
        return api_error('BAD_REQUEST', 'No se encontró el archivo de la foto (campo "foto").', 400)
    try:
        foto = casos.subir_foto(id_categoria, id_equipo, archivo.stream, _validar_foto,
                                almacen=almacenamiento, imagenes=imagenes, **_piezas())
    except ValueError as e:  # el tipo real, el peso o una imagen que no se puede leer
        return api_error('VALIDATION_ERROR', str(e), 422)
    except RuntimeError as e:  # Storage no responde
        return api_error('STORAGE_ERROR', str(e), 502)
    return api_response(data=foto, message='Foto del podio guardada.', status=201)


@foto_podio_bp.route(RUTA, methods=['PATCH'])
@token_required(allowed_roles=['super_admin'])
def ajustar_encuadre_route(id_categoria, id_equipo):
    """Cambia el encuadre de la foto sin tocar el archivo: {"foco_x": 50, "foco_y": 35, "zoom": 1.2}."""
    json_data = request.get_json(silent=True)
    if not isinstance(json_data, dict):
        json_data = {}  # cada campo que falta sale como "tiene que ser un número"
    foto = casos.ajustar_encuadre(id_categoria, id_equipo, json_data.get('foco_x'), json_data.get('foco_y'),
                                  json_data.get('zoom'), **_piezas())
    return api_response(data=foto, message='Encuadre guardado.')


@foto_podio_bp.route(RUTA, methods=['DELETE'])
@token_required(allowed_roles=['super_admin'])
def quitar_foto_route(id_categoria, id_equipo):
    """Quita la foto del equipo en esa categoría y borra su archivo del bucket."""
    casos.quitar_foto(id_categoria, id_equipo, almacen=almacenamiento, **_piezas())
    return api_response(message='Foto del podio eliminada.')
