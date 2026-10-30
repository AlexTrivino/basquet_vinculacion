"""Reglas de competencia y casos de uso con piezas falsas: sin base de datos ni Storage."""
from dataclasses import asdict, replace
from datetime import date

import pytest

from app.modules.competencia.application import fase_final, partidos
from app.modules.competencia.domain import llaves
from app.modules.competencia.domain.llaves import Categoria
from app.modules.competencia.domain.partido import (
    ESTADISTICAS, Partido, box_score, validar_cambio_de_equipos, validar_cruce, validar_sin_empate,
)
from app.modules.competencia.domain.posiciones import ESTADOS_FINALES
from app.shared.domain.errores import Conflicto, ReglaDeNegocio

GRUPOS = {1: 'A', 2: 'A', 3: 'B', 4: None}
FINALIZADO = Partido(1, 1, 1, 1, 2, estado='finalizado', marcador_local=70, marcador_visitante=60)
SEMIS = Categoria(2, 1, 'un_grupo_semis')
CUATRO = {i: None for i in (1, 2, 3, 4)}
TODOS_CONTRA_TODOS = ((1, 2), (1, 3), (1, 4), (2, 3), (2, 4), (3, 4))  # gana siempre el de menor id


# ── Reglas de un partido ──

@pytest.mark.parametrize('local, visitante, mensaje', [
    (1, 1, 'no pueden ser el mismo'),
    (9, 1, 'El equipo local no tiene'),
    (1, 9, 'El equipo visitante no tiene'),
    (1, 3, r'mismo grupo \(local: A, visitante: B\)'),
    (4, 1, r'\(local: sin grupo, visitante: A\)'),
])
def test_cruces_invalidos(local, visitante, mensaje):
    with pytest.raises(ReglaDeNegocio, match=mensaje):
        validar_cruce(local, visitante, GRUPOS)


def test_cruces_validos():
    validar_cruce(1, 2, GRUPOS)
    validar_cruce(1, 3, GRUPOS, llave='CF1')  # la fase final mezcla grupos


def test_los_equipos_solo_cambian_mientras_esta_programado():
    validar_cambio_de_equipos(replace(FINALIZADO, estado='programado'), {'id_equipo_local': 3})
    validar_cambio_de_equipos(FINALIZADO, {'id_equipo_local': 1, 'fase': 'Final'})  # el mismo equipo no es un cambio
    for campo in ('id_equipo_local', 'id_equipo_visitante'):
        with pytest.raises(ReglaDeNegocio, match='ya no está programado'):
            validar_cambio_de_equipos(FINALIZADO, {campo: 3})


@pytest.mark.parametrize('partido, cambios, empata', [
    (replace(FINALIZADO, estado='programado'), {'estado': 'finalizado', 'marcador_local': 50, 'marcador_visitante': 50}, True),
    (FINALIZADO, {'marcador_visitante': 70}, True),
    (FINALIZADO, {'estado': 'finalizado_wo', 'marcador_local': 0, 'marcador_visitante': 0}, False),  # el W.O. vale 20-0
    (replace(FINALIZADO, marcador_visitante=70), {'fase': 'Final'}, False),  # no toca estado ni marcador
    (replace(FINALIZADO, estado='programado'), {'marcador_local': 50, 'marcador_visitante': 50}, False),
])
def test_no_hay_empates(partido, cambios, empata):
    if empata:
        with pytest.raises(ReglaDeNegocio, match='no hay empates'):
            validar_sin_empate(partido, cambios)
    else:
        validar_sin_empate(partido, cambios)


def test_box_score_en_cero_con_sancion_y_de_mas_a_menos_puntos():
    filas = box_score([(7, 'ANA', 4), (8, 'BEA', 5)], {8: dict.fromkeys(ESTADISTICAS, 3)}, {7})
    assert [(f['id_jugador'], f['dorsal'], f['puntos_anotados'], f['rebotes'], f['sancion_activa']) for f in filas] == [
        (8, 5, 3, 3, False), (7, 4, 0, 0, True)]


# ── Fase final ──

def test_asignar_grupos():
    dos_grupos = Categoria(1, 1, 'dos_grupos_cruces')
    assert llaves.asignar_grupos(dos_grupos, [1, 2, 3], {'1': 'A', 2: 'B'}) == {1: 'A', 2: 'B', 3: None}
    with pytest.raises(ReglaDeNegocio, match='El grupo C no existe'):
        llaves.asignar_grupos(dos_grupos, [1], {'1': 'C'})
    with pytest.raises(ReglaDeNegocio, match='El grupo A no existe'):  # un grupo único no lleva letras
        llaves.asignar_grupos(SEMIS, [1], {'1': 'A'})


def test_las_letras_que_el_formato_no_tiene_no_cuentan():
    guardados = {1: 'A', 2: 'B', 3: 'C', 4: None}
    assert llaves.grupos_del_formato('un_grupo_semis', guardados) == CUATRO  # de dos grupos a uno: todos juntos
    assert llaves.grupos_del_formato('tres_final_directa', {1: 'A'}) == {1: None}
    assert llaves.grupos_del_formato('dos_grupos_cruces', guardados) == {1: 'A', 2: 'B', 3: None, 4: None}
    assert llaves.grupos_del_formato(None, guardados) is guardados  # sin formato, como siempre


def _cuadro(jugados_grupos, pendientes=0, jugados=None):
    finalizados = [(a, b, 70, 60, 'finalizado') for a, b in jugados_grupos]
    estado = llaves.estado_fase_final(SEMIS, CUATRO, finalizados, pendientes, jugados or {}, {})
    return {llave['codigo']: llave for llave in estado['llaves']}


def test_el_cuadro_espera_a_que_termine_la_fase_de_grupos():
    assert {llave['estado'] for llave in _cuadro(TODOS_CONTRA_TODOS[:5]).values()} == {'espera'}
    assert {llave['estado'] for llave in _cuadro(TODOS_CONTRA_TODOS, pendientes=1).values()} == {'espera'}


def test_el_cuadro_se_arma_con_la_tabla_y_los_resultados():
    cuadro = _cuadro(TODOS_CONTRA_TODOS)
    assert [(c, ll['estado'], ll['local']['id_equipo'], ll['visitante']['id_equipo']) for c, ll in cuadro.items() if ll['local']] == [
        ('SF1', 'listo', 1, 4), ('SF2', 'listo', 2, 3)]
    assert cuadro['SF1']['local']['nombre_equipo'] == 'Equipo #1'  # sin datos del equipo queda su número

    sf1 = {'estado': 'finalizado', 'marcador_local': 60, 'marcador_visitante': 70, 'id_equipo_local': 1, 'id_equipo_visitante': 4}
    cuadro = _cuadro(TODOS_CONTRA_TODOS, jugados={'SF1': sf1})
    assert (cuadro['SF1']['estado'], cuadro['SF1']['ganador'], cuadro['SF1']['partido']) == ('finalizado', 4, sf1)
    assert (cuadro['F']['local']['id_equipo'], cuadro['F']['visitante'], cuadro['F']['estado']) == (4, None, 'espera')
    assert cuadro['3P']['local']['id_equipo'] == 1


def test_recorrido_despues_de_la_primera_fecha():
    cinco = {i: None for i in range(1, 6)}
    salida = llaves.recorrido(SEMIS, cinco, [(1, 2, 70, 60, 'finalizado', date(2026, 9, 1))], {})
    assert (salida['fechas'], salida['cupos']) == (['2026-09-01'], 4)
    equipos = salida['grupos'][0]['equipos']
    assert [(e['id_equipo'], e['restantes'], e['situacion']) for e in equipos] == [
        (1, 3, 'zona'), (2, 3, 'zona'), (3, 4, 'zona'), (4, 4, 'zona'), (5, 4, 'depende')]
    assert equipos[0]['posiciones'] == [1]


# ── Casos de uso con piezas falsas ──

class Repositorio:
    """Lo que usan los casos de uso de partidos y de la fase final, en memoria."""

    def __init__(self, *guardados, grupos=CUATRO, rechaza=False):
        self.partidos = {p.id_partido: p for p in guardados}
        self.grupos, self.rechaza = dict(grupos), rechaza

    def obtener(self, id_partido):
        partido = self.partidos.get(id_partido)
        return replace(partido) if partido else None

    def agregar(self, datos):
        if self.rechaza:
            raise Conflicto('La base rechazó el partido.')
        nuevo = Partido(max(self.partidos, default=0) + 1, **datos)
        self.partidos[nuevo.id_partido] = nuevo
        return nuevo.id_partido

    def actualizar(self, id_partido, cambios):
        self.partidos[id_partido] = replace(self.partidos[id_partido], **cambios)

    def grupos_de_categoria(self, id_torneo, id_categoria):
        return self.grupos

    def partidos_fase_grupos(self, id_torneo, id_categoria):
        return [(p.id_equipo_local, p.id_equipo_visitante, p.marcador_local, p.marcador_visitante, p.estado)
                for p in self.partidos.values() if not p.llave and p.estado in ESTADOS_FINALES]

    def pendientes_fase_grupos(self, id_torneo, id_categoria):
        return 0

    def partidos_de_llaves(self, id_torneo, id_categoria):
        return {p.llave: asdict(p) for p in self.partidos.values() if p.llave and p.estado != 'anulado'}

    def equipos(self, ids):
        return {}


class Almacen:
    def __init__(self):
        self.llamadas = []

    def subir_archivo(self, stream, nombre, carpeta, mime):
        self.llamadas.append(('subir', f'{carpeta}/{nombre}'))
        return f'{carpeta}/{nombre}'

    def borrar_archivo(self, url):
        self.llamadas.append(('borrar', url))


class Unidad:
    def __init__(self):
        self.estado = 'abierta'

    def confirmar(self):
        self.estado = 'confirmada'

    def revertir(self):
        self.estado = 'revertida'


def test_crear_revierte_si_la_base_rechaza_el_partido():
    unidad = Unidad()
    datos = {'id_torneo': 1, 'id_categoria': 2, 'id_equipo_local': 1, 'id_equipo_visitante': 2, 'fase': 'PRIMERA FASE'}
    with pytest.raises(ReglaDeNegocio, match='conflicto de datos'):
        partidos.crear(datos, repositorio=Repositorio(rechaza=True), unidad=unidad)
    assert unidad.estado == 'revertida'


def test_subir_acta_borra_la_anterior_antes_de_validar_la_nueva():
    repositorio, almacen, unidad = Repositorio(replace(FINALIZADO, url_planilla_fiba='actas_fiba/1/vieja.pdf')), Almacen(), Unidad()

    def no_es_pdf(stream):
        raise ValueError('No es un PDF.')

    with pytest.raises(ValueError):
        partidos.subir_acta(1, None, 'nueva.pdf', no_es_pdf, repositorio=repositorio, almacen=almacen, unidad=unidad)
    assert (almacen.llamadas, unidad.estado) == ([('borrar', 'actas_fiba/1/vieja.pdf')], 'abierta')

    url = partidos.subir_acta(1, None, 'nueva.pdf', lambda stream: 'application/pdf', repositorio=repositorio, almacen=almacen, unidad=unidad)
    assert (url, repositorio.obtener(1).url_planilla_fiba, unidad.estado) == ('actas_fiba/1/nueva.pdf', url, 'confirmada')


def test_generar_llaves_crea_las_listas_y_rechaza_las_demas():
    jugados = [Partido(i, 1, 2, a, b, estado='finalizado', marcador_local=70, marcador_visitante=60)
               for i, (a, b) in enumerate(TODOS_CONTRA_TODOS, start=1)]
    repositorio, unidad = Repositorio(*jugados), Unidad()
    llave = {'fecha': date(2026, 10, 17), 'hora': None}
    creados = fase_final.generar_llaves(SEMIS, [{'llave': 'SF1', **llave}], repositorio=repositorio, unidad=unidad)
    assert [(p.llave, p.fase, p.id_equipo_local, p.id_equipo_visitante) for p in creados] == [('SF1', 'Semifinal', 1, 4)]
    for codigo in ('SF1', 'F'):  # ya creada / espera a las semifinales
        with pytest.raises(Conflicto, match=f'La llave {codigo} todavía no tiene definidos sus dos equipos o ya existe.'):
            fase_final.generar_llaves(SEMIS, [{'llave': codigo, **llave}], repositorio=repositorio, unidad=unidad)
