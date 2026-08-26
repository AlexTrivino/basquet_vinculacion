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


def agregar_categoria(data):
    """Crea una nueva categoría y la asocia a un torneo.

    Args:
        data: Dict validado por schema. Debe incluir id_torneo.
    
    Returns:
        Instancia Categoria creada.
    """
    from app import db
    categoria = Categoria(**data)
    db.session.add(categoria)
    db.session.commit()
    return categoria


def eliminar_categoria(id_categoria):
    """Elimina una categoría si no tiene inscripciones asociadas.

    Raises:
        ValueError: Si la categoría ya tiene equipos inscritos.
    """
    from app import db
    from app.models.inscripcion import Inscripcion
    
    categoria = db.session.get(Categoria, id_categoria)
    if not categoria:
        return None
        
    inscripciones = db.session.query(Inscripcion).filter_by(id_categoria=id_categoria).count()
    if inscripciones > 0:
        raise ValueError("No se puede eliminar la categoría porque ya tiene equipos inscritos. Retire los equipos primero.")
        
    db.session.delete(categoria)
    db.session.commit()
    return True
