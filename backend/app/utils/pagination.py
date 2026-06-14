"""
Helper de paginación estructurada para queries SQLAlchemy (RNF-REN-03).

Todas las rutas GET de listado deben usar ``paginate_query()`` para
aplicar paginación obligatoria con formato estandarizado.

Uso::

    from app.utils.pagination import paginate_query
    from app.utils.response import api_response

    @bp.route('/', methods=['GET'])
    def listar_equipos():
        query = Equipo.activos()
        items, pagination = paginate_query(query)
        return api_response(
            data=[e.to_dict() for e in items],
            pagination=pagination,
        )
"""
from flask import request


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
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    # ── Sanitizar valores ─────────────────────────────────────────
    page = max(1, page)
    per_page = max(1, min(per_page, max_per_page))

    # ── Ejecutar paginación de SQLAlchemy ─────────────────────────
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    meta = {
        'page': paginated.page,
        'per_page': paginated.per_page,
        'total': paginated.total,
        'pages': paginated.pages,
    }

    return paginated.items, meta
