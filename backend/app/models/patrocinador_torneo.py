"""Modelo Patrocinador-Torneo — relación muchos a muchos entre patrocinadores y torneos."""
from app import db


class PatrocinadorTorneo(db.Model):
    """Tabla asociativa que vincula patrocinadores con torneos específicos."""

    __tablename__ = 'patrocinadores_torneos'

    id_patrocinador_torneo = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_patrocinador = db.Column(
        db.Integer, db.ForeignKey('patrocinadores.id_patrocinador'), nullable=False
    )
    id_torneo = db.Column(
        db.Integer, db.ForeignKey('torneos.id_torneo'), nullable=False
    )

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    # ── Relaciones ─────────────────────────────────────────────────
    patrocinador = db.relationship(
        'Patrocinador', back_populates='patrocinadores_torneos', lazy='select'
    )
    torneo = db.relationship(
        'Torneo', back_populates='patrocinadores_torneos', lazy='select'
    )

    def to_dict(self) -> dict:
        """Serializa la instancia a un diccionario JSON-compatible."""
        return {
            'id_patrocinador_torneo': self.id_patrocinador_torneo,
            'id_patrocinador': self.id_patrocinador,
            'id_torneo': self.id_torneo,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f'<PatrocinadorTorneo patrocinador={self.id_patrocinador} torneo={self.id_torneo}>'
