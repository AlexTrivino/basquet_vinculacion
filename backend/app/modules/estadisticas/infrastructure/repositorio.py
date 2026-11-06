"""Estadísticas en la base, sobre los modelos compartidos.

Las consultas son las que hacían stats_bp, stats_service, lideres_service, flyers_service y reportes_service. Los
flyers, el tablero y la actividad reciente devuelven los mismos diccionarios que antes.
"""
from collections import Counter, defaultdict

from sqlalchemy import delete, func, insert, or_
from sqlalchemy.orm import joinedload, selectinload

from app.modules.estadisticas.domain.estadisticas import (
    CON_PUNTOS, JUGADOS, LineaDePlanilla, PartidoParaCarga, Planilla, etiqueta_categoria, orden_de_figura, valoracion,
)
from app.modules.torneos.application import casos_de_uso as torneos
from app.shared.infrastructure.db import db
from app.shared.infrastructure.modelos import Categoria, Equipo, Estadistica, Inscripcion, Jugador, Partido, Plantilla, Sancion, Torneo

CAMPOS = ('puntos', 'rebotes', 'asistencias', 'tapones', 'triples', 'tiros_libres')


def _linea(e):
    return {
        'puntos': e.puntos_anotados or 0, 'rebotes': e.rebotes or 0, 'asistencias': e.asistencias or 0,
        'tapones': e.tapones or 0, 'triples': e.triples_anotados or 0, 'tiros_libres': e.tiros_libres_anotados or 0,
    }


class RepositorioEstadisticas:
    # ── Portada y tablero ─────────────────────────────────────────
    def puntos_por_torneo(self):
        """{id_torneo: puntos anotados en sus partidos que cuentan para la portada}."""
        return dict(
            db.session.query(Partido.id_torneo, func.sum(Partido.marcador_local + Partido.marcador_visitante))
            .filter(Partido.estado.in_(CON_PUNTOS))
            .group_by(Partido.id_torneo)
            .all()
        )

    def contadores(self):
        return {
            'inscripciones_pendientes': Inscripcion.query.filter_by(estado_inscripcion='pendiente').count(),
            'partidos_hoy': Partido.query.filter_by(estado='programado').count(),
            'equipos_totales': Equipo.query.count(),
            'partidos_sin_estadisticas': Partido.query.filter(
                Partido.estado == 'finalizado',
                or_(Partido.stats_local_procesadas == False, Partido.stats_visitante_procesadas == False),  # noqa: E712
            ).count(),
        }

    def actividad_reciente(self):
        """Los 8 movimientos más recientes entre las últimas 5 inscripciones y los últimos 5 partidos finalizados."""
        eventos = [{
            'tipo': 'inscripcion',
            'titulo': f'Inscripción {i.estado_inscripcion.upper()}',
            'descripcion': f'Equipo ID {i.id_equipo} en Torneo ID {i.id_torneo}',
            'fecha': i.updated_at.isoformat() if i.updated_at else None,
            'estado': i.estado_inscripcion,
        } for i in Inscripcion.query.order_by(Inscripcion.updated_at.desc()).limit(5).all()]
        eventos += [{
            'tipo': 'partido',
            'titulo': 'Partido Finalizado',
            'descripcion': f'{p.marcador_local} - {p.marcador_visitante}',
            'fecha': p.updated_at.isoformat() if p.updated_at else None,
            'estado': p.estado,
        } for p in Partido.query.filter_by(estado='finalizado').order_by(Partido.updated_at.desc()).limit(5).all()]
        eventos.sort(key=lambda x: x['fecha'] or '', reverse=True)
        return eventos[:8]

    # ── Líderes ───────────────────────────────────────────────────
    def nombre_del_torneo(self, id_torneo):
        """El nombre del torneo, o None si no existe o no está vigente (la regla es del módulo de torneos)."""
        fila = db.session.get(Torneo, id_torneo)
        return fila.nombre if fila and torneos.vigente(fila.estado) else None

    def totales_por_jugador(self, id_torneo, id_categoria=None):
        """Los totales de cada jugador (con el equipo de su plantilla en la categoría) en los partidos que cuentan."""
        # Una sola fila de plantilla por jugador y categoría, la más nueva: quien fue removido y vuelto a agregar tiene
        # dos (la inactiva queda), y unirse con las dos le sumaba todo doble
        ultima = (
            db.session.query(func.max(Plantilla.id_plantilla).label('id_plantilla'))
            .group_by(Plantilla.id_jugador, Plantilla.id_torneo, Plantilla.id_categoria)
            .subquery()
        )
        query = (
            db.session.query(
                Estadistica.id_jugador,
                Jugador.nombre.label('nombre_jugador'),
                Jugador.url_foto.label('url_foto_jugador'),
                Equipo.nombre_equipo,
                func.count(func.distinct(Partido.id_partido)).label('partidos_jugados'),
                func.sum(Estadistica.puntos_anotados).label('puntos_totales'),
                func.sum(Estadistica.triples_anotados).label('triples_totales'),
                func.sum(Estadistica.rebotes).label('rebotes_totales'),
                func.sum(Estadistica.asistencias).label('asistencias_totales'),
                func.sum(Estadistica.tapones).label('tapones_totales'),
                func.sum(Estadistica.tiros_libres_anotados).label('tiros_libres_totales')
            )
            .join(Partido, Estadistica.id_partido == Partido.id_partido)
            .join(Jugador, Estadistica.id_jugador == Jugador.id_jugador)
            .join(Plantilla, (Plantilla.id_jugador == Jugador.id_jugador) & (Plantilla.id_torneo == Partido.id_torneo)
                  & (Plantilla.id_categoria == Partido.id_categoria))
            .join(ultima, ultima.c.id_plantilla == Plantilla.id_plantilla)
            .join(Equipo, Plantilla.id_equipo == Equipo.id_equipo)
            .filter(Partido.id_torneo == id_torneo)
            .filter(Partido.estado.in_(JUGADOS))
        )
        if id_categoria:
            query = query.filter(Partido.id_categoria == id_categoria)
        query = query.group_by(Estadistica.id_jugador, Jugador.nombre, Jugador.url_foto, Equipo.nombre_equipo)
        return [{
            'id_jugador': row.id_jugador,
            'nombre': row.nombre_jugador,
            'url_foto': row.url_foto_jugador,
            'nombre_equipo': row.nombre_equipo,
            'partidos_jugados': row.partidos_jugados or 0,
            'puntos': int(row.puntos_totales or 0),
            'triples': int(row.triples_totales or 0),
            'rebotes': int(row.rebotes_totales or 0),
            'asistencias': int(row.asistencias_totales or 0),
            'tapones': int(row.tapones_totales or 0),
            'tiros_libres': int(row.tiros_libres_totales or 0),
        } for row in query.all()]

    def torneos_vigentes(self):
        """Los ids de los torneos en curso o programados (uno programado puede tener partidos jugados si nadie le
        cambió el estado), del que empezó antes al último."""
        filas = (db.session.query(Torneo.id_torneo).filter(Torneo.estado.in_(('en_curso', 'programado')))
                 .order_by(Torneo.fecha_inicio, Torneo.id_torneo))
        return [id_torneo for (id_torneo,) in filas]

    def torneos_finalizados(self):
        """Los ids de los torneos finalizados, del que terminó último al primero."""
        filas = (db.session.query(Torneo.id_torneo).filter(Torneo.estado == 'finalizado')
                 .order_by(Torneo.fecha_fin.desc(), Torneo.id_torneo.desc()))
        return [id_torneo for (id_torneo,) in filas]

    # ── Flyers ────────────────────────────────────────────────────
    def flyers(self, id_torneo, fecha=None):
        """Resultados de ``fecha`` (por defecto la última con partidos jugados) con la figura de cada partido y de la
        fecha, las figuras por categoría y por equipo, y los totales por jugador de la fecha y del torneo (con ellos
        el frontend ordena a los líderes). None si el torneo no existe.

        El equipo de cada jugador en un partido sale de la plantilla del torneo: es el lado del partido (local o
        visitante) en cuya plantilla está.
        """
        torneo = db.session.get(Torneo, id_torneo)
        if torneo is None:
            return None

        partidos = Partido.query.filter(Partido.id_torneo == id_torneo, Partido.estado.in_(JUGADOS)).all()
        fechas = sorted({p.fecha for p in partidos}, reverse=True)
        if fecha is None and fechas:
            fecha = fechas[0]

        categorias = {c.id_categoria: etiqueta_categoria(c.nombre_categoria, c.genero_categoria)
                      for c in Categoria.query.filter_by(id_torneo=id_torneo).all()}
        ids_equipos = {i for p in partidos for i in (p.id_equipo_local, p.id_equipo_visitante)}
        equipos = {e.id_equipo: e for e in Equipo.query.filter(Equipo.id_equipo.in_(ids_equipos)).all()} if ids_equipos else {}
        plantilla = {
            (p.id_jugador, p.id_equipo): p.numero_camiseta
            for p in Plantilla.query.filter_by(id_torneo=id_torneo).all()
        }
        estadisticas = (
            Estadistica.query.options(joinedload(Estadistica.jugador))
            .join(Partido, Partido.id_partido == Estadistica.id_partido)
            .filter(Partido.id_torneo == id_torneo, Partido.estado.in_(CON_PUNTOS))
            .all()
        )
        por_id = {p.id_partido: p for p in partidos}

        def ficha_equipo(id_equipo):
            e = equipos.get(id_equipo)
            return {'id_equipo': id_equipo, 'nombre_equipo': e.nombre_equipo if e else f'Equipo #{id_equipo}', 'url_logo': e.url_logo if e else None}

        def nombre_partido(p):
            return f"{ficha_equipo(p.id_equipo_local)['nombre_equipo']} vs {ficha_equipo(p.id_equipo_visitante)['nombre_equipo']}"

        # Cada estadística con su partido y el equipo del jugador en ese partido
        filas = []
        for e in estadisticas:
            p = por_id.get(e.id_partido)
            if p is None:
                continue
            equipo = next((lado for lado in (p.id_equipo_local, p.id_equipo_visitante) if (e.id_jugador, lado) in plantilla), None)
            filas.append((e, p, equipo))

        def figura(e, p, equipo):
            linea = _linea(e)
            return {
                'jugador': {
                    'id_jugador': e.id_jugador,
                    'nombre': e.jugador.nombre if e.jugador else f'Jugador #{e.id_jugador}',
                    'url_foto': e.jugador.url_foto if e.jugador else None,
                    'numero_camiseta': plantilla.get((e.id_jugador, equipo)),
                },
                'equipo': ficha_equipo(equipo) if equipo else None,
                'categoria': categorias.get(p.id_categoria),
                'partido': nombre_partido(p),
                'linea': linea,
                'valoracion': valoracion(linea),
            }

        # ── Resultados de la fecha y su figura ──
        del_dia = sorted((p for p in partidos if p.fecha == fecha), key=lambda p: (p.hora, p.id_partido))
        figuras_partido = {}
        for e, p, equipo in filas:
            if p.fecha == fecha:
                f = figura(e, p, equipo)
                if p.id_partido not in figuras_partido or orden_de_figura(f) > orden_de_figura(figuras_partido[p.id_partido]):
                    figuras_partido[p.id_partido] = f
        resultados = [
            {
                'id_partido': p.id_partido,
                'hora': p.hora.strftime('%H:%M') if p.hora else None,
                'categoria': categorias.get(p.id_categoria),
                'fase': p.fase,
                'estado': p.estado,
                'local': dict(ficha_equipo(p.id_equipo_local), marcador=p.marcador_local),
                'visitante': dict(ficha_equipo(p.id_equipo_visitante), marcador=p.marcador_visitante),
                'figura': figuras_partido.get(p.id_partido),
            }
            for p in del_dia
        ]
        figura_fecha = max(figuras_partido.values(), key=orden_de_figura, default=None)

        # ── Totales por jugador (y categoría): del torneo y de la fecha ──
        def acumular(filas_elegidas):
            acumulado = defaultdict(lambda: {'linea': dict.fromkeys(CAMPOS, 0), 'partidos': 0, 'equipos': Counter(), 'jugador': None, 'ultimo': None})
            for e, p, equipo in filas_elegidas:
                a = acumulado[(p.id_categoria, e.id_jugador)]
                for campo, valor in _linea(e).items():
                    a['linea'][campo] += valor
                a['partidos'] += 1
                if equipo:
                    a['equipos'][equipo] += 1
                a['jugador'], a['ultimo'] = e.jugador, p
            return acumulado

        acumulado = acumular(filas)

        def figura_acumulada(id_categoria, id_jugador, a):
            equipo = a['equipos'].most_common(1)[0][0] if a['equipos'] else None
            return {
                'jugador': {
                    'id_jugador': id_jugador,
                    'nombre': a['jugador'].nombre if a['jugador'] else f'Jugador #{id_jugador}',
                    'url_foto': a['jugador'].url_foto if a['jugador'] else None,
                    'numero_camiseta': plantilla.get((id_jugador, equipo)),
                },
                'equipo': ficha_equipo(equipo) if equipo else None,
                'categoria': categorias.get(id_categoria),
                'id_categoria': id_categoria,
                'linea': a['linea'],
                'partidos': a['partidos'],
                'partido': nombre_partido(a['ultimo']) if a['partidos'] == 1 else None,
                'promedio_puntos': round(a['linea']['puntos'] / a['partidos'], 1) if a['partidos'] else 0,
                'valoracion': valoracion(a['linea']),
            }

        mejores_categoria, mejores_equipo = {}, {}
        for (id_categoria, id_jugador), a in acumulado.items():
            f = figura_acumulada(id_categoria, id_jugador, a)
            if id_categoria not in mejores_categoria or orden_de_figura(f) > orden_de_figura(mejores_categoria[id_categoria]):
                mejores_categoria[id_categoria] = f
            if f['equipo']:
                clave = (f['equipo']['id_equipo'], id_categoria)
                if clave not in mejores_equipo or orden_de_figura(f) > orden_de_figura(mejores_equipo[clave]):
                    mejores_equipo[clave] = f

        return {
            'torneo': {'id_torneo': torneo.id_torneo, 'nombre': torneo.nombre},
            'fecha': fecha.isoformat() if fecha else None,
            'fechas': [f.isoformat() for f in fechas],
            'resultados': resultados,
            'figura_fecha': figura_fecha,
            'figuras_categoria': sorted(mejores_categoria.values(), key=lambda f: f['categoria'] or ''),
            'figuras_equipo': sorted(mejores_equipo.values(), key=lambda f: (f['categoria'] or '', f['equipo']['nombre_equipo'])),
            'jugadores_fecha': [figura_acumulada(c, j, a) for (c, j), a in acumular(f for f in filas if f[1].fecha == fecha).items()],
            'jugadores_torneo': [figura_acumulada(c, j, a) for (c, j), a in acumulado.items()],
        }

    # ── Planilla ──────────────────────────────────────────────────
    def planilla(self, id_partido):
        """La planilla del partido, o None si no existe. El dorsal y el equipo de cada jugador salen de la plantilla del
        torneo (dos consultas: el partido con todo lo suyo y esas plantillas)."""
        partido = (
            Partido.query
            .options(
                joinedload(Partido.torneo),
                joinedload(Partido.equipo_local),
                joinedload(Partido.equipo_visitante),
                selectinload(Partido.estadisticas).joinedload(Estadistica.jugador),
            )
            .filter(Partido.id_partido == id_partido)
            .first()
        )
        if partido is None:
            return None
        plantillas = Plantilla.query.filter(
            Plantilla.id_torneo == partido.id_torneo,
            Plantilla.id_equipo.in_([partido.id_equipo_local, partido.id_equipo_visitante]),
        ).all()
        camiseta = {p.id_jugador: p.numero_camiseta for p in plantillas}
        equipo_de = {p.id_jugador: p.id_equipo for p in plantillas}

        def lineas(id_equipo):
            propias = [e for e in partido.estadisticas if equipo_de.get(e.id_jugador) == id_equipo]
            propias.sort(key=lambda e: e.puntos_anotados, reverse=True)
            return [LineaDePlanilla(camiseta.get(e.id_jugador, '-'), e.jugador.nombre, e.puntos_anotados, e.triples_anotados,
                                    e.faltas_cometidas, e.rebotes, e.asistencias) for e in propias]

        return Planilla(
            partido.id_partido, partido.estado, partido.torneo.nombre if partido.torneo else None, partido.fase, partido.fecha,
            partido.hora, partido.ubicacion, partido.equipo_local.nombre_equipo if partido.equipo_local else None,
            partido.equipo_visitante.nombre_equipo if partido.equipo_visitante else None, partido.marcador_local,
            partido.marcador_visitante, lineas(partido.id_equipo_local), lineas(partido.id_equipo_visitante),
        )

    # ── Carga ─────────────────────────────────────────────────────
    def partido_para_carga(self, id_partido):
        p = db.session.get(Partido, id_partido)
        if p is None:
            return None
        return PartidoParaCarga(p.id_torneo, p.estado, p.id_equipo_local, p.id_equipo_visitante, p.marcador_local, p.marcador_visitante)

    def en_plantilla(self, id_equipo, id_torneo, ids):
        """Cuáles de ``ids`` están activos en la plantilla del equipo en el torneo, en una sola consulta."""
        return {
            fila[0]
            for fila in db.session.execute(
                db.select(Plantilla.id_jugador).where(
                    Plantilla.id_equipo == id_equipo,
                    Plantilla.id_torneo == id_torneo,
                    Plantilla.estado == 'activo',
                    Plantilla.id_jugador.in_(ids),
                )
            ).all()
        }

    def reemplazar_lineas(self, id_partido, jugadores):
        """Borra las líneas que esos jugadores ya tenían en el partido e inserta las nuevas en una sola sentencia."""
        db.session.execute(delete(Estadistica).where(
            Estadistica.id_partido == id_partido, Estadistica.id_jugador.in_({j['id_jugador'] for j in jugadores})))
        db.session.execute(insert(Estadistica), [{
            'id_partido': id_partido,
            'id_jugador': j['id_jugador'],
            'puntos_anotados': j['puntos'],
            'triples_anotados': j['triples'],
            'faltas_cometidas': j['faltas'],
            'rebotes': j['rebotes'],
            'asistencias': j['asistencias'],
            'tapones': j.get('tapones', 0),
            'tiros_libres_anotados': j.get('tiros_libres', 0),
        } for j in jugadores])

    def agregar_sanciones(self, id_partido, sancionados, fecha):
        """``sancionados``: (id_jugador, motivo) de cada sanción, activa desde ``fecha``."""
        db.session.execute(insert(Sancion), [
            {'id_partido': id_partido, 'id_jugador': id_jugador, 'motivo': motivo, 'fecha': fecha, 'estado': 'activa'}
            for id_jugador, motivo in sancionados
        ])

    def marcar_procesadas(self, id_partido, local):
        """Deja anotado que el partido ya tiene las estadísticas del equipo local (o del visitante)."""
        partido = db.session.get(Partido, id_partido)
        if local:
            partido.stats_local_procesadas = True
        else:
            partido.stats_visitante_procesadas = True
