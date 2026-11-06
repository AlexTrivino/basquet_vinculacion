"""Casos de uso del perfil propio. Reciben el repositorio (RepositorioUsuarios) y, el que escribe, la unidad
(confirmar)."""
from app.shared.domain.errores import NoEncontrado


def obtener(id_usuario, repositorio):
    usuario = repositorio.obtener(id_usuario)
    if usuario is None:
        raise NoEncontrado('Usuario no encontrado.')
    return usuario


def cambiar_nombre(id_usuario, nombre, *, repositorio, unidad):
    """Desde el perfil solo cambia el nombre: el rol, el correo y el estado no se tocan."""
    obtener(id_usuario, repositorio)
    repositorio.actualizar(id_usuario, {'nombre': nombre})
    unidad.confirmar()
    return repositorio.obtener(id_usuario)
