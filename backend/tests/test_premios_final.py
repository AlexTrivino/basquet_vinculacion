"""Los premios de la final (MVP y mejor defensa): la final y sus candidatos en Python puro, y las rutas: quién se puede
elegir, qué se rechaza, la foto del premiado (reglas de la del podio), el cambio de jugador que borra la foto, lo que
pasa si se corrige la final y los permisos."""
import io
import os
import time
import unittest
from datetime import date, time as hora
from unittest import mock

import jwt
import pytest
from sqlalchemy.exc import IntegrityError

from app import create_app

from app.modules.competencia.domain.podio import final_de
from app.modules.competencia.domain.premios import candidatos, validar_jugador, valoracion
from app.shared.domain.errores import ReglaDeNegocio
from app.shared.infrastructure.almacenamiento import MAX_FOTO_PODIO
from app.shared.infrastructure.db import db
from app.shared.infrastructure.modelos.categoria import Categoria
from app.shared.infrastructure.modelos.equipo import Equipo
from app.shared.infrastructure.modelos.estadistica import Estadistica
from app.shared.infrastructure.modelos.inscripcion import Inscripcion
from app.shared.infrastructure.modelos.jugador import Jugador
from app.shared.infrastructure.modelos.partido import Partido
from app.shared.infrastructure.modelos.plantilla import Plantilla
from app.shared.infrastructure.modelos.premio_final import PremioFinal
from app.shared.infrastructure.modelos.torneo import Torneo
from app.shared.infrastructure.modelos.usuario import Usuario
from tests.test_fotos_podio import Almacen, con_exif, foto, leer

SECRETO = 'secreto-de-prueba'


# ── Reglas del dominio ──────────────────────────────────────────────

def _llave(estado='finalizado', partido_estado='finalizado', ganador=6, ml=58, mv=55, local=6, visitante=7, codigo='F'):
    equipo = lambda i: {'id_equipo': i, 'nombre_equipo': f'EQUIPO {i}', 'url_logo': f'https://cdn.test/{i}.png'}  # noqa: E731
    partido = {'id_partido': 99, 'estado': partido_estado, 'id_equipo_local': local, 'id_equipo_visitante': visitante,
               'marcador_local': ml, 'marcador_visitante': mv, 'fecha': '2026-11-02'}
    return {'codigo': codigo, 'ronda': 'Final', 'estado': estado, 'local': equipo(local), 'visitante': equipo(visitante),
            'ganador': ganador, 'partido': partido if estado == 'finalizado' else None}


def test_la_final_trae_los_equipos_con_su_marcador_vengan_como_vengan():
    final = final_de([_llave(codigo='SF1'), _llave()])
    assert final['id_partido'] == 99 and final['ronda'] == 'Final' and final['fecha'] == '2026-11-02'
    assert (final['campeon']['id_equipo'], final['campeon']['marcador']) == (6, 58)
    assert (final['vice']['id_equipo'], final['vice']['marcador']) == (7, 55)
    assert final['campeon']['url_logo'] == 'https://cdn.test/6.png'
    # el partido se programó con el visitante de la llave como local: el marcador sigue a su equipo
    al_reves = final_de([_llave(local=7, visitante=6, ganador=6, ml=55, mv=58)])
    assert (al_reves['campeon']['id_equipo'], al_reves['campeon']['marcador']) == (6, 58)
    assert (al_reves['vice']['id_equipo'], al_reves['vice']['marcador']) == (7, 55)


@pytest.mark.parametrize('llaves', [
    [],  # sin llaves
    [_llave(codigo='SF1'), _llave(codigo='3P')],  # la final no existe
    [_llave(estado='programado')],  # no se jugó
    [_llave(partido_estado='finalizado_wo', ml=20, mv=0)],  # por W.O.: no hubo partido
])
def test_sin_final_jugada_no_hay_final(llaves):
    assert final_de(llaves) is None


def _jugador(i, equipo, puntos=0, rebotes=0, asistencias=0, tapones=0, triples=0, tiros_libres=0, nombre=None):
    return {'id_jugador': i, 'nombre': nombre or f'JUGADOR {i}', 'url_foto': None, 'id_equipo': equipo, 'dorsal': i, 'puntos': puntos,
            'rebotes': rebotes, 'asistencias': asistencias, 'tapones': tapones, 'triples': triples, 'tiros_libres': tiros_libres}


FINAL = final_de([_llave()])


def _ids(lista):
    return [f['jugador']['id_jugador'] for f in lista]


def test_valoracion_suma_puntos_rebotes_asistencias_y_tapones():
    assert valoracion({'puntos': 18, 'rebotes': 7, 'asistencias': 3, 'tapones': 2, 'triples': 2, 'tiros_libres': 4}) == 30


def test_el_mvp_es_solo_del_campeon_y_el_defensa_de_los_dos_finalistas():
    jugadores = [_jugador(1, 6, puntos=10), _jugador(2, 7, puntos=40), _jugador(3, 9, puntos=50)]  # el 9 no jugó la final
    c = candidatos(FINAL, jugadores)
    assert _ids(c['mvp']) == [1]
    assert sorted(_ids(c['defensa'])) == [1, 2]


def test_el_mvp_va_por_valoracion_y_en_empate_por_puntos_y_luego_por_nombre():
    c = candidatos(FINAL, [
        _jugador(1, 6, puntos=10, rebotes=10),  # 20
        _jugador(2, 6, puntos=15, rebotes=2, asistencias=3),  # 20, más puntos
        _jugador(3, 6, puntos=20, rebotes=5, asistencias=5, tapones=5),  # 35
        _jugador(4, 6, puntos=15, rebotes=2, asistencias=3, nombre='AAA'),  # igual al 2: por nombre
    ])
    assert _ids(c['mvp']) == [3, 4, 2, 1]


def test_el_defensa_va_por_rebotes_mas_tapones_y_en_empate_por_tapones_y_valoracion():
    c = candidatos(FINAL, [
        _jugador(1, 6, puntos=30, rebotes=2, tapones=1),  # 3, el mejor anotador
        _jugador(2, 7, rebotes=5, tapones=5),  # 10
        _jugador(3, 6, rebotes=8, tapones=2),  # 10, menos tapones que el 2
        _jugador(4, 7, puntos=9, rebotes=5, tapones=5),  # 10 y 5 tapones como el 2, con más valoración
    ])
    assert _ids(c['defensa']) == [4, 2, 3, 1]


def test_el_candidato_tiene_la_forma_de_una_figura_de_los_flyers():
    [figura] = candidatos(FINAL, [_jugador(1, 6, puntos=18, rebotes=7, asistencias=3, tapones=2, triples=2, tiros_libres=4)])['mvp']
    assert figura == {
        'jugador': {'id_jugador': 1, 'nombre': 'JUGADOR 1', 'url_foto': None, 'numero_camiseta': 1},
        'equipo': {'id_equipo': 6, 'nombre_equipo': 'EQUIPO 6', 'url_logo': 'https://cdn.test/6.png'},  # sin el marcador
        'categoria': None,
        'linea': {'puntos': 18, 'rebotes': 7, 'asistencias': 3, 'tapones': 2, 'triples': 2, 'tiros_libres': 4},
        'valoracion': 30,
    }


def test_sin_estadisticas_cargadas_no_hay_candidatos():
    assert candidatos(FINAL, []) == {'mvp': [], 'defensa': []}


@pytest.mark.parametrize('tipo, id_jugador', [('mvp', 2), ('mvp', 99), ('defensa', 3), ('mvp', None), ('mvp', '1'), ('mvp', True), ('mvp', [1]), ('mvp', 1.0)])
def test_validar_jugador_rechaza_a_quien_no_es_candidato(tipo, id_jugador):
    c = candidatos(FINAL, [_jugador(1, 6), _jugador(2, 7)])
    with pytest.raises(ReglaDeNegocio):
        validar_jugador(tipo, id_jugador, c)


def test_validar_jugador_acepta_a_los_candidatos():
    c = candidatos(FINAL, [_jugador(1, 6), _jugador(2, 7)])
    validar_jugador('mvp', 1, c)
    validar_jugador('defensa', 1, c)
    validar_jugador('defensa', 2, c)


# ── Rutas ───────────────────────────────────────────────────────────

# (id, nombre, equipo, dorsal, (puntos, rebotes, asistencias, tapones, triples, tiros_libres) en la final o None)
JUGADORES = [
    (1, 'BRYAN CHÁVEZ', 6, 7, (18, 7, 3, 2, 2, 4)),  # campeón, valoración 30
    (2, 'MATEO MERO', 6, 10, (22, 4, 1, 0, 3, 2)),  # campeón, valoración 27
    (3, 'DAVID CEDEÑO', 6, 12, (6, 11, 0, 4, 0, 0)),  # campeón, valoración 21 y el mejor defensa: 15 rebotes + tapones
    (4, 'LUIS ALAVA', 6, 5, (0, 0, 0, 0, 0, 0)),  # jugó y no anotó nada: tiene su fila, en cero
    (5, 'JORGE ZAMBRANO', 7, 9, (25, 9, 5, 1, 4, 3)),  # vicecampeón, la mejor valoración del partido: 40
    (6, 'CARLOS MACÍAS', 7, 11, (5, 8, 0, 5, 0, 1)),  # vicecampeón, 13 rebotes + tapones
    (7, 'SEBASTIÁN MOREIRA', 6, 14, None),  # del campeón, sin estadísticas en la final
    (8, 'JOSUÉ ALCÍVAR', 9, 3, None),  # del tercero: solo jugó el tercer puesto
]
RUTA = '/api/torneos/categorias/4/premios-final'


class TestPremiosFinal(unittest.TestCase):
    """Torneo 2, finalizado, con la categoría 4 en un grupo único y semis: la final la gana el EQUIPO 6 al 7 por 58 a 55."""

    @classmethod
    def setUpClass(cls):
        os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
        os.environ['SUPABASE_JWT_SECRET'] = SECRETO
        os.environ['SUPABASE_URL'] = 'http://127.0.0.1:9'

    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.client = self.app.test_client()
        self.almacen = Almacen()
        parche = mock.patch('app.modules.competencia.http.premios_final.almacenamiento', self.almacen)
        parche.start()
        self.addCleanup(parche.stop)

        db.session.add(Usuario(id_usuario='u-admin', nombre='Admin', correo='a@test.ec', rol='super_admin'))
        db.session.add(Usuario(id_usuario='u-del', nombre='Delegado', correo='d@test.ec', rol='delegado'))
        db.session.add(Torneo(id_torneo=2, nombre='Nacional Exalumnos', fecha_inicio=date(2026, 10, 31), fecha_fin=date(2026, 11, 2), estado='finalizado'))
        db.session.add(Categoria(id_categoria=4, nombre_categoria='+40', genero_categoria='masculino', id_torneo=2, formato='un_grupo_semis'))
        db.session.add(Categoria(id_categoria=5, nombre_categoria='Libre', genero_categoria='femenino', id_torneo=2))  # sin formato: sin final
        db.session.flush()
        equipos = list(range(6, 11))
        for i in equipos:
            db.session.add(Equipo(id_equipo=i, nombre_equipo=f'EQUIPO {i}', id_usuario='u-del', url_logo=f'https://cdn.test/{i}.png'))
            db.session.add(Inscripcion(id_torneo=2, id_equipo=i, id_categoria=4, estado_inscripcion='aprobado'))
        db.session.flush()
        for k, a in enumerate(equipos):  # todos contra todos: gana el primero de la lista
            for b in equipos[k + 1:]:
                self._jugar(None, a, b, 60, 50, fecha=date(2026, 10, 31))
        self._jugar('SF1', 6, 9, 54, 23)
        self._jugar('SF2', 7, 8, 49, 37)
        self._jugar('3P', 9, 8, 52, 44)
        self.final = self._jugar('F', 6, 7, 58, 55, fecha=date(2026, 11, 2))
        self.tercer_puesto = Partido.query.filter_by(llave='3P').one().id_partido

        for id_, nombre, equipo, dorsal, linea in JUGADORES:
            db.session.add(Jugador(id_jugador=id_, nombre=nombre, documento_identificacion=f'13100000{id_:02d}', fecha_nacimiento=date(1980, 1, id_),
                                   url_foto=f'https://cdn.test/jugadores/{id_}.jpg' if id_ == 1 else None))
            db.session.add(Plantilla(id_jugador=id_, id_torneo=2, id_equipo=equipo, id_categoria=4, numero_camiseta=dorsal))
        db.session.flush()
        for id_, _, _, _, linea in JUGADORES:
            if linea:
                self._estadistica(self.final, id_, *linea)
        self._estadistica(self.tercer_puesto, 8, 30, 3, 2, 0, 5, 5)
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    # ── utilidades ──
    def _jugar(self, llave, local, visitante, ml, mv, estado='finalizado', fecha=date(2026, 11, 1)):
        partido = Partido(id_torneo=2, id_categoria=4, id_equipo_local=local, id_equipo_visitante=visitante, fecha=fecha, hora=hora(19, 0),
                          estado=estado, fase='Final' if llave == 'F' else 'Primera fase', llave=llave, marcador_local=ml, marcador_visitante=mv)
        db.session.add(partido)
        db.session.flush()
        return partido.id_partido

    def _estadistica(self, id_partido, id_jugador, puntos, rebotes, asistencias, tapones, triples, tiros_libres):
        db.session.add(Estadistica(id_partido=id_partido, id_jugador=id_jugador, puntos_anotados=puntos, rebotes=rebotes, asistencias=asistencias,
                                   tapones=tapones, triples_anotados=triples, tiros_libres_anotados=tiros_libres))

    def _cabeceras(self, uid='u-admin'):
        token = jwt.encode({'sub': uid, 'aud': 'authenticated', 'exp': int(time.time()) + 300}, SECRETO, algorithm='HS256')
        return {'Authorization': f'Bearer {token}'}

    def _premios(self, torneo=2):
        r = self.client.get(f'/api/torneos/{torneo}/premios-final', headers=self._cabeceras())
        self.assertEqual(r.status_code, 200, r.get_json())
        return r.get_json()['data']

    def _de_la_categoria(self):
        [premio] = self._premios()['premios']
        return premio

    def _elegir(self, tipo, id_jugador, categoria=4, uid='u-admin'):
        return self.client.put(f'/api/torneos/categorias/{categoria}/premios-final/{tipo}', json={'id_jugador': id_jugador}, headers=self._cabeceras(uid))

    def _subir(self, tipo='mvp', contenido=None, nombre='foto.jpg', categoria=4, uid='u-admin'):
        contenido = foto(1600, 900) if contenido is None else contenido
        return self.client.post(f'/api/torneos/categorias/{categoria}/premios-final/{tipo}/foto', data={'foto': (io.BytesIO(contenido), nombre)},
                                content_type='multipart/form-data', headers=self._cabeceras(uid))

    def _ruta_foto(self, tipo='mvp'):
        return f'{RUTA}/{tipo}/foto'

    # ── la lectura: la final y los candidatos ──
    def test_trae_la_final_y_solo_las_categorias_que_la_jugaron(self):
        data = self._premios()
        self.assertEqual(data['torneo']['id_torneo'], 2)
        [premio] = data['premios']  # la categoría 5 no tiene formato de llaves: no hay final
        self.assertEqual(premio['categoria'], {'id_categoria': 4, 'nombre_categoria': '+40', 'genero_categoria': 'masculino'})
        self.assertEqual(premio['final'], {
            'id_partido': self.final, 'ronda': 'Final', 'fecha': '2026-11-02',
            'campeon': {'id_equipo': 6, 'nombre_equipo': 'EQUIPO 6', 'url_logo': 'https://cdn.test/6.png', 'marcador': 58},
            'vice': {'id_equipo': 7, 'nombre_equipo': 'EQUIPO 7', 'url_logo': 'https://cdn.test/7.png', 'marcador': 55}})
        self.assertEqual(premio['premios'], {'mvp': None, 'defensa': None})

    def test_el_mvp_sale_del_campeon_ordenado_por_valoracion_y_el_defensa_de_los_dos_por_rebotes_y_tapones(self):
        c = self._de_la_categoria()['candidatos']
        self.assertEqual(_ids(c['mvp']), [1, 2, 3, 4])  # sin el 5 y el 6 (vicecampeón), el 7 (sin estadísticas) ni el 8 (otro partido)
        self.assertEqual(_ids(c['defensa']), [3, 6, 5, 1, 2, 4])
        primero = c['mvp'][0]
        self.assertEqual(primero['jugador'], {'id_jugador': 1, 'nombre': 'BRYAN CHÁVEZ', 'url_foto': 'https://cdn.test/jugadores/1.jpg', 'numero_camiseta': 7})
        self.assertEqual(primero['equipo'], {'id_equipo': 6, 'nombre_equipo': 'EQUIPO 6', 'url_logo': 'https://cdn.test/6.png'})
        self.assertEqual(primero['linea'], {'puntos': 18, 'rebotes': 7, 'asistencias': 3, 'tapones': 2, 'triples': 2, 'tiros_libres': 4})
        self.assertEqual(primero['valoracion'], 30)
        self.assertEqual(c['defensa'][1]['equipo']['id_equipo'], 7)  # el mejor defensa puede ser del subcampeón

    def test_sin_estadisticas_en_la_final_la_categoria_sale_sin_candidatos(self):
        Estadistica.query.filter_by(id_partido=self.final).delete()
        db.session.commit()
        premio = self._de_la_categoria()
        self.assertEqual(premio['candidatos'], {'mvp': [], 'defensa': []})
        self.assertEqual(self._elegir('mvp', 1).status_code, 422)

    def test_una_final_por_wo_o_sin_jugar_no_aparece(self):
        partido = db.session.get(Partido, self.final)
        partido.estado = 'finalizado_wo'
        db.session.commit()
        self.assertEqual(self._premios()['premios'], [])
        partido.estado = 'programado'
        db.session.commit()
        self.assertEqual(self._premios()['premios'], [])

    def test_torneo_inexistente_o_anulado_es_404(self):
        self.assertEqual(self.client.get('/api/torneos/99/premios-final', headers=self._cabeceras()).status_code, 404)
        db.session.get(Torneo, 2).estado = 'anulado'
        db.session.commit()
        self.assertEqual(self.client.get('/api/torneos/2/premios-final', headers=self._cabeceras()).status_code, 404)
        self.assertEqual(self._elegir('mvp', 1).status_code, 404)

    # ── elegir al jugador ──
    def test_elegir_guarda_al_jugador_y_la_lectura_lo_trae(self):
        r = self._elegir('mvp', 2)  # no es el de mejor valoración, pero el admin lo elige
        self.assertEqual((r.status_code, r.get_json()['data']), (200, {'id_jugador': 2, 'foto': None}), r.get_json())
        self.assertEqual(self._de_la_categoria()['premios'], {'mvp': {'id_jugador': 2, 'foto': None}, 'defensa': None})
        self.assertEqual(self._elegir('defensa', 6).status_code, 200)  # del subcampeón
        self.assertEqual(self._de_la_categoria()['premios']['defensa'], {'id_jugador': 6, 'foto': None})

    def test_elegir_otra_vez_cambia_al_jugador_sin_crear_otra_fila(self):
        self._elegir('mvp', 2)
        self._elegir('mvp', 3)
        self.assertEqual((PremioFinal.query.count(), PremioFinal.query.one().id_jugador), (1, 3))

    def test_solo_se_elige_a_un_candidato(self):
        casos = [('mvp', 5), ('mvp', 6), ('mvp', 7), ('mvp', 8), ('mvp', 99), ('defensa', 7), ('defensa', 8), ('mvp', None), ('mvp', '1'), ('mvp', True)]
        for tipo, id_jugador in casos:
            r = self._elegir(tipo, id_jugador)
            self.assertEqual(r.status_code, 422, (tipo, id_jugador))
            self.assertEqual(r.get_json()['error_code'], 'VALIDATION_ERROR')
        self.assertIn('equipo campeón', self._elegir('mvp', 5).get_json()['message'])
        self.assertEqual(PremioFinal.query.count(), 0)
        r = self.client.put(f'{RUTA}/mvp', data='no es json', content_type='text/plain', headers=self._cabeceras())
        self.assertEqual(r.status_code, 422)
        self.assertEqual(self.client.put(f'{RUTA}/mvp', json={}, headers=self._cabeceras()).status_code, 422)

    def test_categoria_sin_la_final_inexistente_o_con_otro_tipo(self):
        self.assertEqual(self._elegir('mvp', 1, categoria=5).status_code, 422)  # sin formato: no hay final
        self.assertIn('todavía no se juega', self._elegir('mvp', 1, categoria=5).get_json()['message'])
        self.assertEqual(self._elegir('mvp', 1, categoria=99).status_code, 404)
        self.assertEqual(self.client.put(f'{RUTA}/tiros-libres', json={'id_jugador': 1}, headers=self._cabeceras()).status_code, 404)

    # ── la foto del premiado ──
    def test_subir_sin_haber_elegido_se_rechaza(self):
        r = self._subir()
        self.assertEqual(r.status_code, 422)
        self.assertIn('Elige primero al jugador', r.get_json()['message'])
        self.assertEqual((self.almacen.subidos, PremioFinal.query.count()), ([], 0))

    def test_subir_guarda_la_foto_normalizada_con_el_encuadre_centrado(self):
        self._elegir('mvp', 1)
        r = self._subir(contenido=foto(4000, 3000, exif=con_exif()))
        self.assertEqual(r.status_code, 201, r.get_json())
        [subida] = self.almacen.subidos
        self.assertEqual(r.get_json()['data'], {'id_jugador': 1, 'foto': {
            'url': subida['url'], 'ancho': 2560, 'alto': 1920, 'foco_x': 50.0, 'foco_y': 50.0, 'zoom': 1.0}})
        self.assertEqual(subida['mime'], 'image/webp')
        self.assertIn('/premios/2/4/', subida['url'])  # carpeta: torneo y categoría
        self.assertIn('mvp-1', subida['url'])
        self.assertEqual(leer(subida['datos']).size, (2560, 1920))
        self.assertEqual(dict(leer(subida['datos']).getexif()), {})  # sin cámara, fecha ni GPS
        self.assertEqual(self._de_la_categoria()['premios']['mvp']['foto']['url'], subida['url'])

    def test_cada_premio_tiene_su_foto(self):
        self._elegir('mvp', 1)
        self._elegir('defensa', 1)  # el mismo jugador gana los dos
        self._subir('mvp')
        self._subir('defensa', foto(1920, 1080))
        premios = self._de_la_categoria()['premios']
        self.assertNotEqual(premios['mvp']['foto']['url'], premios['defensa']['foto']['url'])
        self.assertEqual((PremioFinal.query.count(), len(self.almacen.subidos)), (2, 2))

    def test_reemplazar_borra_la_foto_anterior_y_vuelve_a_centrar_el_encuadre(self):
        self._elegir('mvp', 1)
        self._subir()
        primera = self.almacen.subidos[0]['url']
        self.client.patch(self._ruta_foto(), json={'foco_x': 20, 'foco_y': 80, 'zoom': 2}, headers=self._cabeceras())
        r = self._subir(contenido=foto(1920, 1080))
        self.assertEqual(r.status_code, 201)
        self.assertEqual(self.almacen.borrados, [primera])
        self.assertEqual(PremioFinal.query.count(), 1)
        datos = r.get_json()['data']['foto']
        self.assertEqual((datos['url'], datos['foco_x'], datos['foco_y'], datos['zoom']), (self.almacen.subidos[1]['url'], 50.0, 50.0, 1.0))

    def test_los_rechazos_de_la_foto_son_los_del_podio(self):
        self._elegir('mvp', 1)
        casos = [
            (b'#!/bin/sh\necho hola\n' * 100, 'Tipo de archivo no permitido'),  # un texto renombrado como foto.jpg
            (b'%PDF-1.4\n%%EOF\n', 'Tipo de archivo no permitido'),
            (b'\xff\xd8\xff\xe0' + bytes(MAX_FOTO_PODIO), 'excede el tamaño máximo permitido de 4 MB'),
            (foto(800, 600), '800 × 600 px y el mínimo es 1080 × 608'),
            (foto(1600, 900, exif=con_exif(6)), '900 × 1600 px'),  # de pie por su EXIF
            (foto(8100, 700, 'PNG', 'L', 128), '8100 × 700'),
            (foto(7000, 6000, 'PNG', 'L', 128), '40 megapíxeles'),
            (foto(1600, 900)[:300], 'No se pudo leer la foto'),
        ]
        for contenido, texto in casos:
            r = self._subir(contenido=contenido)
            self.assertEqual(r.status_code, 422, texto)
            self.assertIn(texto, r.get_json()['message'])
        self.assertEqual((self.almacen.subidos, self._de_la_categoria()['premios']['mvp']['foto']), ([], None))

    def test_sin_archivo_es_400_y_si_el_bucket_no_responde_es_502(self):
        self._elegir('mvp', 1)
        r = self.client.post(self._ruta_foto(), data={}, content_type='multipart/form-data', headers=self._cabeceras())
        self.assertEqual(r.status_code, 400)
        with mock.patch.object(self.almacen, 'subir_archivo', side_effect=RuntimeError('No se pudo establecer conexión con el servidor de almacenamiento.')):
            r = self._subir()
        self.assertEqual((r.status_code, r.get_json()['error_code']), (502, 'STORAGE_ERROR'))
        self.assertIsNone(self._de_la_categoria()['premios']['mvp']['foto'])

    def test_cambiar_de_jugador_borra_la_foto_del_anterior_pero_elegir_al_mismo_no(self):
        self._elegir('mvp', 1)
        self._subir()
        foto_del_1 = self.almacen.subidos[0]['url']
        self.client.patch(self._ruta_foto(), json={'foco_x': 20, 'foco_y': 80, 'zoom': 2}, headers=self._cabeceras())
        self._elegir('mvp', 1)  # el mismo: no se toca nada
        self.assertEqual((self.almacen.borrados, self._de_la_categoria()['premios']['mvp']['foto']['zoom']), ([], 2.0))
        r = self._elegir('mvp', 2)
        self.assertEqual(r.get_json()['data'], {'id_jugador': 2, 'foto': None})  # la foto era del 1
        self.assertEqual(self.almacen.borrados, [foto_del_1])
        fila = PremioFinal.query.one()
        self.assertEqual((fila.id_jugador, fila.url_foto, fila.ancho, fila.foco_x, fila.foco_y, fila.zoom), (2, None, None, 50, 50, 1))

    def test_ajustar_guarda_el_encuadre_y_no_toca_el_archivo(self):
        self._elegir('mvp', 1)
        self._subir()
        r = self.client.patch(self._ruta_foto(), json={'foco_x': 40.456, 'foco_y': 35, 'zoom': 1.5}, headers=self._cabeceras())
        self.assertEqual(r.status_code, 200, r.get_json())
        datos = r.get_json()['data']['foto']
        self.assertEqual((datos['foco_x'], datos['foco_y'], datos['zoom']), (40.46, 35.0, 1.5))
        self.assertEqual((datos['url'], len(self.almacen.subidos), self.almacen.borrados), (self.almacen.subidos[0]['url'], 1, []))

    def test_un_encuadre_fuera_de_rango_se_rechaza_y_sin_foto_es_404(self):
        self._elegir('mvp', 1)
        ok = {'foco_x': 50, 'foco_y': 50, 'zoom': 1}
        self.assertEqual(self.client.patch(self._ruta_foto(), json=ok, headers=self._cabeceras()).status_code, 404)  # el premio no tiene foto
        self._subir()
        for cuerpo in ({'foco_x': 101, 'foco_y': 50, 'zoom': 1}, {'foco_x': 50, 'foco_y': -1, 'zoom': 1}, {'foco_x': 50, 'foco_y': 50, 'zoom': 3.5},
                       {'foco_x': 50, 'foco_y': 50}, {}):
            self.assertEqual(self.client.patch(self._ruta_foto(), json=cuerpo, headers=self._cabeceras()).status_code, 422, cuerpo)
        r = self.client.patch(self._ruta_foto(), data='no es json', content_type='text/plain', headers=self._cabeceras())
        self.assertEqual(r.status_code, 422)
        datos = self._de_la_categoria()['premios']['mvp']['foto']
        self.assertEqual((datos['foco_x'], datos['foco_y'], datos['zoom']), (50.0, 50.0, 1.0))  # nada cambió
        self.assertEqual(self.client.patch(self._ruta_foto('defensa'), json=ok, headers=self._cabeceras()).status_code, 404)  # no hay premio

    def test_quitar_borra_el_archivo_y_el_premio_sigue_con_su_jugador(self):
        self._elegir('mvp', 1)
        self._subir()
        r = self.client.delete(self._ruta_foto(), headers=self._cabeceras())
        self.assertEqual((r.status_code, r.get_json()['data']), (200, {'id_jugador': 1, 'foto': None}))
        self.assertEqual(self.almacen.borrados, [self.almacen.subidos[0]['url']])
        self.assertEqual(self._de_la_categoria()['premios']['mvp'], {'id_jugador': 1, 'foto': None})
        self.assertEqual(self.client.delete(self._ruta_foto(), headers=self._cabeceras()).status_code, 404)  # ya no tiene

    def test_la_tabla_no_admite_una_foto_a_medias(self):
        # el archivo va siempre con sus medidas y las medidas con el archivo: un NULL no basta para saltarse el CHECK
        url = 'https://cdn.test/a.webp'
        for campos in ({'url_foto': url}, {'ancho': 10, 'alto': 10}, {'url_foto': url, 'ancho': 10}, {'url_foto': url, 'ancho': 0, 'alto': 10}):
            db.session.add(PremioFinal(id_categoria=4, tipo='mvp', id_jugador=1, **campos))
            with self.assertRaises(IntegrityError, msg=campos):
                db.session.flush()
            db.session.rollback()
        db.session.add(PremioFinal(id_categoria=4, tipo='mvp', id_jugador=1, url_foto=url, ancho=10, alto=10))
        db.session.flush()  # completa sí

    # ── si se corrige la final ──
    def test_si_la_final_se_corrige_el_mvp_guardado_ya_no_cuenta_y_la_foto_se_puede_quitar(self):
        self._elegir('mvp', 1)
        self._elegir('defensa', 3)
        self._subir()
        partido = db.session.get(Partido, self.final)
        partido.marcador_local, partido.marcador_visitante = 50, 55  # gana el 7: el 1 ya no es del campeón
        db.session.commit()
        premio = self._de_la_categoria()
        self.assertEqual(_ids(premio['candidatos']['mvp']), [5, 6])
        self.assertEqual(premio['premios'], {'mvp': None, 'defensa': {'id_jugador': 3, 'foto': None}})  # el defensa sigue siendo candidato
        r = self._subir()
        self.assertEqual(r.status_code, 422)
        self.assertIn('Elige primero al jugador', r.get_json()['message'])
        self.assertEqual(self.client.delete(self._ruta_foto(), headers=self._cabeceras()).status_code, 200)  # limpiar sí se puede
        self.assertEqual(self._elegir('mvp', 5).status_code, 200)
        self.assertEqual(PremioFinal.query.filter_by(tipo='mvp').one().id_jugador, 5)

    # ── permisos ──
    def test_un_delegado_no_puede_leer_elegir_subir_ajustar_ni_quitar(self):
        cabeceras = self._cabeceras('u-del')
        self.assertEqual(self.client.get('/api/torneos/2/premios-final', headers=cabeceras).status_code, 403)
        self.assertEqual(self._elegir('mvp', 1, uid='u-del').status_code, 403)
        self.assertEqual(self._subir(uid='u-del').status_code, 403)
        self.assertEqual(self.client.patch(self._ruta_foto(), json={'foco_x': 1, 'foco_y': 1, 'zoom': 1}, headers=cabeceras).status_code, 403)
        self.assertEqual(self.client.delete(self._ruta_foto(), headers=cabeceras).status_code, 403)
        self.assertEqual(PremioFinal.query.count(), 0)

    def test_sin_token_es_401(self):
        self.assertEqual(self.client.get('/api/torneos/2/premios-final').status_code, 401)
        self.assertEqual(self.client.put(f'{RUTA}/mvp', json={'id_jugador': 1}).status_code, 401)
        self.assertEqual(self.client.post(self._ruta_foto()).status_code, 401)
        self.assertEqual(self.client.patch(self._ruta_foto(), json={}).status_code, 401)
        self.assertEqual(self.client.delete(self._ruta_foto()).status_code, 401)
