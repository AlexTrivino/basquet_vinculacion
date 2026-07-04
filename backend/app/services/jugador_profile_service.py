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

    # 2. Calcular Promedios con func.avg()
    stats = db.session.query(
        func.count(Estadistica.id_estadistica).label('partidos'),
        func.avg(Estadistica.puntos_anotados).label('puntos'),
        func.avg(Estadistica.rebotes).label('rebotes'),
        func.avg(Estadistica.asistencias).label('asistencias'),
        func.avg(Estadistica.triples_anotados).label('triples')
    ).filter(Estadistica.id_jugador == id_jugador).first()

    partidos_jugados = stats.partidos if stats and stats.partidos else 0

    return {
        "id_jugador": jugador.id_jugador,
        "nombres": jugador.nombres,
        "apellidos": jugador.apellidos,
        "url_foto": jugador.url_foto,
        "equipo_actual": equipo_actual,
        "torneo_actual": torneo_actual,
        "id_equipo_actual": id_equipo_actual,
        "id_torneo_actual": id_torneo_actual,
        "estadisticas": {
            "partidos_jugados": partidos_jugados,
            "promedio_puntos": round(float(stats.puntos or 0), 1),
            "promedio_rebotes": round(float(stats.rebotes or 0), 1),
            "promedio_asistencias": round(float(stats.asistencias or 0), 1),
            "promedio_triples": round(float(stats.triples or 0), 1),
        }
    }
