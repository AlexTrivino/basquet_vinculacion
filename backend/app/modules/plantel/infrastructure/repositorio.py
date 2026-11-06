"""Equipos y jugadores en la base, sobre los modelos compartidos; entregan las entidades del dominio.

Las consultas son las que hacían equipo_service, jugador_service, jugador_profile_service, visor_service, jugador_bp
y, la de la plantilla del jugador en un torneo, plantilla_service.
El perfil y el buscador del visor devuelven los mismos diccionarios que antes.
"""
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import joinedload

from app.modules.plantel.domain.equipo import CategoriaResumen, Equipo, InscripcionResumen, TorneoResumen, UsuarioResumen
from app.modules.plantel.domain.jugador import Jugador, PlantillaDeJugador, edad, hace_anios
from app.modules.torneos.application import casos_de_uso as torneos
from app.shared.infrastructure.db import db, enviar_cambios
from app.shared.infrastructure.modelos.categoria import Categoria
from app.shared.infrastructure.modelos.equipo import Equipo as FilaEquipo
from app.shared.infrastructure.modelos.estadistica import Estadistica
from app.shared.infrastructure.modelos.inscripcion import Inscripcion
from app.shared.infrastructure.modelos.jugador import Jugador as FilaJugador
from app.shared.infrastructure.modelos.partido import Partido
from app.shared.infrastructure.modelos.plantilla import Plantilla
from app.shared.infrastructure.modelos.torneo import Torneo
from app.shared.infrastructure.paginacion import paginar


# ── Equipos ───────────────────────────────────────────────────────

def _equipo(fila, detalle=False):
    equipo = Equipo(fila.id_equipo, fila.nombre_equipo, fila.id_usuario, fila.estado, fila.url_logo, fila.url_foto_equipo,
                    fila.created_at, fila.updated_at)
    if detalle:
        usuario = fila.usuario
        equipo.usuario = UsuarioResumen(usuario.id_usuario, usuario.nombre, usuario.correo) if usuario else None
        equipo.inscripciones = [
            InscripcionResumen(
                i.id_inscripcion, i.estado_inscripcion,
                TorneoResumen(i.torneo.id_torneo, i.torneo.nombre) if i.torneo else None,
                CategoriaResumen(i.categoria.id_categoria, i.categoria.nombre_categoria) if i.categoria else None,
            )
            for i in fila.inscripciones
        ]
    return equipo


class RepositorioEquipos:
    def listar_activos(self, pagina, por_pagina):
        filas, meta = paginar(FilaEquipo.activos().order_by(FilaEquipo.nombre_equipo), pagina, por_pagina)
        return [_equipo(f) for f in filas], meta

    def listar_para_administrar(self, pagina, por_pagina, id_torneo=None, id_categoria=None, search=None, estado=None):
        """Con el delegado y las inscripciones de cada equipo cargados en la misma consulta."""
        query = FilaEquipo.query.options(
            joinedload(FilaEquipo.usuario),
            joinedload(FilaEquipo.inscripciones).joinedload(Inscripcion.torneo),
            joinedload(FilaEquipo.inscripciones).joinedload(Inscripcion.categoria),
        ).order_by(FilaEquipo.nombre_equipo)
        if search:
            query = query.filter(FilaEquipo.nombre_equipo.ilike(f'%{search}%'))
        if estado:
            query = query.filter(FilaEquipo.estado == estado)
        if id_torneo or id_categoria:
            # ponytail: un equipo inscrito en dos categorías cuenta dos veces en el total (specs/05-plantel)
            query = query.join(Inscripcion, FilaEquipo.id_equipo == Inscripcion.id_equipo)
            if id_torneo:
                query = query.filter(Inscripcion.id_torneo == id_torneo)
            if id_categoria:
                query = query.filter(Inscripcion.id_categoria == id_categoria)
        filas, meta = paginar(query, pagina, por_pagina)
        return [_equipo(f, detalle=True) for f in filas], meta

    def obtener(self, id_equipo, detalle=False):
        fila = db.session.get(FilaEquipo, id_equipo)
        return _equipo(fila, detalle) if fila else None

    def activos_de(self, id_usuario):
        """Cuántos equipos activos tiene el delegado."""
        return FilaEquipo.query.filter_by(id_usuario=id_usuario, estado='activo').count()

    def agregar(self, datos):
        fila = FilaEquipo(**datos)
        db.session.add(fila)
        enviar_cambios()
        return fila.id_equipo

    def actualizar(self, id_equipo, cambios):
        fila = db.session.get(FilaEquipo, id_equipo)
        for campo, valor in cambios.items():
            setattr(fila, campo, valor)

    def borrar_partidos_pendientes(self, id_equipo):
        """Borra los partidos que el equipo todavía no jugó (programados o suspendidos) en los torneos vigentes, también
        los de las llaves. ponytail: deja los que ya tienen estadísticas o sanciones cargadas, para no perderlas."""
        pendientes = Partido.query.filter(
            Partido.estado.in_(('programado', 'suspendido')),
            db.or_(Partido.id_equipo_local == id_equipo, Partido.id_equipo_visitante == id_equipo),
            ~Partido.estadisticas.any(), ~Partido.sanciones.any(),
        ).all()
        for partido in pendientes:
            if torneos.vigente(partido.torneo.estado):
                db.session.delete(partido)


# ── Jugadores ─────────────────────────────────────────────────────

def _jugador(fila, detalle=False):
    jugador = Jugador(fila.id_jugador, fila.nombre, fila.documento_identificacion, fila.fecha_nacimiento, fila.genero,
                      fila.url_foto, fila.url_cedula, fila.url_acta_bachiller, fila.correo, fila.telefono, fila.estado,
                      fila.created_at, fila.updated_at)
    if detalle:
        jugador.plantillas = [
            PlantillaDeJugador(p.id_plantilla, p.numero_camiseta, p.id_equipo, p.equipo.nombre_equipo if p.equipo else None,
                               p.id_torneo, p.torneo.nombre if p.torneo else None, p.estado)
            for p in fila.plantillas
        ]
    return jugador


class RepositorioJugadores:
    def listar(self, pagina, por_pagina, *, search=None, id_torneo=None, id_equipo=None, id_categoria=None, genero=None,
               estado=None, buscar_por_cedula=True, detalle=False):
        """(jugadores de la página, metadatos). ``estado``: 'activo', 'inactivo', 'todos' o None (sin filtro)."""
        query = FilaJugador.query.order_by(FilaJugador.nombre)

        if estado in ('activo', 'inactivo'):
            query = query.filter(FilaJugador.estado == estado)
        elif estado != 'todos' and estado is not None:
            query = query.filter(FilaJugador.estado == 'activo')

        if genero in ('masculino', 'femenino'):
            query = query.filter(FilaJugador.genero == genero)

        if search:
            search_term = f"%{search.strip()}%"
            por_nombre = FilaJugador.nombre.ilike(search_term)
            query = query.filter(
                db.or_(por_nombre, FilaJugador.documento_identificacion.ilike(search_term))
                if buscar_por_cedula else por_nombre
            )

        if id_torneo or id_equipo or id_categoria:
            plantilla_filters = [Plantilla.estado == 'activo']
            if id_torneo:
                plantilla_filters.append(Plantilla.id_torneo == id_torneo)
            if id_equipo:
                plantilla_filters.append(Plantilla.id_equipo == id_equipo)
            if id_categoria:
                plantilla_filters.append(Plantilla.id_categoria == id_categoria)

            stmt = db.select(Plantilla.id_jugador).filter(*plantilla_filters)
            query = query.filter(FilaJugador.id_jugador.in_(stmt))

        filas, meta = paginar(query, pagina, por_pagina)
        return [_jugador(f, detalle) for f in filas], meta

    def obtener(self, id_jugador, detalle=False):
        fila = db.session.get(FilaJugador, id_jugador)
        return _jugador(fila, detalle) if fila else None

    def por_cedula(self, cedula, incluir_inactivos=False):
        query = FilaJugador.query.filter_by(documento_identificacion=str(cedula).strip())
        if not incluir_inactivos:
            query = query.filter_by(estado='activo')
        fila = query.first()
        return _jugador(fila, detalle=True) if fila else None

    def delegados_del_jugador(self, id_jugador):
        """El delegado de cada equipo donde el jugador tiene plantilla activa, uno por plantilla."""
        filas = (
            db.session.query(Plantilla.id_plantilla, FilaEquipo.id_usuario)
            .join(FilaEquipo, Plantilla.id_equipo == FilaEquipo.id_equipo)
            .filter(Plantilla.id_jugador == id_jugador, Plantilla.estado == 'activo')
            .all()
        )
        return [f.id_usuario for f in filas]

    def en_torneo(self, id_jugador, id_torneo, id_categoria=None):
        """Si el jugador tiene plantilla activa en el torneo (en esa categoría, si se da) y en qué equipo."""
        filtros = [Plantilla.id_jugador == id_jugador, Plantilla.id_torneo == id_torneo]
        if id_categoria:
            filtros.append(Plantilla.id_categoria == id_categoria)
        entrada = Plantilla.activos().options(joinedload(Plantilla.equipo)).filter(*filtros).first()
        if entrada and entrada.equipo:
            return {'ya_en_torneo': True, 'equipo_torneo': entrada.equipo.nombre_equipo, 'id_equipo': entrada.id_equipo}
        return {'ya_en_torneo': False, 'equipo_torneo': None, 'id_equipo': None}

    def agregar(self, datos):
        fila = FilaJugador(**datos)
        db.session.add(fila)
        enviar_cambios()
        return fila.id_jugador

    def actualizar(self, id_jugador, cambios):
        fila = db.session.get(FilaJugador, id_jugador)
        for campo, valor in cambios.items():
            setattr(fila, campo, valor)
        enviar_cambios()

    def perfil(self, id_jugador):
        """Perfil consolidado de un jugador activo con todas sus participaciones y estadísticas, o None."""
        jugador = db.session.get(FilaJugador, id_jugador)
        if not jugador or jugador.estado == 'inactivo':
            return None

        # 1. Sus plantillas activas con información de Equipo, Torneo y Categoría
        plantillas_query = (
            db.session.query(
                Plantilla.id_plantilla,
                Plantilla.numero_camiseta,
                Plantilla.estado.label('estado_plantilla'),
                FilaEquipo.id_equipo,
                FilaEquipo.nombre_equipo,
                FilaEquipo.url_logo,
                FilaEquipo.id_usuario.label('id_usuario_delegado'),
                Torneo.id_torneo,
                Torneo.nombre.label('nombre_torneo'),
                Torneo.estado.label('estado_torneo'),
                Torneo.fecha_inicio.label('fecha_inicio_torneo'),
                Categoria.id_categoria,
                Categoria.nombre_categoria,
            )
            .join(FilaEquipo, Plantilla.id_equipo == FilaEquipo.id_equipo)
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

        # 2. Estadísticas de toda la carrera
        stats_globales = db.session.query(
            func.count(func.distinct(Estadistica.id_partido)).label('partidos'),
            func.sum(Estadistica.puntos_anotados).label('puntos_totales'),
            func.sum(Estadistica.rebotes).label('rebotes_totales'),
            func.sum(Estadistica.asistencias).label('asistencias_totales'),
            func.sum(Estadistica.triples_anotados).label('triples_totales'),
            func.sum(Estadistica.tapones).label('tapones_totales'),
            func.sum(Estadistica.tiros_libres_anotados).label('tiros_libres_totales')
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
            "tapones_totales": int(stats_globales.tapones_totales or 0),
            "tiros_libres_totales": int(stats_globales.tiros_libres_totales or 0),
        }

        # 3. Estadísticas por torneo y categoría
        stats_por_torneo_raw = (
            db.session.query(
                Partido.id_torneo,
                Partido.id_categoria,
                func.count(func.distinct(Estadistica.id_partido)).label('partidos'),
                func.sum(Estadistica.puntos_anotados).label('puntos_totales'),
                func.sum(Estadistica.rebotes).label('rebotes_totales'),
                func.sum(Estadistica.asistencias).label('asistencias_totales'),
                func.sum(Estadistica.triples_anotados).label('triples_totales'),
                func.sum(Estadistica.tapones).label('tapones_totales'),
                func.sum(Estadistica.tiros_libres_anotados).label('tiros_libres_totales')
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
                "tapones_totales": int(st.tapones_totales or 0),
                "tiros_libres_totales": int(st.tiros_libres_totales or 0),
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
            # Edad pública: se muestra a todos sin revelar la fecha de nacimiento
            "edad": edad(jugador.fecha_nacimiento, date.today()),
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

    def buscar_para_visor(self, filtros, pagina, por_pagina):
        """(tarjetas de la página, metadatos). Filtros opcionales: q, id_torneo, id_categoria, id_equipo, genero,
        edad_min, edad_max y orden ('nombre' | 'puntos' | 'promedio'). Nunca incluye datos personales."""
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
            db.session.query(FilaJugador, partidos.label('partidos'), puntos.label('puntos'))
            .outerjoin(stats, stats.c.id_jugador == FilaJugador.id_jugador)
            .filter(FilaJugador.estado == 'activo')
        )

        if filtros.get('q'):
            # ponytail: los nombres se guardan en MAYÚSCULAS; ilike no ignora tildes (unaccent si hace falta)
            query = query.filter(FilaJugador.nombre.ilike(f"%{filtros['q'].strip()}%"))
        if filtros.get('genero'):
            query = query.filter(FilaJugador.genero == filtros['genero'])
        if filtros.get('edad_min') is not None:
            query = query.filter(FilaJugador.fecha_nacimiento <= hace_anios(hoy, filtros['edad_min']))
        if filtros.get('edad_max') is not None:
            query = query.filter(FilaJugador.fecha_nacimiento > hace_anios(hoy, filtros['edad_max'] + 1))

        # Torneo, categoría y equipo se filtran por las plantillas activas del jugador
        condiciones = [Plantilla.id_jugador == FilaJugador.id_jugador, Plantilla.estado == 'activo']
        for campo in ('id_torneo', 'id_categoria', 'id_equipo'):
            if filtros.get(campo):
                condiciones.append(getattr(Plantilla, campo) == filtros[campo])
        if len(condiciones) > 2:
            query = query.filter(db.session.query(Plantilla.id_plantilla).filter(*condiciones).exists())

        orden = filtros.get('orden')
        if orden == 'puntos':
            query = query.order_by(puntos.desc(), FilaJugador.nombre)
        elif orden == 'promedio':
            promedio = puntos * 1.0 / func.nullif(partidos, 0)
            query = query.order_by(func.coalesce(promedio, 0).desc(), FilaJugador.nombre)
        else:
            query = query.order_by(FilaJugador.nombre)

        filas, meta = paginar(query, pagina, por_pagina)
        return self._tarjetas(filas, hoy), meta

    def _tarjetas(self, filas, hoy):
        """Tarjeta de cada jugador con su participación más reciente (una consulta para toda la página)."""
        ids = [j.id_jugador for j, _, _ in filas]
        recientes = {}
        if ids:
            plantillas = (
                db.session.query(Plantilla, FilaEquipo, Torneo, Categoria)
                .join(FilaEquipo, Plantilla.id_equipo == FilaEquipo.id_equipo)
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
                'edad': edad(jugador.fecha_nacimiento, hoy),
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

    def partidos_para_visor(self, id_jugador):
        """Partidos con planilla cargada de un jugador activo, del más reciente al más antiguo; None si no existe."""
        jugador = db.session.get(FilaJugador, id_jugador)
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
