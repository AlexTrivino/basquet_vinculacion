"""Modelo de Usuario — delegados y administradores del sistema."""
from app import db


class Usuario(db.Model):
    """Representa un usuario registrado mediante Supabase Auth.

    La autenticación (contraseña, OAuth, etc.) se delega completamente
    a Supabase Auth; aquí solo se almacena el perfil y rol.
    """

    __tablename__ = 'usuarios'

    id_usuario = db.Column(db.String(36), primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    correo = db.Column(db.String(150), unique=True, nullable=False)
    rol = db.Column(db.String(20), nullable=False, default='delegado')
    estado = db.Column(db.String(20), nullable=False, default='activo')

    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_at = db.Column(
        db.DateTime, nullable=False, default=db.func.now(), onupdate=db.func.now()
    )

    # ── Relaciones ─────────────────────────────────────────────────
    equipos = db.relationship('Equipo', back_populates='usuario', lazy='select')

    # ── Restricciones ──────────────────────────────────────────────
    __table_args__ = (
        db.CheckConstraint("rol IN ('super_admin', 'delegado')", name='ck_usuarios_rol'),
        db.CheckConstraint("estado IN ('activo', 'inactivo')", name='ck_usuarios_estado'),
    )

    @classmethod
    def activos(cls):
        """Retorna query filtrada excluyendo registros inactivos (soft delete)."""
        return cls.query.filter_by(estado='activo')

    def to_dict(self) -> dict:
        """Serializa la instancia a un diccionario JSON-compatible."""
        return {
            'id_usuario': self.id_usuario,
            'nombre': self.nombre,
            'correo': self.correo,
            'rol': self.rol,
            'estado': self.estado,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f'<Usuario {self.correo} ({self.rol})>'
