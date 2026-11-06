"""Casos de uso del perfil propio con piezas falsas: sin base de datos."""
from dataclasses import replace

import pytest

from app.modules.identidad.application import casos_de_uso as casos
from app.modules.identidad.domain.usuario import Usuario
from app.shared.domain.errores import NoEncontrado

DELEGADO = Usuario('u-del-1', 'Delegado San José', 'del1@manta.test', 'delegado', 'activo')


class Repositorio:
    """En memoria; entrega copias, como la base."""

    def __init__(self, *usuarios):
        self.filas = {u.id_usuario: u for u in usuarios}

    def obtener(self, id_usuario):
        fila = self.filas.get(id_usuario)
        return replace(fila) if fila else None

    def actualizar(self, id_usuario, cambios):
        self.filas[id_usuario] = replace(self.filas[id_usuario], **cambios)


class Unidad:
    confirmada = False

    def confirmar(self):
        self.confirmada = True


def test_obtener_el_perfil():
    assert casos.obtener('u-del-1', Repositorio(DELEGADO)) == DELEGADO
    with pytest.raises(NoEncontrado, match='Usuario no encontrado'):
        casos.obtener('u-fantasma', Repositorio(DELEGADO))


def test_cambiar_el_nombre_y_nada_mas():
    repositorio, unidad = Repositorio(DELEGADO), Unidad()
    usuario = casos.cambiar_nombre('u-del-1', 'Delegado de San José', repositorio=repositorio, unidad=unidad)
    assert usuario == replace(DELEGADO, nombre='Delegado de San José')  # el rol, el correo y el estado siguen
    assert unidad.confirmada
    unidad = Unidad()
    with pytest.raises(NoEncontrado):
        casos.cambiar_nombre('u-fantasma', 'X', repositorio=repositorio, unidad=unidad)
    assert not unidad.confirmada
