"""Casos de uso de sanciones. Reciben repositorio (RepositorioSanciones) y unidad (confirmar, revertir) por parámetro."""
from app.shared.domain.errores import NoEncontrado


def listar(id_jugador, estado, repositorio):
    """De la más reciente a la más antigua; un filtro vacío no filtra."""
    return repositorio.listar(id_jugador, estado)


def crear(datos, *, repositorio, unidad):
    """Registra una sanción activa. Como hoy, la entrada no se valida (specs/03-competencia, fuera de alcance)."""
    id_sancion = repositorio.agregar(datos['motivo'], datos['fecha'], datos['id_jugador'], datos['id_partido'])
    unidad.confirmar()
    return repositorio.obtener(id_sancion)


def actualizar(id_sancion, motivo, estado, *, repositorio, unidad):
    """Cambia el motivo o el estado; lo que llega vacío no se toca."""
    if repositorio.obtener(id_sancion) is None:
        raise NoEncontrado('El recurso solicitado no fue encontrado.')  # el 404 genérico de hoy
    repositorio.actualizar(id_sancion, {campo: valor for campo, valor in (('motivo', motivo), ('estado', estado)) if valor})
    unidad.confirmar()
    return repositorio.obtener(id_sancion)
