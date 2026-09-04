"""
Servicio de lógica de negocio para la entidad Partido (Decisión #10).

Responsabilidad: CRUD de partidos y verificación de elegibilidad de equipos.
El recálculo de posiciones es delegado a ``services/standings.py``
siguiendo el principio de Responsabilidad Única.

Nota técnica sobre joinedload con dos FKs al mismo modelo:
    ``Partido`` tiene ``id_equipo_local`` e ``id_equipo_visitante``,
    ambas apuntando a ``Equipos``. SQLAlchemy distingue las relaciones
    por ``foreign_keys``, y ``joinedload`` resuelve cada una con su propio
    alias de JOIN. El resultado es una sola consulta SQL con dos LEFT JOINs
    a la tabla ``equipos``, eliminando las 3 consultas adicionales que
    dispararía el acceso lazy a ``partido.equipo_local``,
    ``partido.equipo_visitante`` y ``partido.torneo`` en el serializer.
"""
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload
from sqlalchemy import or_

from app import db
from app.models.inscripcion import Inscripcion
from app.models.partido import Partido


# ── Query base con eager loading ──────────────────────────────────

def _base_query_con_relaciones():
    """Construye la query base con joinedload para torneo y ambos equipos.

    SQLAlchemy genera SQL equivalente a::

        SELECT partidos.*, t.*, el.*, ev.*
        FROM partidos
        LEFT JOIN torneos t ON t.id_torneo = partidos.id_torneo
        LEFT JOIN equipos el ON el.id_equipo = partidos.id_equipo_local
        LEFT JOIN equipos ev ON ev.id_equipo = partidos.id_equipo_visitante

    Los alias ``el`` y ``ev`` son gestionados automáticamente por
    SQLAlchemy gracias al ``foreign_keys`` en la definición del modelo.

    Returns:
        Query de SQLAlchemy con eager loading configurado.
    """
    return Partido.query.options(
        joinedload(Partido.torneo),
        joinedload(Partido.categoria),
        joinedload(Partido.equipo_local),
        joinedload(Partido.equipo_visitante),
    )


# ── Funciones de servicio ─────────────────────────────────────────

def listar_partidos(id_torneo=None, estados=None, id_equipo=None, id_categoria=None, pendientes_stats=None, search=None, sort_order='asc'):
    """Retorna la query de partidos con filtros opcionales para paginación.

    Args:
        id_torneo: Filtra por torneo.
        estados: Lista de estados para filtrar.
        id_equipo: Filtra partidos donde el equipo sea local o visitante.
        id_categoria: Filtra por categoría.
        pendientes_stats: Filtra partidos finalizados sin estadísticas procesadas.
        search: Busca por nombre de torneo o equipos.
        sort_order: 'asc' o 'desc' por fecha y hora.

    Returns:
        Query de SQLAlchemy lista para ``paginate_query()``.
    """
    from sqlalchemy import desc
    from app.models.equipo import Equipo
    from app.models.torneo import Torneo

    query = _base_query_con_relaciones()

    if sort_order == 'desc':
        query = query.order_by(desc(Partido.fecha), desc(Partido.hora))
    else:
        query = query.order_by(Partido.fecha, Partido.hora)

    if id_torneo is not None:
        query = query.filter(Partido.id_torneo == id_torneo)

    if estados:
        query = query.filter(Partido.estado.in_(estados))
    else:
        # Excluir 'anulado' por defecto
        query = query.filter(Partido.estado != 'anulado')

    if id_equipo is not None:
        query = query.filter(or_(Partido.id_equipo_local == id_equipo, Partido.id_equipo_visitante == id_equipo))

    if id_categoria is not None:
        query = query.filter(Partido.id_categoria == id_categoria)

    if pendientes_stats:
        query = query.filter(
            Partido.estado == 'finalizado',
            or_(Partido.stats_local_procesadas == False, Partido.stats_visitante_procesadas == False)
        )

    if search:
        search_term = f"%{search}%"
        # Usamos los alias de joinedload si es necesario, o hacemos outerjoin aquí si se necesita para filtrar.
        # Ya que joinedload no permite filtrar directamente en la DB en SQLAlchemy 2.0 sin explicit JOIN, 
        # necesitamos agregar un join explícito para la búsqueda, o usar las relaciones.
        # Para evitar problemas con el alias de _base_query_con_relaciones, hacemos joins adicionales:
        el = db.aliased(Equipo)
        ev = db.aliased(Equipo)
        query = query.outerjoin(Torneo, Partido.id_torneo == Torneo.id_torneo)\
                     .outerjoin(el, Partido.id_equipo_local == el.id_equipo)\
                     .outerjoin(ev, Partido.id_equipo_visitante == ev.id_equipo)\
                     .filter(
                         or_(
                             Torneo.nombre_torneo.ilike(search_term),
                             el.nombre_equipo.ilike(search_term),
                             ev.nombre_equipo.ilike(search_term)
                         )
                     )

    return query


def obtener_partido_por_id(id_partido):
    """Obtiene un partido por su ID con relaciones cargadas.

    Returns:
        Instancia de ``Partido`` o ``None``.
    """
    return (
        _base_query_con_relaciones()
        .filter(Partido.id_partido == id_partido)
        .first()
    )


def crear_partido(data):
    """Crea un nuevo partido verificando que ambos equipos estén inscritos.

    Validaciones previas:
        1. El equipo local debe tener inscripción aprobada en el torneo.
        2. El equipo visitante debe tener inscripción aprobada en el torneo.
        3. Los dos equipos no pueden ser el mismo.

    Args:
        data: Dict validado por ``PartidoCreateSchema``.

    Returns:
        Instancia de ``Partido`` recién creada con relaciones cargadas.

    Raises:
        ValueError: Si alguna validación falla con mensaje descriptivo.
    """
    id_torneo = data['id_torneo']
    id_categoria = data['id_categoria']
    id_local = data['id_equipo_local']
    id_visitante = data['id_equipo_visitante']

    # ── Validación 0: No puede jugar un equipo contra sí mismo ────
    if id_local == id_visitante:
        raise ValueError('El equipo local y visitante no pueden ser el mismo.')

    # ── Validación 1 y 2: Ambos equipos inscritos y aprobados ─────
    # Se ejecutan en dos queries distintas (más legible que un JOIN complejo)
    # dado que son validaciones de integridad, no consultas de listado.
    inscripcion_local = Inscripcion.query.filter_by(
        id_torneo=id_torneo, id_equipo=id_local, id_categoria=id_categoria, estado_inscripcion='aprobado'
    ).first()

    if not inscripcion_local:
        raise ValueError(
            'El equipo local no tiene una inscripción aprobada para este torneo en esta categoría.'
        )

    inscripcion_visitante = Inscripcion.query.filter_by(
        id_torneo=id_torneo, id_equipo=id_visitante, id_categoria=id_categoria, estado_inscripcion='aprobado'
    ).first()

    if not inscripcion_visitante:
        raise ValueError(
            'El equipo visitante no tiene una inscripción aprobada para este torneo en esta categoría.'
        )

    # ── Creación ──────────────────────────────────────────────────
    try:
        partido = Partido(**data)
        db.session.add(partido)
        db.session.flush()
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ValueError('No se pudo crear el partido por un conflicto de datos.')

    return obtener_partido_por_id(partido.id_partido)


def actualizar_partido(partido, data):
    """Actualiza campos logísticos y/o marcadores de un partido.

    Si el partido pasa a estado ``'finalizado'``, delega a
    ``standings.recalcular_tabla()`` para actualizar posiciones.

    Args:
        partido: Instancia de ``Partido`` a actualizar.
        data: Dict validado por ``PartidoUpdateSchema``.

    Returns:
        Instancia de ``Partido`` actualizada con relaciones cargadas.
    """
    estado_previo = partido.estado

    for key, value in data.items():
        setattr(partido, key, value)

    db.session.commit()

    # ── Disparo del motor de posiciones (SRP) ─────────────────────
    # Solo se recalcula cuando el partido transiciona a 'finalizado'.
    # La función vive en standings.py y puede migrarse a tarea async
    # sin modificar esta función.
    if data.get('estado') == 'finalizado' and estado_previo != 'finalizado':
        from app.services.standings import recalcular_tabla
        recalcular_tabla(partido.id_torneo)

    return obtener_partido_por_id(partido.id_partido)


def obtener_box_score(partido):
    """Genera el box score del partido con todos los jugadores activos."""
    from app.models.plantilla import Plantilla
    from app.models.estadistica import Estadistica
    from app.models.sancion import Sancion
    from sqlalchemy.orm import joinedload
    
    # 1. Obtener todas las plantillas para los equipos del partido
    plantillas_local = Plantilla.query.filter_by(
        id_torneo=partido.id_torneo, id_equipo=partido.id_equipo_local, estado='activo'
    ).options(joinedload(Plantilla.jugador)).all()
    
    plantillas_visitante = Plantilla.query.filter_by(
        id_torneo=partido.id_torneo, id_equipo=partido.id_equipo_visitante, estado='activo'
    ).options(joinedload(Plantilla.jugador)).all()
    
    # 2. Obtener las estadísticas registradas y sanciones activas
    estadisticas = Estadistica.query.filter_by(id_partido=partido.id_partido).all()
    stats_by_jugador = {e.id_jugador: e for e in estadisticas}
    
    sanciones = Sancion.query.filter_by(id_partido=partido.id_partido, estado='activa').all()
    sanciones_by_jugador = {s.id_jugador: s for s in sanciones}
    
    # 3. Formatear la data
    def build_jugador_stats(plantillas):
        res = []
        for p in plantillas:
            jug = p.jugador
            stat = stats_by_jugador.get(jug.id_jugador)
            res.append({
                'id_jugador': jug.id_jugador,
                'nombre_jugador': jug.nombre,
                'dorsal': p.numero_camiseta,
                'puntos_anotados': stat.puntos_anotados if stat else 0,
                'triples_anotados': stat.triples_anotados if stat else 0,
                'faltas_cometidas': stat.faltas_cometidas if stat else 0,
                'rebotes': stat.rebotes if stat else 0,
                'asistencias': stat.asistencias if stat else 0,
                'tapones': stat.tapones if stat else 0,
                'tiros_libres_anotados': stat.tiros_libres_anotados if stat else 0,
                'sancion_activa': True if jug.id_jugador in sanciones_by_jugador else False
            })
        # Order by points descending
        res.sort(key=lambda x: x['puntos_anotados'], reverse=True)
        return res
        
    return {
        'local': build_jugador_stats(plantillas_local),
        'visitante': build_jugador_stats(plantillas_visitante)
    }

def eliminar_partido(id_partido):
    """Elimina un partido si no tiene actas ni estadísticas."""
    partido = db.session.get(Partido, id_partido)
    if not partido:
        raise ValueError("El partido no existe.")
        
    if partido.url_planilla_fiba or partido.stats_local_procesadas or partido.stats_visitante_procesadas:
        raise ValueError("Este partido contiene información histórica (estadísticas o actas). Por seguridad, cámbiale el estado a 'Suspendido' o elimínalo lógicamente (anular).")
        
    db.session.delete(partido)
    db.session.commit()
    return True


def anular_partido(id_partido):
    """Realiza un soft-delete (cambia el estado a 'anulado')."""
    partido = db.session.get(Partido, id_partido)
    if not partido:
        raise ValueError("El partido no existe.")
        
    partido.estado = 'anulado'
    db.session.commit()
    
    # Si estaba finalizado, recalcular tabla para quitarle sus puntos a los equipos
    from app.services.standings import recalcular_tabla
    recalcular_tabla(partido.id_torneo)
    
    return partido


def restaurar_partido(id_partido):
    """Restaura un partido anulado pasándolo a 'programado'."""
    partido = db.session.get(Partido, id_partido)
    if not partido:
        raise ValueError("El partido no existe.")
        
    partido.estado = 'programado'
    db.session.commit()
    
    return partido
