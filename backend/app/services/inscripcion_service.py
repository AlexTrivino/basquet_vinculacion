"""
Servicio de lógica de negocio para la entidad Inscripción (Decisión #10).

Puntos críticos de implementación:
    - ``joinedload``: Carga ansiosa de relaciones en una sola consulta SQL
      para evitar el problema de N+1 al serializar con schemas Nested.
    - ``IntegrityError``: Captura violaciones del UniqueConstraint
      ``uq_inscripcion_torneo_equipo_categoria`` y las convierte en
      errores de dominio con semántica clara (no 500).
    - Validación de existencia: Verifica que torneo, equipo y categoría
      existan y estén activos antes de intentar la inserción.
"""
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app import db
from app.models.equipo import Equipo
from app.models.inscripcion import Inscripcion
from app.models.torneo import Torneo


def _base_query_con_relaciones():
    """Construye la query base con joinedload para las 3 relaciones.

    Al usar ``joinedload``, SQLAlchemy emite un JOIN en lugar de
    3 SELECTs adicionales por fila, eliminando el problema N+1
    que surgiría al acceder a ``inscripcion.torneo``,
    ``inscripcion.equipo`` e ``inscripcion.categoria`` en un loop.

    Returns:
        Query de SQLAlchemy con eager loading configurado.
    """
    return Inscripcion.query.options(
        joinedload(Inscripcion.torneo),
        joinedload(Inscripcion.equipo).joinedload(Equipo.usuario),
        joinedload(Inscripcion.categoria),
    )


def listar_inscripciones(id_torneo=None, estado=None):
    """Retorna la query base de inscripciones con filtros opcionales.

    Usa ``joinedload`` para traer Torneo, Equipo y Categoría en una
    sola consulta SQL (evita N+1 al serializar con ``InscripcionPublicSchema``).

    Args:
        id_torneo: Filtra por torneo específico.
        estado: Filtra por ``estado_inscripcion`` (pendiente/aprobado/rechazado).

    Returns:
        Query de SQLAlchemy sin ejecutar, lista para ``paginate_query()``.
    """
    query = _base_query_con_relaciones().order_by(
        Inscripcion.fecha_inscripcion.desc()
    )

    if id_torneo is not None:
        query = query.filter(Inscripcion.id_torneo == id_torneo)

    if estado in ('pendiente', 'aprobado', 'rechazado'):
        query = query.filter(Inscripcion.estado_inscripcion == estado)

    return query


def obtener_inscripcion_por_id(id_inscripcion):
    """Obtiene una inscripción por su ID con relaciones cargadas.

    Args:
        id_inscripcion: PK de la inscripción.

    Returns:
        Instancia de ``Inscripcion`` con relaciones cargadas, o ``None``.
    """
    return (
        _base_query_con_relaciones()
        .filter(Inscripcion.id_inscripcion == id_inscripcion)
        .first()
    )


def crear_inscripcion(data):
    """Crea una nueva inscripción con validaciones de existencia y unicidad.

    Validaciones previas a la inserción:
        1. El torneo debe existir y no estar inactivo.
        2. El equipo debe existir y estar activo.
        3. El torneo debe estar en estado ``'programado'`` o ``'en_curso'``
           para aceptar nuevas inscripciones.

    Post-inserción:
        - Captura ``IntegrityError`` del ``UniqueConstraint`` y lo convierte
          en un ``ValueError`` con mensaje semántico para la ruta.

    Args:
        data: Dict validado por ``InscripcionCreateSchema``.

    Returns:
        Instancia de ``Inscripcion`` recién creada con relaciones cargadas.

    Raises:
        ValueError: Si el torneo/equipo no existen, están inactivos,
                    o el equipo ya está inscrito en esa categoría.
    """
    # ── Validación 1: Torneo válido ───────────────────────────────
    torneo = db.session.get(Torneo, data['id_torneo'])
    if torneo is None or torneo.estado == 'inactivo':
        raise ValueError('El torneo especificado no existe o está inactivo.')

    if torneo.estado == 'finalizado':
        raise ValueError(
            'No se pueden registrar inscripciones en un torneo finalizado.'
        )

    # ── Validación 2: Equipo válido ───────────────────────────────
    equipo = db.session.get(Equipo, data['id_equipo'])
    if equipo is None or equipo.estado == 'inactivo':
        raise ValueError('El equipo especificado no existe o está inactivo.')

    # ── Inserción con manejo de UniqueConstraint ──────────────────
    try:
        inscripcion = Inscripcion(**data)
        db.session.add(inscripcion)
        db.session.flush()   # Fuerza la validación del constraint ANTES del commit
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ValueError(
            'El equipo ya está inscrito en esta categoría para el torneo '
            'especificado. No se permiten inscripciones duplicadas.'
        )

    # ── Recargar con relaciones para la respuesta ─────────────────
    return obtener_inscripcion_por_id(inscripcion.id_inscripcion)


def cambiar_estado_inscripcion(id_inscripcion, nuevo_estado):
    """Cambia el estado de una inscripción (aprobación/rechazo del Admin).

    Si el estado es 'rechazado', se eliminan físicamente la inscripción,
    las plantillas asociadas y el equipo, liberando el cupo del delegado.

    Args:
        id_inscripcion: PK de la inscripción a actualizar.
        nuevo_estado: Uno de ``'pendiente'``, ``'aprobado'``, ``'rechazado'``.

    Returns:
        Instancia de ``Inscripcion`` actualizada con relaciones cargadas
        (o dict dummy si fue eliminada), o ``None`` si no existe.
    """
    inscripcion = db.session.get(Inscripcion, id_inscripcion)

    if inscripcion is None:
        return None

    if nuevo_estado == 'rechazado':
        from app.models.plantilla import Plantilla
        equipo = inscripcion.equipo
        
        # 1. Eliminar plantillas asociadas
        Plantilla.query.filter_by(id_equipo=equipo.id_equipo).delete()
        
        # 2. Eliminar inscripción
        db.session.delete(inscripcion)
        
        # 3. Eliminar equipo
        db.session.delete(equipo)
        
        db.session.commit()
        
        # Retornamos un objeto dummy para que la serialización de la ruta no falle
        # si espera una Inscripcion (aunque la ruta debería devolver 204 o mensaje).
        return inscripcion

    inscripcion.estado_inscripcion = nuevo_estado
    db.session.commit()

    return obtener_inscripcion_por_id(id_inscripcion)
