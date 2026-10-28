"""Inscripciones y plantillas en la base, sobre los modelos compartidos; entregan las entidades del dominio.

Las consultas son las que hacían inscripcion_service, plantilla_service, inscripcion_bp y plantilla_bp.
"""
from sqlalchemy import func
from sqlalchemy.orm import joinedload

from app.modules.inscripciones.domain.inscripcion import (
    ESTADOS, CategoriaResumen, EquipoResumen, Inscripcion, TorneoResumen, UsuarioResumen,
)
from app.modules.inscripciones.domain.plantilla import VIGENTES, CategoriaInscrita, JugadorDePlantilla, Plantilla
from app.shared.infrastructure.db import db, enviar_cambios
from app.shared.infrastructure.modelos.categoria import Categoria
from app.shared.infrastructure.modelos.documento_jugador import DocumentoJugador
from app.shared.infrastructure.modelos.equipo import Equipo
from app.shared.infrastructure.modelos.estadistica import Estadistica
from app.shared.infrastructure.modelos.inscripcion import Inscripcion as FilaInscripcion
from app.shared.infrastructure.modelos.jugador import Jugador
from app.shared.infrastructure.modelos.partido import Partido
from app.shared.infrastructure.modelos.plantilla import Plantilla as FilaPlantilla
from app.shared.infrastructure.modelos.sancion import Sancion
from app.shared.infrastructure.modelos.torneo import Torneo
from app.shared.infrastructure.paginacion import paginar


def _estado_del_torneo(id_torneo):
    torneo = db.session.get(Torneo, id_torneo)
    return torneo.estado if torneo else None


def _actualizar(modelo, id_fila, cambios):
    fila = db.session.get(modelo, id_fila)
    for campo, valor in cambios.items():
        setattr(fila, campo, valor)


# ── Inscripciones ─────────────────────────────────────────────────

def _equipo(fila):
    if fila is None:
        return None
    usuario = fila.usuario
    return EquipoResumen(fila.id_equipo, fila.nombre_equipo, fila.id_usuario, fila.estado, fila.url_logo,
                         UsuarioResumen(usuario.nombre, usuario.correo) if usuario else None)


def _inscripcion(fila):
    torneo, categoria = fila.torneo, fila.categoria
    return Inscripcion(
        fila.id_inscripcion, fila.id_torneo, fila.id_equipo, fila.id_categoria, fila.estado_inscripcion, fila.fecha_inscripcion,
        fila.grupo, fila.url_comprobante_pago, fila.created_at, fila.updated_at,
        TorneoResumen(torneo.id_torneo, torneo.nombre, torneo.estado, torneo.fecha_inicio, torneo.fecha_fin) if torneo else None,
        _equipo(fila.equipo),
        CategoriaResumen(categoria.id_categoria, categoria.nombre_categoria, categoria.genero_categoria, categoria.edad_minima,
                         categoria.edad_maxima) if categoria else None,
    )


class RepositorioInscripciones:
    def _con_relaciones(self):
        """Torneo, equipo (con su delegado) y categoría en la misma consulta."""
        return FilaInscripcion.query.options(
            joinedload(FilaInscripcion.torneo),
            joinedload(FilaInscripcion.equipo).joinedload(Equipo.usuario),
            joinedload(FilaInscripcion.categoria),
        )

    def listar(self, pagina, por_pagina, *, id_torneo=None, estado=None, id_categoria=None, id_equipo=None,
               incluir_borradores=False, id_delegado=None):
        """(inscripciones de la página, metadatos), de la más reciente a la más antigua. Sin un ``estado`` válido, los
        borradores quedan fuera salvo con ``incluir_borradores``; con ``id_delegado``, solo las de sus equipos activos."""
        query = self._con_relaciones().order_by(FilaInscripcion.fecha_inscripcion.desc())
        if id_torneo is not None:
            query = query.filter(FilaInscripcion.id_torneo == id_torneo)
        if estado in ESTADOS:
            query = query.filter(FilaInscripcion.estado_inscripcion == estado)
        elif not incluir_borradores:
            query = query.filter(FilaInscripcion.estado_inscripcion != 'borrador')
        if id_categoria is not None:
            query = query.filter(FilaInscripcion.id_categoria == id_categoria)
        if id_equipo:
            query = query.filter(FilaInscripcion.id_equipo == id_equipo)
        if id_delegado is not None:
            # El filtro va en la consulta, no después, para que la paginación cuente solo lo suyo
            query = query.join(Equipo, FilaInscripcion.id_equipo == Equipo.id_equipo).filter(
                Equipo.id_usuario == id_delegado, Equipo.estado == 'activo')
        filas, meta = paginar(query, pagina, por_pagina)
        return [_inscripcion(f) for f in filas], meta

    def obtener(self, id_inscripcion):
        fila = self._con_relaciones().filter(FilaInscripcion.id_inscripcion == id_inscripcion).first()
        return _inscripcion(fila) if fila else None

    def estado_del_torneo(self, id_torneo):
        return _estado_del_torneo(id_torneo)

    def existe_categoria(self, id_categoria):
        return db.session.get(Categoria, id_categoria) is not None

    def equipo(self, id_equipo):
        return _equipo(db.session.get(Equipo, id_equipo))

    def equipos_activos_de(self, id_usuario):
        return Equipo.query.filter_by(id_usuario=id_usuario, estado='activo').count()

    def borradores_de(self, id_usuario):
        """Cuántas inscripciones en borrador tienen los equipos del delegado."""
        return FilaInscripcion.query.join(Equipo).filter(
            Equipo.id_usuario == id_usuario, FilaInscripcion.estado_inscripcion == 'borrador').count()

    def buscar(self, id_torneo, id_equipo, id_categoria):
        """El id de la inscripción del equipo en ese torneo y categoría, o None."""
        fila = FilaInscripcion.query.filter_by(id_torneo=id_torneo, id_equipo=id_equipo, id_categoria=id_categoria).first()
        return fila.id_inscripcion if fila else None

    def anterior_en_otro_torneo(self, id_equipo, id_torneo):
        """(torneo, categoría) de la inscripción más reciente del equipo en otro torneo que no fue rechazada, o None."""
        fila = (
            FilaInscripcion.query
            .filter(FilaInscripcion.id_equipo == id_equipo, FilaInscripcion.id_torneo != id_torneo,
                    FilaInscripcion.estado_inscripcion != 'rechazado')
            .order_by(FilaInscripcion.fecha_inscripcion.desc())
            .first()
        )
        return (fila.id_torneo, fila.id_categoria) if fila else None

    def agregar(self, datos):
        fila = FilaInscripcion(**datos)
        db.session.add(fila)
        enviar_cambios()
        return fila.id_inscripcion

    def agregar_equipo(self, nombre_equipo, id_usuario):
        fila = Equipo(nombre_equipo=nombre_equipo, id_usuario=id_usuario)
        db.session.add(fila)
        db.session.flush()
        return fila.id_equipo

    def actualizar(self, id_inscripcion, cambios):
        _actualizar(FilaInscripcion, id_inscripcion, cambios)

    def actualizar_equipo(self, id_equipo, cambios):
        _actualizar(Equipo, id_equipo, cambios)

    # La plantilla vista desde la inscripción
    def plantilla_de(self, id_equipo, id_torneo, id_categoria):
        """(jugador, dorsal) de cada entrada del equipo en ese torneo y categoría, también las inactivas."""
        filas = FilaPlantilla.query.filter_by(id_equipo=id_equipo, id_torneo=id_torneo, id_categoria=id_categoria).all()
        return [(p.id_jugador, p.numero_camiseta) for p in filas]

    def juega_en(self, id_jugador, id_torneo):
        """Si el jugador tiene alguna entrada, activa o no, en el torneo."""
        return FilaPlantilla.query.filter_by(id_jugador=id_jugador, id_torneo=id_torneo).first() is not None

    def agregar_a_plantilla(self, **datos):
        db.session.add(FilaPlantilla(**datos))

    def dorsales_activos(self, id_equipo, id_torneo):
        """El dorsal de cada jugador activo del equipo en el torneo, en todas sus categorías."""
        filas = FilaPlantilla.query.filter_by(id_equipo=id_equipo, id_torneo=id_torneo, estado='activo').all()
        return [p.numero_camiseta for p in filas]

    def mover_plantilla(self, id_equipo, desde, hacia):
        """La plantilla del equipo pasa de (torneo, categoría) ``desde`` a ``hacia``."""
        FilaPlantilla.query.filter_by(id_equipo=id_equipo, id_torneo=desde[0], id_categoria=desde[1]).update(
            {'id_torneo': hacia[0], 'id_categoria': hacia[1]}, synchronize_session=False)

    def borrar_partidos_programados(self, id_torneo, id_equipo):
        partidos = Partido.query.filter(
            Partido.id_torneo == id_torneo,
            Partido.estado == 'programado',
            db.or_(Partido.id_equipo_local == id_equipo, Partido.id_equipo_visitante == id_equipo),
        ).all()
        for partido in partidos:
            db.session.delete(partido)

    def expiradas(self, limite):
        """Ids de los borradores y rechazos sin movimiento desde antes de ``limite``."""
        filas = FilaInscripcion.query.filter(
            FilaInscripcion.estado_inscripcion.in_(['borrador', 'rechazado']),
            func.coalesce(FilaInscripcion.updated_at, FilaInscripcion.fecha_inscripcion, FilaInscripcion.created_at) < limite,
        ).all()
        return [f.id_inscripcion for f in filas]

    def borrar(self, id_inscripcion):
        """Borra la inscripción y la plantilla del equipo en ese torneo; también los jugadores que solo estaban ahí (sin
        otras plantillas, sanciones ni estadísticas) con sus documentos, y el equipo si se queda sin inscripciones.

        Devuelve (las URL de Storage que quedaron sin dueño, si se borró el equipo).
        """
        inscripcion = db.session.get(FilaInscripcion, id_inscripcion)
        archivos = []
        equipo = inscripcion.equipo
        id_equipo = equipo.id_equipo if equipo else inscripcion.id_equipo

        plantillas_torneo = FilaPlantilla.query.filter_by(id_equipo=id_equipo, id_torneo=inscripcion.id_torneo).all()
        id_jugadores = list({p.id_jugador for p in plantillas_torneo})
        for plantilla in plantillas_torneo:
            db.session.delete(plantilla)
        db.session.flush()

        for id_jugador in id_jugadores:
            otras_plantillas = FilaPlantilla.query.filter_by(id_jugador=id_jugador).count()
            tiene_sanciones = Sancion.query.filter_by(id_jugador=id_jugador).count()
            tiene_estadisticas = Estadistica.query.filter_by(id_jugador=id_jugador).count()
            if otras_plantillas == 0 and tiene_sanciones == 0 and tiene_estadisticas == 0:
                jugador = db.session.get(Jugador, id_jugador)
                if jugador:
                    archivos += [url for url in (jugador.url_foto, jugador.url_cedula, jugador.url_acta_bachiller) if url]
                    for documento in DocumentoJugador.query.filter_by(id_jugador=id_jugador).all():
                        if documento.url_documento:
                            archivos.append(documento.url_documento)
                        db.session.delete(documento)
                    db.session.delete(jugador)

        if inscripcion.url_comprobante_pago:
            archivos.append(inscripcion.url_comprobante_pago)
        db.session.delete(inscripcion)
        db.session.flush()

        equipo_borrado = False
        if equipo and FilaInscripcion.query.filter_by(id_equipo=id_equipo).count() == 0:  # un equipo nuevo, sin historial
            if equipo.url_logo:
                archivos.append(equipo.url_logo)
            db.session.delete(equipo)
            equipo_borrado = True
        return archivos, equipo_borrado


# ── Plantillas ────────────────────────────────────────────────────

def _jugador(fila):
    if fila is None:
        return None
    return JugadorDePlantilla(fila.id_jugador, fila.nombre, fila.genero, fila.documento_identificacion, fila.fecha_nacimiento,
                              fila.telefono, fila.correo, fila.url_foto, fila.url_cedula, fila.url_acta_bachiller, fila.estado)


def _plantilla(fila):
    return Plantilla(fila.id_plantilla, fila.id_jugador, fila.id_torneo, fila.id_equipo, fila.id_categoria, fila.numero_camiseta,
                     fila.estado, fila.created_at, fila.updated_at, fila.equipo.id_usuario if fila.equipo else None,
                     _jugador(fila.jugador))


class RepositorioPlantillas:
    def _activas(self):
        return FilaPlantilla.activos().options(joinedload(FilaPlantilla.jugador))

    def listar(self, pagina, por_pagina, id_equipo=None, id_torneo=None, id_categoria=None):
        """(entradas activas de la página, metadatos), por dorsal."""
        query = self._activas().order_by(FilaPlantilla.numero_camiseta)
        if id_equipo is not None:
            query = query.filter(FilaPlantilla.id_equipo == id_equipo)
        if id_torneo is not None:
            query = query.filter(FilaPlantilla.id_torneo == id_torneo)
        if id_categoria is not None:
            query = query.filter(FilaPlantilla.id_categoria == id_categoria)
        filas, meta = paginar(query, pagina, por_pagina)
        return [_plantilla(f) for f in filas], meta

    def obtener(self, id_plantilla):
        fila = self._activas().filter(FilaPlantilla.id_plantilla == id_plantilla).first()
        return _plantilla(fila) if fila else None

    def estado_del_torneo(self, id_torneo):
        return _estado_del_torneo(id_torneo)

    def dueno_del_equipo(self, id_equipo):
        equipo = db.session.get(Equipo, id_equipo)
        return equipo.id_usuario if equipo else None

    def jugador(self, id_jugador):
        return _jugador(db.session.get(Jugador, id_jugador))

    def categoria_inscrita(self, id_equipo, id_torneo, id_categoria):
        """La categoría de la inscripción vigente (borrador, pendiente o aprobada) del equipo, o None."""
        inscripcion = (
            FilaInscripcion.query
            .options(joinedload(FilaInscripcion.categoria))
            .filter(FilaInscripcion.id_equipo == id_equipo, FilaInscripcion.id_torneo == id_torneo,
                    FilaInscripcion.id_categoria == id_categoria, FilaInscripcion.estado_inscripcion.in_(VIGENTES))
            .first()
        )
        if inscripcion is None:
            return None
        categoria = inscripcion.categoria
        return CategoriaInscrita(inscripcion.id_categoria, categoria.nombre_categoria, categoria.edad_minima, categoria.edad_maxima)

    def activos_en(self, id_equipo, id_torneo, id_categoria):
        return FilaPlantilla.query.filter_by(id_equipo=id_equipo, id_torneo=id_torneo, id_categoria=id_categoria,
                                             estado='activo').count()

    def juega_la_categoria(self, id_jugador, id_torneo, id_categoria):
        """Si el jugador tiene entrada activa en un equipo aprobado en esa categoría del torneo."""
        entrada = (
            FilaPlantilla.query
            .join(FilaInscripcion, db.and_(
                FilaInscripcion.id_equipo == FilaPlantilla.id_equipo,
                FilaInscripcion.id_torneo == FilaPlantilla.id_torneo,
                FilaInscripcion.estado_inscripcion == 'aprobado',
            ))
            .filter(FilaPlantilla.id_jugador == id_jugador, FilaPlantilla.id_torneo == id_torneo, FilaPlantilla.estado == 'activo',
                    FilaInscripcion.id_categoria == id_categoria)
            .first()
        )
        return entrada is not None

    def dorsal_ocupado(self, id_equipo, id_torneo, numero, id_categoria=None, salvo=None):
        """Si un jugador activo del equipo (otro que la entrada ``salvo``) usa ese dorsal en el torneo, o en esa
        categoría si se da."""
        query = FilaPlantilla.activos().filter(FilaPlantilla.id_equipo == id_equipo, FilaPlantilla.id_torneo == id_torneo,
                                               FilaPlantilla.numero_camiseta == numero)
        if id_categoria is not None:
            query = query.filter(FilaPlantilla.id_categoria == id_categoria)
        if salvo is not None:
            query = query.filter(FilaPlantilla.id_plantilla != salvo)
        return query.first() is not None

    def agregar(self, datos):
        fila = FilaPlantilla(**datos)
        db.session.add(fila)
        enviar_cambios()
        return fila.id_plantilla

    def actualizar(self, id_plantilla, cambios):
        _actualizar(FilaPlantilla, id_plantilla, cambios)
