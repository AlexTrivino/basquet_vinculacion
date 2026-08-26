"""Blueprint para exponer configuración global y reglas de negocio al frontend."""
from flask import Blueprint
from app.utils.response import api_response
from app.utils.business_rules import MAX_EQUIPOS_POR_DELEGADO, MAX_JUGADORES_PLANTILLA, MIN_JUGADORES_PLANTILLA

config_bp = Blueprint('config', __name__, url_prefix='/api')

@config_bp.route('/config/reglas-negocio', methods=['GET'])
def get_reglas_negocio():
    """Devuelve las constantes y reglas de negocio configuradas en el backend."""
    return api_response(
        data={
            "MAX_EQUIPOS_POR_DELEGADO": MAX_EQUIPOS_POR_DELEGADO,
            "MAX_JUGADORES_PLANTILLA": MAX_JUGADORES_PLANTILLA,
            "MIN_JUGADORES_PLANTILLA": MIN_JUGADORES_PLANTILLA
        },
        message="Reglas de negocio obtenidas con éxito."
    )
