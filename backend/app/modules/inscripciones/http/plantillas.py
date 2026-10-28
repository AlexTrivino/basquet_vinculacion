"""Rutas de /api/plantillas: la nómina es pública (los datos personales, solo para el delegado del equipo y el
super_admin); la escriben super_admin y delegados, cada delegado la de sus equipos."""
from datetime import date

from flask import Blueprint, g, request
from marshmallow import ValidationError

from app.modules.inscripciones.application import plantillas as casos
from app.modules.inscripciones.domain.plantilla import ve_datos_personales
from app.modules.inscripciones.http.esquemas import (
    PlantillaAdminSchema, PlantillaCreateSchema, PlantillaPrivadaSchema, PlantillaPublicSchema, PlantillaUpdateSchema,
)
from app.modules.inscripciones.infrastructure.repositorio import RepositorioPlantillas
from app.shared.http.autenticacion import identidad_opcional, token_required
from app.shared.http.paginacion import pagina_pedida
from app.shared.http.respuestas import api_error, api_response
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

plantilla_bp = Blueprint('plantillas', __name__, url_prefix='/api/plantillas')

_public_schema = PlantillaPublicSchema()
_privada_schema = PlantillaPrivadaSchema()
_admin_schema = PlantillaAdminSchema()
_create_schema = PlantillaCreateSchema()
_update_schema = PlantillaUpdateSchema()


def _piezas():
    return {'repositorio': RepositorioPlantillas(), 'unidad': UnidadDeTrabajo()}


def _serializar(entradas):
    id_usuario, rol = identidad_opcional()
    return [(_privada_schema if ve_datos_personales(e, id_usuario, rol) else _public_schema).dump(e) for e in entradas]


def _cuerpo(schema):
    """(datos, None) o (None, la respuesta de error) con los mensajes de hoy."""
    json_data = request.get_json(silent=True)
    if json_data is None:
        return None, api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)
    try:
        return schema.load(json_data), None
    except ValidationError as err:
        return None, api_error('VALIDATION_ERROR', err.messages, 422)


@plantilla_bp.route('', methods=['GET'])
def listar_plantilla():
    """La nómina activa con paginación (hasta 200 por página). Filtros opcionales: ``id_equipo``, ``id_torneo`` e
    ``id_categoria``."""
    items, pagination = casos.listar(*pagina_pedida(max_per_page=200), RepositorioPlantillas(),
                                     id_equipo=request.args.get('id_equipo', type=int),
                                     id_torneo=request.args.get('id_torneo', type=int),
                                     id_categoria=request.args.get('id_categoria', type=int))
    return api_response(data=_serializar(items), pagination=pagination)


@plantilla_bp.route('/<int:id_plantilla>', methods=['GET'])
def obtener_entrada(id_plantilla):
    return api_response(data=_serializar([casos.obtener(id_plantilla, RepositorioPlantillas())])[0])


@plantilla_bp.route('', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def agregar_jugador():
    """Agrega un jugador a la plantilla de un equipo inscrito; un delegado, solo a sus equipos."""
    data, error = _cuerpo(_create_schema)
    if error:
        return error
    entrada = casos.agregar_jugador(data, g.usuario_id, g.usuario_rol, date.today(), **_piezas())
    return api_response(data=_admin_schema.dump(entrada), message='Jugador agregado a la plantilla exitosamente.', status=201)


@plantilla_bp.route('/<int:id_plantilla>', methods=['PATCH'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def actualizar_camiseta(id_plantilla):
    """Cambia el dorsal de una entrada; un delegado, solo en sus equipos."""
    piezas = _piezas()
    casos.para_gestionar(id_plantilla, g.usuario_id, g.usuario_rol, piezas['repositorio'])  # antes de leer el cuerpo, como siempre
    data, error = _cuerpo(_update_schema)
    if error:
        return error
    entrada = casos.cambiar_dorsal(id_plantilla, data['numero_camiseta'], **piezas)
    return api_response(data=_admin_schema.dump(entrada), message='Número de camiseta actualizado exitosamente.')


@plantilla_bp.route('/<int:id_plantilla>', methods=['DELETE'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def remover_jugador(id_plantilla):
    """Baja lógica de una entrada; un delegado, solo en sus equipos."""
    casos.remover(id_plantilla, g.usuario_id, g.usuario_rol, **_piezas())
    return api_response(message='Jugador removido de la plantilla exitosamente.')
