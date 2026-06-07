"""Modelo de Estadística — rendimiento individual de jugadores por partido."""
from app import db


class Estadistica(db.Model):
    """Registra las estadísticas de un jugador en un partido específico."""

    __tablename__ = 'estadisticas'

    id_estadistica = db.Column(db.Integer, primary_key=True, autoincrement=True)
    puntos_anotados = db.Column(db.Integer, nullable=False, default=0)
    faltas_cometidas = db.Column(db.Integer, nullable=False, default=0)
    triples_anotados = db.Column(db.Integer, nullable=False, default=0)
    rebotes = db.Column(db.Integer, nullable=False, default=0)
    asistencias = db.Column(db.Integer, nullable=False, default=0)
    id_partido = db.Column(
        db.Integer, db.ForeignKey('partidos.id_partido'), nullable=False
    )
    id_jugador = db.Column(
        db.Integer, db.ForeignKey('jugadores.id_jugador'), nullable=False
    )

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    # ── Relaciones ─────────────────────────────────────────────────
    partido = db.relationship('Partido', back_populates='estadisticas', lazy='select')
    jugador = db.relationship('Jugador', back_populates='estadisticas', lazy='select')

    def to_dict(self) -> dict:
        """Serializa la instancia a un diccionario JSON-compatible."""
        return {
            'id_estadistica': self.id_estadistica,
            'puntos_anotados': self.puntos_anotados,
            'faltas_cometidas': self.faltas_cometidas,
            'triples_anotados': self.triples_anotados,
            'rebotes': self.rebotes,
            'asistencias': self.asistencias,
            'id_partido': self.id_partido,
            'id_jugador': self.id_jugador,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f'<Estadistica jugador={self.id_jugador} partido={self.id_partido}>'
