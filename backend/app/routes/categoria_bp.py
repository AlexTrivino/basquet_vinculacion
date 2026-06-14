"""
Blueprint de rutas para Categorías (solo lectura).

Las categorías son datos estáticos — no existen endpoints de escritura.
Todas las rutas son públicas (sin autenticación requerida).
"""
from flask import Blueprint, request

from app.schemas.categoria_schema import CategoriaPublicSchema
from app.services import categoria_service
from app.utils.response import api_error, api_response

categoria_bp = Blueprint('categorias', __name__, url_prefix='/api/categorias')

_public_schema = CategoriaPublicSchema()
_public_many = CategoriaPublicSchema(many=True)


# ── GET /api/categorias ───────────────────────────────────────────

@categoria_bp.route('', methods=['GET'])
def listar_categorias():
    """Lista todas las categorías disponibles.

    Query param opcional: ``genero`` (``masculino`` | ``femenino``).
    Las categorías son pocas y estáticas; se devuelve la lista completa
    sin paginación para simplificar el consumo en selects del frontend.
    """
    genero = request.args.get('genero')

    if genero and genero not in ('masculino', 'femenino'):
        return api_error(
            'VALIDATION_ERROR',
            "El parámetro 'genero' debe ser 'masculino' o 'femenino'.",
            422,
        )

    categorias = categoria_service.listar_categorias(genero=genero).all()
    return api_response(data=_public_many.dump(categorias))


# ── GET /api/categorias/<id> ──────────────────────────────────────

@categoria_bp.route('/<int:id_categoria>', methods=['GET'])
def obtener_categoria(id_categoria):
    """Obtiene los detalles de una categoría por su ID."""
    categoria = categoria_service.obtener_categoria_por_id(id_categoria)
    if categoria is None:
        return api_error('NOT_FOUND', 'Categoría no encontrada.', 404)
    return api_response(data=_public_schema.dump(categoria))
