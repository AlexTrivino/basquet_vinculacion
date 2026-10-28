"""Patrocinadores en la base, sobre el modelo compartido; entrega y recibe la entidad del dominio."""
from app.modules.auspicios.domain.patrocinador import Patrocinador
from app.shared.infrastructure.db import db
from app.shared.infrastructure.modelos.patrocinador import Patrocinador as Fila

EDITABLES = ('nombre_patrocinador', 'url_logo_patrocinador', 'url_imagen_promocional')


def _entidad(fila):
    return Patrocinador(**{campo: getattr(fila, campo) for campo in (*EDITABLES, 'id_patrocinador', 'created_at', 'updated_at')})


class RepositorioPatrocinadores:
    def listar(self):
        return [_entidad(fila) for fila in Fila.query.order_by(Fila.created_at.desc()).all()]

    def obtener(self, id_patrocinador):
        fila = db.session.get(Fila, id_patrocinador)
        return _entidad(fila) if fila else None

    def agregar(self, patrocinador):
        fila = Fila(**{campo: getattr(patrocinador, campo) for campo in EDITABLES})
        db.session.add(fila)
        db.session.flush()
        return fila.id_patrocinador

    def guardar(self, patrocinador):
        fila = db.session.get(Fila, patrocinador.id_patrocinador)
        for campo in EDITABLES:
            setattr(fila, campo, getattr(patrocinador, campo))

    def eliminar(self, id_patrocinador):
        db.session.delete(db.session.get(Fila, id_patrocinador))
