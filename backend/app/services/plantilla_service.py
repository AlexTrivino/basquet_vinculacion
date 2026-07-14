"""
Servicio de lógica de negocio para la entidad Plantilla (Decisión #10).

Contiene la lógica de negocio más crítica del sistema: la validación
completa antes de agregar un jugador a la nómina de un torneo.

Tres validaciones secuenciales en ``crear_plantilla``:
    1. El equipo debe tener una inscripción APROBADA en el torneo.
    2. El jugador debe cumplir el rango de edad de la categoría inscrita.
    3. El jugador no puede estar en dos equipos de la misma categoría dentro del torneo.
"""
from datetime import date

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app import db
from app.models.inscripcion import Inscripcion
from app.models.jugador import Jugador
from app.models.plantilla import Plantilla


# ── Utilidad de cálculo de edad ───────────────────────────────────

def calcular_edad(fecha_nacimiento: date) -> int:
    """Calcula la edad exacta en años completos a la fecha actual.

    Algoritmo: resta el año de nacimiento al año actual, luego
    descuenta 1 si el cumpleaños de este año aún no ha ocurrido.
    Esto evita el error clásico de solo restar años
    (ej. alguien nacido el 31/12 que aparentemente "ya cumplió").

    Args:
        fecha_nacimiento: Objeto ``date`` de la BD (campo del Jugador).

    Returns:
        Edad en años completos como entero.

    Example:
        >>> # Hoy es 2024-06-14, nacido el 2000-12-31
        >>> calcular_edad(date(2000, 12, 31))
        23   # El cumpleaños 2024 aún no ocurrió → 2024-2000-1 = 23
        >>> # Hoy es 2024-06-14, nacido el 2000-06-01
        >>> calcular_edad(date(2000, 6, 1))
        24   # El cumpleaños 2024 ya ocurrió → 2024-2000-0 = 24
    """
    hoy = date.today()
    return (
        hoy.year
        - fecha_nacimiento.year
        - ((hoy.month, hoy.day) < (fecha_nacimiento.month, fecha_nacimiento.day))
    )


# ── Query base con joinedload ─────────────────────────────────────

def _base_query_con_jugador():
    """Construye la query base con joinedload del jugador para evitar N+1."""
    return Plantilla.activos().options(joinedload(Plantilla.jugador))


# ── Funciones de servicio ─────────────────────────────────────────

def listar_plantilla(id_equipo=None, id_torneo=None):
    """Retorna la query de plantilla con filtros opcionales.

    Args:
        id_equipo: Filtra por equipo.
        id_torneo: Filtra por torneo.

    Returns:
        Query de SQLAlchemy lista para ``paginate_query()``.
    """
    query = _base_query_con_jugador().order_by(Plantilla.numero_camiseta)

    if id_equipo is not None:
        query = query.filter(Plantilla.id_equipo == id_equipo)

    if id_torneo is not None:
        query = query.filter(Plantilla.id_torneo == id_torneo)

    return query


def obtener_entrada_plantilla(id_plantilla):
    """Obtiene una entrada de plantilla por su ID con jugador cargado.

    Returns:
        Instancia de ``Plantilla`` o ``None``.
    """
    return (
        _base_query_con_jugador()
        .filter(Plantilla.id_plantilla == id_plantilla)
        .first()
    )


def crear_plantilla(data):
    """Agrega un jugador a la nómina de un equipo en un torneo.

    Ejecuta tres validaciones secuenciales antes de persistir:

    **Validación 1 — Inscripción aprobada:**
        El equipo debe tener una ``Inscripcion`` con
        ``estado_inscripcion='aprobado'`` en el torneo indicado.
        Si la inscripción no existe o está pendiente/rechazada,
        no se permite agregar jugadores.

    **Validación 2 — Rango de edad:**
        Calcula la edad actual del jugador usando ``calcular_edad()``
        y la compara contra ``categoria.edad_minima`` y
        ``categoria.edad_maxima`` de la inscripción del equipo.
        Rechaza con ``ValueError`` si está fuera de rango.

    **Validación 3 — Jugador no duplicado en la categoría:**
        Consulta si el jugador ya tiene una entrada activa en
        ``Plantillas`` para la MISMA categoría (en cualquier equipo).
        Previene que un jugador represente a dos equipos en la misma categoría.
        Se refuerza con ``flush()`` + ``except IntegrityError`` para
        la seguridad concurrente a nivel de BD.

    Args:
        data: Dict validado por ``PlantillaCreateSchema``.

    Returns:
        Instancia de ``Plantilla`` recién creada con jugador cargado.

    Raises:
        ValueError: Si alguna validación falla (con mensaje descriptivo).
    """
    id_jugador = data['id_jugador']
    id_equipo = data['id_equipo']
    id_torneo = data['id_torneo']

    # ── Validación 1: Inscripción válida (aprobada o pendiente) ─────────
    inscripcion = (
        Inscripcion.query
        .options(joinedload(Inscripcion.categoria))
        .filter(
            Inscripcion.id_equipo == id_equipo,
            Inscripcion.id_torneo == id_torneo,
            Inscripcion.estado_inscripcion.in_(['aprobado', 'pendiente'])
        )
        .first()
    )

    if inscripcion is None:
        raise ValueError(
            'El equipo no tiene una inscripción válida en este torneo. '
            'Solo se pueden agregar jugadores a equipos con inscripción pendiente o aprobada.'
        )

    # ── Validación 2: Rango de edad de la categoría ───────────────
    jugador = db.session.get(Jugador, id_jugador)

    if jugador is None or jugador.estado == 'inactivo':
        raise ValueError('El jugador especificado no existe o está inactivo.')

    categoria = inscripcion.categoria
    edad_actual = calcular_edad(jugador.fecha_nacimiento)

    if edad_actual < categoria.edad_minima:
        raise ValueError(
            f'El jugador tiene {edad_actual} años y no cumple la edad mínima '
            f'de {categoria.edad_minima} años para la categoría '
            f'"{categoria.nombre_categoria}".'
        )

    if categoria.edad_maxima is not None and edad_actual > categoria.edad_maxima:
        raise ValueError(
            f'El jugador tiene {edad_actual} años y supera la edad máxima '
            f'de {categoria.edad_maxima} años para la categoría '
            f'"{categoria.nombre_categoria}".'
        )

    # ── Validación 3: Jugador no duplicado en la categoría ──────────
    id_categoria_destino = inscripcion.id_categoria
    ya_en_categoria = (
        Plantilla.query
        .join(Inscripcion, db.and_(
            Inscripcion.id_equipo == Plantilla.id_equipo,
            Inscripcion.id_torneo == Plantilla.id_torneo,
            Inscripcion.estado_inscripcion.in_(['aprobado', 'pendiente'])
        ))
        .filter(
            Plantilla.id_jugador == id_jugador,
            Plantilla.id_torneo == id_torneo,
            Plantilla.estado == 'activo',
            Inscripcion.id_categoria == id_categoria_destino
        )
        .first()
    )

    if ya_en_categoria is not None:
        raise ValueError(
            'El jugador ya está inscrito en esta categoría dentro del torneo. '
            'Solo puede participar una vez por categoría.'
        )

    # ── Inserción con seguridad concurrente (flush + IntegrityError) ─
    try:
        plantilla = Plantilla(**data)
        db.session.add(plantilla)
        db.session.flush()
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ValueError(
            'No se pudo agregar al jugador por un conflicto de datos. '
            'Verifique que el jugador no esté ya registrado en esta plantilla.'
        )

    return obtener_entrada_plantilla(plantilla.id_plantilla)


def eliminar_de_plantilla(id_plantilla):
    """Soft delete: marca la entrada de plantilla como inactiva.
    El perfil del jugador se mantiene intacto (incluyendo su foto) 
    para poder ser reusado en otros equipos.

    Args:
        id_plantilla: PK de la entrada a desactivar.

    Returns:
        Instancia de ``Plantilla`` desactivada, o ``None`` si no existe.
    """
    plantilla = db.session.get(Plantilla, id_plantilla)

    if plantilla is None or plantilla.estado == 'inactivo':
        return None

    plantilla.estado = 'inactivo'
    db.session.commit()
    return plantilla
