"""Torneos y categorías en la base, sobre los modelos compartidos; entrega las entidades del dominio.

Las consultas son las que hacían torneo_service, categoria_service y torneo_bp.
"""
from app.modules.torneos.domain.torneo import OCULTOS, Categoria, Torneo
from app.shared.infrastructure.db import db
from app.shared.infrastructure.modelos.categoria import Categoria as FilaCategoria
from app.shared.infrastructure.modelos.inscripcion import Inscripcion
from app.shared.infrastructure.modelos.torneo import Torneo as FilaTorneo
from app.shared.infrastructure.paginacion import paginar


def _categoria(fila):
    return Categoria(fila.id_categoria, fila.nombre_categoria, fila.genero_categoria, fila.edad_minima,
                     fila.edad_maxima, fila.formato, fila.id_torneo)


def _torneo(fila):
    return Torneo(fila.id_torneo, fila.nombre, fila.fecha_inicio, fila.fecha_fin, fila.estado, fila.url_calendario_excel,
                  fila.created_at, fila.updated_at, [_categoria(c) for c in fila.categorias])


def _pagina(query, pagina, por_pagina):
    filas, meta = paginar(query, pagina, por_pagina)
    return [_torneo(f) for f in filas], meta


class RepositorioTorneos:
    def listar_vigentes(self, anio, pagina, por_pagina):
        query = FilaTorneo.query.filter(FilaTorneo.estado.notin_(OCULTOS))
        if anio is not None:
            query = query.filter(db.extract('year', FilaTorneo.fecha_inicio) == anio)
        return _pagina(query.order_by(FilaTorneo.fecha_inicio.desc()), pagina, por_pagina)

    def listar_todos(self, pagina, por_pagina):
        return _pagina(FilaTorneo.query.order_by(FilaTorneo.fecha_inicio.desc()), pagina, por_pagina)

    def listar_por_estado(self, estado):
        return [_torneo(f) for f in FilaTorneo.query.filter_by(estado=estado).order_by(FilaTorneo.fecha_inicio.desc()).all()]

    def obtener(self, id_torneo):
        fila = db.session.get(FilaTorneo, id_torneo)
        return _torneo(fila) if fila else None

    def agregar(self, datos, categorias):
        """Inserta el torneo y sus categorías; devuelve el id del torneo."""
        fila = FilaTorneo(**datos)
        db.session.add(fila)
        db.session.flush()
        for categoria in categorias:
            db.session.add(FilaCategoria(**categoria, id_torneo=fila.id_torneo))
        return fila.id_torneo

    def actualizar(self, id_torneo, cambios):
        fila = db.session.get(FilaTorneo, id_torneo)
        for campo, valor in cambios.items():
            setattr(fila, campo, valor)

    def listar_categorias(self, genero, id_torneo):
        query = FilaCategoria.query.order_by(FilaCategoria.genero_categoria, FilaCategoria.edad_minima)
        if genero is not None:
            query = query.filter_by(genero_categoria=genero)
        if id_torneo is not None:
            query = query.filter_by(id_torneo=id_torneo)
        return [_categoria(f) for f in query.all()]

    def obtener_categoria(self, id_categoria):
        fila = db.session.get(FilaCategoria, id_categoria)
        return _categoria(fila) if fila else None

    def agregar_categoria(self, datos):
        fila = FilaCategoria(**datos)
        db.session.add(fila)
        db.session.flush()
        return fila.id_categoria

    def inscripciones_de_categoria(self, id_categoria):
        return db.session.query(Inscripcion).filter_by(id_categoria=id_categoria).count()

    def eliminar_categoria(self, id_categoria):
        db.session.delete(db.session.get(FilaCategoria, id_categoria))
