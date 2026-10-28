"""
Helper de paginación estructurada para queries SQLAlchemy (RNF-REN-03).

Todas las rutas GET de listado deben usar ``paginate_query()`` para
aplicar paginación obligatoria con formato estandarizado.

Uso::

    from app.shared.http.paginacion import paginate_query
    from app.shared.http.respuestas import api_response

    @bp.route('/', methods=['GET'])
    def listar_equipos():
        query = Equipo.activos()
        items, pagination = paginate_query(query)
        return api_response(
            data=[e.to_dict() for e in items],
            pagination=pagination,
        )

Los módulos leen la página con ``pagina_pedida()`` y su repositorio pagina la consulta
con ``app.shared.infrastructure.paginacion.paginar()``.
"""
from flask import request

from app.shared.infrastructure.paginacion import paginar


def paginate_query(query, max_per_page=50):
    """Aplica paginación a una query SQLAlchemy y retorna datos + metadatos.

    Lee ``page`` y ``per_page`` automáticamente de los query params
    de la petición HTTP actual.

    Args:
        query: Query de SQLAlchemy (ej. ``Equipo.activos()``).
        max_per_page: Límite máximo de registros por página (default 50).

    Returns:
        Tuple ``(items, pagination_meta)``:
            - ``items``: Lista de objetos SQLAlchemy de la página actual.
            - ``pagination_meta``: Dict con metadatos para el frontend::

                {
                    "page": 1,
                    "per_page": 20,
                    "total": 147,
                    "pages": 8
                }
    """
    return paginar(query, *pagina_pedida(max_per_page))


def pagina_pedida(max_per_page=50, por_defecto=20):
    """(page, per_page) de los query params de la petición, saneados: page desde 1 y per_page entre 1 y ``max_per_page``."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', por_defecto, type=int)
    return max(1, page), max(1, min(per_page, max_per_page))
