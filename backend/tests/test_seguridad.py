"""Fase 11 (OWASP): lo que no se ve en las pruebas de contrato."""
import io
import logging
import os
import sqlite3
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from flask import abort, request

from app import create_app
from app.modules.estadisticas.domain.estadisticas import LineaDePlanilla, Planilla
from app.modules.estadisticas.http import planilla_pdf
from app.shared.http import autenticacion
from app.shared.infrastructure import almacenamiento

BACKEND = Path(__file__).resolve().parents[1]


@pytest.fixture
def app():
    aplicacion = create_app()
    aplicacion.add_url_rule('/prueba/formulario', 'formulario', lambda: str(len(request.form)), methods=['POST'])
    aplicacion.add_url_rule('/prueba/415', 'error_415', lambda: abort(415))
    return aplicacion


class Storage:
    """Reemplaza urlopen y anota los pedidos; con ``falla``, cada pedido da ese error."""

    def __init__(self, falla=None):
        self.pedidos, self.falla = [], falla

    def __call__(self, peticion, timeout=None):
        self.pedidos.append((peticion.get_method(), peticion.full_url, timeout))
        if self.falla:
            raise self.falla
        return io.BytesIO(b'{}')


def test_borrar_archivo_solo_borra_claves_del_bucket(monkeypatch, caplog):
    monkeypatch.setenv('SUPABASE_URL', 'https://proyecto.supabase.co')
    monkeypatch.setenv('SUPABASE_STORAGE_BUCKET', 'archivos')
    storage = Storage()
    monkeypatch.setattr(urllib.request, 'urlopen', storage)
    for url in ('../../../auth/v1/admin/users/u-admin', 'https://otra.web/x.png',
                'https://proyecto.supabase.co/storage/v1/object/public/archivos/jugadores/1/../../../rest/v1/jugadores',
                'jugadores/1/cedula.pdf?select=*', 'jugadores/%2e%2e/x'):
        almacenamiento.borrar_archivo(url)
    assert storage.pedidos == []
    assert caplog.text.count('no es un archivo del bucket') == 5
    almacenamiento.borrar_archivo('https://cdn.propio.ec/storage/v1/object/public/archivos/jugadores/1/cedulas/ab_cedula.pdf')
    almacenamiento.borrar_archivo('equipos/2/logo/fae.png')
    assert storage.pedidos == [
        ('DELETE', 'https://proyecto.supabase.co/storage/v1/object/archivos/jugadores/1/cedulas/ab_cedula.pdf', 30),
        ('DELETE', 'https://proyecto.supabase.co/storage/v1/object/archivos/equipos/2/logo/fae.png', 30),
    ]


def test_borrar_en_segundo_plano_no_tumba_el_hilo(monkeypatch, caplog):
    """En el hilo no hay contexto de Flask: antes, un error de red terminaba en otra excepción al registrarlo."""
    monkeypatch.setattr(urllib.request, 'urlopen', Storage(falla=TimeoutError('timed out')))
    errores = []
    monkeypatch.setattr(threading, 'excepthook', lambda args: errores.append(args.exc_value))
    hilo = threading.Thread(target=almacenamiento.borrar_archivo, args=('jugadores/1/foto.jpg',))
    hilo.start()
    hilo.join(5)
    assert errores == [] and 'Error al borrar en Storage' in caplog.text


def test_errores_http_salen_con_su_codigo(app):
    cliente = app.test_client()
    grande = cliente.post('/prueba/formulario', data={'archivo': (io.BytesIO(b'x' * (6 * 1024 * 1024)), 'grande.pdf')},
                          content_type='multipart/form-data')
    assert grande.status_code == 413 and grande.get_json()['error_code'] == 'PAYLOAD_TOO_LARGE'
    otro = cliente.get('/prueba/415')
    assert otro.status_code == 415 and otro.get_json()['error_code'] == 'UNSUPPORTED_MEDIA_TYPE'


def test_cabeceras_y_registro_de_rechazos(app, caplog):
    cliente = app.test_client()
    publica = cliente.get('/api/health')
    assert publica.headers['X-Content-Type-Options'] == 'nosniff' and 'no-store' not in publica.headers.get('Cache-Control', '')
    with caplog.at_level(logging.WARNING):
        rechazada = cliente.get('/api/usuarios/me', headers={'Authorization': 'Bearer x', 'X-Forwarded-For': '203.0.113.7'})
    assert rechazada.status_code == 401 and rechazada.headers['Cache-Control'] == 'no-store'
    assert "Acceso rechazado: 401 GET '/api/usuarios/me' desde 203.0.113.7 (INVALID_TOKEN)" in caplog.text


def test_un_hs256_con_kid_del_jwks_da_401_y_no_500(app, monkeypatch):
    """Antes, HS256 entraba con la clave pública del JWKS y PyJWT fallaba con TypeError: 500."""
    publica = ec.generate_private_key(ec.SECP256R1()).public_key()

    class Jwks:
        def get_signing_key_from_jwt(self, token):
            return type('Clave', (), {'key': publica})()

    monkeypatch.setattr(autenticacion, '_get_jwks_client', lambda: Jwks())
    token = jwt.encode({'sub': 'u-del-1', 'aud': 'authenticated', 'exp': int(time.time()) + 60}, 'x' * 32,
                       algorithm='HS256', headers={'kid': 'clave-del-jwks'})
    respuesta = app.test_client().get('/api/usuarios/me', headers={'Authorization': f'Bearer {token}'})
    assert respuesta.status_code == 401 and respuesta.get_json()['error_code'] == 'INVALID_TOKEN'


def test_la_planilla_escapa_el_marcado_de_los_nombres():
    linea = LineaDePlanilla(4, '<b>ANA</b> & CO', 10, 1, 2, 3, 4)
    planilla = Planilla(1, 'finalizado', 'COPA <MANTA>', 'FINAL & CIERRE', None, None, '<img src="/etc/passwd"/>',
                        '<img src="/etc/passwd"/>', 'A & B <para>', 70, 60, [linea], [])
    pdf = planilla_pdf.generar(planilla).getvalue()
    assert pdf.startswith(b'%PDF')


def _correr(script, base, *argumentos):
    entorno = {**os.environ, 'DATABASE_URL': f'sqlite:///{base}', 'PYTHONPATH': str(BACKEND)}
    return subprocess.run([sys.executable, script, *argumentos], cwd=BACKEND, env=entorno, stdin=subprocess.DEVNULL,
                          capture_output=True, text=True, timeout=120)


def test_los_scripts_que_borran_piden_confirmacion(tmp_path):
    base = tmp_path / 'base.db'
    with sqlite3.connect(base) as conexion:
        conexion.execute('CREATE TABLE partidos (id INTEGER)')
        conexion.execute('CREATE TABLE estadisticas (id INTEGER)')
        conexion.execute('INSERT INTO partidos VALUES (1)')
    reset = _correr('reset_database.py', base)
    assert reset.returncode == 0 and 'cancelada' in reset.stdout
    limpiar = _correr('clean_partidos.py', base)
    assert limpiar.returncode != 0 and 'cancelada' in limpiar.stderr
    seed = _correr('seed_database.py', base)
    assert seed.returncode == 0 and 'no se hace nada' in seed.stdout
    produccion = _correr('seed_database.py', base, '4')
    assert produccion.returncode != 0 and 'No se cambió nada' in produccion.stderr
    with sqlite3.connect(base) as conexion:
        assert conexion.execute('SELECT count(*) FROM partidos').fetchone() == (1,)
        assert [t for (t,) in conexion.execute("SELECT name FROM sqlite_master WHERE type = 'table'")] == ['partidos', 'estadisticas']
