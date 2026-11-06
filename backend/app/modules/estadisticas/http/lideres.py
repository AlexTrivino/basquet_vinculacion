"""Ruta pública de los líderes estadísticos de un torneo: /api/torneos/<id>/lideres."""
from flask import Blueprint, request

from app.modules.estadisticas.application import estadisticas as casos
from app.modules.estadisticas.infrastructure.repositorio import RepositorioEstadisticas
from app.shared.http.respuestas import api_response

lideres_bp = Blueprint('lideres', __name__, url_prefix='/api/torneos')


@lideres_bp.route('/<int:id_torneo>/lideres', methods=['GET'])
def lideres_torneo(id_torneo):
    """Los primeros de cada rubro en un torneo vigente ('Torneo no encontrado.' si no), en ``id_categoria`` o en todas."""
    cat_param = request.args.get('id_categoria')
    id_categoria = int(cat_param) if cat_param and cat_param.isdecimal() else None
    nombre, lideres = casos.lideres(id_torneo, id_categoria, RepositorioEstadisticas())
    return api_response(data=lideres, message=f'Líderes estadísticos del torneo "{nombre}".')
