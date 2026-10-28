"""Casos de uso de auspicios con piezas falsas: sin base de datos ni Storage."""
from dataclasses import replace

import pytest

from app.modules.auspicios.application import casos_de_uso as casos
from app.modules.auspicios.domain.patrocinador import Patrocinador
from app.shared.domain.errores import NoEncontrado


class Repositorio:
    """En memoria; entrega copias, como la base."""

    def __init__(self, *patrocinadores):
        self.filas = {p.id_patrocinador: p for p in patrocinadores}

    def listar(self):
        return [replace(p) for p in self.filas.values()]

    def obtener(self, id_patrocinador):
        fila = self.filas.get(id_patrocinador)
        return replace(fila) if fila else None

    def agregar(self, patrocinador):
        nuevo = replace(patrocinador, id_patrocinador=max(self.filas, default=0) + 1)
        self.filas[nuevo.id_patrocinador] = nuevo
        return nuevo.id_patrocinador

    def guardar(self, patrocinador):
        self.filas[patrocinador.id_patrocinador] = replace(patrocinador)

    def eliminar(self, id_patrocinador):
        del self.filas[id_patrocinador]


class Almacen:
    def __init__(self):
        self.llamadas = []

    def subir_archivo(self, stream, nombre, carpeta, mime):
        self.llamadas.append(('subir', f'{carpeta}/{nombre}'))
        return f'{carpeta}/{nombre}'

    def borrar_archivo(self, url):
        self.llamadas.append(('borrar', url))


class Unidad:
    def __init__(self, falla=False):
        self.falla, self.estado = falla, 'abierta'

    def confirmar(self):
        if self.falla:
            raise RuntimeError('la base rechazó el cambio')
        self.estado = 'confirmada'

    def revertir(self):
        self.estado = 'revertida'


LOGO = (None, 'pan.png', 'image/png')
FERRETERIA = Patrocinador('FERRETERÍA', url_logo_patrocinador='patrocinadores/viejo.png', id_patrocinador=1)


def piezas(*patrocinadores, falla=False):
    return {'repositorio': Repositorio(*patrocinadores), 'almacen': Almacen(), 'unidad': Unidad(falla)}


def test_crear_sube_el_logo_y_confirma():
    p = piezas()
    nuevo = casos.crear({'nombre_patrocinador': 'PANADERÍA'}, LOGO, **p)
    assert (nuevo.id_patrocinador, nuevo.url_logo_patrocinador) == (1, 'patrocinadores/pan.png')
    assert p['almacen'].llamadas == [('subir', 'patrocinadores/pan.png')]
    assert p['unidad'].estado == 'confirmada'


def test_crear_borra_el_logo_subido_si_la_base_falla():
    p = piezas(falla=True)
    with pytest.raises(casos.NoSeGuardo):
        casos.crear({'nombre_patrocinador': 'PANADERÍA'}, LOGO, **p)
    assert p['almacen'].llamadas == [('subir', 'patrocinadores/pan.png'), ('borrar', 'patrocinadores/pan.png')]
    assert p['unidad'].estado == 'revertida'


def test_actualizar_reemplaza_el_logo_y_conserva_la_imagen_promocional():
    p = piezas(replace(FERRETERIA, url_imagen_promocional='promo.jpg'))
    actualizado = casos.actualizar(1, {'nombre_patrocinador': 'FERRETERÍA S.A.'}, LOGO, **p)
    assert (actualizado.nombre_patrocinador, actualizado.url_logo_patrocinador, actualizado.url_imagen_promocional) == (
        'FERRETERÍA S.A.', 'patrocinadores/pan.png', 'promo.jpg')
    assert p['almacen'].llamadas == [('subir', 'patrocinadores/pan.png'), ('borrar', 'patrocinadores/viejo.png')]


def test_actualizar_sin_logo_no_toca_storage_y_aplica_la_imagen_enviada():
    p = piezas(replace(FERRETERIA, url_imagen_promocional='promo.jpg'))
    casos.actualizar(1, {'nombre_patrocinador': 'X', 'url_imagen_promocional': None}, None, **p)
    assert p['almacen'].llamadas == []
    assert p['repositorio'].obtener(1).url_imagen_promocional is None


def test_eliminar_borra_el_logo_solo_si_la_base_confirma():
    p = piezas(FERRETERIA)
    casos.eliminar(1, **p)
    assert p['almacen'].llamadas == [('borrar', 'patrocinadores/viejo.png')]

    p = piezas(FERRETERIA, falla=True)
    with pytest.raises(casos.NoSeGuardo):
        casos.eliminar(1, **p)
    assert p['almacen'].llamadas == []
    assert p['unidad'].estado == 'revertida'


@pytest.mark.parametrize('caso', [
    lambda p: casos.obtener(99, p['repositorio']),
    lambda p: casos.actualizar(99, {'nombre_patrocinador': 'X'}, None, **p),
    lambda p: casos.eliminar(99, **p),
])
def test_lo_que_no_existe_es_no_encontrado(caso):
    with pytest.raises(NoEncontrado, match='Patrocinador no encontrado.'):
        caso(piezas())
