"""
Servicio de lógica de negocio para la entidad Jugador (Decisión #10).

Usa ``Jugador.activos()`` en todas las consultas de listado.
Captura ``IntegrityError`` al crear para manejar cédulas duplicadas.
"""
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.jugador import Jugador

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
    query = Jugador.activos().order_by(Jugador.apellidos, Jugador.nombres)

    if genero in ('masculino', 'femenino'):
        query = query.filter_by(genero=genero)

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
        ValueError: Si ya existe un jugador con la misma cédula.
    """
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
    for key, value in data.items():
        setattr(jugador, key, value)

    db.session.commit()
    return jugador


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
