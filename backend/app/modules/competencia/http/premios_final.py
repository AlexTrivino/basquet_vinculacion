"""Rutas de los premios de la final (el MVP y el mejor defensa), bajo /api/torneos: las usa el super_admin desde el Estudio de flyers."""
from flask import Blueprint, request

from app.modules.competencia.application import premios_final as casos
from app.modules.competencia.domain.premios import TIPOS
from app.modules.competencia.infrastructure.repositorio import RepositorioPartidos
from app.shared.http.autenticacion import token_required
from app.shared.http.respuestas import api_error, api_response
from app.shared.infrastructure import almacenamiento, imagenes
from app.shared.infrastructure.almacenamiento import MAX_FOTO_PODIO, TIPOS_IMAGEN, validar_archivo
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

premios_final_bp = Blueprint('premios_final', __name__, url_prefix='/api/torneos')

# El tipo de premio va en la ruta y solo vale uno de TIPOS: cualquier otro es un 404 de la ruta misma
RUTA = f'/categorias/<int:id_categoria>/premios-final/<any({",".join(TIPOS)}):tipo>'


def _piezas():
    return {'repositorio': RepositorioPartidos(), 'unidad': UnidadDeTrabajo()}


def _validar_foto(stream):
    return validar_archivo(stream, tipos_aceptados=TIPOS_IMAGEN, max_bytes=MAX_FOTO_PODIO)


@premios_final_bp.route('/<int:id_torneo>/premios-final', methods=['GET'])
@token_required(allowed_roles=['super_admin'])
def premios_del_torneo_route(id_torneo):
    """Las categorías del torneo con la final jugada: la final, los candidatos a cada premio y lo que ya se eligió."""
    return api_response(data=casos.premios_del_torneo(id_torneo, RepositorioPartidos()))


@premios_final_bp.route(RUTA, methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def elegir_jugador_route(id_categoria, tipo):
    """Elige al jugador del premio entre los de la final: {"id_jugador": 12}. Cambiar de jugador borra la foto."""
    json_data = request.get_json(silent=True)
    id_jugador = json_data.get('id_jugador') if isinstance(json_data, dict) else None  # si falta, no es un candidato
    premio = casos.elegir_jugador(id_categoria, tipo, id_jugador, almacen=almacenamiento, **_piezas())
    return api_response(data=premio, message='Jugador guardado.')


@premios_final_bp.route(f'{RUTA}/foto', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def subir_foto_route(id_categoria, tipo):
    """Sube la foto del premiado, o reemplaza la que tenía (multipart, campo ``foto``)."""
    archivo = request.files.get('foto')
    if not archivo:
        return api_error('BAD_REQUEST', 'No se encontró el archivo de la foto (campo "foto").', 400)
    try:
        premio = casos.subir_foto(id_categoria, tipo, archivo.stream, _validar_foto,
                                  almacen=almacenamiento, imagenes=imagenes, **_piezas())
    except ValueError as e:  # el tipo real, el peso o una imagen que no se puede leer
        return api_error('VALIDATION_ERROR', str(e), 422)
    except RuntimeError as e:  # Storage no responde
        return api_error('STORAGE_ERROR', str(e), 502)
    return api_response(data=premio, message='Foto del premio guardada.', status=201)


@premios_final_bp.route(f'{RUTA}/foto', methods=['PATCH'])
@token_required(allowed_roles=['super_admin'])
def ajustar_encuadre_route(id_categoria, tipo):
    """Cambia el encuadre de la foto sin tocar el archivo: {"foco_x": 50, "foco_y": 35, "zoom": 1.2}."""
    json_data = request.get_json(silent=True)
    if not isinstance(json_data, dict):
        json_data = {}  # cada campo que falta sale como "tiene que ser un número"
    premio = casos.ajustar_encuadre(id_categoria, tipo, json_data.get('foco_x'), json_data.get('foco_y'),
                                    json_data.get('zoom'), **_piezas())
    return api_response(data=premio, message='Encuadre guardado.')


@premios_final_bp.route(f'{RUTA}/foto', methods=['DELETE'])
@token_required(allowed_roles=['super_admin'])
def quitar_foto_route(id_categoria, tipo):
    """Quita la foto del premio y borra su archivo del bucket; el premio sigue con su jugador."""
    premio = casos.quitar_foto(id_categoria, tipo, almacen=almacenamiento, **_piezas())
    return api_response(data=premio, message='Foto del premio eliminada.')
