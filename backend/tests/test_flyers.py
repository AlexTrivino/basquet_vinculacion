"""Datos de los flyers: resultados de la fecha, su figura y las figuras por categoría y por equipo."""
import os
import time
import unittest
from datetime import date, time as hora

import jwt

from app import create_app, db
from app.models import Categoria, Equipo, Estadistica, Jugador, Partido, Plantilla, Torneo, Usuario

SECRETO = 'secreto-de-prueba'


class TestFlyers(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['SUPABASE_JWT_SECRET'] = SECRETO

    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.client = self.app.test_client()
        db.session.add(Usuario(id_usuario='u-admin', nombre='Admin', correo='a@test.ec', rol='super_admin'))
        db.session.add(Torneo(id_torneo=1, nombre='VI Edición', fecha_inicio=date(2026, 9, 1), fecha_fin=date(2026, 12, 1), estado='en_curso'))
        db.session.add(Categoria(id_categoria=3, nombre_categoria='Juvenil', genero_categoria='masculino', id_torneo=1))
        for i, n in ((1, 'FAE'), (2, 'SAN JOSÉ'), (3, 'MANTA')):
            db.session.add(Equipo(id_equipo=i, nombre_equipo=n, id_usuario='u-admin'))
        # Jugadores 10-11 en FAE, 20-21 en San José, 30 en Manta
        for j, equipo, dorsal in ((10, 1, 7), (11, 1, 8), (20, 2, 4), (21, 2, 5), (30, 3, 9)):
            db.session.add(Jugador(id_jugador=j, nombre=f'JUGADOR {j}', documento_identificacion=f'13{j:08d}', fecha_nacimiento=date(2008, 1, 1)))
            db.session.add(Plantilla(id_jugador=j, id_torneo=1, id_equipo=equipo, id_categoria=3, numero_camiseta=dorsal))
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _get(self, url):
        token = jwt.encode({'sub': 'u-admin', 'aud': 'authenticated', 'exp': int(time.time()) + 300}, SECRETO, algorithm='HS256')
        r = self.client.get(url, headers={'Authorization': f'Bearer {token}'})
        return r.status_code, r.get_json()

    def _partido(self, local, visita, ml, mv, dia, a_las=19, estado='finalizado', stats=()):
        p = Partido(id_torneo=1, id_categoria=3, id_equipo_local=local, id_equipo_visitante=visita, fecha=dia, hora=hora(a_las, 0),
                    estado=estado, fase='PRIMERA FASE', marcador_local=ml, marcador_visitante=mv)
        db.session.add(p)
        db.session.flush()
        for jugador, puntos, rebotes, asistencias in stats:
            db.session.add(Estadistica(id_partido=p.id_partido, id_jugador=jugador, puntos_anotados=puntos, rebotes=rebotes, asistencias=asistencias))
        db.session.commit()
        return p

    def test_resultados_y_figuras(self):
        self._partido(1, 2, 70, 60, date(2026, 10, 4), stats=[(10, 30, 5, 2), (20, 25, 2, 1)])
        self._partido(2, 1, 66, 64, date(2026, 10, 11), a_las=19, stats=[(20, 10, 3, 1), (21, 20, 10, 4), (10, 22, 4, 1)])
        self._partido(3, 1, 20, 0, date(2026, 10, 11), a_las=17, estado='finalizado_wo')
        self._partido(3, 2, 0, 0, date(2026, 10, 18), estado='programado')

        status, body = self._get('/api/estadisticas/flyers?id_torneo=1')
        self.assertEqual(status, 200)
        data = body['data']
        self.assertEqual(data['fecha'], '2026-10-11')  # la última fecha con partidos jugados
        self.assertEqual(data['fechas'], ['2026-10-11', '2026-10-04'])
        # Resultados por hora: el W.O. de las 17h primero, sin figura
        self.assertEqual([r['hora'] for r in data['resultados']], ['17:00', '19:00'])
        self.assertIsNone(data['resultados'][0]['figura'])
        self.assertEqual(data['resultados'][1]['local']['nombre_equipo'], 'SAN JOSÉ')
        self.assertEqual(data['resultados'][1]['visitante']['marcador'], 64)
        # Figura de la fecha: 21 (20 + 10 + 4 = 34) de San José, con su dorsal
        figura = data['figura_fecha']
        self.assertEqual((figura['jugador']['id_jugador'], figura['valoracion'], figura['equipo']['nombre_equipo']), (21, 34, 'SAN JOSÉ'))
        self.assertEqual(figura['jugador']['numero_camiseta'], 5)
        self.assertEqual(figura['categoria'], 'Juvenil (masculino)')
        # Acumulado del torneo: 10 suma 37 + 27 = 64 y es la figura de la categoría
        categoria = data['figuras_categoria'][0]
        self.assertEqual((categoria['jugador']['id_jugador'], categoria['valoracion'], categoria['partidos']), (10, 64, 2))
        self.assertEqual(categoria['promedio_puntos'], 26.0)
        # Por equipo, acumulado: FAE → 10 (64); San José → 20 (28 + 14 = 42) por delante de 21 (34)
        por_equipo = {f['equipo']['nombre_equipo']: f['jugador']['id_jugador'] for f in data['figuras_equipo']}
        self.assertEqual(por_equipo, {'FAE': 10, 'SAN JOSÉ': 20})

    def test_otra_fecha_y_errores(self):
        self._partido(1, 2, 70, 60, date(2026, 10, 4), stats=[(10, 30, 5, 2)])
        status, body = self._get('/api/estadisticas/flyers?id_torneo=1&fecha=2026-10-04')
        self.assertEqual((status, body['data']['figura_fecha']['jugador']['id_jugador']), (200, 10))
        self.assertEqual(self._get('/api/estadisticas/flyers?id_torneo=1&fecha=11-10-2026')[0], 400)
        self.assertEqual(self._get('/api/estadisticas/flyers?id_torneo=99')[0], 400)
        self.assertEqual(self._get('/api/estadisticas/flyers')[0], 400)
        self.assertIn(self.client.get('/api/estadisticas/flyers?id_torneo=1').status_code, (401, 403))


if __name__ == '__main__':
    unittest.main()
