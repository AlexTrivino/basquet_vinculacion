"""Rutas de /api/categorias: lectura pública de las categorías."""
from flask import Blueprint, request

from app.modules.torneos.application import casos_de_uso as casos
from app.modules.torneos.domain.torneo import GENEROS
from app.modules.torneos.http.esquemas import CategoriaPublicSchema
from app.modules.torneos.infrastructure.repositorio import RepositorioTorneos
from app.shared.http.respuestas import api_error, api_response

categoria_bp = Blueprint('categorias', __name__, url_prefix='/api/categorias')

_public_schema = CategoriaPublicSchema()
_public_many = CategoriaPublicSchema(many=True)


@categoria_bp.route('', methods=['GET'])
def listar_categorias():
    """Todas las categorías, sin paginar porque son pocas. Query params opcionales: ``genero`` e ``id_torneo``."""
    genero = request.args.get('genero')
    id_torneo = request.args.get('id_torneo', type=int)
    if genero and genero not in GENEROS:
        return api_error('VALIDATION_ERROR', "El parámetro 'genero' debe ser 'masculino' o 'femenino'.", 422)
    return api_response(data=_public_many.dump(casos.listar_categorias(genero, id_torneo, RepositorioTorneos())))


@categoria_bp.route('/<int:id_categoria>', methods=['GET'])
def obtener_categoria(id_categoria):
    """Detalle de una categoría."""
    return api_response(data=_public_schema.dump(casos.obtener_categoria(id_categoria, RepositorioTorneos())))
