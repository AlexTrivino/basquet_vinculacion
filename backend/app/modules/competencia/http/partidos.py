"""Rutas de /api/partidos: lectura pública y escritura de super_admin. Validan la entrada y llaman a los casos de uso."""
from flask import Blueprint, current_app, request
from marshmallow import ValidationError

from app.modules.competencia.application import partidos as casos
from app.modules.competencia.http.esquemas import (
    PartidoAdminSchema, PartidoCreateSchema, PartidoPublicSchema, PartidoUpdateSchema,
)
from app.modules.competencia.infrastructure.repositorio import RepositorioPartidos
from app.shared.domain.errores import ErrorDeDominio, ReglaDeNegocio
from app.shared.http.autenticacion import token_required
from app.shared.http.paginacion import pagina_pedida
from app.shared.http.respuestas import api_error, api_response
from app.shared.infrastructure import almacenamiento
from app.shared.infrastructure.almacenamiento import MAX_COMPROBANTE, TIPOS_DOCUMENTO, validar_archivo
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

partido_bp = Blueprint('partidos', __name__, url_prefix='/api/partidos')

_public_schema = PartidoPublicSchema()
_public_many = PartidoPublicSchema(many=True)
_admin_schema = PartidoAdminSchema()
_create_schema = PartidoCreateSchema()
_update_schema = PartidoUpdateSchema()


def _piezas():
    return {'repositorio': RepositorioPartidos(), 'unidad': UnidadDeTrabajo()}


def _validar_acta(stream):
    return validar_archivo(stream, tipos_aceptados=TIPOS_DOCUMENTO, max_bytes=MAX_COMPROBANTE)


def _error_interno(error):
    """Como siempre en anular, restaurar y las actas: lo inesperado se revierte y responde 500 SERVER_ERROR."""
    UnidadDeTrabajo().revertir()
    current_app.logger.exception(f'Error en partido: {error}')
    return api_error('SERVER_ERROR', 'Error interno al procesar la operación.', 500)


@partido_bp.route('', methods=['GET'])
def listar_partidos():
    """Lista partidos con paginación y filtros opcionales.

    Query params: ``id_torneo``, ``estados``, ``id_equipo``, ``id_categoria``, ``pendientes_stats``, ``search``, ``sort_order``.
    """
    estados = request.args.get('estados')
    # La vista del torneo pide todos sus partidos de una vez (per_page=1000); con el tope general de 50,
    # el calendario se cortaba en la fecha del partido 50.
    # ponytail: tope de 1000 por torneo; si alguno lo pasa, que el frontend pida las páginas siguientes.
    items, pagination = casos.listar(
        *pagina_pedida(max_per_page=1000), RepositorioPartidos(),
        id_torneo=request.args.get('id_torneo', type=int),
        estados=estados.split(',') if estados else None,
        id_equipo=request.args.get('id_equipo', type=int),
        id_categoria=request.args.get('id_categoria', type=int),
        pendientes_stats=request.args.get('pendientes_stats', type=lambda v: v.lower() == 'true'),
        search=request.args.get('search'),
        sort_order=request.args.get('sort_order', 'asc'),
    )
    return api_response(data=_public_many.dump(items), pagination=pagination)


@partido_bp.route('/<int:id_partido>', methods=['GET'])
def obtener_partido(id_partido):
    """Obtiene los detalles de un partido por su ID."""
    return api_response(data=_public_schema.dump(casos.obtener(id_partido, RepositorioPartidos())))


@partido_bp.route('/<int:id_partido>/estadisticas', methods=['GET'])
def obtener_estadisticas_partido(id_partido):
    """Box score del partido, local y visitante, con todos los jugadores activos de cada plantilla, incluso en 0."""
    return api_response(casos.box_score(id_partido, RepositorioPartidos()))


@partido_bp.route('/<int:id_partido>/acta', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def subir_acta_partido(id_partido):
    """Sube el acta oficial (PDF) de un partido y la asocia en la BD."""
    archivo = request.files.get('acta')
    if not archivo:
        return api_error('BAD_REQUEST', 'No se encontró el archivo de acta.', 400)
    piezas = _piezas()
    casos.obtener(id_partido, piezas['repositorio'])  # el 404 va antes de tocar Storage, como siempre
    try:
        url = casos.subir_acta(id_partido, archivo.stream, archivo.filename, _validar_acta, almacen=almacenamiento, **piezas)
    except ValueError as e:
        return api_error('VALIDATION_ERROR', str(e), 422)
    except ErrorDeDominio:
        raise
    except Exception as e:
        return _error_interno(e)
    return api_response({'url': url}, message='Acta subida correctamente.')


@partido_bp.route('/<int:id_partido>/acta', methods=['DELETE'])
@token_required(allowed_roles=['super_admin'])
def eliminar_acta_partido(id_partido):
    """Elimina el acta oficial (PDF) de un partido permanentemente."""
    try:
        casos.eliminar_acta(id_partido, almacen=almacenamiento, **_piezas())
    except ReglaDeNegocio as e:
        return api_error('BAD_REQUEST', str(e), 400)
    except ErrorDeDominio:
        raise
    except Exception as e:
        return _error_interno(e)
    return api_response(None, message='Acta eliminada exitosamente.')


@partido_bp.route('', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def crear_partido():
    """Programa un nuevo partido. Verifica inscripciones aprobadas de ambos equipos."""
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)
    try:
        data = _create_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)
    partido = casos.crear(data, **_piezas())
    return api_response(data=_admin_schema.dump(partido), message='Partido programado exitosamente.', status=201)


@partido_bp.route('/<int:id_partido>', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def actualizar_partido(id_partido):
    """Actualiza logística, equipos, estado o marcadores de un partido."""
    piezas = _piezas()
    casos.obtener(id_partido, piezas['repositorio'])  # el 404 va antes que la validación, como siempre
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)
    try:
        data = _update_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)
    if not data:
        return api_error('VALIDATION_ERROR', 'No se proporcionaron campos para actualizar.', 422)
    partido = casos.actualizar(id_partido, data, **piezas)
    return api_response(data=_admin_schema.dump(partido), message='Partido actualizado exitosamente.')


@partido_bp.route('/<int:id_partido>', methods=['DELETE'])
@token_required(allowed_roles=['super_admin'])
def anular_partido(id_partido):
    """Anula un partido (soft-delete). Cambia estado a 'anulado'."""
    try:
        casos.anular(id_partido, **_piezas())
    except ErrorDeDominio:
        raise
    except Exception as e:
        return _error_interno(e)
    return api_response(None, message='Partido anulado exitosamente.')


@partido_bp.route('/<int:id_partido>/restaurar', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def restaurar_partido(id_partido):
    """Restaura un partido anulado pasándolo a 'programado'."""
    try:
        casos.restaurar(id_partido, **_piezas())
    except ErrorDeDominio:
        raise
    except Exception as e:
        return _error_interno(e)
    return api_response(None, message='Partido restaurado exitosamente.')
