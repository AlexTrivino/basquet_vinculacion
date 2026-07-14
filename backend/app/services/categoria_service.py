"""
Servicio de solo lectura para la entidad Categoría (Decisión #10).

Las categorías son datos estáticos gestionados por seeder.
Este módulo expone únicamente consultas de lectura para
poblar selects en el frontend y validar elegibilidad de jugadores.
"""
from app.models.categoria import Categoria


def listar_categorias(genero=None, id_torneo=None):
    """Retorna la query de todas las categorías, opcionalmente filtrada por género y torneo.

    Args:
        genero: Filtra por ``'masculino'`` o ``'femenino'``. Si es ``None``,
                retorna todas las categorías.
        id_torneo: Filtra por ID de torneo.

    Returns:
        Query de SQLAlchemy sin ejecutar, lista para ``paginate_query()``
        o para ``.all()`` si la lista completa se requiere sin paginar.
    """
    query = Categoria.query.order_by(
        Categoria.genero_categoria,
        Categoria.edad_minima,
    )

    if genero in ('masculino', 'femenino'):
        query = query.filter_by(genero_categoria=genero)

    if id_torneo is not None:
        query = query.filter_by(id_torneo=id_torneo)

    return query


def obtener_categoria_por_id(id_categoria):
    """Obtiene una categoría por su ID.

    Args:
        id_categoria: PK de la categoría.

    Returns:
        Instancia de ``Categoria`` o ``None`` si no existe.
    """
    from app import db
    return db.session.get(Categoria, id_categoria)
