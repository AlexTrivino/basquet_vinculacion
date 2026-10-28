"""Reglas de equipos y jugadores y sus casos de uso con piezas falsas: sin base de datos ni Storage."""
from dataclasses import replace
from datetime import date

import pytest

from app.modules.plantel.application import equipos, jugadores
from app.modules.plantel.domain.equipo import Equipo, puede_gestionar, validar_cupo_de_equipos
from app.modules.plantel.domain.jugador import (
    CAMPOS_PRIVADOS, CedulaRepetida, Jugador, delegado_puede_gestionar, edad, hace_anios, puede_ver_privados, sin_privados,
)
from app.shared.domain.errores import Conflicto, NoEncontrado, ReglaDeNegocio, SinPermiso

DELEGADO, OTRO = 'uuid-delegado', 'uuid-otro'


class Repositorio:
    """Equipos o jugadores en memoria; entrega copias, como la base. ``choca``: la base rechaza el alta."""

    def __init__(self, entidad, *filas, delegados=None, choca=False):
        self.entidad, self.choca = entidad, choca
        self.filas = {f.id_equipo if entidad is Equipo else f.id_jugador: f for f in filas}
        self.delegados = delegados or {}  # id_jugador → delegado de cada equipo donde juega
        self.pedido = None

    def obtener(self, id_fila, detalle=False):
        fila = self.filas.get(id_fila)
        return replace(fila) if fila else None

    def agregar(self, datos):
        if self.choca:
            raise Conflicto('La base rechazó el cambio.')
        id_fila = max(self.filas, default=0) + 1
        self.filas[id_fila] = self.entidad(id_fila, **datos)
        return id_fila

    def actualizar(self, id_fila, cambios):
        self.filas[id_fila] = replace(self.filas[id_fila], **cambios)

    def activos_de(self, id_usuario):
        return sum(e.id_usuario == id_usuario and e.estado == 'activo' for e in self.filas.values())

    def delegados_del_jugador(self, id_jugador):
        return self.delegados.get(id_jugador, [])

    def por_cedula(self, cedula, incluir_inactivos=False):
        return next((replace(j) for j in self.filas.values()
                     if j.documento_identificacion == cedula and (incluir_inactivos or j.estado == 'activo')), None)

    def listar(self, pagina, por_pagina, **pedido):
        self.pedido = pedido
        return [], {}

    def perfil(self, id_jugador):
        j = self.filas.get(id_jugador)
        if not j or j.estado == 'inactivo':
            return None
        return {'id_jugador': j.id_jugador, 'edad': 21, 'documento_identificacion': j.documento_identificacion,
                'correo': j.correo, 'delegados_autorizados': list(self.delegados.get(id_jugador, []))}

    def partidos_para_visor(self, id_jugador):
        return None


class Almacen:
    def __init__(self, falla_al_borrar=False):
        self.llamadas, self.falla_al_borrar = [], falla_al_borrar

    def subir_archivo(self, stream, nombre, carpeta, mime):
        self.llamadas.append(('subir', f'{carpeta}/{nombre}', mime))
        return f'{carpeta}/{nombre}'

    def borrar_archivo(self, url):
        self.llamadas.append(('borrar', url))
        if self.falla_al_borrar:
            raise RuntimeError('Storage caído')

    def borrar_en_segundo_plano(self, url):
        self.llamadas.append(('borrar después', url))


class Unidad:
    def __init__(self):
        self.estado = 'abierta'

    def confirmar(self):
        self.estado = 'confirmada'

    def revertir(self):
        self.estado = 'revertida'


TIGRES = Equipo(1, 'TIGRES', DELEGADO, url_logo='equipos/1/logo/viejo.png')
ANA = Jugador(1, 'ANA PÉREZ', '1312345678', date(2005, 3, 1), 'femenino',
              url_foto='foto.png', url_cedula='cedula.pdf', url_acta_bachiller='acta.pdf', correo='ana@correo.ec')


def piezas(entidad, *filas, **opciones):
    return {'repositorio': Repositorio(entidad, *filas, **opciones), 'unidad': Unidad()}


def test_quien_gestiona_un_equipo_y_cuantos_puede_tener():
    assert [puede_gestionar(TIGRES, u, r) for u, r in ((OTRO, 'super_admin'), (DELEGADO, 'delegado'), (OTRO, 'delegado'))] \
        == [True, True, False]
    validar_cupo_de_equipos(0)
    with pytest.raises(Conflicto, match=r'solo puede administrar 1 equipo\(s\)'):
        validar_cupo_de_equipos(1)


def test_quien_ve_y_gestiona_los_datos_de_un_jugador():
    casos = [('super_admin', OTRO, []), ('delegado', DELEGADO, [None, DELEGADO]), ('delegado', OTRO, [DELEGADO]),
             ('visor', DELEGADO, [DELEGADO]), (None, None, [DELEGADO])]
    assert [puede_ver_privados(rol, u, d) for rol, u, d in casos] == [True, True, False, False, False]
    assert puede_ver_privados('delegado', 7, ['7'])  # el id llega como texto o como número
    assert [delegado_puede_gestionar(DELEGADO, d) for d in ([], [DELEGADO, OTRO], [OTRO])] == [True, True, False]
    perfil = sin_privados({'nombre': 'ANA', 'edad': 21, **{campo: 'x' for campo in CAMPOS_PRIVADOS}})
    assert perfil == {'nombre': 'ANA', 'edad': 21}


def test_edad_cumplida_y_fecha_de_corte():
    assert [edad(date(2008, 10, 29), date(2026, 10, d)) for d in (28, 29)] == [17, 18]
    assert edad(None, date(2026, 10, 28)) is None
    assert hace_anios(date(2026, 10, 28), 18) == date(2008, 10, 28)
    assert hace_anios(date(2028, 2, 29), 18) == date(2010, 2, 28)  # 2010 no es bisiesto


def test_crear_equipo_a_nombre_de_quien_lo_pide_y_dentro_del_cupo():
    p = piezas(Equipo)
    nuevo = equipos.crear({'nombre_equipo': 'leones'}, DELEGADO, **p)
    assert (nuevo.nombre_equipo, nuevo.id_usuario, p['unidad'].estado) == ('LEONES', DELEGADO, 'confirmada')
    with pytest.raises(Conflicto, match='Límite alcanzado'):
        equipos.crear({'nombre_equipo': 'Pumas'}, DELEGADO, **p)
    p = piezas(Equipo, choca=True)
    with pytest.raises(Conflicto, match='Ya existe un equipo con ese nombre'):
        equipos.crear({'nombre_equipo': 'Leones'}, OTRO, **p)
    assert p['unidad'].estado == 'revertida'


def test_un_delegado_solo_gestiona_sus_equipos():
    p = piezas(Equipo, TIGRES)
    with pytest.raises(SinPermiso, match='modificar este equipo'):
        equipos.actualizar(1, {'nombre_equipo': 'x'}, OTRO, 'delegado', **p)
    with pytest.raises(SinPermiso, match='eliminar este equipo'):
        equipos.dar_de_baja(1, OTRO, 'delegado', **p)
    assert equipos.actualizar(1, {'nombre_equipo': 'tigres b'}, OTRO, 'super_admin', **p).nombre_equipo == 'TIGRES B'
    equipos.dar_de_baja(1, DELEGADO, 'delegado', **p)
    with pytest.raises(NoEncontrado):
        equipos.para_gestionar(1, DELEGADO, 'delegado', p['repositorio'])
    assert equipos.obtener(1, p['repositorio'], incluir_inactivos=True).estado == 'inactivo'


def test_reactivar_si_el_delegado_no_tiene_otro_equipo_activo():
    p = piezas(Equipo, replace(TIGRES, estado='inactivo'), Equipo(2, 'PUMAS', DELEGADO))
    with pytest.raises(NoEncontrado, match='ya activo'):
        equipos.reactivar(2, **p)
    with pytest.raises(Conflicto, match='ya tiene 1 equipo activo'):
        equipos.reactivar(1, **p)
    p['repositorio'].actualizar(2, {'estado': 'inactivo'})
    equipos.reactivar(1, **p)
    assert p['repositorio'].filas[1].estado == 'activo'


def test_logo_y_banner_del_equipo():
    p, almacen = piezas(Equipo, TIGRES), Almacen(falla_al_borrar=True)
    url = equipos.reemplazar_imagen(1, 'logo', b'png', 'nuevo.png', lambda stream: 'image/png', almacen=almacen, **p)
    assert almacen.llamadas == [('borrar', 'equipos/1/logo/viejo.png'), ('subir', 'equipos/1/logo/nuevo.png', 'image/png')]
    assert p['repositorio'].filas[1].url_logo == url and p['unidad'].estado == 'confirmada'
    with pytest.raises(ReglaDeNegocio, match='El equipo no tiene banner.'):
        equipos.quitar_imagen(1, 'banner', almacen=Almacen(), **p)
    equipos.quitar_imagen(1, 'logo', almacen=Almacen(), **p)
    assert p['repositorio'].filas[1].url_logo is None


def test_el_listado_completo_de_jugadores_es_solo_del_super_admin():
    repositorio = Repositorio(Jugador)
    assert jugadores.listar(1, 20, 'delegado', repositorio, estado='inactivo', search='131')[2] is False
    assert repositorio.pedido == {'estado': 'activo', 'search': '131', 'buscar_por_cedula': False, 'detalle': False}
    assert jugadores.listar(1, 20, 'super_admin', repositorio, estado='inactivo')[2] is True
    assert repositorio.pedido == {'estado': 'inactivo', 'buscar_por_cedula': True, 'detalle': True}


def test_ficha_y_perfil_sin_datos_personales_para_quien_no_es_su_delegado():
    repositorio = Repositorio(Jugador, ANA, replace(ANA, id_jugador=2, estado='inactivo'), delegados={1: [DELEGADO]})
    assert [jugadores.ficha(1, u, rol, repositorio)[1] for u, rol in ((None, None), (OTRO, 'delegado'), (DELEGADO, 'delegado'))] \
        == [False, False, True]
    assert jugadores.ficha(2, OTRO, 'super_admin', repositorio)[0].estado == 'inactivo'
    with pytest.raises(NoEncontrado):
        jugadores.ficha(2, None, None, repositorio)
    assert 'correo' not in jugadores.perfil(1, OTRO, 'delegado', repositorio)
    assert jugadores.perfil(1, DELEGADO, 'delegado', repositorio)['correo'] == 'ana@correo.ec'
    with pytest.raises(NoEncontrado):
        jugadores.partidos_del_jugador(1, repositorio)


def test_un_delegado_gestiona_jugadores_libres_o_de_sus_equipos():
    repositorio = Repositorio(Jugador, ANA, replace(ANA, id_jugador=2, estado='inactivo'), delegados={1: [OTRO]})
    with pytest.raises(SinPermiso, match='mensaje propio'):
        jugadores.para_gestionar(1, DELEGADO, 'delegado', 'mensaje propio', repositorio)
    assert jugadores.para_gestionar(1, DELEGADO, 'super_admin', '', repositorio).id_jugador == 1
    with pytest.raises(NoEncontrado):
        jugadores.para_gestionar(2, DELEGADO, 'delegado', '', repositorio)
    assert jugadores.para_gestionar(2, DELEGADO, 'delegado', '', repositorio, incluir_inactivos=True).id_jugador == 2


def test_cedula_repetida_devuelve_al_jugador_que_la_tiene_aunque_este_inactivo():
    inactiva = replace(ANA, estado='inactivo')
    p = piezas(Jugador, inactiva, choca=True)
    with pytest.raises(CedulaRepetida) as error:
        jugadores.crear({'nombre': 'ana', 'documento_identificacion': '1312345678'}, **p)
    assert (error.value.jugador, p['unidad'].estado) == (inactiva, 'revertida')
    p = piezas(Jugador)
    nuevo = jugadores.crear({'nombre': 'luis mora', 'documento_identificacion': '0912345678', 'fecha_nacimiento': date(2004, 1, 2)}, **p)
    assert nuevo.nombre == 'LUIS MORA'


def test_la_baja_y_los_documentos_nuevos_borran_los_viejos_en_segundo_plano():
    p, almacen = piezas(Jugador, ANA), Almacen()
    jugador = jugadores.reemplazar_documento(1, 'cedula', b'pdf', 'nueva.pdf', 'application/pdf', almacen=almacen, **p)
    assert jugador.url_cedula == 'jugadores/1/cedulas/nueva.pdf'
    assert almacen.llamadas == [('subir', 'jugadores/1/cedulas/nueva.pdf', 'application/pdf'), ('borrar después', 'cedula.pdf')]
    almacen.llamadas.clear()
    jugadores.dar_de_baja(1, almacen=almacen, **p)
    assert p['repositorio'].filas[1].estado == 'inactivo' and p['unidad'].estado == 'confirmada'
    assert [u for _, u in almacen.llamadas] == ['foto.png', 'jugadores/1/cedulas/nueva.pdf', 'acta.pdf']
