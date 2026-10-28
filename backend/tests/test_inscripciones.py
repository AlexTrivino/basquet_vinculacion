"""Reglas de inscripciones y plantillas y sus casos de uso con piezas falsas: sin base de datos ni Storage."""
from dataclasses import replace
from datetime import date, datetime

import pytest

from app.modules.inscripciones.application import inscripciones, plantillas
from app.modules.inscripciones.domain.inscripcion import (
    EquipoResumen, Inscripcion, SinCupoParaClubNuevo, TorneoResumen, validar_club_nuevo, validar_envio,
    validar_equipo_para_inscribir, validar_retiro, validar_torneo_para_inscribir, validar_un_borrador,
)
from app.modules.inscripciones.domain.plantilla import (
    CategoriaInscrita, JugadorDePlantilla, Plantilla, edad_deportiva, validar_cupo_de_plantilla, validar_edad, ve_datos_personales,
)
from app.shared.domain.errores import Conflicto, NoEncontrado, ReglaDeNegocio, SinPermiso

DELEGADO, OTRO = 'uuid-delegado', 'uuid-otro'
SAN_JOSE = EquipoResumen(1, 'SAN JOSÉ', DELEGADO)


def inscripcion(id_, estado, torneo=2, categoria=3, equipo=SAN_JOSE, comprobante='pago.pdf', estado_torneo='programado', cuando=None):
    return Inscripcion(id_, torneo, equipo.id_equipo, categoria, estado, url_comprobante_pago=comprobante, updated_at=cuando,
                       torneo=TorneoResumen(torneo, 'NACIONAL', estado_torneo), equipo=equipo)


class RepoInscripciones:
    """En memoria; entrega copias, como la base. ``choca``: la base rechaza el alta."""

    def __init__(self, *filas, torneos=None, categorias=(), plantilla=(), archivos=None, borradores=0, activos=0, choca=False):
        self.filas = {i.id_inscripcion: i for i in filas}
        self.torneos = torneos or {2: 'programado'}
        self.equipos = {i.equipo.id_equipo: i.equipo for i in filas} or {1: SAN_JOSE}
        self.categorias, self.plantilla, self.archivos = set(categorias), [dict(p) for p in plantilla], archivos or {}
        self.borradores, self.activos, self.choca = borradores, activos, choca
        self.partidos_borrados = []

    def obtener(self, id_):
        return replace(self.filas[id_]) if id_ in self.filas else None

    def estado_del_torneo(self, id_torneo):
        return self.torneos.get(id_torneo)

    def existe_categoria(self, id_categoria):
        return id_categoria in self.categorias

    def equipo(self, id_equipo):
        return self.equipos.get(id_equipo)

    def equipos_activos_de(self, id_usuario):
        return self.activos

    def borradores_de(self, id_usuario):
        return self.borradores

    def buscar(self, id_torneo, id_equipo, id_categoria):
        return next((i.id_inscripcion for i in self.filas.values() if (i.id_torneo, i.id_equipo, i.id_categoria) == (id_torneo, id_equipo, id_categoria)), None)

    def anterior_en_otro_torneo(self, id_equipo, id_torneo):
        anteriores = [i for i in self.filas.values() if i.id_equipo == id_equipo and i.id_torneo != id_torneo and i.estado_inscripcion != 'rechazado']
        return (anteriores[-1].id_torneo, anteriores[-1].id_categoria) if anteriores else None

    def agregar(self, datos):
        if self.choca:
            raise Conflicto('La base rechazó el cambio.')
        id_ = max(self.filas, default=0) + 1
        self.filas[id_] = Inscripcion(id_, datos['id_torneo'], datos['id_equipo'], datos['id_categoria'],
                                      datos.get('estado_inscripcion', 'pendiente'), equipo=self.equipos[datos['id_equipo']])
        return id_

    def agregar_equipo(self, nombre_equipo, id_usuario):
        id_ = max(self.equipos) + 1
        self.equipos[id_] = EquipoResumen(id_, nombre_equipo, id_usuario)
        return id_

    def actualizar(self, id_, cambios):
        self.filas[id_] = replace(self.filas[id_], **cambios)

    def actualizar_equipo(self, id_equipo, cambios):
        self.equipos[id_equipo] = replace(self.equipos[id_equipo], **cambios)

    def plantilla_de(self, id_equipo, id_torneo, id_categoria):
        return [(p['id_jugador'], p['numero_camiseta']) for p in self.plantilla
                if (p['id_equipo'], p['id_torneo'], p['id_categoria']) == (id_equipo, id_torneo, id_categoria)]

    def juega_en(self, id_jugador, id_torneo):
        return any(p['id_jugador'] == id_jugador and p['id_torneo'] == id_torneo for p in self.plantilla)

    def agregar_a_plantilla(self, **datos):
        self.plantilla.append(datos)

    def dorsales_activos(self, id_equipo, id_torneo):
        return [p['numero_camiseta'] for p in self.plantilla if (p['id_equipo'], p['id_torneo'], p['estado']) == (id_equipo, id_torneo, 'activo')]

    def mover_plantilla(self, id_equipo, desde, hacia):
        for p in self.plantilla:
            if p['id_equipo'] == id_equipo and (p['id_torneo'], p['id_categoria']) == desde:
                p['id_torneo'], p['id_categoria'] = hacia

    def borrar_partidos_programados(self, id_torneo, id_equipo):
        self.partidos_borrados.append((id_torneo, id_equipo))

    def expiradas(self, limite):
        return [i.id_inscripcion for i in self.filas.values() if i.estado_inscripcion in ('borrador', 'rechazado') and i.updated_at < limite]

    def borrar(self, id_):
        borrada = self.filas.pop(id_)
        return self.archivos.get(id_, []), not any(i.id_equipo == borrada.id_equipo for i in self.filas.values())


class Almacen:
    def __init__(self, falla_al_subir=None):
        self.llamadas, self.falla_al_subir = [], falla_al_subir

    def subir_archivo(self, stream, nombre, carpeta, mime):
        if nombre == self.falla_al_subir:
            raise RuntimeError('Storage caído')
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


def piezas(*filas, **opciones):
    return {'repositorio': RepoInscripciones(*filas, **opciones), 'unidad': Unidad()}


def test_cuando_se_acepta_una_inscripcion():
    for estado, mensaje in ((None, 'no existe o está inactivo'), ('inactivo', 'no existe'), ('en_curso', 'en curso, finalizado o anulado'),
                            ('anulado', 'anulado')):
        with pytest.raises(ReglaDeNegocio, match=mensaje):
            validar_torneo_para_inscribir(estado)
    validar_torneo_para_inscribir('programado')
    for equipo in (None, replace(SAN_JOSE, estado='inactivo')):
        with pytest.raises(ReglaDeNegocio, match='El equipo especificado'):
            validar_equipo_para_inscribir(equipo)
    validar_un_borrador(0)
    with pytest.raises(ReglaDeNegocio, match='una solicitud en borrador'):
        validar_un_borrador(1)


def test_un_club_nuevo_necesita_cupo_y_ningun_borrador():
    validar_club_nuevo(0, 0)
    with pytest.raises(SinCupoParaClubNuevo, match=r'más de 1 equipo\(s\)'):
        validar_club_nuevo(1, 0)
    with pytest.raises(SinCupoParaClubNuevo, match='en borrador'):
        validar_club_nuevo(0, 1)
    assert issubclass(SinCupoParaClubNuevo, Conflicto)


def test_envio_a_revision_y_retiro():
    validar_envio('borrador', 'pago.pdf', [1, 2, 3, None, None])
    validar_envio('pendiente', 'pago.pdf', list(range(18)))
    with pytest.raises(Conflicto, match='ya se encuentra en estado "aprobado"'):
        validar_envio('aprobado', 'pago.pdf', [1, 2, 3, 4, 5])
    casos = [(None, [1, 2, 3, 4, 5], 'comprobante'), ('pago.pdf', [1, 2, 3, 4], 'mínimo de 5'),
             ('pago.pdf', list(range(19)), 'máximo de 18'), ('pago.pdf', [1, 1, 2, 3, 4], 'duplicados')]
    for comprobante, dorsales, mensaje in casos:
        with pytest.raises(ReglaDeNegocio, match=mensaje):
            validar_envio('borrador', comprobante, dorsales)
    validar_retiro('aprobado')
    with pytest.raises(ReglaDeNegocio, match='aprobados'):
        validar_retiro('pendiente')


def test_edad_deportiva_cupo_de_plantilla_y_nomina_privada():
    assert edad_deportiva(date(2008, 12, 31), date(2026, 1, 1)) == 18  # el año, no el cumpleaños
    validar_edad(40, CategoriaInscrita(3, 'Senior +40', 40))
    for edad, categoria, mensaje in ((39, CategoriaInscrita(3, 'Senior +40', 40), 'edad mínima de 40'),
                                     (19, CategoriaInscrita(9, 'Juvenil', 0, 18), 'edad máxima de 18')):
        with pytest.raises(ReglaDeNegocio, match=mensaje):
            validar_edad(edad, categoria)
    validar_cupo_de_plantilla(17)
    with pytest.raises(ReglaDeNegocio, match='18 jugadores'):
        validar_cupo_de_plantilla(18)
    entrada = Plantilla(1, 13, 2, 1, 3, dueno=DELEGADO)
    assert [ve_datos_personales(entrada, u, r) for u, r in ((OTRO, 'super_admin'), (DELEGADO, 'delegado'), (OTRO, 'delegado'),
                                                              (DELEGADO, 'visor'), (None, None))] == [True, True, False, False, False]
    assert not ve_datos_personales(replace(entrada, dueno=None), 'None', 'delegado')


def test_crear_e_inscribir_con_la_plantilla_anterior():
    p = piezas(torneos={2: 'en_curso'})
    with pytest.raises(ReglaDeNegocio, match='en curso'):
        inscripciones.crear({'id_torneo': 2, 'id_equipo': 1, 'id_categoria': 3}, **p)
    with pytest.raises(ReglaDeNegocio, match='en borrador'):
        inscripciones.crear({'id_torneo': 2, 'id_equipo': 1, 'id_categoria': 3}, **piezas(borradores=1))
    p = piezas(choca=True)
    with pytest.raises(Conflicto, match='ya está inscrito'):
        inscripciones.crear({'id_torneo': 2, 'id_equipo': 1, 'id_categoria': 3}, **p)
    assert p['unidad'].estado == 'revertida'

    anterior = inscripcion(1, 'aprobado', torneo=1, categoria=1)
    plantilla = [dict(id_jugador=j, id_torneo=1, id_equipo=1, id_categoria=1, numero_camiseta=j, estado='activo') for j in (4, 5)]
    plantilla.append(dict(id_jugador=5, id_torneo=2, id_equipo=9, id_categoria=7, numero_camiseta=8, estado='activo'))
    p = piezas(anterior, plantilla=plantilla)
    nueva = inscripciones.reinscribir({'id_torneo': 2, 'id_equipo': 1, 'id_categoria': 3}, True, **p)
    assert (nueva.estado_inscripcion, p['unidad'].estado) == ('borrador', 'confirmada')
    assert p['repositorio'].plantilla_de(1, 2, 3) == [(4, 4)]  # el 5 ya juega este torneo con otro equipo
    p = piezas(anterior, plantilla=plantilla)
    inscripciones.reinscribir({'id_torneo': 2, 'id_equipo': 1, 'id_categoria': 3}, False, **p)
    assert p['repositorio'].plantilla_de(1, 2, 3) == []


def test_rechazar_borrar_el_borrador_y_purgar_usan_la_cascada():
    p, almacen = piezas(inscripcion(8, 'pendiente'), archivos={8: ['pago.pdf', 'foto.jpg']}), Almacen()
    assert inscripciones.cambiar_estado(8, 'rechazado', almacen=almacen, **p) is None
    assert almacen.llamadas == [('borrar', 'pago.pdf'), ('borrar', 'foto.jpg')] and p['unidad'].estado == 'confirmada'
    with pytest.raises(NoEncontrado):
        inscripciones.cambiar_estado(8, 'aprobado', almacen=almacen, **p)
    p = piezas(inscripcion(8, 'pendiente'))
    assert inscripciones.cambiar_estado(8, 'aprobado', almacen=almacen, **p).estado_inscripcion == 'aprobado'

    p = piezas(inscripcion(9, 'borrador'), inscripcion(1, 'aprobado', torneo=1))
    with pytest.raises(NoEncontrado, match='no tienes permisos'):
        inscripciones.eliminar_borrador(9, OTRO, almacen=Almacen(), **p)
    with pytest.raises(ReglaDeNegocio, match='estado de borrador'):
        inscripciones.eliminar_borrador(1, DELEGADO, almacen=Almacen(), **p)
    inscripciones.eliminar_borrador(9, DELEGADO, almacen=Almacen(), **p)
    assert p['repositorio'].obtener(9) is None

    viejo, reciente = datetime(2026, 9, 1), datetime(2026, 10, 25)
    p = piezas(inscripcion(9, 'borrador', cuando=viejo), inscripcion(10, 'rechazado', equipo=EquipoResumen(4, 'STELLA', OTRO), cuando=viejo),
               inscripcion(4, 'aprobado', torneo=1, equipo=EquipoResumen(4, 'STELLA', OTRO), cuando=viejo),
               inscripcion(8, 'borrador', equipo=EquipoResumen(2, 'FAE', OTRO), cuando=reciente))
    resumen = inscripciones.purgar_expiradas(30, datetime(2026, 10, 28), almacen=Almacen(), **p)
    assert resumen == {'inscripciones_purgadas': 2, 'equipos_eliminados': 1, 'dias_umbral': 30}
    assert sorted(p['repositorio'].filas) == [4, 8]


def test_editar_y_retirar():
    p = piezas(inscripcion(8, 'pendiente', categoria=3), inscripcion(5, 'aprobado', categoria=6), torneos={2: 'programado', 3: 'finalizado'},
               categorias=(3, 6, 7), plantilla=[dict(id_jugador=12, id_torneo=2, id_equipo=1, id_categoria=3, numero_camiseta=23, estado='activo')])
    for id_torneo, id_categoria, error, mensaje in ((99, 7, NoEncontrado, 'nuevo torneo'), (3, 7, ReglaDeNegocio, 'programado'),
                                                    (2, 99, NoEncontrado, 'categoría'), (2, 6, Conflicto, 'ya está inscrito')):
        with pytest.raises(error, match=mensaje):
            inscripciones.editar(8, id_torneo, id_categoria, **p)
    assert inscripciones.editar(8, 2, 3, **p).id_categoria == 3  # a donde ya está: no choca consigo misma
    assert inscripciones.editar(8, 2, 7, **p).id_categoria == 7
    assert p['repositorio'].plantilla_de(1, 2, 7) == [(12, 23)]
    with pytest.raises(ReglaDeNegocio, match='en curso o finalizado'):
        inscripciones.editar(1, 2, 7, **piezas(inscripcion(1, 'aprobado', estado_torneo='en_curso')))

    with pytest.raises(ReglaDeNegocio, match='aprobados'):
        inscripciones.retirar(8, **p)
    assert inscripciones.retirar(5, **p).estado_inscripcion == 'retirado'
    assert p['repositorio'].partidos_borrados == [(2, 1)]


def test_alta_completa_de_un_club_es_todo_o_nada():
    comprobante, logo = (b'%PDF', 'pago.pdf', 'application/pdf'), (b'png', 'logo.png', 'image/png')
    with pytest.raises(SinCupoParaClubNuevo):
        inscripciones.crear_completa('club', '2', '7', comprobante, None, DELEGADO, almacen=Almacen(), **piezas(activos=1))
    p, almacen = piezas(), Almacen()
    nueva = inscripciones.crear_completa('club náutico', '2', '7', comprobante, logo, OTRO, almacen=almacen, **p)
    assert (nueva.estado_inscripcion, nueva.url_comprobante_pago, p['unidad'].estado) == ('borrador', 'inscripciones/1/pago.pdf', 'confirmada')
    assert p['repositorio'].equipos[2].nombre_equipo == 'CLUB NÁUTICO' and p['repositorio'].equipos[2].url_logo == 'equipos/2/logo/logo.png'
    p, almacen = piezas(), Almacen(falla_al_subir='logo.png')
    with pytest.raises(RuntimeError):
        inscripciones.crear_completa('club', '2', '7', comprobante, logo, OTRO, almacen=almacen, **p)
    assert p['unidad'].estado == 'revertida'
    assert almacen.llamadas == [('subir', 'inscripciones/1/pago.pdf'), ('borrar', 'inscripciones/1/pago.pdf')]
    with pytest.raises(ValueError):
        inscripciones.crear_completa('club', 'dos', '7', comprobante, None, OTRO, almacen=Almacen(), **piezas())


def test_enviar_a_revision_y_subir_comprobante():
    plantilla = [dict(id_jugador=j, id_torneo=2, id_equipo=1, id_categoria=3, numero_camiseta=j, estado='activo') for j in range(5)]
    p = piezas(inscripcion(9, 'borrador'), plantilla=plantilla)
    with pytest.raises(SinPermiso, match='gestionar esta inscripción'):
        inscripciones.enviar_a_revision(9, OTRO, 'delegado', **p)
    assert inscripciones.enviar_a_revision(9, DELEGADO, 'delegado', **p).estado_inscripcion == 'pendiente'
    p = piezas(inscripcion(9, 'borrador', comprobante=None), plantilla=plantilla[:4])
    with pytest.raises(ReglaDeNegocio, match='comprobante'):
        inscripciones.enviar_a_revision(9, OTRO, 'super_admin', **p)
    url = inscripciones.subir_comprobante(9, b'%PDF', 'pago.pdf', 'application/pdf', almacen=Almacen(), **p)
    assert (url, p['repositorio'].obtener(9).url_comprobante_pago) == ('inscripciones/9/pago.pdf', url)
    with pytest.raises(ReglaDeNegocio, match='mínimo de 5'):
        inscripciones.enviar_a_revision(9, OTRO, 'super_admin', **p)


class RepoPlantillas:
    def __init__(self, *entradas, torneo='programado', categoria=CategoriaInscrita(3, 'Senior +40', 40), activos=0, jugador=None,
                 ya_juega=False, choca=False):
        self.entradas = {e.id_plantilla: e for e in entradas}
        self.torneo, self.categoria, self.activos, self.ya_juega, self.choca = torneo, categoria, activos, ya_juega, choca
        self.jugador_ = jugador or JugadorDePlantilla(18, 'MANUEL VERA PICO', fecha_nacimiento=date(1975, 9, 9))

    def obtener(self, id_):
        entrada = self.entradas.get(id_)
        return replace(entrada) if entrada and entrada.estado == 'activo' else None

    def dueno_del_equipo(self, id_equipo):
        return DELEGADO if id_equipo == 1 else None

    def estado_del_torneo(self, id_torneo):
        return self.torneo

    def categoria_inscrita(self, id_equipo, id_torneo, id_categoria):
        return self.categoria

    def activos_en(self, id_equipo, id_torneo, id_categoria):
        return self.activos

    def jugador(self, id_jugador):
        return self.jugador_

    def juega_la_categoria(self, id_jugador, id_torneo, id_categoria):
        return self.ya_juega

    def dorsal_ocupado(self, id_equipo, id_torneo, numero, id_categoria=None, salvo=None):
        return any(e.numero_camiseta == numero and e.id_plantilla != salvo and e.estado == 'activo' for e in self.entradas.values())

    def agregar(self, datos):
        if self.choca:
            raise Conflicto('La base rechazó el cambio.')
        id_ = max(self.entradas, default=0) + 1
        self.entradas[id_] = Plantilla(id_, datos['id_jugador'], datos['id_torneo'], datos['id_equipo'], datos['id_categoria'],
                                       datos.get('numero_camiseta'), dueno=self.dueno_del_equipo(datos['id_equipo']))
        return id_

    def actualizar(self, id_, cambios):
        self.entradas[id_] = replace(self.entradas[id_], **cambios)


def test_agregar_un_jugador_revisa_en_orden():
    hoy, datos = date(2026, 10, 28), {'id_jugador': 18, 'id_torneo': 2, 'id_equipo': 1, 'id_categoria': 3, 'numero_camiseta': 24}
    casos = [
        ({}, OTRO, 'delegado', SinPermiso, 'agregar jugadores'),
        ({'torneo': 'en_curso'}, DELEGADO, 'delegado', ReglaDeNegocio, 'en curso'),
        ({'categoria': None}, DELEGADO, 'delegado', ReglaDeNegocio, 'inscripción válida'),
        ({'activos': 18}, DELEGADO, 'delegado', ReglaDeNegocio, 'límite máximo'),
        ({'jugador': JugadorDePlantilla(18, 'X', fecha_nacimiento=date(1975, 1, 1), estado='inactivo')}, DELEGADO, 'delegado', ReglaDeNegocio, 'no existe'),
        ({'jugador': JugadorDePlantilla(1, 'X', fecha_nacimiento=date(2008, 3, 10))}, DELEGADO, 'delegado', ReglaDeNegocio, 'edad mínima'),
        ({'ya_juega': True}, DELEGADO, 'delegado', Conflicto, 'una vez por categoría'),
    ]
    for opciones, id_usuario, rol, error, mensaje in casos:
        with pytest.raises(error, match=mensaje):
            plantillas.agregar_jugador(datos, id_usuario, rol, hoy, repositorio=RepoPlantillas(**opciones), unidad=Unidad())
    unidad = Unidad()
    with pytest.raises(Conflicto, match='conflicto de datos'):
        plantillas.agregar_jugador(datos, OTRO, 'super_admin', hoy, repositorio=RepoPlantillas(choca=True), unidad=unidad)
    assert unidad.estado == 'revertida'
    p = {'repositorio': RepoPlantillas(Plantilla(1, 12, 2, 1, 3, 24)), 'unidad': Unidad()}
    with pytest.raises(Conflicto, match='camiseta 24'):
        plantillas.agregar_jugador(datos, DELEGADO, 'delegado', hoy, **p)
    entrada = plantillas.agregar_jugador({**datos, 'numero_camiseta': 30}, OTRO, 'super_admin', hoy,
                                         **{**p, 'repositorio': RepoPlantillas(torneo='en_curso')})
    assert entrada.numero_camiseta == 30  # el super_admin agrega aunque el torneo esté en curso


def test_cambiar_dorsal_y_remover():
    p = {'repositorio': RepoPlantillas(Plantilla(13, 13, 2, 1, 3, 1, dueno=DELEGADO), Plantilla(14, 14, 2, 1, 3, 2, dueno=DELEGADO)), 'unidad': Unidad()}
    with pytest.raises(Conflicto, match='camiseta 2'):
        plantillas.cambiar_dorsal(13, 2, **p)
    assert plantillas.cambiar_dorsal(13, 1, **p).numero_camiseta == 1  # el suyo propio no cuenta
    with pytest.raises(SinPermiso, match='modificar la plantilla'):
        plantillas.remover(13, OTRO, 'delegado', **p)
    plantillas.remover(13, OTRO, 'super_admin', **p)
    with pytest.raises(NoEncontrado):
        plantillas.para_gestionar(13, DELEGADO, 'delegado', p['repositorio'])
