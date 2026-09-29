"""Rutas del rol visor: buscador de jugadores y partidos jugados (solo lectura).

Solo usuarios con rol ``visor`` o ``super_admin``. Las respuestas nunca
incluyen datos personales sensibles (ver ``visor_service``).
"""
from flask import Blueprint, request

from app.services import visor_service
from app.utils.auth_middleware import token_required
from app.utils.response import api_error, api_response

visor_bp = Blueprint('visor', __name__, url_prefix='/api/visor')
ROLES = ['visor', 'super_admin']


@visor_bp.route('/jugadores', methods=['GET'])
@token_required(allowed_roles=ROLES)
def buscar_jugadores():
    args = request.args
    filtros = {
        'q': args.get('q', '').strip() or None,
        'genero': args.get('genero') if args.get('genero') in ('masculino', 'femenino') else None,
        'id_torneo': args.get('id_torneo', type=int),
        'id_categoria': args.get('id_categoria', type=int),
        'id_equipo': args.get('id_equipo', type=int),
        'edad_min': args.get('edad_min', type=int),
        'edad_max': args.get('edad_max', type=int),
        'orden': args.get('orden'),
    }

    page = max(1, args.get('page', 1, type=int))
    per_page = max(1, min(args.get('per_page', 24, type=int), 60))
    paginado = visor_service.buscar_jugadores(filtros).paginate(page=page, per_page=per_page, error_out=False)

    return api_response(
        data=visor_service.serializar_resultados(paginado.items),
        pagination={'page': paginado.page, 'per_page': paginado.per_page, 'total': paginado.total, 'pages': paginado.pages},
    )


@visor_bp.route('/jugadores/<int:id_jugador>/partidos', methods=['GET'])
@token_required(allowed_roles=ROLES)
def partidos_jugador(id_jugador):
    datos = visor_service.partidos_de_jugador(id_jugador)
    if datos is None:
        return api_error('NOT_FOUND', 'Jugador no encontrado.', 404)
    return api_response(data=datos)
