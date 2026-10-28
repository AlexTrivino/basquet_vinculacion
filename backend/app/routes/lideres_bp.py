"""Ruta de los líderes estadísticos de un torneo (pública).

Es de estadísticas: queda aquí, en el código viejo, hasta que se migre ese módulo (fase 7).
"""
from flask import Blueprint, request

from app.modules.torneos.application import casos_de_uso as torneos
from app.modules.torneos.infrastructure.repositorio import RepositorioTorneos
from app.shared.http.respuestas import api_response

lideres_bp = Blueprint('lideres', __name__, url_prefix='/api/torneos')


@lideres_bp.route('/<int:id_torneo>/lideres', methods=['GET'])
def lideres_torneo(id_torneo):
    """Retorna los líderes estadísticos del torneo. Acceso público."""
    torneo = torneos.obtener(id_torneo, RepositorioTorneos())  # 'Torneo no encontrado.' (404) si no está vigente

    from app.services.lideres_service import obtener_lideres_estadisticos
    cat_param = request.args.get('id_categoria')
    id_categoria = int(cat_param) if cat_param and cat_param.isdigit() else None

    lideres = obtener_lideres_estadisticos(id_torneo, id_categoria)

    return api_response(
        data=lideres,
        message=f'Líderes estadísticos del torneo "{torneo.nombre}".',
    )
