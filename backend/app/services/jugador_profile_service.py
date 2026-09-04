from sqlalchemy import func
from app import db
from app.models.jugador import Jugador
from app.models.plantilla import Plantilla
from app.models.estadistica import Estadistica
from app.models.equipo import Equipo
from app.models.torneo import Torneo
from app.models.inscripcion import Inscripcion
from app.models.categoria import Categoria
from app.models.partido import Partido


def obtener_perfil_publico(id_jugador: int):
    """Obtiene el perfil consolidado del jugador con todas sus participaciones y estadísticas."""
    jugador = db.session.get(Jugador, id_jugador)
    if not jugador or jugador.estado == 'inactivo':
        return None

    # 1. Traer todas sus plantillas activas con información de Equipo, Torneo y Categoría
    plantillas_query = (
        db.session.query(
            Plantilla.id_plantilla,
            Plantilla.numero_camiseta,
            Plantilla.estado.label('estado_plantilla'),
            Equipo.id_equipo,
            Equipo.nombre_equipo,
            Equipo.url_logo,
            Equipo.id_usuario.label('id_usuario_delegado'),
            Torneo.id_torneo,
            Torneo.nombre.label('nombre_torneo'),
            Torneo.estado.label('estado_torneo'),
            Torneo.fecha_inicio.label('fecha_inicio_torneo'),
            Categoria.id_categoria,
            Categoria.nombre_categoria,
        )
        .join(Equipo, Plantilla.id_equipo == Equipo.id_equipo)
        .join(Torneo, Plantilla.id_torneo == Torneo.id_torneo)
        .outerjoin(
            Inscripcion,
            (Inscripcion.id_torneo == Plantilla.id_torneo) & (Inscripcion.id_equipo == Plantilla.id_equipo),
        )
        .outerjoin(Categoria, Inscripcion.id_categoria == Categoria.id_categoria)
        .filter(Plantilla.id_jugador == id_jugador, Plantilla.estado == 'activo')
        .order_by(Torneo.fecha_inicio.desc(), Plantilla.created_at.desc())
        .all()
    )

    participaciones = []
    delegado_ids = set()
    claves_vistas = set()

    for p in plantillas_query:
        if p.id_usuario_delegado:
            delegado_ids.add(str(p.id_usuario_delegado))

        # Evitar registros duplicados si el join con Inscripcion/Categoría produce filas repetidas
        clave_unica = (p.id_plantilla, p.id_categoria)
        if clave_unica in claves_vistas:
            continue
        claves_vistas.add(clave_unica)

        participaciones.append({
            "id_plantilla": p.id_plantilla,
            "numero_camiseta": p.numero_camiseta,
            "id_equipo": p.id_equipo,
            "nombre_equipo": p.nombre_equipo,
            "url_logo": p.url_logo,
            "id_torneo": p.id_torneo,
            "nombre_torneo": p.nombre_torneo,
            "estado_torneo": p.estado_torneo,
            "anio": p.fecha_inicio_torneo.year if p.fecha_inicio_torneo else None,
            "id_categoria": p.id_categoria,
            "nombre_categoria": p.nombre_categoria,
        })

    # Participación principal más reciente (para retrocompatibilidad)
    principal = participaciones[0] if participaciones else None
    equipo_actual = principal["nombre_equipo"] if principal else None
    torneo_actual = principal["nombre_torneo"] if principal else None
    id_equipo_actual = principal["id_equipo"] if principal else None
    id_torneo_actual = principal["id_torneo"] if principal else None

    # 2. Calcular Estadísticas Globales (toda la carrera)
    stats_globales = db.session.query(
        func.count(func.distinct(Estadistica.id_partido)).label('partidos'),
        func.sum(Estadistica.puntos_anotados + (Estadistica.triples_anotados * 3)).label('puntos_totales'),
        func.sum(Estadistica.rebotes).label('rebotes_totales'),
        func.sum(Estadistica.asistencias).label('asistencias_totales'),
        func.sum(Estadistica.triples_anotados).label('triples_totales')
    ).filter(Estadistica.id_jugador == id_jugador).first()

    partidos_totales = stats_globales.partidos if stats_globales and stats_globales.partidos else 0
    puntos_totales = int(stats_globales.puntos_totales or 0)
    promedio_global = round(puntos_totales / partidos_totales, 1) if partidos_totales > 0 else 0.0

    estadisticas_globales = {
        "partidos_jugados": partidos_totales,
        "puntos_totales": puntos_totales,
        "promedio_puntos": promedio_global,
        "rebotes_totales": int(stats_globales.rebotes_totales or 0),
        "asistencias_totales": int(stats_globales.asistencias_totales or 0),
        "triples_totales": int(stats_globales.triples_totales or 0),
    }

    # 3. Calcular Estadísticas desglosadas por Torneo y Categoría
    stats_por_torneo_raw = (
        db.session.query(
            Partido.id_torneo,
            Partido.id_categoria,
            func.count(func.distinct(Estadistica.id_partido)).label('partidos'),
            func.sum(Estadistica.puntos_anotados + (Estadistica.triples_anotados * 3)).label('puntos_totales'),
            func.sum(Estadistica.rebotes).label('rebotes_totales'),
            func.sum(Estadistica.asistencias).label('asistencias_totales'),
            func.sum(Estadistica.triples_anotados).label('triples_totales')
        )
        .join(Partido, Estadistica.id_partido == Partido.id_partido)
        .filter(Estadistica.id_jugador == id_jugador)
        .group_by(Partido.id_torneo, Partido.id_categoria)
        .all()
    )

    estadisticas_por_torneo = {}
    for st in stats_por_torneo_raw:
        pj = st.partidos or 0
        pts = int(st.puntos_totales or 0)
        prom = round(pts / pj, 1) if pj > 0 else 0.0
        
        id_t = str(st.id_torneo)
        id_c = str(st.id_categoria)
        
        if id_t not in estadisticas_por_torneo:
            estadisticas_por_torneo[id_t] = {}
            
        estadisticas_por_torneo[id_t][id_c] = {
            "partidos_jugados": pj,
            "puntos_totales": pts,
            "promedio_puntos": prom,
            "rebotes_totales": int(st.rebotes_totales or 0),
            "asistencias_totales": int(st.asistencias_totales or 0),
            "triples_totales": int(st.triples_totales or 0),
        }

    return {
        "id_jugador": jugador.id_jugador,
        "nombre": jugador.nombre,
        "url_foto": jugador.url_foto,
        "participaciones": participaciones,
        "equipo_actual": equipo_actual,
        "torneo_actual": torneo_actual,
        "id_equipo_actual": id_equipo_actual,
        "id_torneo_actual": id_torneo_actual,
        "estadisticas": estadisticas_globales,
        "estadisticas_por_torneo": estadisticas_por_torneo,
        # Datos para verificación de permisos y panel administrativo
        "documento_identificacion": jugador.documento_identificacion,
        "fecha_nacimiento": jugador.fecha_nacimiento.isoformat() if jugador.fecha_nacimiento else None,
        "genero": jugador.genero,
        "correo": jugador.correo,
        "telefono": jugador.telefono,
        "url_cedula": jugador.url_cedula,
        "url_acta_bachiller": jugador.url_acta_bachiller,
        "delegados_autorizados": list(delegado_ids),
    }
