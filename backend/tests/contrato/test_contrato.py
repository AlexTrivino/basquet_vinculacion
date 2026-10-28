"""Pruebas de contrato: cada caso de casos.py se compara con su respuesta grabada en referencias.json.

Regrabar (solo cuando un cambio de comportamiento está aprobado en una especificación):
    ACTUALIZAR_CONTRATO=1 pytest tests/contrato
Un cambio en referencias.json durante la migración es una alarma: se revisa línea por línea.
"""
import difflib
import io
import json
import os
import re
import threading
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timezone
from functools import cache
from pathlib import Path

import jwt
import pytest
from sqlalchemy import text

from app import create_app, db
from tests.contrato.casos import CASOS, ROLES
from tests.contrato.datos import sembrar

SECRETO = 'secreto-de-prueba'
REFERENCIAS = Path(__file__).with_name('referencias.json')
ACTUALIZAR = os.getenv('ACTUALIZAR_CONTRATO') == '1'
ORDEN_LIBRE = {'delegados_autorizados'}  # el servicio arma la lista desde un set
_NUEVAS = {}


class Almacen:
    """Reemplaza urllib.request.urlopen: anota las llamadas a Storage y corta toda otra salida a la red."""

    def __init__(self):
        self.llamadas = []

    def __call__(self, peticion, *args, **kwargs):
        url = getattr(peticion, 'full_url', str(peticion))
        if '/storage/v1/object/' not in url:
            raise urllib.error.URLError('sin red en las pruebas de contrato')  # el JWKS falla y se usa HS256
        self.llamadas.append(f"{peticion.get_method()} {url.split('/storage/v1/object/', 1)[1]}")
        return io.BytesIO(b'{}')


@pytest.fixture(autouse=True)
def almacen(monkeypatch):
    for clave, valor in {
        'SUPABASE_JWT_SECRET': SECRETO, 'SUPABASE_URL': 'http://127.0.0.1:9', 'SUPABASE_PUBLIC_URL': 'https://supabase.test',
        'SUPABASE_STORAGE_BUCKET': 'archivos', 'SUPABASE_SERVICE_ROLE_KEY': 'clave-de-prueba',
    }.items():
        monkeypatch.setenv(clave, valor)
    falso = Almacen()
    monkeypatch.setattr(urllib.request, 'urlopen', falso)
    return falso


def _app_sembrada():
    app = create_app()  # tests/conftest.py la entrega con las tablas creadas en SQLite en memoria
    app.config['TESTING'] = True
    with app.app_context():
        sembrar()
    return app


@pytest.fixture(scope='module')
def app_lectura():
    return _app_sembrada()


def _cabeceras(rol):
    if rol is None:
        return {}
    vence = int(time.time()) + (-3600 if rol == 'vencido' else 3600)
    secreto = 'otro-secreto' if rol == 'firma_mala' else SECRETO
    token = jwt.encode({'sub': ROLES[rol], 'aud': 'authenticated', 'exp': vence}, secreto, algorithm='HS256')
    return {'Authorization': f'Bearer {token}'}


def _filas(app):
    with app.app_context():
        return {t.name: db.session.execute(text(f'SELECT count(*) FROM "{t.name}"')).scalar() for t in db.metadata.sorted_tables}


def _ejecutar(app, caso, almacen):
    opciones = {'headers': _cabeceras(caso['rol'])}
    if caso['json'] is not None:
        opciones['json'] = caso['json']
    if caso['form'] is not None or caso['archivos'] is not None:
        datos = dict(caso['form'] or {})
        for campo, (contenido, nombre) in (caso['archivos'] or {}).items():
            datos[campo] = (io.BytesIO(contenido), nombre)
        opciones.update(data=datos, content_type='multipart/form-data')
    respuesta = app.test_client().open(caso['ruta'], method=caso['metodo'], **opciones)
    for hilo in threading.enumerate():  # jugador_bp borra archivos viejos en hilos aparte
        if hilo is not threading.current_thread() and not hilo.daemon:
            hilo.join(5)
    cuerpo = respuesta.get_json(silent=True)
    if cuerpo is None:  # el PDF de la planilla: solo el tipo y el nombre del adjunto
        cuerpo = {'tipo': respuesta.mimetype, 'adjunto': respuesta.headers.get('Content-Disposition')}
    resultado = {'codigo': respuesta.status_code, 'cuerpo': cuerpo}
    if almacen.llamadas:
        resultado['almacenamiento'] = sorted(almacen.llamadas)
    return resultado


def normalizar(valor, clave=None):
    """Quita lo que depende del reloj y del azar: la fecha de hoy, las edades y el prefijo uuid de los archivos."""
    if isinstance(valor, dict):
        return {k: normalizar(v, k) for k, v in valor.items()}
    if isinstance(valor, list):
        lista = [normalizar(v) for v in valor]
        return sorted(lista, key=str) if clave in ORDEN_LIBRE else lista
    if clave == 'edad' and valor is not None:
        return '<edad>'
    if isinstance(valor, str):
        # SQLite guarda now() en UTC y date.today() es local: cualquiera de las dos es "hoy"
        if valor[:10] in {date.today().isoformat(), datetime.now(timezone.utc).date().isoformat()}:
            return '<hoy>'
        valor = re.sub(r'[0-9a-f]{32}_', '<uuid>_', valor)
        return re.sub(r'tiene \d+ años', 'tiene <edad> años', valor)
    return valor


def _texto(datos):
    return json.dumps(datos, ensure_ascii=False, indent=1, sort_keys=True)


@cache
def _referencias():
    return json.loads(REFERENCIAS.read_text(encoding='utf-8')) if REFERENCIAS.exists() else {}


@pytest.fixture(scope='module', autouse=True)
def _grabar_referencias():
    yield
    if ACTUALIZAR and _NUEVAS:
        nombres = {c['nombre'] for c in CASOS}
        todas = {**_referencias(), **_NUEVAS}
        with open(REFERENCIAS, 'w', encoding='utf-8', newline='\n') as archivo:  # LF también en Windows
            archivo.write(_texto({k: v for k, v in todas.items() if k in nombres}) + '\n')


@pytest.mark.parametrize('caso', CASOS, ids=[c['nombre'] for c in CASOS])
def test_contrato(caso, app_lectura, almacen):
    if caso['metodo'] == 'GET':
        obtenido = _ejecutar(app_lectura, caso, almacen)
    else:  # cada escritura parte de una base recién sembrada: el orden de los casos no importa
        # ponytail: ~60 ms por base nueva (~20 s en total); si molesta, copiar una base plantilla con sqlite3.Connection.backup
        app = _app_sembrada()
        antes = _filas(app)
        obtenido = _ejecutar(app, caso, almacen)
        cambios = {tabla: n - antes[tabla] for tabla, n in _filas(app).items() if n != antes[tabla]}
        if cambios:
            obtenido['filas'] = cambios
        with app.app_context():
            db.engine.dispose()
    obtenido = normalizar(obtenido)

    if ACTUALIZAR:
        _NUEVAS[caso['nombre']] = obtenido
        return
    esperado = _referencias().get(caso['nombre'])
    assert esperado is not None, 'Caso sin referencia: grábala con ACTUALIZAR_CONTRATO=1 pytest tests/contrato'
    if obtenido != esperado:
        diferencia = difflib.unified_diff(_texto(esperado).splitlines(), _texto(obtenido).splitlines(), 'referencia', 'ahora', lineterm='')
        pytest.fail('La respuesta cambió:\n' + '\n'.join(diferencia), pytrace=False)


def test_todas_las_rutas_tienen_caso(app_lectura):
    adaptador = app_lectura.url_map.bind('localhost')
    cubiertas = {(adaptador.match(c['ruta'].split('?')[0], method=c['metodo'], return_rule=True)[0].rule, c['metodo']) for c in CASOS}
    todas = {(r.rule, m) for r in app_lectura.url_map.iter_rules() if r.endpoint != 'static' for m in r.methods - {'HEAD', 'OPTIONS'}}
    assert sorted(todas - cubiertas) == [], 'Rutas sin caso de contrato'


def test_no_hay_referencias_sin_caso():
    if not ACTUALIZAR:
        assert sorted(set(_referencias()) - {c['nombre'] for c in CASOS}) == []
