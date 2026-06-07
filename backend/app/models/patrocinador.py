"""Modelo de Patrocinador — empresas y marcas que apoyan los torneos."""
from app import db


class Patrocinador(db.Model):
    """Representa un patrocinador con su información de marca e imagen."""

    __tablename__ = 'patrocinadores'

    id_patrocinador = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre_patrocinador = db.Column(db.String(100), nullable=False)
    url_logo_patrocinador = db.Column(db.Text, nullable=True)
    url_imagen_promocional = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    # ── Relaciones ─────────────────────────────────────────────────
    patrocinadores_torneos = db.relationship(
        'PatrocinadorTorneo', back_populates='patrocinador', lazy='select'
    )

    def to_dict(self) -> dict:
        """Serializa la instancia a un diccionario JSON-compatible."""
        return {
            'id_patrocinador': self.id_patrocinador,
            'nombre_patrocinador': self.nombre_patrocinador,
            'url_logo_patrocinador': self.url_logo_patrocinador,
            'url_imagen_promocional': self.url_imagen_promocional,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f'<Patrocinador {self.nombre_patrocinador}>'
