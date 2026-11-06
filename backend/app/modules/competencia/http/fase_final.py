"""Rutas de la tabla de posiciones y la fase final bajo /api/torneos (antes en torneo_bp): formato, grupos, llaves y recorrido."""
from flask import Blueprint, request
from marshmallow import ValidationError

from app.modules.competencia.application import fase_final as casos
from app.modules.competencia.domain.llaves import FORMATOS
from app.modules.competencia.http.esquemas import LlaveProgramadaSchema, PartidoPublicSchema
from app.modules.competencia.infrastructure.repositorio import RepositorioPartidos
from app.shared.domain.errores import Conflicto, ReglaDeNegocio
from app.shared.http.autenticacion import token_required
from app.shared.http.respuestas import api_error, api_response
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

competencia_bp = Blueprint('competencia', __name__, url_prefix='/api/torneos')


def _id_categoria_param():
    valor = request.args.get('id_categoria', '')
    return int(valor) if valor.isdecimal() else None


@competencia_bp.route('/<int:id_torneo>/posiciones', methods=['GET'])
def tabla_de_posiciones(id_torneo):
    """Tabla de posiciones del torneo (pública); con ``id_categoria``, una por grupo si la categoría los tiene."""
    repositorio = RepositorioPartidos()
    nombre = casos.nombre_del_torneo(id_torneo, repositorio)  # el 404 va antes de leer la categoría, como siempre
    posiciones = casos.tabla_de_posiciones(id_torneo, _id_categoria_param(), repositorio)
    return api_response(data=posiciones, message=f'Tabla de posiciones del torneo "{nombre}".')


@competencia_bp.route('/<int:id_torneo>/fase-final', methods=['GET'])
def fase_final_route(id_torneo):
    """Estado del cuadro de llaves de una categoría: formato, grupos y cada llave con su partido."""
    repositorio = RepositorioPartidos()
    categoria = casos.categoria_del_torneo(id_torneo, _id_categoria_param(), repositorio)
    return api_response(data=casos.estado(categoria, repositorio))


@competencia_bp.route('/<int:id_torneo>/recorrido', methods=['GET'])
def recorrido_route(id_torneo):
    """Posición de cada equipo después de cada fecha de la fase de grupos y su situación."""
    repositorio = RepositorioPartidos()
    categoria = casos.categoria_del_torneo(id_torneo, _id_categoria_param(), repositorio)
    return api_response(data=casos.recorrido(categoria, repositorio))


@competencia_bp.route('/categorias/<int:id_categoria>/formato', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def formato_categoria_route(id_categoria):
    """Guarda el formato de la fase final de la categoría (o null para quitarlo)."""
    repositorio = RepositorioPartidos()
    categoria = casos.buscar_categoria(id_categoria, repositorio)
    json_data = request.get_json(silent=True) or {}
    try:
        categoria = casos.guardar_formato(categoria, json_data.get('formato'), repositorio=repositorio, unidad=UnidadDeTrabajo())
    except ReglaDeNegocio as e:
        return api_error('VALIDATION_ERROR', str(e), 422, data={'formatos': list(FORMATOS)})
    return api_response(data={'id_categoria': categoria.id_categoria, 'formato': categoria.formato}, message='Formato guardado.')


@competencia_bp.route('/<int:id_torneo>/grupos', methods=['PUT'])
@token_required(allowed_roles=['super_admin'])
def grupos_route(id_torneo):
    """Asigna el grupo de cada equipo inscrito: {"id_categoria": 3, "grupos": {"19": "A", "20": "B"}}."""
    repositorio = RepositorioPartidos()
    json_data = request.get_json(silent=True) or {}
    categoria = casos.categoria_del_torneo(id_torneo, json_data.get('id_categoria'), repositorio)
    asignados = casos.asignar_grupos(categoria, json_data.get('grupos'), repositorio=repositorio, unidad=UnidadDeTrabajo())
    return api_response(data={'grupos': {str(k): v for k, v in asignados.items()}}, message='Grupos guardados.')


@competencia_bp.route('/<int:id_torneo>/fase-final/partidos', methods=['POST'])
@token_required(allowed_roles=['super_admin'])
def generar_llaves_route(id_torneo):
    """Crea los partidos de las llaves listas: {"id_categoria": 3, "partidos": [{"llave": "CF1", "fecha": "2026-10-17", "hora": "19:00"}]}."""
    repositorio = RepositorioPartidos()
    json_data = request.get_json(silent=True) or {}
    categoria = casos.categoria_del_torneo(id_torneo, json_data.get('id_categoria'), repositorio)
    try:
        programacion = LlaveProgramadaSchema(many=True).load(json_data.get('partidos') or [])
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', 'Datos inválidos', 422, data=err.messages)
    if not programacion:
        return api_error('VALIDATION_ERROR', 'No hay llaves para programar.', 422)
    try:
        creados = casos.generar_llaves(categoria, programacion, repositorio=repositorio, unidad=UnidadDeTrabajo())
    except (ReglaDeNegocio, Conflicto) as e:
        return api_error('CONFLICT', str(e), 409)  # como siempre: cualquier error de una llave responde 409
    return api_response(
        data=PartidoPublicSchema(many=True).dump(creados),
        message=f'{len(creados)} partido(s) de fase final creados.',
        status=201,
    )
