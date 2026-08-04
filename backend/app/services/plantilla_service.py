"""
Servicio de lógica de negocio para la entidad Plantilla (Decisión #10).

Contiene la lógica de negocio más crítica del sistema: la validación
completa antes de agregar un jugador a la nómina de un torneo.

Cuatro validaciones secuenciales en ``crear_plantilla``:
    1. El equipo debe tener una inscripción APROBADA en el torneo.
    2. El jugador debe cumplir el rango de edad de la categoría inscrita.
    3. El jugador no puede estar en dos equipos de la misma categoría dentro del torneo.
    4. El número de camiseta no puede repetirse dentro del mismo equipo en el mismo torneo.
"""
from datetime import date

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app import db
from app.models.inscripcion import Inscripcion
from app.models.jugador import Jugador
from app.models.plantilla import Plantilla


# ── Constantes de Reglas de Negocio ───────────────────────────────
MIN_JUGADORES_PLANTILLA = 10
MAX_JUGADORES_PLANTILLA = 18


# ── Utilidad de cálculo de edad ───────────────────────────────────

def calcular_edad(fecha_nacimiento: date) -> int:
    """Calcula la edad deportiva basada en el año natural (año calendario).

    Reglamento deportivo: La edad de los jugadores se calcula directamente
    restando el año de nacimiento al año en curso, sin importar el día o mes.
    (Ej. alguien nacido el 01/01/2000 y alguien nacido el 31/12/2000 en el año 2026
    tienen ambos 26 años).

    Args:
        fecha_nacimiento: Objeto ``date`` de la BD (campo del Jugador).

    Returns:
        Edad en años basada en el año natural como entero.
    """
    hoy = date.today()
    return hoy.year - fecha_nacimiento.year


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

    Ejecuta cinco validaciones secuenciales antes de persistir:

    **Validación 1 — Inscripción aprobada:**
        El equipo debe tener una ``Inscripcion`` con
        ``estado_inscripcion='aprobado'`` en el torneo indicado.
        Si la inscripción no existe, está pendiente o fue rechazada,
        no se permite agregar jugadores.

    **Validación 2 — Límite máximo de jugadores:**
        El equipo no puede tener más de ``MAX_JUGADORES_PLANTILLA`` (18)
        jugadores activos registrados en el torneo.

    **Validación 3 — Rango de edad:**
        Calcula la edad actual del jugador usando ``calcular_edad()``
        y la compara contra ``categoria.edad_minima`` y
        ``categoria.edad_maxima`` de la inscripción del equipo.
        Rechaza con ``ValueError`` si está fuera de rango.

    **Validación 4 — Jugador no duplicado en la categoría:**
        Consulta si el jugador ya tiene una entrada activa en
        ``Plantillas`` para la MISMA categoría (en cualquier equipo).
        Previene que un jugador represente a dos equipos en la misma categoría.

    **Validación 5 — Número de camiseta único en el equipo:**
        Verifica que ningún jugador activo en el mismo equipo/torneo
        tenga ya el mismo ``numero_camiseta``. Se omite si el campo
        viene como ``None`` (camiseta opcional).

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

    # ── Validación 1: Inscripción activa o en proceso ───────────────────
    inscripcion = (
        Inscripcion.query
        .options(joinedload(Inscripcion.categoria))
        .filter(
            Inscripcion.id_equipo == id_equipo,
            Inscripcion.id_torneo == id_torneo,
            Inscripcion.estado_inscripcion.in_(['borrador', 'pendiente', 'aprobado'])
        )
        .first()
    )

    if inscripcion is None:
        raise ValueError(
            'El equipo no tiene una inscripción válida o en proceso para este torneo. '
            'No se pueden agregar jugadores si la inscripción fue rechazada o no existe.'
        )

    # ── Validación 2: Límite máximo de jugadores en plantilla ────────
    total_jugadores = (
        Plantilla.query
        .filter_by(
            id_equipo=id_equipo,
            id_torneo=id_torneo,
            estado='activo'
        )
        .count()
    )

    if total_jugadores >= MAX_JUGADORES_PLANTILLA:
        raise ValueError(
            f'El equipo ya ha alcanzado el límite máximo permitido de '
            f'{MAX_JUGADORES_PLANTILLA} jugadores en la plantilla.'
        )

    # ── Validación 3: Rango de edad de la categoría ───────────────
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
            Inscripcion.estado_inscripcion == 'aprobado'
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

    # ── Validación 4: Número de camiseta único en el equipo ───────
    numero_camiseta = data.get('numero_camiseta')
    if numero_camiseta is not None:
        camiseta_ocupada = (
            Plantilla.query
            .filter_by(
                id_equipo=id_equipo,
                id_torneo=id_torneo,
                numero_camiseta=numero_camiseta,
                estado='activo'
            )
            .first()
        )
        if camiseta_ocupada is not None:
            raise ValueError(
                f'El número de camiseta {numero_camiseta} ya está en uso '
                'por otro jugador de este equipo en este torneo.'
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


def verificar_jugador_en_torneo(id_jugador: int, id_torneo: int) -> dict:
    """Verifica si un jugador ya está registrado en alguna plantilla activa del torneo.

    Args:
        id_jugador: PK del jugador a consultar.
        id_torneo: PK del torneo a consultar.

    Returns:
        Dict con ``ya_en_torneo`` (bool), ``equipo_torneo`` (str o None), e ``id_equipo`` (int o None).
    """
    entrada = (
        Plantilla.activos()
        .options(joinedload(Plantilla.equipo))
        .filter(
            Plantilla.id_jugador == id_jugador,
            Plantilla.id_torneo == id_torneo,
        )
        .first()
    )

    if entrada and entrada.equipo:
        return {
            'ya_en_torneo': True,
            'equipo_torneo': entrada.equipo.nombre_equipo,
            'id_equipo': entrada.id_equipo,
        }

    return {
        'ya_en_torneo': False,
        'equipo_torneo': None,
        'id_equipo': None,
    }


def actualizar_numero_camiseta(id_plantilla: int, numero_camiseta: int):
    """Actualiza el número de camiseta de un jugador en la plantilla.

    Verifica que el número no esté ya en uso por otro jugador del mismo
    equipo en el mismo torneo.

    Args:
        id_plantilla: PK de la entrada de plantilla a actualizar.
        numero_camiseta: Nuevo número de camiseta (0-99).

    Returns:
        Instancia de ``Plantilla`` actualizada con jugador cargado,
        o ``None`` si la entrada no existe o está inactiva.

    Raises:
        ValueError: Si el número de camiseta ya está ocupado por otro jugador.
    """
    plantilla = db.session.get(Plantilla, id_plantilla)
    if plantilla is None or plantilla.estado == 'inactivo':
        return None

    if numero_camiseta is not None:
        camiseta_ocupada = (
            Plantilla.activos()
            .filter(
                Plantilla.id_equipo == plantilla.id_equipo,
                Plantilla.id_torneo == plantilla.id_torneo,
                Plantilla.numero_camiseta == numero_camiseta,
                Plantilla.id_plantilla != id_plantilla,
            )
            .first()
        )
        if camiseta_ocupada is not None:
            raise ValueError(
                f'El número de camiseta {numero_camiseta} ya está en uso '
                'por otro jugador de este equipo en este torneo.'
            )

    plantilla.numero_camiseta = numero_camiseta
    db.session.commit()

    return obtener_entrada_plantilla(id_plantilla)

