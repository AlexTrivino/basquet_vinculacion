"""Rutas de /api/estadisticas: los totales públicos de la portada, la carga de un equipo por partido y, para el
super_admin, los flyers y el tablero. Validan la entrada y llaman a los casos de uso."""
from datetime import date

from flask import Blueprint, g, request
from marshmallow import ValidationError

from app.modules.estadisticas.application import estadisticas as casos
from app.modules.estadisticas.http.esquemas import EstadisticasBulkSchema, FiguraPublicaSchema
from app.modules.estadisticas.infrastructure.repositorio import RepositorioEstadisticas
from app.shared.domain.errores import NoEncontrado
from app.shared.http.autenticacion import token_required
from app.shared.http.respuestas import api_error, api_response
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

stats_bp = Blueprint('estadisticas', __name__, url_prefix='/api/estadisticas')

_bulk_schema = EstadisticasBulkSchema()
_figuras_schema = FiguraPublicaSchema(many=True)


@stats_bp.route('/publicas', methods=['GET'])
def estadisticas_publicas():
    """Totales de la portada, sin autenticación: los puntos de los partidos finalizados, en total y por torneo
    ({id_torneo: puntos}). Los ganados por W.O. no cuentan: su marcador es administrativo."""
    return api_response(casos.publicas(RepositorioEstadisticas()))


@stats_bp.route('/figuras', methods=['GET'])
def figuras_en_curso():
    """La figura de cada categoría de los torneos en curso hasta hoy, sin autenticación (la sección de la portada)."""
    return api_response(_figuras_schema.dump(casos.figuras_en_curso(RepositorioEstadisticas())))


@stats_bp.route('/flyers', methods=['GET'])
@token_required(allowed_roles=['super_admin'])
def datos_flyers():
    """Resultados de una fecha (``?fecha=AAAA-MM-DD``, por defecto la última jugada) y figuras del torneo para los flyers."""
    id_torneo = request.args.get('id_torneo', type=int)
    if not id_torneo:
        return api_error('VALIDATION_ERROR', 'Falta el torneo (id_torneo).', 400)
    try:
        fecha = date.fromisoformat(request.args['fecha']) if request.args.get('fecha') else None
        return api_response(casos.flyers(id_torneo, fecha, RepositorioEstadisticas()))
    except (ValueError, NoEncontrado) as e:  # como siempre: una fecha que no es fecha o un torneo que no existe son 400
        return api_error('VALIDATION_ERROR', str(e), 400)


@stats_bp.route('/dashboard', methods=['GET'])
@token_required(allowed_roles=['super_admin'])
def dashboard_stats():
    """Los contadores del panel del super_admin."""
    return api_response(casos.tablero(RepositorioEstadisticas()))


@stats_bp.route('/dashboard/actividad-reciente', methods=['GET'])
@token_required(allowed_roles=['super_admin'])
def actividad_reciente():
    """Los últimos movimientos: inscripciones y partidos finalizados."""
    return api_response(casos.actividad_reciente(RepositorioEstadisticas()))


@stats_bp.route('/bulk', methods=['POST'])
@token_required(allowed_roles=['super_admin', 'delegado'])
def ingresar_estadisticas_bulk():
    """Carga las estadísticas de todos los jugadores de un equipo en un partido (y sus sanciones); solo el super_admin.
    Cargarle números a un jugador que no está en la plantilla del equipo es 403."""
    json_data = request.get_json(silent=True)
    if json_data is None:
        return api_error('BAD_REQUEST', 'El cuerpo debe ser JSON válido.', 400)
    try:
        data = _bulk_schema.load(json_data)
    except ValidationError as err:
        return api_error('VALIDATION_ERROR', err.messages, 422)
    resultado = casos.cargar(data, g.usuario_rol, date.today(), repositorio=RepositorioEstadisticas(), unidad=UnidadDeTrabajo())
    return api_response(
        data=resultado,
        message=f"{resultado['estadisticas_insertadas']} estadísticas y {resultado['sanciones_insertadas']} sanción(es) registradas exitosamente.",
        status=201,
    )
