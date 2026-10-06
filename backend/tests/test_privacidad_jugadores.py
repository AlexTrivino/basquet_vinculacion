"""Los datos personales de los jugadores solo llegan al super_admin o al delegado de su equipo."""
import os
import time
import unittest
from datetime import date

import jwt

from app import create_app, db
from app.models.categoria import Categoria
from app.models.equipo import Equipo
from app.models.inscripcion import Inscripcion
from app.models.jugador import Jugador
from app.models.plantilla import Plantilla
from app.models.torneo import Torneo
from app.models.usuario import Usuario

SECRETO = 'secreto-de-prueba'
PRIVADOS = {'documento_identificacion', 'fecha_nacimiento', 'correo', 'telefono', 'url_cedula', 'url_acta_bachiller'}


class TestPrivacidadJugadores(unittest.TestCase):
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

        for uid, rol in (('u-admin', 'super_admin'), ('u-dueno', 'delegado'), ('u-otro', 'delegado'), ('u-visor', 'visor')):
            db.session.add(Usuario(id_usuario=uid, nombre=uid, correo=f'{uid}@test.ec', rol=rol))
        db.session.add(Torneo(id_torneo=1, nombre='Copa', fecha_inicio=date(2026, 6, 1), fecha_fin=date(2026, 12, 1)))
        db.session.add(Categoria(id_categoria=1, nombre_categoria='Senior', genero_categoria='masculino', id_torneo=1))
        db.session.flush()
        db.session.add_all([
            Equipo(id_equipo=1, nombre_equipo='MANTA BULLS', id_usuario='u-dueno'),
            Equipo(id_equipo=2, nombre_equipo='DELFINES BC', id_usuario='u-otro'),
            Jugador(id_jugador=1, nombre='PEDRO ALAVA', genero='masculino', documento_identificacion='1310000001',
                    fecha_nacimiento=date(1990, 5, 1), correo='pedro@x.ec', telefono='0990000001',
                    url_cedula='https://x/ced.pdf'),
        ])
        db.session.flush()
        db.session.add_all([
            Plantilla(id_jugador=1, id_torneo=1, id_equipo=1, id_categoria=1, numero_camiseta=7),
            Inscripcion(id_torneo=1, id_equipo=1, id_categoria=1, estado_inscripcion='aprobado'),
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
        r = self.client.get(url, headers=headers)
        self.assertEqual(r.status_code, 200, (url, uid, r.get_json()))
        return r.get_json()['data']

    def test_perfil(self):
        anonimo = self._get('/api/jugadores/1/perfil')
        self.assertFalse(PRIVADOS & anonimo.keys())
        self.assertNotIn('delegados_autorizados', anonimo)
        self.assertEqual(anonimo['edad'], date.today().year - 1990 - ((date.today().month, date.today().day) < (5, 1)))
        for uid in ('u-otro', 'u-visor'):
            self.assertFalse(PRIVADOS & self._get('/api/jugadores/1/perfil', uid).keys(), uid)
        for uid in ('u-admin', 'u-dueno'):
            self.assertEqual(self._get('/api/jugadores/1/perfil', uid)['documento_identificacion'], '1310000001', uid)

    def test_token_invalido_es_anonimo(self):
        r = self.client.get('/api/jugadores/1/perfil', headers={'Authorization': 'Bearer basura'})
        self.assertEqual(r.status_code, 200)
        self.assertFalse(PRIVADOS & r.get_json()['data'].keys())

    def test_detalle_y_listado(self):
        self.assertFalse(PRIVADOS & self._get('/api/jugadores/1').keys())
        self.assertFalse(PRIVADOS & self._get('/api/jugadores/1', 'u-otro').keys())
        self.assertEqual(self._get('/api/jugadores/1', 'u-dueno')['telefono'], '0990000001')

        for j in self._get('/api/jugadores?admin=true&search=pedro'):
            self.assertFalse(PRIVADOS & j.keys())
        # El público no puede buscar por cédula (sería un oráculo cédula → nombre)
        self.assertEqual(self._get('/api/jugadores?search=1310000001'), [])
        self.assertEqual(len(self._get('/api/jugadores?search=1310000001', 'u-admin')), 1)

    def test_plantilla(self):
        [anonima] = self._get('/api/plantillas?id_equipo=1')
        self.assertFalse(PRIVADOS & anonima['jugador'].keys())
        [ajena] = self._get('/api/plantillas?id_equipo=1', 'u-otro')
        self.assertFalse(PRIVADOS & ajena['jugador'].keys())
        [propia] = self._get('/api/plantillas?id_equipo=1', 'u-dueno')
        self.assertEqual(propia['jugador']['documento_identificacion'], '1310000001')

    def test_inscripciones_publicas_sin_correo_del_delegado(self):
        [ins] = self._get('/api/inscripciones/publicas?id_torneo=1')
        self.assertEqual(ins['equipo']['nombre_equipo'], 'MANTA BULLS')
        self.assertNotIn('usuario', ins['equipo'])


if __name__ == '__main__':
    unittest.main()
