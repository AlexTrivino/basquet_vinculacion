"""Reglas de torneos y casos de uso con piezas falsas: sin base de datos ni Storage."""
from dataclasses import replace
from datetime import date

import pytest

from app.modules.torneos.application import casos_de_uso as casos
from app.modules.torneos.domain.torneo import Categoria, Torneo, validar_fechas, vigente
from app.shared.domain.errores import Conflicto, NoEncontrado, ReglaDeNegocio


class Repositorio:
    """En memoria; entrega copias, como la base."""

    def __init__(self, *torneos, inscritos=()):
        self.torneos = {t.id_torneo: t for t in torneos}
        self.categorias = {c.id_categoria: c for t in torneos for c in t.categorias}
        self.inscritos = set(inscritos)  # ids de categorías con equipos inscritos

    def obtener(self, id_torneo):
        torneo = self.torneos.get(id_torneo)
        return replace(torneo) if torneo else None

    def agregar(self, datos, categorias):
        nuevo = Torneo(max(self.torneos, default=0) + 1, **datos)
        nuevo.categorias = [Categoria(len(self.categorias) + i, **c, id_torneo=nuevo.id_torneo) for i, c in enumerate(categorias, 1)]
        self.torneos[nuevo.id_torneo] = nuevo
        return nuevo.id_torneo

    def actualizar(self, id_torneo, cambios):
        self.torneos[id_torneo] = replace(self.torneos[id_torneo], **cambios)

    def listar_categorias(self, genero, id_torneo):
        return [c for c in self.categorias.values() if genero in (None, c.genero_categoria) and id_torneo in (None, c.id_torneo)]

    def obtener_categoria(self, id_categoria):
        return self.categorias.get(id_categoria)

    def agregar_categoria(self, datos):
        nueva = Categoria(max(self.categorias, default=0) + 1, **datos)
        self.categorias[nueva.id_categoria] = nueva
        return nueva.id_categoria

    def inscripciones_de_categoria(self, id_categoria):
        return int(id_categoria in self.inscritos)

    def eliminar_categoria(self, id_categoria):
        del self.categorias[id_categoria]


class Almacen:
    def __init__(self):
        self.llamadas = []

    def subir_archivo(self, stream, nombre, carpeta, mime):
        self.llamadas.append(f'{carpeta}/{nombre}')
        return f'{carpeta}/{nombre}'


class Unidad:
    def __init__(self):
        self.estado = 'abierta'

    def confirmar(self):
        self.estado = 'confirmada'

    def revertir(self):
        self.estado = 'revertida'


JUVENIL = Categoria(1, 'Juvenil', 'masculino', id_torneo=1)
INTERCOLEGIAL = Torneo(1, 'INTERCOLEGIAL', date(2026, 8, 1), date(2026, 10, 20), 'en_curso', categorias=[JUVENIL])


def piezas(*torneos, **opciones):
    return {'repositorio': Repositorio(*torneos, **opciones), 'unidad': Unidad()}


def test_reglas_de_estado_y_fechas():
    assert [vigente(e) for e in ('programado', 'en_curso', 'finalizado', 'inactivo', 'anulado')] == [True, True, True, False, False]
    validar_fechas(date(2026, 1, 1), date(2026, 1, 1))
    with pytest.raises(ReglaDeNegocio, match='fecha de fin'):
        validar_fechas(date(2026, 1, 2), date(2026, 1, 1))


@pytest.mark.parametrize('estado', ['inactivo', 'anulado'])
def test_un_torneo_oculto_no_se_encuentra(estado):
    with pytest.raises(NoEncontrado, match='Torneo no encontrado.'):
        casos.obtener(1, piezas(replace(INTERCOLEGIAL, estado=estado))['repositorio'])


def test_actualizar_revisa_las_fechas_contra_las_que_tiene_y_devuelve_aunque_lo_anule():
    p = piezas(INTERCOLEGIAL)
    with pytest.raises(ReglaDeNegocio):
        casos.actualizar(1, {'fecha_fin': date(2026, 7, 31)}, **p)
    assert p['unidad'].estado == 'abierta' and p['repositorio'].obtener(1).fecha_fin == date(2026, 10, 20)
    assert casos.actualizar(1, {'estado': 'anulado'}, **p).estado == 'anulado'


def test_baja_y_anulacion():
    p = piezas(replace(INTERCOLEGIAL, estado='anulado'))
    with pytest.raises(NoEncontrado, match='ya inactivo/anulado'):
        casos.anular(1, **p)
    casos.dar_de_baja(1, **p)  # un anulado sí se da de baja
    assert p['repositorio'].obtener(1).estado == 'inactivo'
    with pytest.raises(NoEncontrado, match='Torneo no encontrado.'):
        casos.dar_de_baja(1, **p)

    p = piezas(INTERCOLEGIAL)
    casos.anular(1, **p)
    assert (p['repositorio'].obtener(1).estado, p['unidad'].estado) == ('anulado', 'confirmada')


def test_crear_con_sus_categorias():
    p = piezas()
    datos = {'nombre': 'COPA', 'fecha_inicio': date(2026, 6, 1), 'fecha_fin': date(2026, 6, 30),
             'categorias': [{'nombre_categoria': 'Libre', 'genero_categoria': 'femenino', 'edad_minima': 18}]}
    torneo = casos.crear(datos, **p)
    assert [(c.nombre_categoria, c.id_torneo) for c in torneo.categorias] == [('Libre', torneo.id_torneo)]
    assert 'categorias' in datos  # no toca los datos que recibe


def test_categorias():
    p = piezas(INTERCOLEGIAL, inscritos={1})
    assert casos.listar_categorias('mixto', None, p['repositorio']) == [JUVENIL]  # un género desconocido no filtra
    with pytest.raises(Conflicto, match='ya tiene equipos inscritos'):
        casos.eliminar_categoria(1, **p)
    nueva = casos.agregar_categoria(1, {'nombre_categoria': 'Libre', 'genero_categoria': 'femenino', 'edad_minima': 18}, **p)
    assert nueva.id_torneo == 1
    casos.eliminar_categoria(nueva.id_categoria, **p)
    with pytest.raises(NoEncontrado, match='Categoría no encontrada.'):
        casos.obtener_categoria(nueva.id_categoria, p['repositorio'])
    with pytest.raises(NoEncontrado, match='Torneo no encontrado.'):
        casos.agregar_categoria(9, {'nombre_categoria': 'X', 'genero_categoria': 'masculino', 'edad_minima': 0}, **p)


def test_subir_calendario_solo_a_un_torneo_vigente():
    p, almacen = piezas(INTERCOLEGIAL, replace(INTERCOLEGIAL, id_torneo=2, estado='anulado')), Almacen()
    url = casos.subir_calendario(1, None, 'calendario.xlsx', 'application/pdf', almacen=almacen, **p)
    assert (url, p['repositorio'].obtener(1).url_calendario_excel) == ('torneos/1/calendario/calendario.xlsx', url)
    with pytest.raises(NoEncontrado):
        casos.subir_calendario(2, None, 'calendario.xlsx', 'application/pdf', almacen=almacen, **p)
    assert almacen.llamadas == [url]  # al anulado no se le sube nada
