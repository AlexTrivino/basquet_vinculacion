"""Modelo de Torneo — gestión de competiciones de baloncesto."""
from app import db


class Torneo(db.Model):
    """Representa un torneo de baloncesto con sus fechas y estado."""

    __tablename__ = 'torneos'

    id_torneo = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(100), nullable=False)
    fecha_inicio = db.Column(db.Date, nullable=False)
    fecha_fin = db.Column(db.Date, nullable=False)
    estado = db.Column(db.String(20), nullable=False, default='programado')

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    # ── Relaciones ─────────────────────────────────────────────────
    partidos = db.relationship('Partido', back_populates='torneo', lazy='select')
    inscripciones = db.relationship('Inscripcion', back_populates='torneo', lazy='select')
    documentacion_items = db.relationship('Documentacion', back_populates='torneo', lazy='select')
    plantillas = db.relationship('Plantilla', back_populates='torneo', lazy='select')
    patrocinadores_torneos = db.relationship('PatrocinadorTorneo', back_populates='torneo', lazy='select')

    # ── Restricciones ──────────────────────────────────────────────
    __table_args__ = (
        db.CheckConstraint(
            "estado IN ('programado', 'en_curso', 'finalizado', 'inactivo')",
            name='ck_torneos_estado',
        ),
    )

    @classmethod
    def activos(cls):
        """Retorna query filtrada excluyendo torneos eliminados (soft delete).

        Incluye torneos programados, en curso y finalizados.
        Solo excluye los marcados como 'inactivo'.
        """
        return cls.query.filter(cls.estado != 'inactivo')

    def to_dict(self) -> dict:
        """Serializa la instancia a un diccionario JSON-compatible."""
        return {
            'id_torneo': self.id_torneo,
            'nombre': self.nombre,
            'fecha_inicio': self.fecha_inicio.isoformat() if self.fecha_inicio else None,
            'fecha_fin': self.fecha_fin.isoformat() if self.fecha_fin else None,
            'estado': self.estado,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f'<Torneo {self.nombre} ({self.estado})>'
