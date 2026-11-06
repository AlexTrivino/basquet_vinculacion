"""Reglas de estadísticas y sus casos de uso con piezas falsas: sin base de datos."""
from datetime import date

import pytest

from app.modules.estadisticas.application import estadisticas as casos
from app.modules.estadisticas.domain.estadisticas import (
    CARGABLES, CON_PUNTOS, JUGADOS, PartidoParaCarga, Planilla, etiqueta_categoria, lideres, orden_de_figura, validar_carga,
    validar_jugadores_propios, valoracion,
)
from app.shared.domain.errores import NoEncontrado, ReglaDeNegocio, SinPermiso

FAE_MANTA = PartidoParaCarga(1, 'finalizado', 2, 3, 51, 49)


def linea(puntos=0, rebotes=0, asistencias=0, tapones=0, triples=0, tiros_libres=0):
    return {'puntos': puntos, 'rebotes': rebotes, 'asistencias': asistencias, 'tapones': tapones, 'triples': triples, 'tiros_libres': tiros_libres}


def test_que_partidos_cuentan_hoy_en_cada_vista():
    assert JUGADOS == ('finalizado', 'finalizado_wo') and CON_PUNTOS == ('finalizado',)  # el W.O. no son puntos anotados
    assert set(CARGABLES) == {'en_curso', 'finalizado', 'finalizado_wo'}


def test_valoracion_figura_y_etiqueta_de_la_categoria():
    assert valoracion(linea(10, 5, 3, 2, triples=4, tiros_libres=6)) == 20  # triples y tiros libres ya están en los puntos
    goleador, completo = {'valoracion': 20, 'linea': linea(18)}, {'valoracion': 20, 'linea': linea(12)}
    assert max([completo, goleador], key=orden_de_figura) is goleador  # en empate, más puntos
    assert orden_de_figura({'valoracion': 21, 'linea': linea(2)}) > orden_de_figura(goleador)
    assert [etiqueta_categoria(n, g) for n, g in (('Juvenil', 'masculino'), ('Cadetes +30 Femenino', 'femenino'), ('Libre', None),
                                                   ('Libre', ' '))] == ['Juvenil (masculino)', 'Cadetes +30 Femenino', 'Libre', 'Libre']


def test_lideres_sin_ceros_y_con_tope():
    totales = [{'id_jugador': j, **linea(puntos=p, triples=t, rebotes=r)} for j, p, t, r in ((1, 10, 0, 0), (2, 30, 2, 0), (3, 30, 1, 0), (4, 0, 5, 0))]
    primeros = lideres(totales, limite=2)
    assert [t['id_jugador'] for t in primeros['puntos']] == [2, 3]  # empate también en valoración: el orden de la consulta
    totales[2]['rebotes'] = 4
    assert [t['id_jugador'] for t in lideres(totales, limite=2)['puntos']] == [3, 2]  # en empate, la mayor valoración (como el flyer)
    assert [t['id_jugador'] for t in primeros['triples']] == [4, 2]
    assert primeros['rebotes'] == [] and set(primeros) == {'puntos', 'triples', 'rebotes', 'asistencias', 'tapones', 'tiros_libres'}


def test_validar_la_carga_de_un_equipo():
    validar_carga(FAE_MANTA, 2, 51)
    validar_carga(FAE_MANTA, 3, 49)
    validar_carga(PartidoParaCarga(1, 'en_curso', 2, 3), 2, 7)  # sin marcador no se compara
    casos_ = [(PartidoParaCarga(1, 'programado', 2, 3, 0, 0), 2, 0, 'en curso o finalizados'), (FAE_MANTA, 1, 51, 'no participó'),
              (FAE_MANTA, 2, 49, r'\(49\) no coincide .* \(51\)'), (FAE_MANTA, 3, 51, r'\(51\) no coincide .* \(49\)')]
    for partido, id_equipo, puntos, mensaje in casos_:
        with pytest.raises(ReglaDeNegocio, match=mensaje):
            validar_carga(partido, id_equipo, puntos)
    validar_jugadores_propios({5, 6}, {5, 6, 9})
    with pytest.raises(SinPermiso, match=r'\[7, 8\]'):
        validar_jugadores_propios({5, 7, 8}, {5, 6})


class Repositorio:
    def __init__(self, partido=FAE_MANTA, plantilla=frozenset({5, 6}), nombre='INTERCOLEGIAL', planilla=None, en_curso=(1,)):
        self.partido, self.plantilla, self.nombre, self.planilla_, self.en_curso = partido, plantilla, nombre, planilla, en_curso
        self.lineas, self.sanciones, self.procesadas = None, None, None

    def puntos_por_torneo(self):
        return {1: 100, 3: 45}

    def nombre_del_torneo(self, id_torneo):
        return self.nombre

    def totales_por_jugador(self, id_torneo, id_categoria):
        return [{'id_jugador': 5, **linea(puntos=30)}]

    def flyers(self, id_torneo, fecha=None):
        if id_torneo == 99:
            return None
        figuras = [{'categoria': f'Categoría {id_torneo}', 'valoracion': 40 + id_torneo}]
        return {'fecha': fecha, 'torneo': {'id_torneo': id_torneo, 'nombre': f'Torneo {id_torneo}'}, 'figuras_categoria': figuras}

    def torneos_en_curso(self):
        return self.en_curso

    def planilla(self, id_partido):
        return self.planilla_

    def partido_para_carga(self, id_partido):
        return self.partido

    def en_plantilla(self, id_equipo, id_torneo, ids):
        self.plantilla_de = (id_equipo, id_torneo)
        return ids & self.plantilla

    def reemplazar_lineas(self, id_partido, jugadores):
        self.lineas = (id_partido, [j['id_jugador'] for j in jugadores])

    def agregar_sanciones(self, id_partido, sancionados, fecha):
        self.sanciones = (id_partido, sancionados, fecha)

    def marcar_procesadas(self, id_partido, local):
        self.procesadas = (id_partido, local)


class Unidad:
    estado = 'abierta'

    def confirmar(self):
        self.estado = 'confirmada'


def test_portada_lideres_flyers_y_planilla():
    assert casos.publicas(Repositorio()) == {'puntos_totales': 145, 'puntos_por_torneo': {'1': 100, '3': 45}}
    assert casos.lideres(1, None, Repositorio())[0] == 'INTERCOLEGIAL'
    with pytest.raises(NoEncontrado, match='Torneo no encontrado'):
        casos.lideres(4, None, Repositorio(nombre=None))
    assert casos.flyers(1, date(2026, 8, 8), Repositorio())['fecha'] == date(2026, 8, 8)
    with pytest.raises(NoEncontrado, match='El torneo no existe'):
        casos.flyers(99, None, Repositorio())
    with pytest.raises(NoEncontrado, match='no existe'):
        casos.planilla(99, Repositorio())
    planilla = Planilla(7, 'programado', 'INTERCOLEGIAL', 'Semifinal', None, None, None, 'SAN JOSÉ', 'MANTA', 0, 0)
    with pytest.raises(ReglaDeNegocio, match='Estado actual: "programado"'):
        casos.planilla(7, Repositorio(planilla=planilla))
    planilla.estado = 'finalizado_wo'
    assert casos.planilla(7, Repositorio(planilla=planilla)) is planilla


def test_cargar_las_estadisticas_de_un_equipo():
    hoy = date(2026, 10, 29)
    datos = {'id_partido': 6, 'id_equipo': 2, 'estadisticas_jugadores': [
        {'id_jugador': 5, 'puntos': 30, 'sancion_tipo': None}, {'id_jugador': 6, 'puntos': 21, 'sancion_tipo': 'tecnica'}]}
    with pytest.raises(ReglaDeNegocio, match='Solo los administradores'):
        casos.cargar(datos, 'delegado', hoy, repositorio=Repositorio(), unidad=Unidad())
    with pytest.raises(ReglaDeNegocio, match='El partido especificado no existe'):
        casos.cargar(datos, 'super_admin', hoy, repositorio=Repositorio(partido=None), unidad=Unidad())
    with pytest.raises(SinPermiso, match=r'\[6\]'):
        casos.cargar(datos, 'super_admin', hoy, repositorio=Repositorio(plantilla=frozenset({5})), unidad=Unidad())
    with pytest.raises(ReglaDeNegocio, match=r'\(50\) no coincide'):
        casos.cargar({**datos, 'estadisticas_jugadores': [{'id_jugador': 5, 'puntos': 50}]}, 'super_admin', hoy,
                     repositorio=Repositorio(), unidad=Unidad())
    repositorio, unidad = Repositorio(), Unidad()
    resultado = casos.cargar(datos, 'super_admin', hoy, repositorio=repositorio, unidad=unidad)
    assert resultado == {'estadisticas_insertadas': 2, 'sanciones_insertadas': 1, 'id_partido': 6, 'id_equipo': 2}
    assert repositorio.plantilla_de == (2, 1)  # la plantilla del equipo en el torneo del partido
    assert (repositorio.lineas, repositorio.sanciones, repositorio.procesadas) == ((6, [5, 6]), (6, [(6, 'tecnica')], hoy), (6, True))
    assert unidad.estado == 'confirmada'
    repositorio = Repositorio(plantilla=frozenset({7}))
    casos.cargar({'id_partido': 6, 'id_equipo': 3, 'estadisticas_jugadores': [{'id_jugador': 7, 'puntos': 49}]}, 'super_admin', hoy,
                 repositorio=repositorio, unidad=Unidad())
    assert (repositorio.sanciones, repositorio.procesadas) == (None, (6, False))  # el visitante, sin sanciones


def test_figuras_de_los_torneos_en_curso():
    """Las figuras de cada categoría, de todos los torneos en curso y con su torneo; sin torneos en curso, ninguna."""
    assert casos.figuras_en_curso(Repositorio(en_curso=(1, 3))) == [
        {'categoria': 'Categoría 1', 'valoracion': 41, 'torneo': {'id_torneo': 1, 'nombre': 'Torneo 1'}},
        {'categoria': 'Categoría 3', 'valoracion': 43, 'torneo': {'id_torneo': 3, 'nombre': 'Torneo 3'}},
    ]
    assert casos.figuras_en_curso(Repositorio(en_curso=())) == []
