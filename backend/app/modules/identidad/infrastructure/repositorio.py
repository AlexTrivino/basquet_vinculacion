"""Usuarios en la base, sobre el modelo compartido; entregan la entidad del dominio."""
from app.modules.identidad.domain.usuario import Usuario
from app.shared.infrastructure.db import db
from app.shared.infrastructure.modelos.usuario import Usuario as FilaUsuario


class RepositorioUsuarios:
    def obtener(self, id_usuario):
        fila = db.session.get(FilaUsuario, id_usuario)
        if fila is None:
            return None
        return Usuario(fila.id_usuario, fila.nombre, fila.correo, fila.rol, fila.estado, fila.created_at, fila.updated_at)

    def actualizar(self, id_usuario, cambios):
        fila = db.session.get(FilaUsuario, id_usuario)
        for campo, valor in cambios.items():
            setattr(fila, campo, valor)
