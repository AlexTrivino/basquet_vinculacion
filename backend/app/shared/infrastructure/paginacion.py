"""Paginación de una consulta de Flask-SQLAlchemy con los metadatos que espera el frontend."""


def paginar(query, page, per_page):
    """(filas de la página, {'page', 'per_page', 'total', 'pages'})."""
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return paginated.items, {
        'page': paginated.page,
        'per_page': paginated.per_page,
        'total': paginated.total,
        'pages': paginated.pages,
    }
