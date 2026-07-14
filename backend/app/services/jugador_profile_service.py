from sqlalchemy import func
from app import db
from app.models.jugador import Jugador
from app.models.plantilla import Plantilla
from app.models.estadistica import Estadistica
from app.models.equipo import Equipo
from app.models.torneo import Torneo

def obtener_perfil_publico(id_jugador):
    jugador = db.session.get(Jugador, id_jugador)
    if not jugador or jugador.estado == 'inactivo':
        return None

    # 1. Traer su plantilla activa más reciente
    plantilla = (
        db.session.query(Plantilla, Equipo.nombre_equipo, Torneo.nombre)
        .join(Equipo, Plantilla.id_equipo == Equipo.id_equipo)
        .join(Torneo, Plantilla.id_torneo == Torneo.id_torneo)
        .filter(Plantilla.id_jugador == id_jugador, Plantilla.estado == 'activo')
        .order_by(Plantilla.created_at.desc())
        .first()
    )
    
    equipo_actual = plantilla[1] if plantilla else None
    torneo_actual = plantilla[2] if plantilla else None
    id_equipo_actual = plantilla[0].id_equipo if plantilla else None
    id_torneo_actual = plantilla[0].id_torneo if plantilla else None

    # 2. Calcular Totales y Promedios con func (estadísticas globales, sin filtro de equipo/torneo)
    stats = db.session.query(
        func.count(func.distinct(Estadistica.id_partido)).label('partidos'),
        func.sum(Estadistica.puntos_anotados + (Estadistica.triples_anotados * 3)).label('puntos_totales'),
        func.sum(Estadistica.rebotes).label('rebotes_totales'),
        func.sum(Estadistica.asistencias).label('asistencias_totales'),
        func.sum(Estadistica.triples_anotados).label('triples_totales')
    ).filter(Estadistica.id_jugador == id_jugador).first()

    partidos_jugados = stats.partidos if stats and stats.partidos else 0
    puntos_totales = int(stats.puntos_totales or 0)
    promedio_puntos = round(puntos_totales / partidos_jugados, 1) if partidos_jugados > 0 else 0.0

    return {
        "id_jugador": jugador.id_jugador,
        "nombre": jugador.nombre,
        "url_foto": jugador.url_foto,
        "equipo_actual": equipo_actual,
        "torneo_actual": torneo_actual,
        "id_equipo_actual": id_equipo_actual,
        "id_torneo_actual": id_torneo_actual,
        "estadisticas": {
            "partidos_jugados": partidos_jugados,
            "puntos_totales": puntos_totales,
            "promedio_puntos": promedio_puntos,
            "rebotes_totales": int(stats.rebotes_totales or 0),
            "asistencias_totales": int(stats.asistencias_totales or 0),
            "triples_totales": int(stats.triples_totales or 0),
        }
    }
