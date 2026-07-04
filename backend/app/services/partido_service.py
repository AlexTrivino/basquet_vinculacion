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
        joinedload(Partido.equipo_local),
        joinedload(Partido.equipo_visitante),
    )


# ── Funciones de servicio ─────────────────────────────────────────

def listar_partidos(id_torneo=None, estado=None, id_equipo=None):
    """Retorna la query de partidos con filtros opcionales para paginación.

    Args:
        id_torneo: Filtra por torneo.
        estado: Filtra por estado del partido.
        id_equipo: Filtra partidos donde el equipo sea local o visitante.

    Returns:
        Query de SQLAlchemy lista para ``paginate_query()``.
    """
    query = _base_query_con_relaciones().order_by(
        Partido.fecha, Partido.hora
    )

    if id_torneo is not None:
        query = query.filter(Partido.id_torneo == id_torneo)

    if estado in ('programado', 'en_curso', 'finalizado', 'suspendido'):
        query = query.filter(Partido.estado == estado)

    if id_equipo is not None:
        query = query.filter(or_(Partido.id_equipo_local == id_equipo, Partido.id_equipo_visitante == id_equipo))

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
    id_local = data['id_equipo_local']
    id_visitante = data['id_equipo_visitante']

    # ── Validación 0: No puede jugar un equipo contra sí mismo ────
    if id_local == id_visitante:
        raise ValueError('El equipo local y visitante no pueden ser el mismo.')

    # ── Validación 1 y 2: Ambos equipos inscritos y aprobados ─────
    # Se ejecutan en dos queries distintas (más legible que un JOIN complejo)
    # dado que son validaciones de integridad, no consultas de listado.
    for id_equipo, rol in [(id_local, 'local'), (id_visitante, 'visitante')]:
        inscripcion = Inscripcion.query.filter_by(
            id_equipo=id_equipo,
            id_torneo=id_torneo,
            estado_inscripcion='aprobado',
        ).first()

        if inscripcion is None:
            raise ValueError(
                f'El equipo {rol} no tiene una inscripción aprobada '
                f'en el torneo especificado.'
            )

    # ── Inserción ─────────────────────────────────────────────────
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
    from sqlalchemy.orm import joinedload
    
    # 1. Obtener todas las plantillas para los equipos del partido
    plantillas_local = Plantilla.query.filter_by(
        id_torneo=partido.id_torneo, id_equipo=partido.id_equipo_local, estado='activo'
    ).options(joinedload(Plantilla.jugador)).all()
    
    plantillas_visitante = Plantilla.query.filter_by(
        id_torneo=partido.id_torneo, id_equipo=partido.id_equipo_visitante, estado='activo'
    ).options(joinedload(Plantilla.jugador)).all()
    
    # 2. Obtener las estadísticas registradas
    estadisticas = Estadistica.query.filter_by(id_partido=partido.id_partido).all()
    stats_by_jugador = {e.id_jugador: e for e in estadisticas}
    
    # 3. Formatear la data
    def build_jugador_stats(plantillas):
        res = []
        for p in plantillas:
            jug = p.jugador
            stat = stats_by_jugador.get(jug.id_jugador)
            res.append({
                'id_jugador': jug.id_jugador,
                'nombre_jugador': jug.nombres,
                'apellido_jugador': jug.apellidos,
                'dorsal': p.numero_camiseta,
                'puntos_anotados': stat.puntos_anotados if stat else 0,
                'triples_anotados': stat.triples_anotados if stat else 0,
                'faltas_cometidas': stat.faltas_cometidas if stat else 0,
                'rebotes': stat.rebotes if stat else 0,
                'asistencias': stat.asistencias if stat else 0
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
        raise ValueError("Este partido contiene información histórica (estadísticas o actas). Por seguridad, cámbiale el estado a 'Suspendido' en lugar de eliminarlo físicamente.")
        
    db.session.delete(partido)
    db.session.commit()
    return True
