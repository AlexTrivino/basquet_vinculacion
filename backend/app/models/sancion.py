"""Modelo de Sanción — faltas disciplinarias aplicadas a jugadores."""
from app import db


class Sancion(db.Model):
    """Representa una sanción disciplinaria impuesta a un jugador durante un partido."""

    __tablename__ = 'sanciones'

    id_sancion = db.Column(db.Integer, primary_key=True, autoincrement=True)
    motivo = db.Column(db.Text, nullable=False)
    fecha = db.Column(db.Date, nullable=False)
    estado = db.Column(db.String(20), nullable=False, default='activa')
    id_jugador = db.Column(
        db.Integer, db.ForeignKey('jugadores.id_jugador'), nullable=False
    )
    id_partido = db.Column(
        db.Integer, db.ForeignKey('partidos.id_partido'), nullable=False
    )

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    # ── Relaciones ─────────────────────────────────────────────────
    jugador = db.relationship('Jugador', back_populates='sanciones', lazy='select')
    partido = db.relationship('Partido', back_populates='sanciones', lazy='select')

    def to_dict(self) -> dict:
        """Serializa la instancia a un diccionario JSON-compatible."""
        return {
            'id_sancion': self.id_sancion,
            'motivo': self.motivo,
            'fecha': self.fecha.isoformat() if self.fecha else None,
            'estado': self.estado,
            'id_jugador': self.id_jugador,
            'id_partido': self.id_partido,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f'<Sancion jugador={self.id_jugador} ({self.estado})>'
