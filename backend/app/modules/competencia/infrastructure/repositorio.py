"""Partidos y sanciones en la base, sobre los modelos compartidos; entregan las entidades del dominio.

Las consultas son las que hacían partido_service, sancion_service, standings y llaves_service.
"""
from sqlalchemy import desc, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app.modules.competencia.domain.llaves import Categoria, grupos_del_formato
from app.modules.competencia.domain.partido import ESTADISTICAS, CategoriaEnPartido, EquipoEnPartido, Partido, TorneoEnPartido
from app.modules.competencia.domain.posiciones import ESTADOS_FINALES
from app.modules.competencia.domain.sancion import JugadorEnSancion, PartidoEnSancion, Sancion
from app.modules.torneos.application import casos_de_uso as torneos
from app.shared.domain.errores import Conflicto
from app.shared.infrastructure.db import db
from app.shared.infrastructure.modelos.categoria import Categoria as FilaCategoria
from app.shared.infrastructure.modelos.equipo import Equipo
from app.shared.infrastructure.modelos.estadistica import Estadistica
from app.shared.infrastructure.modelos.inscripcion import Inscripcion
from app.shared.infrastructure.modelos.partido import Partido as FilaPartido
from app.shared.infrastructure.modelos.plantilla import Plantilla
from app.shared.infrastructure.modelos.sancion import Sancion as FilaSancion
from app.shared.infrastructure.modelos.torneo import Torneo
from app.shared.infrastructure.paginacion import paginar

CAMPOS = ('id_partido', 'id_torneo', 'id_categoria', 'id_equipo_local', 'id_equipo_visitante', 'fecha', 'hora', 'estado',
          'marcador_local', 'marcador_visitante', 'fase', 'ubicacion', 'llave', 'url_planilla_fiba',
          'stats_local_procesadas', 'stats_visitante_procesadas', 'created_at', 'updated_at')


def _equipo(fila):
    return EquipoEnPartido(fila.id_equipo, fila.nombre_equipo, fila.url_logo) if fila else None


def _partido(fila):
    t, c = fila.torneo, fila.categoria
    return Partido(
        **{campo: getattr(fila, campo) for campo in CAMPOS},
        torneo=TorneoEnPartido(t.id_torneo, t.nombre, t.estado, t.fecha_inicio, t.fecha_fin) if t else None,
        categoria=CategoriaEnPartido(c.id_categoria, c.nombre_categoria, c.genero_categoria) if c else None,
        equipo_local=_equipo(fila.equipo_local),
        equipo_visitante=_equipo(fila.equipo_visitante),
    )


def _con_relaciones():
    """Partidos con torneo, categoría y los dos equipos en la misma consulta (un LEFT JOIN por relación)."""
    return FilaPartido.query.options(
        joinedload(FilaPartido.torneo),
        joinedload(FilaPartido.categoria),
        joinedload(FilaPartido.equipo_local),
        joinedload(FilaPartido.equipo_visitante),
    )


def _fase_de_grupos(id_torneo, id_categoria):
    """Finalizados de la fase de grupos (sin llave); sin categoría, los de todo el torneo."""
    query = FilaPartido.query.filter(
        FilaPartido.id_torneo == id_torneo,
        FilaPartido.estado.in_(ESTADOS_FINALES),
        FilaPartido.llave.is_(None),
    )
    if id_categoria is not None:
        query = query.filter(FilaPartido.id_categoria == id_categoria)
    return query


class RepositorioPartidos:
    def listar(self, pagina, por_pagina, *, id_torneo=None, estados=None, id_equipo=None, id_categoria=None,
               pendientes_stats=None, search=None, sort_order='asc'):
        """(partidos de la página, metadatos de paginación); sin ``estados`` quedan fuera los anulados."""
        query = _con_relaciones()
        if sort_order == 'desc':
            query = query.order_by(desc(FilaPartido.fecha), desc(FilaPartido.hora))
        else:
            query = query.order_by(FilaPartido.fecha, FilaPartido.hora)
        if id_torneo is not None:
            query = query.filter(FilaPartido.id_torneo == id_torneo)
        if estados:
            query = query.filter(FilaPartido.estado.in_(estados))
        else:
            query = query.filter(FilaPartido.estado != 'anulado')
        if id_equipo is not None:
            query = query.filter(or_(FilaPartido.id_equipo_local == id_equipo, FilaPartido.id_equipo_visitante == id_equipo))
        if id_categoria is not None:
            query = query.filter(FilaPartido.id_categoria == id_categoria)
        if pendientes_stats:
            query = query.filter(
                FilaPartido.estado == 'finalizado',
                or_(FilaPartido.stats_local_procesadas == False, FilaPartido.stats_visitante_procesadas == False),  # noqa: E712
            )
        if search:
            termino = f'%{search}%'
            # Los alias de joinedload no sirven para filtrar: la búsqueda hace sus propios JOIN.
            el, ev = db.aliased(Equipo), db.aliased(Equipo)
            query = query.outerjoin(Torneo, FilaPartido.id_torneo == Torneo.id_torneo) \
                .outerjoin(el, FilaPartido.id_equipo_local == el.id_equipo) \
                .outerjoin(ev, FilaPartido.id_equipo_visitante == ev.id_equipo) \
                .filter(or_(Torneo.nombre.ilike(termino), el.nombre_equipo.ilike(termino), ev.nombre_equipo.ilike(termino)))
        filas, meta = paginar(query, pagina, por_pagina)
        return [_partido(f) for f in filas], meta

    def obtener(self, id_partido):
        fila = _con_relaciones().filter(FilaPartido.id_partido == id_partido).first()
        return _partido(fila) if fila else None

    def agregar(self, datos):
        """Inserta el partido y devuelve su id; Conflicto si la base lo rechaza."""
        fila = FilaPartido(**datos)
        db.session.add(fila)
        try:
            # ponytail: la base revisa las restricciones aquí porque ninguna es diferida; si una se difiere, traducir también al confirmar
            db.session.flush()
        except IntegrityError as error:
            raise Conflicto('La base rechazó el partido.') from error
        return fila.id_partido

    def actualizar(self, id_partido, cambios):
        fila = db.session.get(FilaPartido, id_partido)
        for campo, valor in cambios.items():
            setattr(fila, campo, valor)

    def grupos_de_categoria(self, id_torneo, id_categoria):
        """{id_equipo: grupo} de las inscripciones aprobadas de la categoría (grupo puede ser None), con los grupos que
        tiene su formato de hoy (``grupos_del_formato``)."""
        filas = db.session.execute(
            db.select(Inscripcion.id_equipo, Inscripcion.grupo).where(
                Inscripcion.id_torneo == id_torneo,
                Inscripcion.id_categoria == id_categoria,
                Inscripcion.estado_inscripcion == 'aprobado',
            )
        ).all()
        categoria = db.session.get(FilaCategoria, id_categoria)
        return grupos_del_formato(categoria.formato if categoria else None, {f.id_equipo: f.grupo for f in filas})

    def inactivos(self):
        """Ids de los equipos inactivos: quedaron fuera de los torneos (``posiciones.relegar``)."""
        return set(db.session.execute(db.select(Equipo.id_equipo).where(Equipo.estado == 'inactivo')).scalars())

    def guardar_grupos(self, id_torneo, id_categoria, asignados):
        """Escribe en cada inscripción aprobada su grupo de ``asignados`` ({id_equipo: letra o None})."""
        for inscripcion in Inscripcion.query.filter_by(
            id_torneo=id_torneo, id_categoria=id_categoria, estado_inscripcion='aprobado'
        ).all():
            inscripcion.grupo = asignados.get(inscripcion.id_equipo)

    def partidos_fase_grupos(self, id_torneo, id_categoria=None):
        """Finalizados de la fase de grupos como tuplas para ``calcular_tabla``."""
        return [(p.id_equipo_local, p.id_equipo_visitante, p.marcador_local, p.marcador_visitante, p.estado)
                for p in _fase_de_grupos(id_torneo, id_categoria).all()]

    def partidos_fase_grupos_por_fecha(self, id_torneo, id_categoria):
        """Los mismos ordenados por fecha y con la fecha al final, para el recorrido."""
        return [(p.id_equipo_local, p.id_equipo_visitante, p.marcador_local, p.marcador_visitante, p.estado, p.fecha)
                for p in _fase_de_grupos(id_torneo, id_categoria).order_by(FilaPartido.fecha).all()]

    def pendientes_fase_grupos(self, id_torneo, id_categoria):
        """Cuántos partidos de la fase de grupos siguen programados o en curso."""
        return FilaPartido.query.filter(
            FilaPartido.id_torneo == id_torneo, FilaPartido.id_categoria == id_categoria,
            FilaPartido.llave.is_(None), FilaPartido.estado.in_(('programado', 'en_curso')),
        ).count()

    def partidos_de_llaves(self, id_torneo, id_categoria):
        """{llave: partido como dict} de los cruces no anulados de la fase final."""
        return {p.llave: p.to_dict() for p in FilaPartido.query.filter(
            FilaPartido.id_torneo == id_torneo, FilaPartido.id_categoria == id_categoria,
            FilaPartido.llave.isnot(None), FilaPartido.estado != 'anulado',
        ).all()}

    def equipos(self, ids):
        """{id_equipo: EquipoEnPartido} de los que existen."""
        filas = db.session.execute(
            db.select(Equipo.id_equipo, Equipo.nombre_equipo, Equipo.url_logo).where(Equipo.id_equipo.in_(ids))
        ).all()
        return {f.id_equipo: EquipoEnPartido(f.id_equipo, f.nombre_equipo, f.url_logo) for f in filas}

    def plantilla(self, id_torneo, id_equipo):
        """(id_jugador, nombre, dorsal) de los jugadores activos del equipo en el torneo, en todas sus categorías."""
        filas = Plantilla.query.filter_by(id_torneo=id_torneo, id_equipo=id_equipo, estado='activo') \
            .options(joinedload(Plantilla.jugador)).all()
        return [(p.jugador.id_jugador, p.jugador.nombre, p.numero_camiseta) for p in filas]

    def estadisticas(self, id_partido):
        """{id_jugador: {campo: valor}} de lo cargado en el partido."""
        return {e.id_jugador: {campo: getattr(e, campo) for campo in ESTADISTICAS}
                for e in Estadistica.query.filter_by(id_partido=id_partido).all()}

    def sancionados(self, id_partido):
        """Ids de los jugadores con una sanción activa en el partido."""
        return {s.id_jugador for s in FilaSancion.query.filter_by(id_partido=id_partido, estado='activa').all()}

    def nombre_del_torneo(self, id_torneo):
        """Nombre del torneo, o None si no existe o no está vigente (la regla es del módulo de torneos)."""
        fila = db.session.get(Torneo, id_torneo)
        return fila.nombre if fila and torneos.vigente(fila.estado) else None

    def categoria(self, id_categoria):
        fila = db.session.get(FilaCategoria, id_categoria)
        return Categoria(fila.id_categoria, fila.id_torneo, fila.formato) if fila else None

    def guardar_formato(self, id_categoria, formato):
        db.session.get(FilaCategoria, id_categoria).formato = formato


def _sancion(fila):
    j, p = fila.jugador, fila.partido
    return Sancion(
        fila.id_sancion, fila.motivo, fila.fecha, fila.estado, fila.id_jugador, fila.id_partido, fila.created_at,
        jugador=JugadorEnSancion(j.id_jugador, j.nombre) if j else None,
        partido=PartidoEnSancion(p.id_partido, p.fecha, p.estado) if p else None,
    )


class RepositorioSanciones:
    def listar(self, id_jugador=None, estado=None):
        query = FilaSancion.query.order_by(FilaSancion.fecha.desc())
        if id_jugador:
            query = query.filter_by(id_jugador=id_jugador)
        if estado:
            query = query.filter_by(estado=estado)
        return [_sancion(f) for f in query.all()]

    def obtener(self, id_sancion):
        fila = db.session.get(FilaSancion, id_sancion)
        return _sancion(fila) if fila else None

    def agregar(self, motivo, fecha, id_jugador, id_partido):
        fila = FilaSancion(motivo=motivo, fecha=fecha, id_jugador=id_jugador, id_partido=id_partido)
        db.session.add(fila)
        db.session.flush()
        return fila.id_sancion

    def actualizar(self, id_sancion, cambios):
        fila = db.session.get(FilaSancion, id_sancion)
        for campo, valor in cambios.items():
            setattr(fila, campo, valor)
