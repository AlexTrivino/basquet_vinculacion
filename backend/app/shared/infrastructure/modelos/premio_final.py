"""Modelo de PremioFinal — el MVP y el mejor defensa de la final de una categoría, con la foto del premiado para su flyer."""
from app.shared.infrastructure.db import db


class PremioFinal(db.Model):
    """Un premio por categoría y tipo (``mvp`` o ``defensa``): el jugador que eligió el admin entre los de la final.

    La foto es del premiado y es opcional: ``url_foto``, ``ancho`` y ``alto`` están los tres o ninguno. ``foco_x`` y
    ``foco_y`` (0 a 100 %) son el punto de la foto que queda al centro del héroe del flyer y ``zoom`` (1 a 3) cuánto
    se acerca, igual que en ``FotoPodio``; el archivo no se toca.
    """

    __tablename__ = 'premios_final'

    id_premio_final = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_categoria = db.Column(db.Integer, db.ForeignKey('categorias.id_categoria', ondelete='CASCADE'), nullable=False)
    tipo = db.Column(db.String(10), nullable=False)
    id_jugador = db.Column(db.Integer, db.ForeignKey('jugadores.id_jugador', ondelete='CASCADE'), nullable=False)
    url_foto = db.Column(db.Text, nullable=True)
    ancho = db.Column(db.Integer, nullable=True)
    alto = db.Column(db.Integer, nullable=True)
    foco_x = db.Column(db.Numeric(5, 2, asdecimal=False), nullable=False, default=50, server_default=db.text('50'))
    foco_y = db.Column(db.Numeric(5, 2, asdecimal=False), nullable=False, default=50, server_default=db.text('50'))
    zoom = db.Column(db.Numeric(3, 2, asdecimal=False), nullable=False, default=1, server_default=db.text('1'))

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now())

    __table_args__ = (
        db.UniqueConstraint('id_categoria', 'tipo', name='uq_premios_final_categoria_tipo'),
        db.CheckConstraint("tipo IN ('mvp', 'defensa')", name='ck_premios_final_tipo'),
        db.CheckConstraint(
            '(url_foto IS NULL AND ancho IS NULL AND alto IS NULL) OR (url_foto IS NOT NULL AND COALESCE(ancho, 0) > 0 AND COALESCE(alto, 0) > 0)',
            name='ck_premios_final_foto'),
        db.CheckConstraint('foco_x BETWEEN 0 AND 100', name='ck_premios_final_foco_x'),
        db.CheckConstraint('foco_y BETWEEN 0 AND 100', name='ck_premios_final_foco_y'),
        db.CheckConstraint('zoom BETWEEN 1 AND 3', name='ck_premios_final_zoom'),
    )

    def to_dict(self) -> dict:
        """Lo que el flyer necesita: el jugador y, si la hay, su foto con el encuadre."""
        foto = None if self.url_foto is None else {
            'url': self.url_foto,
            'ancho': self.ancho,
            'alto': self.alto,
            'foco_x': float(self.foco_x),
            'foco_y': float(self.foco_y),
            'zoom': float(self.zoom),
        }
        return {'id_jugador': self.id_jugador, 'foto': foto}

    def __repr__(self) -> str:
        return f'<PremioFinal categoria={self.id_categoria} tipo={self.tipo} jugador={self.id_jugador}>'
