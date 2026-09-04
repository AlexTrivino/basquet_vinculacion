from sqlalchemy import func
from app import db
from app.models.estadistica import Estadistica
from app.models.partido import Partido
from app.models.jugador import Jugador
from app.models.equipo import Equipo
from app.models.plantilla import Plantilla

def obtener_lideres_estadisticos(id_torneo: int, id_categoria: int = None, limit: int = 10) -> dict:
    """Obtiene los líderes estadísticos (Top N) para cada categoría en un torneo.
    
    Args:
        id_torneo: ID del torneo.
        id_categoria: ID de la categoría (opcional).
        limit: Cantidad de jugadores a devolver por cada estadística (default 10).
        
    Returns:
        Dict con arrays de jugadores top en cada rubro: puntos, triples, rebotes, asistencias, tapones, tiros_libres.
    """
    base_query = (
        db.session.query(
            Estadistica.id_jugador,
            Jugador.nombre.label('nombre_jugador'),
            Jugador.url_foto.label('url_foto_jugador'),
            Equipo.nombre_equipo,
            func.count(func.distinct(Partido.id_partido)).label('partidos_jugados'),
            func.sum(Estadistica.puntos_anotados + (Estadistica.triples_anotados * 3)).label('puntos_totales'),
            func.sum(Estadistica.triples_anotados).label('triples_totales'),
            func.sum(Estadistica.rebotes).label('rebotes_totales'),
            func.sum(Estadistica.asistencias).label('asistencias_totales'),
            func.sum(Estadistica.tapones).label('tapones_totales'),
            func.sum(Estadistica.tiros_libres_anotados).label('tiros_libres_totales')
        )
        .join(Partido, Estadistica.id_partido == Partido.id_partido)
        .join(Jugador, Estadistica.id_jugador == Jugador.id_jugador)
        .join(Plantilla, (Plantilla.id_jugador == Jugador.id_jugador) & (Plantilla.id_torneo == Partido.id_torneo))
        .join(Equipo, Plantilla.id_equipo == Equipo.id_equipo)
        .filter(Partido.id_torneo == id_torneo)
        .filter(Partido.estado.in_(['finalizado', 'finalizado_wo']))
    )

    if id_categoria:
        base_query = base_query.filter(Partido.id_categoria == id_categoria)

    base_query = base_query.group_by(
        Estadistica.id_jugador,
        Jugador.nombre,
        Jugador.url_foto,
        Equipo.nombre_equipo
    )
    
    stats = base_query.all()
    
    def format_row(row):
        pj = row.partidos_jugados or 0
        return {
            "id_jugador": row.id_jugador,
            "nombre": row.nombre_jugador,
            "url_foto": row.url_foto_jugador,
            "nombre_equipo": row.nombre_equipo,
            "partidos_jugados": pj,
            "puntos": int(row.puntos_totales or 0),
            "triples": int(row.triples_totales or 0),
            "rebotes": int(row.rebotes_totales or 0),
            "asistencias": int(row.asistencias_totales or 0),
            "tapones": int(row.tapones_totales or 0),
            "tiros_libres": int(row.tiros_libres_totales or 0)
        }
        
    formatted = [format_row(r) for r in stats]
    
    # Filtrar aquellos con 0 en la estadística respectiva para no mostrar "líderes" con 0
    puntos = sorted([f for f in formatted if f['puntos'] > 0], key=lambda x: x['puntos'], reverse=True)[:limit]
    triples = sorted([f for f in formatted if f['triples'] > 0], key=lambda x: x['triples'], reverse=True)[:limit]
    rebotes = sorted([f for f in formatted if f['rebotes'] > 0], key=lambda x: x['rebotes'], reverse=True)[:limit]
    asistencias = sorted([f for f in formatted if f['asistencias'] > 0], key=lambda x: x['asistencias'], reverse=True)[:limit]
    tapones = sorted([f for f in formatted if f['tapones'] > 0], key=lambda x: x['tapones'], reverse=True)[:limit]
    tiros_libres = sorted([f for f in formatted if f['tiros_libres'] > 0], key=lambda x: x['tiros_libres'], reverse=True)[:limit]
    
    return {
        "puntos": puntos,
        "triples": triples,
        "rebotes": rebotes,
        "asistencias": asistencias,
        "tapones": tapones,
        "tiros_libres": tiros_libres
    }
