"""Modelo de Inscripción — registro de equipos en torneos por categoría."""
from app import db


class Inscripcion(db.Model):
    """Representa la inscripción de un equipo a un torneo en una categoría específica."""

    __tablename__ = 'inscripciones'

    id_inscripcion = db.Column(db.Integer, primary_key=True, autoincrement=True)
    fecha_inscripcion = db.Column(db.DateTime, nullable=False, default=db.func.now())
    estado_inscripcion = db.Column(db.String(20), nullable=False, default='pendiente')
    grupo = db.Column(db.String(10), nullable=True)
    url_comprobante_pago = db.Column(db.Text, nullable=True)
    id_torneo = db.Column(
        db.Integer, db.ForeignKey('torneos.id_torneo'), nullable=False
    )
    id_equipo = db.Column(
        db.Integer, db.ForeignKey('equipos.id_equipo'), nullable=False
    )
    id_categoria = db.Column(
        db.Integer, db.ForeignKey('categorias.id_categoria'), nullable=False
    )

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    # ── Relaciones ─────────────────────────────────────────────────
    torneo = db.relationship('Torneo', back_populates='inscripciones', lazy='select')
    equipo = db.relationship('Equipo', back_populates='inscripciones', lazy='select')
    categoria = db.relationship('Categoria', back_populates='inscripciones', lazy='select')

    # ── Restricciones ──────────────────────────────────────────────
    __table_args__ = (
        db.CheckConstraint(
            "estado_inscripcion IN ('pendiente', 'aprobado', 'rechazado')",
            name='ck_inscripciones_estado',
        ),
    )

    def to_dict(self) -> dict:
        """Serializa la instancia a un diccionario JSON-compatible."""
        return {
            'id_inscripcion': self.id_inscripcion,
            'fecha_inscripcion': self.fecha_inscripcion.isoformat() if self.fecha_inscripcion else None,
            'estado_inscripcion': self.estado_inscripcion,
            'grupo': self.grupo,
            'url_comprobante_pago': self.url_comprobante_pago,
            'id_torneo': self.id_torneo,
            'id_equipo': self.id_equipo,
            'id_categoria': self.id_categoria,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f'<Inscripcion equipo={self.id_equipo} torneo={self.id_torneo}>'
