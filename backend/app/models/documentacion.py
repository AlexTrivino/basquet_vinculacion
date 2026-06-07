"""Modelo de Documentación — archivos administrativos asociados a un torneo."""
from app import db


class Documentacion(db.Model):
    """Representa un documento oficial vinculado a un torneo (reglamento, bases, etc.)."""

    __tablename__ = 'documentacion'

    id_documentacion = db.Column(db.Integer, primary_key=True, autoincrement=True)
    titulo = db.Column(db.String(150), nullable=False)
    url_documento = db.Column(db.Text, nullable=False)
    id_torneo = db.Column(
        db.Integer, db.ForeignKey('torneos.id_torneo'), nullable=False
    )

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    # ── Relaciones ─────────────────────────────────────────────────
    torneo = db.relationship('Torneo', back_populates='documentacion_items', lazy='select')

    def to_dict(self) -> dict:
        """Serializa la instancia a un diccionario JSON-compatible."""
        return {
            'id_documentacion': self.id_documentacion,
            'titulo': self.titulo,
            'url_documento': self.url_documento,
            'id_torneo': self.id_torneo,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f'<Documentacion {self.titulo}>'
