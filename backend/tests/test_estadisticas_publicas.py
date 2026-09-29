import os
import unittest
from datetime import date, time

from app import create_app, db
from app.models import Partido


class TestEstadisticasPublicas(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _partido(self, estado, local, visitante):
        db.session.add(Partido(
            fecha=date(2026, 9, 1), hora=time(19, 0), estado=estado, fase='Jornada 1',
            marcador_local=local, marcador_visitante=visitante,
            id_torneo=1, id_categoria=1, id_equipo_local=1, id_equipo_visitante=2,
        ))

    def test_sin_partidos_devuelve_cero(self):
        r = self.client.get('/api/estadisticas/publicas')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.get_json()['data']['puntos_totales'], 0)

    def test_suma_solo_partidos_finalizados(self):
        self._partido('finalizado', 78, 84)
        self._partido('finalizado', 66, 59)
        self._partido('finalizado_wo', 20, 0)   # W.O.: no son puntos anotados
        self._partido('programado', 0, 0)
        db.session.commit()
        r = self.client.get('/api/estadisticas/publicas')
        self.assertEqual(r.get_json()['data']['puntos_totales'], 78 + 84 + 66 + 59)


if __name__ == '__main__':
    unittest.main()
