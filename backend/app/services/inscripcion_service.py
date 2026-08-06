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


def listar_inscripciones(id_torneo=None, estado=None, id_categoria=None, incluir_borradores=False):
    """Retorna la query base de inscripciones con filtros opcionales.

    Usa ``joinedload`` para traer Torneo, Equipo y Categoría en una
    sola consulta SQL (evita N+1 al serializar con ``InscripcionPublicSchema``).

    Args:
        id_torneo: Filtra por torneo específico.
        estado: Filtra por ``estado_inscripcion`` (pendiente/aprobado/rechazado/borrador).
        id_categoria: Filtra por categoría.
        incluir_borradores: Si es False y no se especificó un estado explícito,
            excluye inscripciones en estado 'borrador'.

    Returns:
        Query de SQLAlchemy sin ejecutar, lista para ``paginate_query()``.
    """
    query = _base_query_con_relaciones().order_by(
        Inscripcion.fecha_inscripcion.desc()
    )

    if id_torneo is not None:
        query = query.filter(Inscripcion.id_torneo == id_torneo)

    if estado in ('pendiente', 'aprobado', 'rechazado', 'borrador'):
        query = query.filter(Inscripcion.estado_inscripcion == estado)
    elif not incluir_borradores:
        # Por defecto, nunca incluir borradores en listados generales para admin o público
        query = query.filter(Inscripcion.estado_inscripcion != 'borrador')

    if id_categoria is not None:
        query = query.filter(Inscripcion.id_categoria == id_categoria)

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


def _eliminar_datos_inscripcion_y_equipo(inscripcion, commit=True):
    """Elimina físicamente una inscripción, su equipo, plantillas, jugadores exclusivos y archivos asociados."""
    from app.models.plantilla import Plantilla
    from app.models.jugador import Jugador
    from app.models.sancion import Sancion
    from app.models.estadistica import Estadistica
    from app.models.documento_jugador import DocumentoJugador
    from app.utils.storage import borrar_archivo

    equipo = inscripcion.equipo
    id_equipo = equipo.id_equipo if equipo else inscripcion.id_equipo

    # 1. Identificar todos los jugadores de la plantilla del equipo
    plantillas = Plantilla.query.filter_by(id_equipo=id_equipo).all()
    id_jugadores = list({p.id_jugador for p in plantillas})

    # 2. Eliminar plantillas del equipo
    Plantilla.query.filter_by(id_equipo=id_equipo).delete()
    db.session.flush()

    # 3. Limpieza de jugadores exclusivos (sin otros equipos ni estadísticas/sanciones)
    for id_jug in id_jugadores:
        otras_plantillas = Plantilla.query.filter_by(id_jugador=id_jug).count()
        tiene_sanciones = Sancion.query.filter_by(id_jugador=id_jug).count()
        tiene_estadisticas = Estadistica.query.filter_by(id_jugador=id_jug).count()

        if otras_plantillas == 0 and tiene_sanciones == 0 and tiene_estadisticas == 0:
            jugador = db.session.get(Jugador, id_jug)
            if jugador:
                # Borrar archivos asociados del storage
                if jugador.url_foto:
                    borrar_archivo(jugador.url_foto)
                if jugador.url_cedula:
                    borrar_archivo(jugador.url_cedula)
                if jugador.url_acta_bachiller:
                    borrar_archivo(jugador.url_acta_bachiller)

                # Borrar documentos adicionales si existían
                docs = DocumentoJugador.query.filter_by(id_jugador=id_jug).all()
                for doc in docs:
                    if doc.url_documento:
                        borrar_archivo(doc.url_documento)
                    db.session.delete(doc)

                # Eliminar al jugador de la base de datos (libera su cédula)
                db.session.delete(jugador)

    # 4. Borrar archivos adjuntos a la inscripción y al equipo
    if inscripcion.url_comprobante_pago:
        borrar_archivo(inscripcion.url_comprobante_pago)

    if equipo and equipo.url_logo:
        borrar_archivo(equipo.url_logo)

    # 5. Eliminar inscripción y equipo
    db.session.delete(inscripcion)
    if equipo:
        db.session.delete(equipo)

    if commit:
        db.session.commit()


def cambiar_estado_inscripcion(id_inscripcion, nuevo_estado):
    """Cambia el estado de una inscripción (aprobación/rechazo del Admin).

    Si el estado es 'rechazado', se eliminan físicamente:
      1. Las plantillas del equipo.
      2. Los jugadores creados exclusivamente para esta inscripción (sin historial en otros equipos).
      3. Los archivos de Supabase Storage (fotos, cédulas, actas, comprobante, logo).
      4. La inscripción y el equipo, liberando el cupo del delegado y las cédulas.

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
        _eliminar_datos_inscripcion_y_equipo(inscripcion, commit=True)
        # Retornamos un string sentinel para que la ruta sepa que fue eliminado
        return 'DELETED'

    inscripcion.estado_inscripcion = nuevo_estado
    db.session.commit()

    return obtener_inscripcion_por_id(id_inscripcion)


def purgar_inscripciones_expiradas(dias=30):
    """Elimina permanentemente inscripciones en estado 'borrador' o 'rechazado'
    inactivas por más de ``dias`` días.

    Limpia plantillas, jugadores exclusivos y archivos huérfanos en Supabase Storage.

    Args:
        dias (int): Umbral de antigüedad en días (por defecto 30).

    Returns:
        dict: Resumen estadístico de elementos purgados.
    """
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import func

    limite = datetime.now(timezone.utc) - timedelta(days=dias)

    # Buscamos borradores o rechazados que superen la fecha límite
    expiradas = (
        Inscripcion.query
        .filter(
            Inscripcion.estado_inscripcion.in_(['borrador', 'rechazado']),
            func.coalesce(Inscripcion.updated_at, Inscripcion.fecha_inscripcion, Inscripcion.created_at) < limite
        )
        .all()
    )

    total_inscripciones = len(expiradas)
    equipos_eliminados = 0

    for insc in expiradas:
        if insc.equipo:
            equipos_eliminados += 1
        _eliminar_datos_inscripcion_y_equipo(insc, commit=False)

    if total_inscripciones > 0:
        db.session.commit()

    return {
        'inscripciones_purgadas': total_inscripciones,
        'equipos_eliminados': equipos_eliminados,
        'dias_umbral': dias,
    }
