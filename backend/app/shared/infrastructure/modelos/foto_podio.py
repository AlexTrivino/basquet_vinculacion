"""Modelo de FotoPodio — la foto de un equipo en el podio de una categoría y su encuadre en el flyer."""
from app.shared.infrastructure.db import db


class FotoPodio(db.Model):
    """Una foto por equipo en cada categoría (la categoría es de un solo torneo). Sigue al equipo y no al puesto:
    si se corrige la final y cambia el campeón, la foto no queda en el lugar equivocado.

    ``foco_x`` y ``foco_y`` (0 a 100 %) son el punto de la foto que queda al centro del héroe del flyer y ``zoom``
    (1 a 3) cuánto se acerca; el archivo no se toca. ``ancho`` y ``alto`` son los del archivo guardado.
    """

    __tablename__ = 'fotos_podio'

    id_foto_podio = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_categoria = db.Column(db.Integer, db.ForeignKey('categorias.id_categoria', ondelete='CASCADE'), nullable=False)
    id_equipo = db.Column(db.Integer, db.ForeignKey('equipos.id_equipo', ondelete='CASCADE'), nullable=False)
    url_foto = db.Column(db.Text, nullable=False)
    ancho = db.Column(db.Integer, nullable=False)
    alto = db.Column(db.Integer, nullable=False)
    foco_x = db.Column(db.Numeric(5, 2, asdecimal=False), nullable=False, default=50, server_default=db.text('50'))
    foco_y = db.Column(db.Numeric(5, 2, asdecimal=False), nullable=False, default=50, server_default=db.text('50'))
    zoom = db.Column(db.Numeric(3, 2, asdecimal=False), nullable=False, default=1, server_default=db.text('1'))

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now())

    __table_args__ = (
        db.UniqueConstraint('id_categoria', 'id_equipo', name='uq_fotos_podio_categoria_equipo'),
        db.CheckConstraint('ancho > 0', name='ck_fotos_podio_ancho'),
        db.CheckConstraint('alto > 0', name='ck_fotos_podio_alto'),
        db.CheckConstraint('foco_x BETWEEN 0 AND 100', name='ck_fotos_podio_foco_x'),
        db.CheckConstraint('foco_y BETWEEN 0 AND 100', name='ck_fotos_podio_foco_y'),
        db.CheckConstraint('zoom BETWEEN 1 AND 3', name='ck_fotos_podio_zoom'),
    )

    def to_dict(self) -> dict:
        """Lo que el flyer necesita: el archivo y su encuadre."""
        return {
            'url': self.url_foto,
            'ancho': self.ancho,
            'alto': self.alto,
            'foco_x': float(self.foco_x),
            'foco_y': float(self.foco_y),
            'zoom': float(self.zoom),
        }

    def __repr__(self) -> str:
        return f'<FotoPodio categoria={self.id_categoria} equipo={self.id_equipo}>'
