import os
import time
import unittest
from datetime import date, time as hora

import jwt

from app import create_app, db
from app.models import Partido
from app.models.categoria import Categoria
from app.models.equipo import Equipo
from app.models.estadistica import Estadistica
from app.models.jugador import Jugador
from app.models.plantilla import Plantilla
from app.models.torneo import Torneo
from app.models.usuario import Usuario

SECRETO = 'secreto-de-prueba'
SENSIBLES = {'documento_identificacion', 'fecha_nacimiento', 'correo', 'telefono', 'url_cedula', 'url_acta_bachiller'}


class TestVisor(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
        os.environ['SUPABASE_JWT_SECRET'] = SECRETO
        os.environ['SUPABASE_URL'] = 'http://127.0.0.1:9'  # sin JWKS: se usa el secreto HS256

    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.client = self.app.test_client()

        for uid, rol in (('u-visor', 'visor'), ('u-delegado', 'delegado'), ('u-admin', 'super_admin')):
            db.session.add(Usuario(id_usuario=uid, nombre=rol, correo=f'{rol}@test.ec', rol=rol))
        t = Torneo(id_torneo=1, nombre='Copa Verano', fecha_inicio=date(2026, 6, 1), fecha_fin=date(2026, 12, 1))
        c = Categoria(id_categoria=1, nombre_categoria='Senior', genero_categoria='masculino', id_torneo=1)
        db.session.add_all([t, c])
        db.session.flush()
        db.session.add_all([
            Equipo(id_equipo=1, nombre_equipo='MANTA BULLS', id_usuario='u-delegado'),
            Equipo(id_equipo=2, nombre_equipo='DELFINES BC', id_usuario='u-delegado'),
            Jugador(id_jugador=1, nombre='PEDRO ALAVA', genero='masculino', documento_identificacion='1310000001',
                    fecha_nacimiento=date(1990, 5, 1), correo='p@x.ec', telefono='0990000001'),
            Jugador(id_jugador=2, nombre='LUIS MERO', genero='masculino', documento_identificacion='1310000002',
                    fecha_nacimiento=date(2004, 5, 1)),
            Jugador(id_jugador=3, nombre='ANA ZAMBRANO', genero='femenino', documento_identificacion='1310000003',
                    fecha_nacimiento=date(1995, 5, 1)),
        ])
        db.session.flush()
        db.session.add_all([
            Plantilla(id_jugador=1, id_torneo=1, id_equipo=1, id_categoria=1, numero_camiseta=7),
            Plantilla(id_jugador=2, id_torneo=1, id_equipo=2, id_categoria=1, numero_camiseta=10),
            Partido(id_partido=1, fecha=date(2026, 9, 1), hora=hora(19, 0), estado='finalizado', fase='Jornada 1',
                    marcador_local=80, marcador_visitante=70, id_torneo=1, id_categoria=1,
                    id_equipo_local=1, id_equipo_visitante=2),
        ])
        db.session.flush()
        db.session.add_all([
            Estadistica(id_partido=1, id_jugador=1, puntos_anotados=25, rebotes=6),
            Estadistica(id_partido=1, id_jugador=2, puntos_anotados=12),
        ])
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _get(self, url, uid=None):
        headers = {}
        if uid:
            token = jwt.encode({'sub': uid, 'aud': 'authenticated', 'exp': int(time.time()) + 300}, SECRETO, algorithm='HS256')
            headers['Authorization'] = f'Bearer {token}'
        return self.client.get(url, headers=headers)

    def test_permisos(self):
        self.assertEqual(self._get('/api/visor/jugadores').status_code, 401)
        self.assertEqual(self._get('/api/visor/jugadores', 'u-delegado').status_code, 403)
        self.assertEqual(self._get('/api/visor/jugadores', 'u-visor').status_code, 200)
        self.assertEqual(self._get('/api/visor/jugadores', 'u-admin').status_code, 200)

    def test_busqueda_sin_datos_sensibles(self):
        data = self._get('/api/visor/jugadores', 'u-visor').get_json()['data']
        self.assertEqual([j['nombre'] for j in data], ['ANA ZAMBRANO', 'LUIS MERO', 'PEDRO ALAVA'])
        for j in data:
            self.assertFalse(SENSIBLES & j.keys())
        pedro = data[2]
        self.assertEqual(pedro['equipo']['nombre_equipo'], 'MANTA BULLS')
        self.assertEqual(pedro['numero_camiseta'], 7)
        self.assertEqual((pedro['partidos_jugados'], pedro['puntos_totales'], pedro['promedio_puntos']), (1, 25, 25.0))

    def test_filtros(self):
        nombres = lambda qs: [j['nombre'] for j in self._get(f'/api/visor/jugadores?{qs}', 'u-visor').get_json()['data']]
        self.assertEqual(nombres('q=mero'), ['LUIS MERO'])
        self.assertEqual(nombres('genero=femenino'), ['ANA ZAMBRANO'])
        self.assertEqual(nombres('id_equipo=1'), ['PEDRO ALAVA'])
        self.assertEqual(nombres('id_torneo=1&orden=puntos'), ['PEDRO ALAVA', 'LUIS MERO'])
        self.assertEqual(nombres('edad_max=25'), ['LUIS MERO'])
        self.assertEqual(nombres('edad_min=35'), ['PEDRO ALAVA'])

    def test_partidos_del_jugador(self):
        r = self._get('/api/visor/jugadores/1/partidos', 'u-visor')
        self.assertEqual(r.status_code, 200)
        [p] = r.get_json()['data']
        self.assertEqual((p['lado'], p['linea']['puntos'], p['linea']['rebotes']), ('local', 25, 6))
        self.assertEqual(self._get('/api/visor/jugadores/99/partidos', 'u-visor').status_code, 404)
        self.assertEqual(self._get('/api/visor/jugadores/1/partidos', 'u-delegado').status_code, 403)


if __name__ == '__main__':
    unittest.main()
