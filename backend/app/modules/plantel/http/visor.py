"""Rutas del rol visor: buscador de jugadores y partidos jugados (solo lectura).

Solo usuarios con rol ``visor`` o ``super_admin``. Las respuestas nunca incluyen datos personales.
"""
from flask import Blueprint, request

from app.modules.plantel.application import jugadores as casos
from app.modules.plantel.infrastructure.repositorio import RepositorioJugadores
from app.shared.http.autenticacion import token_required
from app.shared.http.paginacion import pagina_pedida
from app.shared.http.respuestas import api_response

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
    datos, pagination = casos.buscar_para_visor(filtros, *pagina_pedida(max_per_page=60, por_defecto=24), RepositorioJugadores())
    return api_response(data=datos, pagination=pagination)


@visor_bp.route('/jugadores/<int:id_jugador>/partidos', methods=['GET'])
@token_required(allowed_roles=ROLES)
def partidos_jugador(id_jugador):
    return api_response(data=casos.partidos_del_jugador(id_jugador, RepositorioJugadores()))
