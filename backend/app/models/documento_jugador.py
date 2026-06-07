"""Modelo de Documento de Jugador — archivos de identidad y certificados."""
from app import db


class DocumentoJugador(db.Model):
    """Representa un documento personal de un jugador (cédula, certificado, etc.)."""

    __tablename__ = 'documentos_jugadores'

    id_documentos_jugador = db.Column(db.Integer, primary_key=True, autoincrement=True)
    url_documento = db.Column(db.Text, nullable=False)
    tipo_documento = db.Column(db.String(50), nullable=False)
    estado_validacion = db.Column(db.String(20), nullable=False, default='pendiente')
    id_jugador = db.Column(
        db.Integer, db.ForeignKey('jugadores.id_jugador'), nullable=False
    )

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    # ── Relaciones ─────────────────────────────────────────────────
    jugador = db.relationship('Jugador', back_populates='documentos', lazy='select')

    # ── Restricciones ──────────────────────────────────────────────
    __table_args__ = (
        db.CheckConstraint(
            "tipo_documento IN ('cedula', 'certificado_estudios')",
            name='ck_documentos_jugadores_tipo',
        ),
        db.CheckConstraint(
            "estado_validacion IN ('pendiente', 'aprobado', 'rechazado')",
            name='ck_documentos_jugadores_estado_validacion',
        ),
    )

    def to_dict(self) -> dict:
        """Serializa la instancia a un diccionario JSON-compatible."""
        return {
            'id_documentos_jugador': self.id_documentos_jugador,
            'url_documento': self.url_documento,
            'tipo_documento': self.tipo_documento,
            'estado_validacion': self.estado_validacion,
            'id_jugador': self.id_jugador,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f'<DocumentoJugador jugador={self.id_jugador} tipo={self.tipo_documento}>'
