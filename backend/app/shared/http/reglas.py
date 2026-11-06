"""GET /api/config/reglas-negocio: las reglas de app/shared/domain/reglas.py para el frontend (useBusinessRules)."""
from flask import Blueprint

from app.shared.domain.reglas import MAX_EQUIPOS_POR_DELEGADO, MAX_JUGADORES_PLANTILLA, MIN_JUGADORES_PLANTILLA
from app.shared.http.respuestas import api_response

config_bp = Blueprint('config', __name__, url_prefix='/api')


@config_bp.route('/config/reglas-negocio', methods=['GET'])
def get_reglas_negocio():
    return api_response(
        data={
            'MAX_EQUIPOS_POR_DELEGADO': MAX_EQUIPOS_POR_DELEGADO,
            'MAX_JUGADORES_PLANTILLA': MAX_JUGADORES_PLANTILLA,
            'MIN_JUGADORES_PLANTILLA': MIN_JUGADORES_PLANTILLA,
        },
        message='Reglas de negocio obtenidas con éxito.',
    )
