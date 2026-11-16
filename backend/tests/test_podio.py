"""Podio de la portada: campeón y vicecampeón de la final, tercero del 3.er puesto o del repechaje, la tabla sin
llaves con el torneo terminado, sellos y el torneo que se elige."""
import os
import unittest
from datetime import date, time as hora

from app import create_app

from app.shared.infrastructure.db import db
from app.shared.infrastructure.modelos.categoria import Categoria
from app.shared.infrastructure.modelos.equipo import Equipo
from app.shared.infrastructure.modelos.inscripcion import Inscripcion
from app.shared.infrastructure.modelos.partido import Partido
from app.shared.infrastructure.modelos.torneo import Torneo
from app.shared.infrastructure.modelos.usuario import Usuario
from app.modules.competencia.domain.podio import podio


class TestPodio(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
        os.environ['SUPABASE_JWT_SECRET'] = 'secreto-de-prueba'
        os.environ['SUPABASE_URL'] = 'http://127.0.0.1:9'

    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.client = self.app.test_client()
        db.session.add(Usuario(id_usuario='u-del', nombre='Delegado', correo='d@test.ec', rol='delegado'))
        db.session.add(Torneo(id_torneo=1, nombre='VI Edición', fecha_inicio=date(2026, 9, 16), fecha_fin=date(2026, 12, 12), estado='en_curso'))
        db.session.add(Torneo(id_torneo=2, nombre='Nacional Exalumnos', fecha_inicio=date(2026, 10, 31), fecha_fin=date(2026, 11, 2), estado='finalizado'))
        db.session.add(Categoria(id_categoria=3, nombre_categoria='Juvenil', genero_categoria='masculino', id_torneo=1, formato='un_grupo_semis'))
        db.session.add(Categoria(id_categoria=4, nombre_categoria='+40', genero_categoria='masculino', id_torneo=2, formato='un_grupo_semis'))
        db.session.flush()
        for i in range(1, 11):
            db.session.add(Equipo(id_equipo=i, nombre_equipo=f'EQUIPO {i}', id_usuario='u-del', url_logo=f'https://cdn.test/{i}.png'))
        db.session.flush()
        # Equipos 1-5 en el torneo 1 y 6-10 en el torneo 2, grupo único
        for i in range(1, 11):
            db.session.add(Inscripcion(id_torneo=1 if i <= 5 else 2, id_equipo=i, id_categoria=3 if i <= 5 else 4, estado_inscripcion='aprobado'))
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _jugar(self, torneo, cat, local, visitante, ml, mv, llave=None, estado='finalizado', fecha=date(2026, 11, 1)):
        db.session.add(Partido(id_torneo=torneo, id_categoria=cat, id_equipo_local=local, id_equipo_visitante=visitante,
                               fecha=fecha, hora=hora(19, 0), estado=estado, fase='Final' if llave == 'F' else 'Primera fase',
                               llave=llave, marcador_local=ml, marcador_visitante=mv))
        db.session.commit()

    def _grupo(self, torneo, cat, equipos):
        """Todos contra todos: gana siempre el primero de la lista (el orden de la tabla es el de la lista)."""
        for k, a in enumerate(equipos):
            for b in equipos[k + 1:]:
                self._jugar(torneo, cat, a, b, 60, 50, fecha=date(2026, 10, 31))

    def _podios(self):
        r = self.client.get('/api/torneos/podios')
        self.assertEqual(r.status_code, 200)
        return r.get_json()['data']

    def test_sin_finales_no_hay_podio(self):
        self._grupo(2, 4, [6, 7, 8, 9, 10])
        self.assertEqual(self._podios(), {'torneo': None, 'podios': []})

    def test_final_y_tercer_puesto_arman_el_podio(self):
        self._grupo(2, 4, [6, 7, 8, 9, 10])
        self._jugar(2, 4, 6, 9, 54, 23, llave='SF1')
        self._jugar(2, 4, 7, 8, 49, 37, llave='SF2')
        self._jugar(2, 4, 9, 8, 52, 44, llave='3P')
        self._jugar(2, 4, 6, 7, 58, 55, llave='F', fecha=date(2026, 11, 2))
        data = self._podios()
        self.assertEqual(data['torneo']['id_torneo'], 2)
        self.assertEqual(data['torneo']['fecha_fin'], '2026-11-02')
        [podio_cat] = data['podios']
        self.assertEqual(podio_cat['categoria'], {'id_categoria': 4, 'nombre_categoria': '+40', 'genero_categoria': 'masculino'})
        uno, dos, tres = podio_cat['puestos']
        self.assertEqual([p['lugar'] for p in (uno, dos, tres)], [1, 2, 3])
        self.assertEqual([p['equipo']['id_equipo'] for p in (uno, dos, tres)], [6, 7, 9])
        self.assertEqual(uno['equipo'], {'id_equipo': 6, 'nombre_equipo': 'EQUIPO 6', 'url_logo': 'https://cdn.test/6.png'})
        # El 6 ganó los 4 del grupo, la semifinal y la final: 6 de 6
        self.assertEqual((uno['PJ'], uno['PG'], uno['PP'], uno['PF'], uno['PC']), (6, 6, 0, 352, 278))
        self.assertIn('invicto', uno['sellos'])
        self.assertEqual(uno['partido'], {'ronda': 'Final', 'fecha': '2026-11-02', 'propio': 58, 'rival': 55, 'wo': False,
                                          'equipo_rival': {'id_equipo': 7, 'nombre_equipo': 'EQUIPO 7', 'url_logo': 'https://cdn.test/7.png'}})
        self.assertEqual((dos['partido']['propio'], dos['partido']['rival']), (55, 58))
        self.assertEqual(dos['partido']['equipo_rival']['id_equipo'], 6)
        self.assertEqual(tres['partido']['ronda'], 'Tercer puesto')
        self.assertEqual((tres['partido']['propio'], tres['partido']['rival']), (52, 44))
        self.assertEqual(tres['sellos'], [])

    def test_mas_puntos_es_de_quien_mas_anoto_en_la_categoria(self):
        self._grupo(2, 4, [6, 7, 8, 9, 10])
        self._jugar(2, 4, 6, 9, 54, 23, llave='SF1')
        self._jugar(2, 4, 7, 8, 120, 37, llave='SF2')  # el 7 anota de más y supera al campeón
        self._jugar(2, 4, 6, 7, 58, 55, llave='F')
        uno, dos = self._podios()['podios'][0]['puestos']  # sin 3.er puesto jugado, el podio tiene dos
        self.assertEqual(uno['sellos'], ['invicto'])
        self.assertEqual(dos['sellos'], ['mas_puntos'])

    def test_el_torneo_que_termina_ultimo_va_primero(self):
        for torneo, cat, equipos in ((2, 4, [6, 7, 8, 9, 10]), (1, 3, [1, 2, 3, 4, 5])):
            self._grupo(torneo, cat, equipos)
            a, b, c, d = equipos[:4]
            self._jugar(torneo, cat, a, d, 70, 60, llave='SF1')
            self._jugar(torneo, cat, b, c, 70, 60, llave='SF2')
            self._jugar(torneo, cat, a, b, 70, 60, llave='F')
        data = self._podios()
        self.assertEqual(data['torneo']['id_torneo'], 1)  # en curso, termina en diciembre
        self.assertEqual(data['podios'][0]['puestos'][0]['equipo']['id_equipo'], 1)

    def test_final_por_wo(self):
        self._grupo(2, 4, [6, 7, 8, 9, 10])
        self._jugar(2, 4, 6, 9, 54, 23, llave='SF1')
        self._jugar(2, 4, 7, 8, 49, 37, llave='SF2')
        self._jugar(2, 4, 7, 6, 0, 0, llave='F', estado='finalizado_wo')  # W.O. sin marcador: 20-0 para el local
        uno, dos = self._podios()['podios'][0]['puestos']
        self.assertEqual(uno['equipo']['id_equipo'], 7)
        self.assertEqual((uno['partido']['propio'], uno['partido']['rival'], uno['partido']['wo']), (20, 0, True))
        self.assertEqual((dos['partido']['propio'], dos['partido']['rival']), (0, 20))

    def test_sin_llaves_la_tabla_solo_con_el_torneo_finalizado(self):
        db.session.get(Categoria, 4).formato = None
        db.session.get(Categoria, 3).formato = None
        db.session.commit()
        self._grupo(1, 3, [1, 2, 3, 4, 5])  # torneo 1 en curso: su tabla todavía no es un podio
        self._grupo(2, 4, [8, 6, 7, 9, 10])
        data = self._podios()
        self.assertEqual(data['torneo']['id_torneo'], 2)
        puestos = data['podios'][0]['puestos']
        self.assertEqual([(p['lugar'], p['equipo']['id_equipo']) for p in puestos], [(1, 8), (2, 6), (3, 7)])
        self.assertIsNone(puestos[0]['partido'])
        self.assertEqual(puestos[0]['sellos'], ['invicto', 'mas_puntos'])


class TestPodioPuro(unittest.TestCase):
    """El formato de tres equipos no tiene 3.er puesto: el tercero es quien perdió el repechaje."""

    def ficha(self, i):
        return {'id_equipo': i, 'nombre_equipo': f'E{i}', 'url_logo': None}

    def llave(self, codigo, ronda, local, visitante, ml, mv):
        return {'codigo': codigo, 'ronda': ronda, 'estado': 'finalizado', 'local': self.ficha(local), 'visitante': self.ficha(visitante),
                'ganador': local if ml >= mv else visitante,
                'partido': {'estado': 'finalizado', 'fecha': '2026-11-02', 'marcador_local': ml, 'marcador_visitante': mv,
                            'id_equipo_local': local, 'id_equipo_visitante': visitante}}

    def test_tres_equipos_el_tercero_pierde_el_repechaje(self):
        estado = {'formato': 'tres_final_directa', 'llaves': [
            self.llave('R', 'Repechaje', 2, 3, 40, 45),
            self.llave('F', 'Final', 1, 3, 70, 60),
        ]}
        puestos = podio(estado, [(2, 3, 40, 45, 'finalizado'), (1, 3, 70, 60, 'finalizado')])
        self.assertEqual([(p['lugar'], p['equipo']['id_equipo']) for p in puestos], [(1, 1), (2, 3), (3, 2)])
        self.assertEqual(puestos[2]['partido']['ronda'], 'Repechaje')
        self.assertEqual((puestos[2]['partido']['propio'], puestos[2]['partido']['rival']), (40, 45))

    def test_final_sin_jugar_no_hay_podio(self):
        estado = {'formato': 'un_grupo_semis', 'llaves': [dict(self.llave('F', 'Final', 1, 2, 0, 0), estado='programado')]}
        self.assertEqual(podio(estado, []), [])
