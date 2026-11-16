"""La foto del ganador en el flyer del podio: las medidas y el encuadre, el procesado con Pillow (sin EXIF, a 2560 px como
máximo, derecha) y las rutas: quién sube, qué se rechaza, el reemplazo que borra la foto anterior y la foto en los podios."""
import io
import os
import time
import unittest
from datetime import date, time as hora
from unittest import mock

import jwt
import pytest
from PIL import Image

from app import create_app

from app.modules.competencia.domain.podio import validar_dimensiones, validar_encuadre
from app.shared.domain.errores import ReglaDeNegocio
from app.shared.infrastructure import imagenes
from app.shared.infrastructure.almacenamiento import MAX_FOTO_PODIO
from app.shared.infrastructure.db import db
from app.shared.infrastructure.modelos.categoria import Categoria
from app.shared.infrastructure.modelos.equipo import Equipo
from app.shared.infrastructure.modelos.foto_podio import FotoPodio
from app.shared.infrastructure.modelos.inscripcion import Inscripcion
from app.shared.infrastructure.modelos.partido import Partido
from app.shared.infrastructure.modelos.torneo import Torneo
from app.shared.infrastructure.modelos.usuario import Usuario

SECRETO = 'secreto-de-prueba'


def foto(ancho=1600, alto=900, formato='JPEG', modo='RGB', color=(40, 90, 160), **opciones):
    """Los bytes de una imagen de verdad (un color liso pesa muy poco, aun a miles de píxeles)."""
    salida = io.BytesIO()
    Image.new(modo, (ancho, alto), color).save(salida, formato, **opciones)
    return salida.getvalue()


def con_exif(orientacion=1):
    """Un EXIF con la cámara, la fecha y el GPS (lo que no debe llegar al bucket) y la orientación pedida."""
    exif = Image.Exif()
    exif[0x0112] = orientacion
    exif[0x010F] = 'CamaraFalsa'
    exif[0x0110] = 'Modelo X'
    exif[0x0132] = '2026:11:02 19:30:00'
    gps = exif.get_ifd(0x8825)
    gps[1], gps[2], gps[3], gps[4] = 'S', (0.0, 56.0, 12.0), 'W', (80.0, 42.0, 30.0)
    return exif


def leer(datos):
    return Image.open(io.BytesIO(datos))


# ── Reglas del dominio ──────────────────────────────────────────────

@pytest.mark.parametrize('ancho, alto', [(1080, 608), (2560, 1440), (8000, 5000), (1080, 8000)])
def test_dimensiones_que_sirven(ancho, alto):
    validar_dimensiones(ancho, alto)


@pytest.mark.parametrize('ancho, alto, texto', [
    (1079, 900, 'mínimo es 1080 × 608'),
    (1920, 607, 'mínimo es 1080 × 608'),
    (640, 480, '640 × 480'),
    (8001, 700, 'máximo es 8000 × 8000'),
    (1100, 8001, 'máximo es 8000 × 8000'),
    (7000, 6000, '40 megapíxeles'),  # cada lado entra, pero son 42 megapíxeles
])
def test_dimensiones_que_se_rechazan(ancho, alto, texto):
    with pytest.raises(ReglaDeNegocio, match=texto):
        validar_dimensiones(ancho, alto)


def test_encuadre_valido_con_dos_decimales():
    assert validar_encuadre(50, 35.123, 1.2) == (50.0, 35.12, 1.2)
    assert validar_encuadre(0, 100, 1) == (0.0, 100.0, 1.0)
    assert validar_encuadre(10, 10, 3) == (10.0, 10.0, 3.0)


@pytest.mark.parametrize('foco_x, foco_y, zoom, texto', [
    (-1, 50, 1, 'foco horizontal'),
    (101, 50, 1, 'foco horizontal'),
    (50, 100.5, 1, 'foco vertical'),
    (50, 50, 0.9, 'zoom'),
    (50, 50, 3.1, 'zoom'),
    (None, 50, 1, 'foco horizontal'),
    ('50', 50, 1, 'foco horizontal'),
    (True, 50, 1, 'foco horizontal'),
    (50, 50, float('nan'), 'zoom'),
    (float('inf'), 50, 1, 'foco horizontal'),
])
def test_encuadre_que_se_rechaza(foco_x, foco_y, zoom, texto):
    with pytest.raises(ReglaDeNegocio, match=texto):
        validar_encuadre(foco_x, foco_y, zoom)


# ── Procesado de la imagen ──────────────────────────────────────────

def test_medir_lee_la_cabecera_y_deja_el_stream_al_inicio():
    stream = io.BytesIO(foto(3000, 2000))
    assert imagenes.medir(stream) == (3000, 2000)
    assert stream.tell() == 0


def test_medir_cuenta_el_giro_del_exif():
    # guardada apaisada pero con la orientación 6 (girar 90°): se ve de pie
    assert imagenes.medir(io.BytesIO(foto(1600, 900, exif=con_exif(6)))) == (900, 1600)


def test_normalizar_baja_a_2560_quita_el_exif_y_guarda_webp():
    datos, ancho, alto = imagenes.normalizar(io.BytesIO(foto(4000, 3000, exif=con_exif(1))))
    resultado = leer(datos)
    assert resultado.format == 'WEBP'
    assert (ancho, alto) == resultado.size == (2560, 1920)  # el lado mayor a 2560 y la proporción de siempre
    assert len(datos) < 1024 * 1024
    assert dict(resultado.getexif()) == {}  # ni cámara, ni fecha, ni GPS
    assert 'exif' not in resultado.info and b'CamaraFalsa' not in datos


def test_normalizar_no_agranda_una_foto_menor_a_2560():
    datos, ancho, alto = imagenes.normalizar(io.BytesIO(foto(1600, 900)))
    assert (ancho, alto) == (1600, 900) == leer(datos).size


def test_normalizar_endereza_segun_el_exif():
    datos, ancho, alto = imagenes.normalizar(io.BytesIO(foto(1600, 900, exif=con_exif(6))))
    assert (ancho, alto) == leer(datos).size == (900, 1600)


@pytest.mark.parametrize('formato, modo, color', [('PNG', 'RGB', (1, 2, 3)), ('PNG', 'P', 5), ('PNG', 'L', 128), ('WEBP', 'RGB', (9, 9, 9))])
def test_normalizar_acepta_los_formatos_y_modos_de_color(formato, modo, color):
    datos, ancho, alto = imagenes.normalizar(io.BytesIO(foto(1200, 700, formato, modo, color)))
    assert leer(datos).format == 'WEBP' and (ancho, alto) == (1200, 700)


def test_normalizar_conserva_la_transparencia_de_un_png():
    datos, _, _ = imagenes.normalizar(io.BytesIO(foto(1200, 700, 'PNG', 'RGBA', (200, 10, 10, 0))))
    assert leer(datos).convert('RGBA').getpixel((10, 10))[3] == 0


@pytest.mark.parametrize('funcion', [imagenes.medir, imagenes.normalizar])
@pytest.mark.parametrize('contenido', [
    b'\xff\xd8\xff\xe0' + b'basura que no es un jpeg',
    b'\x89PNG\r\n\x1a\n' + bytes(40),
    foto(1600, 900)[:200],  # truncada
])
def test_una_imagen_que_no_se_lee_sale_como_value_error(funcion, contenido):
    with pytest.raises(ValueError, match='No se pudo leer la foto'):
        funcion(io.BytesIO(contenido))


# ── Rutas ───────────────────────────────────────────────────────────

class Almacen:
    """El bucket de mentira: anota lo que se sube y lo que se manda a borrar."""

    def __init__(self):
        self.subidos, self.borrados = [], []

    def subir_archivo(self, stream, nombre, carpeta, mime):
        url = f'https://cdn.test/{carpeta}/{len(self.subidos)}_{nombre}'
        self.subidos.append({'url': url, 'mime': mime, 'datos': stream.read()})
        return url

    def borrar_en_segundo_plano(self, url):
        self.borrados.append(url)


class TestRutasFotoPodio(unittest.TestCase):
    """Torneo 2, finalizado y sin llaves: el podio de la categoría 4 es el de su tabla (equipos 6, 7 y 8)."""

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
        parche = mock.patch('app.modules.competencia.http.fotos_podio.almacenamiento', self.almacen)
        parche.start()
        self.addCleanup(parche.stop)

        db.session.add(Usuario(id_usuario='u-admin', nombre='Admin', correo='a@test.ec', rol='super_admin'))
        db.session.add(Usuario(id_usuario='u-del', nombre='Delegado', correo='d@test.ec', rol='delegado'))
        db.session.add(Torneo(id_torneo=2, nombre='Nacional Exalumnos', fecha_inicio=date(2026, 10, 31), fecha_fin=date(2026, 11, 2), estado='finalizado'))
        db.session.add(Categoria(id_categoria=4, nombre_categoria='+40', genero_categoria='masculino', id_torneo=2))
        db.session.flush()
        for i in range(6, 11):
            db.session.add(Equipo(id_equipo=i, nombre_equipo=f'EQUIPO {i}', id_usuario='u-del', url_logo=f'https://cdn.test/{i}.png'))
        db.session.flush()
        equipos = list(range(6, 11))
        for i in equipos:
            db.session.add(Inscripcion(id_torneo=2, id_equipo=i, id_categoria=4, estado_inscripcion='aprobado'))
        for k, a in enumerate(equipos):  # todos contra todos: gana el primero de la lista (6, 7, 8, 9, 10)
            for b in equipos[k + 1:]:
                db.session.add(Partido(id_torneo=2, id_categoria=4, id_equipo_local=a, id_equipo_visitante=b, fecha=date(2026, 10, 31),
                                       hora=hora(19, 0), estado='finalizado', fase='Primera fase', marcador_local=60, marcador_visitante=50))
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    # ── utilidades ──
    def _cabeceras(self, uid='u-admin'):
        token = jwt.encode({'sub': uid, 'aud': 'authenticated', 'exp': int(time.time()) + 300}, SECRETO, algorithm='HS256')
        return {'Authorization': f'Bearer {token}'}

    def _ruta(self, id_equipo=6, id_categoria=4):
        return f'/api/torneos/categorias/{id_categoria}/podio/{id_equipo}/foto'

    def _subir(self, contenido=None, nombre='foto.jpg', id_equipo=6, uid='u-admin', **extra):
        contenido = foto(1600, 900) if contenido is None else contenido
        return self.client.post(self._ruta(id_equipo, **extra), data={'foto': (io.BytesIO(contenido), nombre)},
                                content_type='multipart/form-data', headers=self._cabeceras(uid))

    def _podios(self):
        return self.client.get('/api/torneos/2/podios').get_json()['data']

    # ── subir ──
    def test_subir_guarda_la_foto_normalizada_con_el_encuadre_centrado(self):
        r = self._subir(foto(4000, 3000, exif=con_exif()))
        self.assertEqual(r.status_code, 201, r.get_json())
        self.assertEqual(r.get_json()['data'], {
            'url': self.almacen.subidos[0]['url'], 'ancho': 2560, 'alto': 1920, 'foco_x': 50.0, 'foco_y': 50.0, 'zoom': 1.0})
        [subida] = self.almacen.subidos
        self.assertEqual(subida['mime'], 'image/webp')
        self.assertIn('/podios/2/4/', subida['url'])  # carpeta: torneo y categoría
        self.assertEqual(leer(subida['datos']).size, (2560, 1920))
        self.assertEqual(dict(leer(subida['datos']).getexif()), {})
        self.assertEqual(FotoPodio.query.count(), 1)

    def test_subir_acepta_png_y_webp(self):
        for contenido in (foto(1200, 700, 'PNG'), foto(1200, 700, 'WEBP')):
            self.assertEqual(self._subir(contenido, 'foto').status_code, 201)

    def test_reemplazar_borra_la_foto_anterior_y_vuelve_a_centrar_el_encuadre(self):
        self._subir()
        primera = self.almacen.subidos[0]['url']
        self.client.patch(self._ruta(), json={'foco_x': 20, 'foco_y': 80, 'zoom': 2}, headers=self._cabeceras())
        r = self._subir(foto(1920, 1080))
        self.assertEqual(r.status_code, 201)
        self.assertEqual(self.almacen.borrados, [primera])
        self.assertEqual(FotoPodio.query.count(), 1)  # una por equipo y categoría
        datos = r.get_json()['data']
        self.assertEqual((datos['url'], datos['foco_x'], datos['foco_y'], datos['zoom']), (self.almacen.subidos[1]['url'], 50.0, 50.0, 1.0))

    def test_un_texto_renombrado_como_jpg_se_rechaza_por_su_contenido(self):
        r = self._subir(b'#!/bin/sh\necho hola\n' * 100, 'foto.jpg')
        self.assertEqual(r.status_code, 422)
        self.assertIn('Tipo de archivo no permitido', r.get_json()['message'])
        self.assertEqual((self.almacen.subidos, FotoPodio.query.count()), ([], 0))

    def test_un_pdf_no_es_una_foto(self):
        r = self._subir(b'%PDF-1.4\n%%EOF\n', 'foto.pdf')
        self.assertEqual(r.status_code, 422)
        self.assertIn('Tipo de archivo no permitido', r.get_json()['message'])

    def test_mas_de_4_mb_se_rechaza(self):
        r = self._subir(b'\xff\xd8\xff\xe0' + bytes(MAX_FOTO_PODIO))
        self.assertEqual(r.status_code, 422)
        self.assertIn('excede el tamaño máximo permitido de 4 MB', r.get_json()['message'])

    def test_una_foto_menor_a_1080_por_608_se_rechaza(self):
        r = self._subir(foto(800, 600))
        self.assertEqual(r.status_code, 422)
        self.assertIn('800 × 600 px y el mínimo es 1080 × 608', r.get_json()['message'])

    def test_una_foto_de_pie_con_orientacion_exif_se_mide_como_se_ve(self):
        r = self._subir(foto(1600, 900, exif=con_exif(6)))  # se ve de 900 × 1600
        self.assertEqual(r.status_code, 422)
        self.assertIn('900 × 1600 px', r.get_json()['message'])

    def test_una_foto_de_mas_de_8000_px_o_de_40_megapixeles_se_rechaza(self):
        for ancho, alto, texto in ((8100, 700, '8100 × 700'), (7000, 6000, '7000 × 6000')):
            r = self._subir(foto(ancho, alto, 'PNG', 'L', 128))
            self.assertEqual(r.status_code, 422, (ancho, alto))
            self.assertIn(texto, r.get_json()['message'])
        self.assertEqual(self.almacen.subidos, [])

    def test_una_imagen_dañada_se_rechaza(self):
        r = self._subir(foto(1600, 900)[:300])
        self.assertEqual(r.status_code, 422)
        self.assertIn('No se pudo leer la foto', r.get_json()['message'])

    def test_sin_archivo_es_400(self):
        r = self.client.post(self._ruta(), data={}, content_type='multipart/form-data', headers=self._cabeceras())
        self.assertEqual(r.status_code, 400)

    def test_un_equipo_fuera_del_podio_se_rechaza(self):
        r = self._subir(id_equipo=9)  # cuarto de la tabla
        self.assertEqual(r.status_code, 422)
        self.assertIn('no está en el podio', r.get_json()['message'])
        self.assertEqual(self.almacen.subidos, [])

    def test_categoria_inexistente_es_404(self):
        self.assertEqual(self._subir(id_categoria=99).status_code, 404)

    def test_si_el_torneo_no_esta_vigente_es_404(self):
        db.session.get(Torneo, 2).estado = 'anulado'
        db.session.commit()
        self.assertEqual(self._subir().status_code, 404)

    def test_un_delegado_no_puede_subir_ajustar_ni_quitar(self):
        self.assertEqual(self._subir(uid='u-del').status_code, 403)
        cabeceras = self._cabeceras('u-del')
        self.assertEqual(self.client.patch(self._ruta(), json={'foco_x': 1, 'foco_y': 1, 'zoom': 1}, headers=cabeceras).status_code, 403)
        self.assertEqual(self.client.delete(self._ruta(), headers=cabeceras).status_code, 403)

    def test_sin_token_es_401(self):
        self.assertEqual(self.client.post(self._ruta()).status_code, 401)
        self.assertEqual(self.client.patch(self._ruta(), json={}).status_code, 401)
        self.assertEqual(self.client.delete(self._ruta()).status_code, 401)

    # ── ajustar el encuadre ──
    def test_ajustar_guarda_el_encuadre_y_no_toca_el_archivo(self):
        self._subir()
        r = self.client.patch(self._ruta(), json={'foco_x': 40.456, 'foco_y': 35, 'zoom': 1.5}, headers=self._cabeceras())
        self.assertEqual(r.status_code, 200, r.get_json())
        datos = r.get_json()['data']
        self.assertEqual((datos['foco_x'], datos['foco_y'], datos['zoom']), (40.46, 35.0, 1.5))
        self.assertEqual((datos['url'], len(self.almacen.subidos), self.almacen.borrados), (self.almacen.subidos[0]['url'], 1, []))

    def test_un_encuadre_fuera_de_rango_se_rechaza(self):
        self._subir()
        for cuerpo in ({'foco_x': 101, 'foco_y': 50, 'zoom': 1}, {'foco_x': 50, 'foco_y': -1, 'zoom': 1},
                       {'foco_x': 50, 'foco_y': 50, 'zoom': 3.5}, {'foco_x': 50, 'foco_y': 50}, {}):
            r = self.client.patch(self._ruta(), json=cuerpo, headers=self._cabeceras())
            self.assertEqual(r.status_code, 422, cuerpo)
        r = self.client.patch(self._ruta(), data='no es json', content_type='text/plain', headers=self._cabeceras())
        self.assertEqual(r.status_code, 422)
        datos = self._podios()['podios'][0]['puestos'][0]['foto']
        self.assertEqual((datos['foco_x'], datos['foco_y'], datos['zoom']), (50.0, 50.0, 1.0))  # nada cambió

    def test_ajustar_sin_foto_es_404(self):
        r = self.client.patch(self._ruta(), json={'foco_x': 50, 'foco_y': 50, 'zoom': 1}, headers=self._cabeceras())
        self.assertEqual(r.status_code, 404)

    # ── quitar ──
    def test_quitar_borra_la_fila_y_el_archivo(self):
        self._subir()
        r = self.client.delete(self._ruta(), headers=self._cabeceras())
        self.assertEqual(r.status_code, 200)
        self.assertEqual((FotoPodio.query.count(), self.almacen.borrados), (0, [self.almacen.subidos[0]['url']]))
        self.assertEqual(self.client.delete(self._ruta(), headers=self._cabeceras()).status_code, 404)

    def test_quitar_funciona_aunque_el_equipo_ya_no_este_en_el_podio(self):
        self._subir()
        db.session.get(Equipo, 6).estado = 'inactivo'  # queda fuera del torneo: sale del podio y sube el cuarto
        db.session.commit()
        self.assertEqual([p['equipo']['id_equipo'] for p in self._podios()['podios'][0]['puestos']], [7, 8, 9])
        self.assertEqual(self.client.delete(self._ruta(), headers=self._cabeceras()).status_code, 200)
        self.assertEqual(FotoPodio.query.count(), 0)

    # ── la foto en los podios ──
    def test_los_podios_traen_la_foto_con_su_encuadre_y_la_del_equipo(self):
        db.session.get(Equipo, 7).url_foto_equipo = 'https://cdn.test/equipo-7.jpg'
        db.session.commit()
        self._subir()
        self.client.patch(self._ruta(), json={'foco_x': 30, 'foco_y': 25, 'zoom': 1.3}, headers=self._cabeceras())
        data = self._podios()
        self.assertEqual(data['torneo']['id_torneo'], 2)
        uno, dos, tres = data['podios'][0]['puestos']
        self.assertEqual(uno['foto'], {'url': self.almacen.subidos[0]['url'], 'ancho': 1600, 'alto': 900, 'foco_x': 30.0, 'foco_y': 25.0, 'zoom': 1.3})
        self.assertIsNone(uno['url_foto_equipo'])
        self.assertIsNone(dos['foto'])
        self.assertEqual(dos['url_foto_equipo'], 'https://cdn.test/equipo-7.jpg')
        self.assertEqual((tres['foto'], tres['url_foto_equipo']), (None, None))

    def test_la_portada_trae_los_mismos_campos(self):
        self._subir()
        puesto = self.client.get('/api/torneos/podios').get_json()['data']['podios'][0]['puestos'][0]
        self.assertEqual(puesto['foto']['url'], self.almacen.subidos[0]['url'])
        self.assertIn('url_foto_equipo', puesto)

    def test_podios_de_un_torneo_inexistente_o_sin_podio(self):
        self.assertEqual(self.client.get('/api/torneos/99/podios').status_code, 404)
        db.session.add(Torneo(id_torneo=3, nombre='Otro', fecha_inicio=date(2026, 12, 1), fecha_fin=date(2026, 12, 5), estado='programado'))
        db.session.commit()
        r = self.client.get('/api/torneos/3/podios')
        self.assertEqual((r.status_code, r.get_json()['data']['podios']), (200, []))
