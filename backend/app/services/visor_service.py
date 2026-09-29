"""Consultas del rol visor: buscar jugadores y ver sus partidos.

Solo lectura. Cada respuesta se arma con una lista blanca de campos:
nunca incluye cédula, fecha de nacimiento, correo, teléfono ni documentos.
"""
from datetime import date

from sqlalchemy import func

from app import db
from app.models.categoria import Categoria
from app.models.equipo import Equipo
from app.models.estadistica import Estadistica
from app.models.jugador import Jugador
from app.models.partido import Partido
from app.models.plantilla import Plantilla
from app.models.torneo import Torneo


def _edad(nacimiento, hoy):
    if not nacimiento:
        return None
    return hoy.year - nacimiento.year - ((hoy.month, hoy.day) < (nacimiento.month, nacimiento.day))


def _hace_anios(hoy, anios):
    """La misma fecha de hoy, ``anios`` atrás (el 29 de febrero cae al 28)."""
    try:
        return hoy.replace(year=hoy.year - anios)
    except ValueError:
        return hoy.replace(year=hoy.year - anios, day=28)


def buscar_jugadores(filtros: dict):
    """Devuelve (query, stats) para paginar. Filtros opcionales:

    q, id_torneo, id_categoria, id_equipo, genero, edad_min, edad_max,
    orden ('nombre' | 'puntos' | 'promedio').
    """
    hoy = date.today()
    stats = (
        db.session.query(
            Estadistica.id_jugador.label('id_jugador'),
            func.count(func.distinct(Estadistica.id_partido)).label('partidos'),
            func.coalesce(func.sum(Estadistica.puntos_anotados), 0).label('puntos'),
        )
        .group_by(Estadistica.id_jugador)
        .subquery()
    )
    partidos = func.coalesce(stats.c.partidos, 0)
    puntos = func.coalesce(stats.c.puntos, 0)

    query = (
        db.session.query(Jugador, partidos.label('partidos'), puntos.label('puntos'))
        .outerjoin(stats, stats.c.id_jugador == Jugador.id_jugador)
        .filter(Jugador.estado == 'activo')
    )

    if filtros.get('q'):
        # ponytail: los nombres se guardan en MAYÚSCULAS; ilike no ignora tildes (unaccent si hace falta)
        query = query.filter(Jugador.nombre.ilike(f"%{filtros['q'].strip()}%"))
    if filtros.get('genero'):
        query = query.filter(Jugador.genero == filtros['genero'])
    if filtros.get('edad_min') is not None:
        query = query.filter(Jugador.fecha_nacimiento <= _hace_anios(hoy, filtros['edad_min']))
    if filtros.get('edad_max') is not None:
        query = query.filter(Jugador.fecha_nacimiento > _hace_anios(hoy, filtros['edad_max'] + 1))

    # Torneo, categoría y equipo se filtran por las plantillas activas del jugador
    condiciones = [Plantilla.id_jugador == Jugador.id_jugador, Plantilla.estado == 'activo']
    for campo in ('id_torneo', 'id_categoria', 'id_equipo'):
        if filtros.get(campo):
            condiciones.append(getattr(Plantilla, campo) == filtros[campo])
    if len(condiciones) > 2:
        query = query.filter(db.session.query(Plantilla.id_plantilla).filter(*condiciones).exists())

    orden = filtros.get('orden')
    if orden == 'puntos':
        query = query.order_by(puntos.desc(), Jugador.nombre)
    elif orden == 'promedio':
        promedio = puntos * 1.0 / func.nullif(partidos, 0)
        query = query.order_by(func.coalesce(promedio, 0).desc(), Jugador.nombre)
    else:
        query = query.order_by(Jugador.nombre)
    return query


def serializar_resultados(filas):
    """Arma la tarjeta de cada jugador con su participación más reciente (una consulta para toda la página)."""
    hoy = date.today()
    ids = [j.id_jugador for j, _, _ in filas]
    recientes = {}
    if ids:
        plantillas = (
            db.session.query(Plantilla, Equipo, Torneo, Categoria)
            .join(Equipo, Plantilla.id_equipo == Equipo.id_equipo)
            .join(Torneo, Plantilla.id_torneo == Torneo.id_torneo)
            .outerjoin(Categoria, Plantilla.id_categoria == Categoria.id_categoria)
            .filter(Plantilla.id_jugador.in_(ids), Plantilla.estado == 'activo')
            .order_by(Torneo.fecha_inicio.desc(), Plantilla.created_at.desc())
            .all()
        )
        for p, e, t, c in plantillas:
            recientes.setdefault(p.id_jugador, (p, e, t, c))

    datos = []
    for jugador, pj, pts in filas:
        p, e, t, c = recientes.get(jugador.id_jugador, (None, None, None, None))
        datos.append({
            'id_jugador': jugador.id_jugador,
            'nombre': jugador.nombre,
            'url_foto': jugador.url_foto,
            'genero': jugador.genero,
            'edad': _edad(jugador.fecha_nacimiento, hoy),
            'numero_camiseta': p.numero_camiseta if p else None,
            'equipo': {'id_equipo': e.id_equipo, 'nombre_equipo': e.nombre_equipo, 'url_logo': e.url_logo} if e else None,
            'torneo': {'id_torneo': t.id_torneo, 'nombre': t.nombre} if t else None,
            'categoria': {
                'id_categoria': c.id_categoria,
                'nombre_categoria': c.nombre_categoria,
                'genero_categoria': c.genero_categoria,
            } if c else None,
            'partidos_jugados': int(pj or 0),
            'puntos_totales': int(pts or 0),
            'promedio_puntos': round(pts / pj, 1) if pj else 0.0,
        })
    return datos


def partidos_de_jugador(id_jugador: int):
    """Partidos con planilla cargada del jugador, del más reciente al más antiguo. None si no existe."""
    jugador = db.session.get(Jugador, id_jugador)
    if not jugador or jugador.estado != 'activo':
        return None

    # Equipos del jugador por torneo, para saber de qué lado jugó
    equipos_por_torneo = {}
    for id_torneo, id_equipo in db.session.query(Plantilla.id_torneo, Plantilla.id_equipo).filter(Plantilla.id_jugador == id_jugador):
        equipos_por_torneo.setdefault(id_torneo, set()).add(id_equipo)

    filas = (
        db.session.query(Estadistica, Partido)
        .join(Partido, Estadistica.id_partido == Partido.id_partido)
        .filter(Estadistica.id_jugador == id_jugador)
        .order_by(Partido.fecha.desc(), Partido.hora.desc())
        .all()
    )

    def equipo(e):
        return {'id_equipo': e.id_equipo, 'nombre_equipo': e.nombre_equipo, 'url_logo': e.url_logo} if e else None

    datos = []
    for est, partido in filas:
        propios = equipos_por_torneo.get(partido.id_torneo, set())
        lado = 'local' if partido.id_equipo_local in propios else 'visitante' if partido.id_equipo_visitante in propios else None
        datos.append({
            'id_partido': partido.id_partido,
            'fecha': partido.fecha.isoformat() if partido.fecha else None,
            'fase': partido.fase,
            'estado': partido.estado,
            'torneo': {'id_torneo': partido.id_torneo, 'nombre': partido.torneo.nombre if partido.torneo else None},
            'categoria': partido.categoria.nombre_categoria if partido.categoria else None,
            'equipo_local': equipo(partido.equipo_local),
            'equipo_visitante': equipo(partido.equipo_visitante),
            'marcador_local': partido.marcador_local,
            'marcador_visitante': partido.marcador_visitante,
            'lado': lado,
            'linea': {
                'puntos': est.puntos_anotados,
                'rebotes': est.rebotes,
                'asistencias': est.asistencias,
                'triples': est.triples_anotados,
                'tiros_libres': est.tiros_libres_anotados,
                'tapones': est.tapones,
                'robos': est.robos,
                'faltas': est.faltas_cometidas,
                'valoracion': est.valoracion,
            },
        })
    return datos
