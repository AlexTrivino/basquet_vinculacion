"""
Servicio de lógica de negocio para la entidad Jugador (Decisión #10).

Usa ``Jugador.activos()`` en todas las consultas de listado.
Captura ``IntegrityError`` al crear para manejar cédulas duplicadas.
"""
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.jugador import Jugador
from app.models.plantilla import Plantilla
from app.utils.text_utils import normalizar_mayusculas

class JugadorDuplicadoError(Exception):
    def __init__(self, mensaje, jugador):
        super().__init__(mensaje)
        self.jugador = jugador


def listar_jugadores_activos(genero=None):
    """Retorna la query base de jugadores activos para paginación.

    Args:
        genero: Filtra por ``'masculino'`` o ``'femenino'``. Si es ``None``,
                retorna todos.

    Returns:
        Query de SQLAlchemy sin ejecutar, lista para ``paginate_query()``.
    """
    query = Jugador.activos().order_by(Jugador.nombre)

    if genero in ('masculino', 'femenino'):
        query = query.filter_by(genero=genero)

    return query


def listar_jugadores_admin(search=None, id_torneo=None, id_equipo=None, genero=None, estado=None):
    """Retorna la query de jugadores para el panel de administración con filtros avanzados.

    Args:
        search: Término de búsqueda parcial (cédula o nombre).
        id_torneo: ID de torneo para filtrar por asignación en plantilla.
        id_equipo: ID de equipo para filtrar por asignación en plantilla.
        genero: 'masculino' o 'femenino'.
        estado: 'activo', 'inactivo' o 'todos'.

    Returns:
        Query de SQLAlchemy lista para ``paginate_query()``.
    """
    query = Jugador.query.order_by(Jugador.nombre)

    if estado in ('activo', 'inactivo'):
        query = query.filter(Jugador.estado == estado)
    elif estado != 'todos' and estado is not None:
        query = query.filter(Jugador.estado == 'activo')

    if genero in ('masculino', 'femenino'):
        query = query.filter(Jugador.genero == genero)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            db.or_(
                Jugador.nombre.ilike(search_term),
                Jugador.documento_identificacion.ilike(search_term)
            )
        )

    if id_torneo or id_equipo:
        plantilla_filters = [Plantilla.estado == 'activo']
        if id_torneo:
            plantilla_filters.append(Plantilla.id_torneo == id_torneo)
        if id_equipo:
            plantilla_filters.append(Plantilla.id_equipo == id_equipo)

        stmt = db.select(Plantilla.id_jugador).filter(*plantilla_filters)
        query = query.filter(Jugador.id_jugador.in_(stmt))

    return query


def obtener_jugador_por_id(id_jugador, incluir_inactivos=False):
    """Obtiene un jugador por su ID.

    Args:
        id_jugador: PK del jugador.
        incluir_inactivos: Si ``True``, retorna jugadores inactivos.

    Returns:
        Instancia de ``Jugador`` o ``None``.
    """
    jugador = db.session.get(Jugador, id_jugador)

    if jugador is None:
        return None

    if not incluir_inactivos and jugador.estado == 'inactivo':
        return None

    return jugador


def obtener_jugador_por_cedula(cedula: str, incluir_inactivos=False):
    """Obtiene un jugador por su documento de identificación.

    Args:
        cedula: Número de cédula/documento del jugador.
        incluir_inactivos: Si ``True``, retorna jugadores inactivos.

    Returns:
        Instancia de ``Jugador`` o ``None``.
    """
    cedula_limpia = str(cedula).strip()
    query = Jugador.query.filter_by(documento_identificacion=cedula_limpia)
    if not incluir_inactivos:
        query = query.filter_by(estado='activo')
    return query.first()


def crear_jugador(data):
    """Crea un nuevo jugador.

    Usa ``flush()`` antes del ``commit()`` para capturar violaciones
    del constraint UNIQUE en ``documento_identificacion`` con semántica
    clara (409 Conflict) en lugar de un 500 genérico.

    Args:
        data: Dict validado por ``JugadorCreateSchema``.

    Returns:
        Instancia de ``Jugador`` recién creada.

    Raises:
        ValueError: Si la nueva cédula ya está registrada.
    """
    data = normalizar_mayusculas(data, ['nombre', 'documento_identificacion', 'telefono'])
    
    try:
        jugador = Jugador(**data)
        db.session.add(jugador)
        db.session.flush()
        db.session.commit()
        return jugador
    except IntegrityError:
        db.session.rollback()
        # Buscar el jugador existente
        jugador_existente = Jugador.query.filter_by(
            documento_identificacion=data['documento_identificacion']
        ).first()
        
        raise JugadorDuplicadoError(
            'Ya existe un jugador registrado con ese número de documento.',
            jugador_existente
        )


def actualizar_jugador(jugador, data):
    """Actualiza los campos editables de un jugador.

    Args:
        jugador: Instancia de ``Jugador`` a actualizar.
        data: Dict validado por ``JugadorUpdateSchema``.

    Returns:
        Instancia de ``Jugador`` actualizada.
    """
    data = normalizar_mayusculas(data, ['nombre', 'documento_identificacion', 'telefono'])
    try:
        for key, value in data.items():
            setattr(jugador, key, value)
        db.session.flush()
        db.session.commit()
        return jugador
    except IntegrityError:
        db.session.rollback()
        jugador_existente = Jugador.query.filter_by(
            documento_identificacion=data.get('documento_identificacion')
        ).first()
        raise JugadorDuplicadoError(
            'Ya existe otro jugador registrado con ese número de documento.',
            jugador_existente
        )


def eliminar_jugador(id_jugador):
    """Soft delete: marca el jugador como inactivo.

    Args:
        id_jugador: PK del jugador a desactivar.

    Returns:
        Instancia de ``Jugador`` desactivada, o ``None`` si no existe.
    """
    jugador = db.session.get(Jugador, id_jugador)

    if jugador is None or jugador.estado == 'inactivo':
        return None

    jugador.estado = 'inactivo'
    db.session.commit()
    return jugador
