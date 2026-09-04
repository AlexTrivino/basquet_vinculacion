"""
Servicio de estadísticas individuales — ingesta masiva (Fase 7).

Garantías de este módulo:
    1. **Anti-spoofing en O(1):** Un set difference de Python verifica en
       memoria que todos los IDs enviados pertenecen al equipo —sin loops
       con queries individuales.
    2. **Bulk insert real:** Una sola sentencia INSERT para todas las
       estadísticas (SQLAlchemy 2.x ``insert()`` + ``execute()``).
    3. **Transacción atómica:** Estadísticas y sanciones se insertan en
       el mismo bloque. Si cualquier fila falla, todo hace rollback.
    4. **Sin N+1:** La verificación de membresía usa una sola query con ``in_``.
"""
from datetime import date

from sqlalchemy import insert, delete
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.estadistica import Estadistica
from app.models.partido import Partido
from app.models.plantilla import Plantilla
from app.models.sancion import Sancion


def procesar_estadisticas_bulk(data: dict, usuario_id: str, usuario_rol: str) -> dict:
    """Inserta estadísticas y sanciones de un equipo en una transacción atómica.

    Flujo de ejecución:
        1. Verificar que el partido existe.
        2. Verificar que el partido pertenece al equipo (anti-falsificación de contexto).
        3. Extraer IDs enviados y validarlos contra Plantillas con ``in_``
           (anti-spoofing: evita asignar estadísticas a jugadores rivales).
        4. Para delegados: verificar que el equipo le pertenece.
        5. Bulk INSERT de estadísticas con ``insert()`` de SQLAlchemy 2.x.
        6. INSERT de sanciones (jugadores con ``sancion_tipo != None``)
           en el mismo bloque transaccional.
        7. ``flush()`` para detectar IntegrityErrors antes del commit.
        8. ``commit()`` único al final.

    Args:
        data: Dict validado por ``EstadisticasBulkSchema``.
        usuario_id: UUID del usuario que hace la petición (de ``flask.g``).
        usuario_rol: Rol del usuario (``'super_admin'`` o ``'delegado'``).

    Returns:
        Dict con resumen: cantidad de estadísticas y sanciones insertadas.

    Raises:
        ValueError: Si alguna validación de negocio falla.
    """
    id_partido = data['id_partido']
    id_equipo = data['id_equipo']
    jugadores_payload = data['estadisticas_jugadores']

    # ── Validación 0: Solo super_admin puede ingresar estadísticas ─
    if usuario_rol != 'super_admin':
        raise ValueError(
            'Solo los administradores del sistema pueden registrar estadísticas de partidos.'
        )

    # ── Validación 1: Partido existe y está en curso ───────────────
    partido = db.session.get(Partido, id_partido)
    if partido is None:
        raise ValueError('El partido especificado no existe.')

    if partido.estado not in ('en_curso', 'finalizado', 'finalizado_wo'):
        raise ValueError(
            'Solo se pueden registrar estadísticas en partidos '
            'en curso o finalizados.'
        )

    # ── Validación 2: El equipo participó en este partido ─────────
    if id_equipo not in (partido.id_equipo_local, partido.id_equipo_visitante):
        raise ValueError(
            'El equipo especificado no participó en este partido.'
        )

    # ── Validación 3: Propiedad del delegado ──────────────────────
    # (Ahora bloqueada para delegados; solo super_admin llega aquí)
    # Se mantiene como código de defensa en profundidad.
    if usuario_rol == 'delegado':
        raise ValueError(
            'No tienes permiso para registrar estadísticas. Contacta al administrador.'
        )

    # ── Validación 4: Verificación matemática del marcador ────────
    total_puntos_payload = sum(entry['puntos'] + (entry.get('triples', 0) * 3) for entry in jugadores_payload)
    if id_equipo == partido.id_equipo_local:
        marcador_oficial = partido.marcador_local
    else:
        marcador_oficial = partido.marcador_visitante

    if marcador_oficial is not None and total_puntos_payload != marcador_oficial:
        raise ValueError(
            f'La suma de puntos individuales ({total_puntos_payload}) no coincide con '
            f'el marcador oficial del equipo en el partido ({marcador_oficial}).'
        )

    # ── Validación 4: Anti-spoofing con set difference en O(1) ────
    # Extraer todos los IDs del payload en un set (O(n) en longitud del array)
    ids_enviados = {entry['id_jugador'] for entry in jugadores_payload}

    # UNA sola query con in_ para obtener los IDs válidos del equipo en este torneo
    ids_validos_db = {
        row[0]
        for row in db.session.execute(
            db.select(Plantilla.id_jugador)
            .where(
                Plantilla.id_equipo == id_equipo,
                Plantilla.id_torneo == partido.id_torneo,
                Plantilla.estado == 'activo',
                Plantilla.id_jugador.in_(ids_enviados),
            )
        ).all()
    }

    # Set difference: O(1) en Python — si hay IDs enviados que no están en BD,
    # significa que alguien intentó asignar estadísticas a jugadores de otro equipo.
    ids_invalidos = ids_enviados - ids_validos_db
    if ids_invalidos:
        raise ValueError(
            f'Los siguientes jugadores no pertenecen al equipo en este torneo '
            f'o no están activos en la plantilla: {sorted(ids_invalidos)}. '
            f'Posible intento de asignación de estadísticas a jugadores rivales.'
        )

    # ── Limpiar estadísticas previas (Upsert atómico) ───────────────
    # Borramos las stats previas de los jugadores del payload para este
    # partido específico. Esto permite editar sin duplicar registros.
    db.session.execute(
        delete(Estadistica).where(
            Estadistica.id_partido == id_partido,
            Estadistica.id_jugador.in_(ids_enviados)
        )
    )

    # ── Bulk INSERT de estadísticas (SQLAlchemy 2.x) ──────────────
    # ``db.session.execute(insert(Model), lista)`` emite UN SOLO INSERT
    # con múltiples filas, equivalente a:
    #   INSERT INTO estadisticas (id_partido, id_jugador, ...) VALUES (...), (...), ...
    # Esto es radicalmente más eficiente que un for-loop con add() individual.
    mappings_estadisticas = [
        {
            'id_partido':        id_partido,
            'id_jugador':        entry['id_jugador'],
            'puntos_anotados':   entry['puntos'],
            'triples_anotados':  entry['triples'],
            'faltas_cometidas':  entry['faltas'],
            'rebotes':           entry['rebotes'],
            'asistencias':       entry['asistencias'],
            'tapones':           entry.get('tapones', 0),
            'tiros_libres_anotados': entry.get('tiros_libres', 0),
        }
        for entry in jugadores_payload
    ]

    db.session.execute(insert(Estadistica), mappings_estadisticas)

    # ── INSERT de sanciones (dentro del mismo bloque transaccional) ──
    # Solo procesa jugadores que incluyeron sancion_tipo en el payload.
    # Se usa flush() ANTES del commit para detectar IntegrityErrors con
    # la sesión aún activa y poder hacer rollback limpio.
    hoy = date.today()
    sanciones_a_insertar = [
        {
            'id_partido': id_partido,
            'id_jugador': entry['id_jugador'],
            'motivo':     entry['sancion_tipo'],
            'fecha':      hoy,
            'estado':     'activa',
        }
        for entry in jugadores_payload
        if entry.get('sancion_tipo') is not None
    ]

    if sanciones_a_insertar:
        db.session.execute(insert(Sancion), sanciones_a_insertar)

    if id_equipo == partido.id_equipo_local:
        partido.stats_local_procesadas = True
    else:
        partido.stats_visitante_procesadas = True

    # ── flush() + commit() atómico ────────────────────────────────
    # flush() envía todo al motor de BD sin cerrar la transacción.
    # Permite detectar violaciones de constraint (duplicados, FK inválidas)
    # ANTES del commit, con la sesión aún en estado rollbackeable.
    try:
        db.session.flush()
        db.session.commit()
    except IntegrityError as e:
        db.session.rollback()
        raise ValueError(
            'Error de integridad al guardar estadísticas. '
            'Verifica que no existan estadísticas duplicadas para este partido. '
            f'Detalle: {str(e.orig)}'
        )

    return {
        'estadisticas_insertadas': len(mappings_estadisticas),
        'sanciones_insertadas':    len(sanciones_a_insertar),
        'id_partido':              id_partido,
        'id_equipo':               id_equipo,
    }
