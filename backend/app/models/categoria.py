"""Modelo de Categoría — clasificación por género y rango de edad."""
from app import db


class Categoria(db.Model):
    """Representa una categoría competitiva (ej. Sub-18 Masculino)."""

    __tablename__ = 'categorias'

    id_categoria = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre_categoria = db.Column(db.String(50), nullable=False)
    genero_categoria = db.Column(db.String(20), nullable=False)
    edad_minima = db.Column(db.Integer, nullable=False, default=0)
    edad_maxima = db.Column(db.Integer, nullable=True)
    id_torneo = db.Column(db.Integer, db.ForeignKey('torneos.id_torneo', ondelete='CASCADE'), nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    # ── Relaciones ─────────────────────────────────────────────────
    inscripciones = db.relationship('Inscripcion', back_populates='categoria', lazy='select')
    torneo = db.relationship('Torneo', back_populates='categorias', lazy='select')
    partidos = db.relationship('Partido', back_populates='categoria', lazy='select')

    # ── Restricciones ──────────────────────────────────────────────
    __table_args__ = (
        db.CheckConstraint(
            "genero_categoria IN ('masculino', 'femenino')",
            name='ck_categorias_genero',
        ),
    )

    def to_dict(self) -> dict:
        """Serializa la instancia a un diccionario JSON-compatible."""
        return {
            'id_categoria': self.id_categoria,
            'nombre_categoria': self.nombre_categoria,
            'genero_categoria': self.genero_categoria,
            'edad_minima': self.edad_minima,
            'edad_maxima': self.edad_maxima,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f'<Categoria {self.nombre_categoria} ({self.genero_categoria})>'
