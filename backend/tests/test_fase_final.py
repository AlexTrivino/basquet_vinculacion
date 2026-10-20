"""Fase final: posiciones por grupo, cuadro de llaves que se va armando y recorrido del grupo."""
import os
import time
import unittest
from datetime import date, time as hora, timedelta

import jwt

from app import create_app, db
from app.models.categoria import Categoria
from app.models.equipo import Equipo
from app.models.inscripcion import Inscripcion
from app.models.partido import Partido
from app.models.torneo import Torneo
from app.models.usuario import Usuario
from app.services.standings import calcular_tabla

SECRETO = 'secreto-de-prueba'
NOMBRES = ['5 DE JUNIO', 'FAE', 'SAN JOSÉ', 'MARÍA AUXILIADORA', 'FE Y ALEGRÍA',
           'JULIO PIERREGROSSE', '4 DE NOVIEMBRE', 'JUAN MONTALVO', 'STELLA MARIS', 'MANTA']


class TestFaseFinal(unittest.TestCase):
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

        db.session.add(Usuario(id_usuario='u-admin', nombre='Admin', correo='a@test.ec', rol='super_admin'))
        db.session.add(Usuario(id_usuario='u-del', nombre='Delegado', correo='d@test.ec', rol='delegado'))
        db.session.add(Torneo(id_torneo=1, nombre='VI Edición', fecha_inicio=date(2026, 9, 16), fecha_fin=date(2026, 12, 12), estado='en_curso'))
        db.session.add(Categoria(id_categoria=3, nombre_categoria='Juvenil', genero_categoria='masculino', id_torneo=1, formato='dos_grupos_cruces'))
        db.session.flush()
        # Equipos 1-5 en el grupo A y 6-10 en el B
        for i, n in enumerate(NOMBRES, start=1):
            db.session.add(Equipo(id_equipo=i, nombre_equipo=n, id_usuario='u-del'))
        db.session.flush()
        for i in range(1, 11):
            db.session.add(Inscripcion(id_torneo=1, id_equipo=i, id_categoria=3, estado_inscripcion='aprobado', grupo='A' if i <= 5 else 'B'))
        db.session.commit()
        self.dia = date(2026, 9, 16)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    # ── utilidades ──
    def _token(self, uid):
        return jwt.encode({'sub': uid, 'aud': 'authenticated', 'exp': int(time.time()) + 300}, SECRETO, algorithm='HS256')

    def _admin(self, metodo, url, json=None):
        r = getattr(self.client, metodo)(url, json=json, headers={'Authorization': f'Bearer {self._token("u-admin")}'})
        return r.status_code, r.get_json()

    def _jugar(self, local, visitante, ml, mv, fecha=None, llave=None, fase='Primera fase', cat=3):
        p = Partido(id_torneo=1, id_categoria=cat, id_equipo_local=local, id_equipo_visitante=visitante,
                    fecha=fecha or self.dia, hora=hora(19, 0), estado='finalizado', fase=fase, llave=llave,
                    marcador_local=ml, marcador_visitante=mv)
        db.session.add(p)
        db.session.commit()
        return p

    def _fase_de_grupos_completa(self):
        """Todos contra todos en cada grupo: gana siempre el de menor id (1 > 2 > 3 > 4 > 5)."""
        for grupo in ((1, 2, 3, 4, 5), (6, 7, 8, 9, 10)):
            for k, a in enumerate(grupo):
                for b in grupo[k + 1:]:
                    self._jugar(a, b, 70, 60, fecha=date(2026, 9, 16 + k))

    # ── posiciones por grupo ──
    def test_tabla_pura_con_equipos_sin_partidos(self):
        tabla = calcular_tabla([(1, 2, 70, 60, 'finalizado')], equipos=[1, 2, 3])
        self.assertEqual([f['id_equipo'] for f in tabla], [1, 2, 3])
        self.assertEqual(tabla[2]['PJ'], 0)

    def test_posiciones_por_grupo_y_solo_fase_de_grupos(self):
        self._jugar(1, 2, 70, 60)
        self._jugar(6, 7, 50, 80)
        self._jugar(1, 6, 99, 0, llave='F', fase='Final')  # un partido de llave no cuenta
        r = self.client.get('/api/torneos/1/posiciones?id_categoria=3')
        filas = r.get_json()['data']
        self.assertEqual(len(filas), 10)
        a = [f for f in filas if f['grupo'] == 'A']
        b = [f for f in filas if f['grupo'] == 'B']
        self.assertEqual([f['id_equipo'] for f in a][:2], [1, 2])
        self.assertEqual(a[0]['posicion'], 1)
        self.assertEqual(b[0]['id_equipo'], 7)
        self.assertEqual(b[0]['posicion'], 1)
        self.assertEqual(a[0]['PF'], 70)  # la final no sumó los 99

    # ── llaves ──
    def test_llaves_esperan_hasta_terminar_la_fase_de_grupos(self):
        self._jugar(1, 2, 70, 60)
        r = self.client.get('/api/torneos/1/fase-final?id_categoria=3')
        data = r.get_json()['data']
        self.assertFalse(data['fase_grupos']['terminada'])
        self.assertEqual(data['fase_grupos']['esperados'], 20)
        self.assertTrue(all(l['estado'] == 'espera' for l in data['llaves']))
        self.assertEqual([l['codigo'] for l in data['llaves']], ['CF1', 'CF2', 'CF3', 'CF4', 'SF1', 'SF2', '3P', 'F'])

    def test_cuadro_completo_se_va_armando(self):
        self._fase_de_grupos_completa()
        data = self.client.get('/api/torneos/1/fase-final?id_categoria=3').get_json()['data']
        self.assertTrue(data['fase_grupos']['terminada'])
        listas = {l['codigo']: (l['local']['id_equipo'], l['visitante']['id_equipo']) for l in data['llaves'] if l['estado'] == 'listo'}
        # 1A-4B, 2B-3A, 1B-4A, 2A-3B
        self.assertEqual(listas, {'CF1': (1, 9), 'CF2': (7, 3), 'CF3': (6, 4), 'CF4': (2, 8)})
        self.assertEqual(data['llaves'][4]['cruce'], 'Ganador CF1 vs Ganador CF2')

        # Un delegado no puede generar llaves
        r = self.client.post('/api/torneos/1/fase-final/partidos', json={'id_categoria': 3, 'partidos': []},
                             headers={'Authorization': f'Bearer {self._token("u-del")}'})
        self.assertEqual(r.status_code, 403)

        # El admin crea los cuartos con fecha y hora
        programacion = [{'llave': c, 'fecha': '2026-10-17', 'hora': '19:00'} for c in ('CF1', 'CF2', 'CF3', 'CF4')]
        status, body = self._admin('post', '/api/torneos/1/fase-final/partidos', {'id_categoria': 3, 'partidos': programacion})
        self.assertEqual(status, 201, body)
        self.assertEqual({p['llave'] for p in body['data']}, {'CF1', 'CF2', 'CF3', 'CF4'})
        self.assertEqual(body['data'][0]['fase'], 'Cuartos de final')

        # No se puede volver a crear una llave ya creada ni una que espera
        status, _ = self._admin('post', '/api/torneos/1/fase-final/partidos', {'id_categoria': 3, 'partidos': [{'llave': 'SF1', 'fecha': '2026-10-20', 'hora': '19:00'}]})
        self.assertEqual(status, 409)

        # Se juegan los cuartos: ganan 1, 3, 6 y 8
        for codigo, (loc, vis, ml, mv) in {'CF1': (1, 9, 80, 60), 'CF2': (7, 3, 60, 80), 'CF3': (6, 4, 80, 60), 'CF4': (2, 8, 60, 80)}.items():
            p = Partido.query.filter_by(id_torneo=1, llave=codigo).first()
            p.marcador_local, p.marcador_visitante, p.estado = ml, mv, 'finalizado'
        db.session.commit()
        data = self.client.get('/api/torneos/1/fase-final?id_categoria=3').get_json()['data']
        llaves = {l['codigo']: l for l in data['llaves']}
        self.assertEqual(llaves['CF1']['estado'], 'finalizado')
        self.assertEqual(llaves['CF1']['ganador'], 1)
        self.assertEqual((llaves['SF1']['local']['id_equipo'], llaves['SF1']['visitante']['id_equipo']), (1, 3))
        self.assertEqual((llaves['SF2']['local']['id_equipo'], llaves['SF2']['visitante']['id_equipo']), (6, 8))
        self.assertEqual(llaves['SF1']['estado'], 'listo')
        self.assertEqual(llaves['3P']['estado'], 'espera')
        self.assertEqual(llaves['F']['estado'], 'espera')

        # Semifinales jugadas: el tercer puesto y la final se arman con perdedores y ganadores
        self._jugar(1, 3, 90, 70, llave='SF1', fase='Semifinal')
        self._jugar(6, 8, 70, 90, llave='SF2', fase='Semifinal')
        data = self.client.get('/api/torneos/1/fase-final?id_categoria=3').get_json()['data']
        llaves = {l['codigo']: l for l in data['llaves']}
        self.assertEqual((llaves['3P']['local']['id_equipo'], llaves['3P']['visitante']['id_equipo']), (3, 6))
        self.assertEqual((llaves['F']['local']['id_equipo'], llaves['F']['visitante']['id_equipo']), (1, 8))

    # ── formato y grupos ──
    def test_formato_y_grupos(self):
        status, body = self._admin('put', '/api/torneos/categorias/3/formato', {'formato': 'inventado'})
        self.assertEqual(status, 422)
        status, body = self._admin('put', '/api/torneos/categorias/3/formato', {'formato': 'un_grupo_semis'})
        self.assertEqual(status, 200)
        self.assertEqual(db.session.get(Categoria, 3).formato, 'un_grupo_semis')
        # Con un solo grupo no se permite asignar letras
        status, _ = self._admin('put', '/api/torneos/1/grupos', {'id_categoria': 3, 'grupos': {'1': 'A'}})
        self.assertEqual(status, 422)
        self._admin('put', '/api/torneos/categorias/3/formato', {'formato': 'dos_grupos_cruces'})
        status, body = self._admin('put', '/api/torneos/1/grupos', {'id_categoria': 3, 'grupos': {str(i): ('B' if i % 2 else 'A') for i in range(1, 11)}})
        self.assertEqual(status, 200, body)
        self.assertEqual(Inscripcion.query.filter_by(id_equipo=1).first().grupo, 'B')
        self.assertEqual(Inscripcion.query.filter_by(id_equipo=2).first().grupo, 'A')
        # El formato llega en la categoría pública del torneo
        cat = next(c for c in self.client.get('/api/torneos/1').get_json()['data']['categorias'] if c['id_categoria'] == 3)
        self.assertEqual(cat['formato'], 'dos_grupos_cruces')

    # ── recorrido ──
    def test_recorrido_posiciones_por_fecha_y_situacion(self):
        self._jugar(1, 2, 70, 60, fecha=date(2026, 9, 16))
        self._jugar(3, 4, 70, 60, fecha=date(2026, 9, 16))
        self._jugar(2, 3, 70, 60, fecha=date(2026, 9, 19))
        data = self.client.get('/api/torneos/1/recorrido?id_categoria=3').get_json()['data']
        self.assertEqual(data['fechas'], ['2026-09-16', '2026-09-19'])
        self.assertEqual(data['cupos'], 4)
        a = next(g for g in data['grupos'] if g['grupo'] == 'A')
        self.assertFalse(a['terminado'])
        por_id = {e['id_equipo']: e for e in a['equipos']}
        self.assertEqual(len(por_id[1]['posiciones']), 2)
        self.assertEqual(por_id[1]['posiciones'][0], 1)
        self.assertEqual(por_id[1]['restantes'], 3)
        self.assertIn(por_id[5]['situacion'], ('zona', 'depende'))  # sin jugar, nada está decidido
        # Fase terminada: 4 clasificados y 1 eliminado por grupo
        self._fase_de_grupos_completa()
        data = self.client.get('/api/torneos/1/recorrido?id_categoria=3').get_json()['data']
        for g in data['grupos']:
            self.assertTrue(g['terminado'])
            self.assertEqual([e['situacion'] for e in g['equipos']], ['clasificado'] * 4 + ['eliminado'])

    def test_tres_equipos_ida_y_vuelta(self):
        """Cadetes +30 femenino: 3 equipos, ida y vuelta (6 partidos); recién entonces se arma el repechaje 2.º-3.º."""
        db.session.add(Categoria(id_categoria=10, nombre_categoria='Cadetes +30 Femenino', genero_categoria='femenino', id_torneo=1, formato='tres_final_directa'))
        for i in (11, 12, 13):
            db.session.add(Equipo(id_equipo=i, nombre_equipo=f'EQUIPO {i}', id_usuario='u-del'))
            db.session.add(Inscripcion(id_torneo=1, id_equipo=i, id_categoria=10, estado_inscripcion='aprobado'))
        db.session.commit()
        ida = [(11, 12), (12, 13), (11, 13)]
        for local, visita in ida:
            self._jugar(local, visita, 70, 60, cat=10)
        data = self.client.get('/api/torneos/1/fase-final?id_categoria=10').get_json()['data']
        self.assertEqual(data['fase_grupos']['esperados'], 6)
        self.assertFalse(data['fase_grupos']['terminada'])  # la ida sola no cierra la fase
        self.assertTrue(all(l['estado'] == 'espera' for l in data['llaves']))
        grupo = self.client.get('/api/torneos/1/recorrido?id_categoria=10').get_json()['data']['grupos'][0]
        self.assertEqual([e['restantes'] for e in grupo['equipos']], [2, 2, 2])
        self.assertFalse(grupo['terminado'])
        for local, visita in ida:  # vuelta: cambia la localía y repite el ganador
            self._jugar(visita, local, 60, 70, fecha=date(2026, 10, 16), cat=10)
        data = self.client.get('/api/torneos/1/fase-final?id_categoria=10').get_json()['data']
        self.assertTrue(data['fase_grupos']['terminada'])
        llaves = {l['codigo']: l for l in data['llaves']}
        self.assertEqual((llaves['R']['estado'], llaves['R']['local']['id_equipo'], llaves['R']['visitante']['id_equipo']), ('listo', 12, 13))
        self.assertEqual(llaves['F']['estado'], 'espera')  # 11 espera al ganador del repechaje
        self.assertTrue(self.client.get('/api/torneos/1/recorrido?id_categoria=10').get_json()['data']['grupos'][0]['terminado'])

    def test_reglas_al_programar_y_finalizar(self):
        """En la fase de grupos solo juegan equipos del mismo grupo, no se finaliza empatado y el buscador responde."""
        base = {'id_torneo': 1, 'id_categoria': 3, 'fecha': '2026-09-20', 'hora': '19:00', 'fase': 'Primera fase', 'ubicacion': 'Coliseo'}
        st, cuerpo = self._admin('post', '/api/partidos', {**base, 'id_equipo_local': 1, 'id_equipo_visitante': 6})
        self.assertEqual(st, 422)
        self.assertIn('mismo grupo', cuerpo['message'])
        st, cuerpo = self._admin('post', '/api/partidos', {**base, 'id_equipo_local': 1, 'id_equipo_visitante': 2})
        self.assertEqual(st, 201)
        pid = cuerpo['data']['id_partido']
        # Cambiar el visitante por uno del otro grupo tampoco se puede
        st, _ = self._admin('put', f'/api/partidos/{pid}', {'id_equipo_visitante': 7})
        self.assertEqual(st, 422)
        # Empatado no se finaliza; con ganador sí
        st, cuerpo = self._admin('put', f'/api/partidos/{pid}', {'estado': 'finalizado', 'marcador_local': 60, 'marcador_visitante': 60})
        self.assertEqual(st, 422)
        self.assertIn('empates', cuerpo['message'])
        st, _ = self._admin('put', f'/api/partidos/{pid}', {'estado': 'finalizado', 'marcador_local': 61, 'marcador_visitante': 60})
        self.assertEqual(st, 200)
        # El buscador de partidos (antes respondía 500)
        r = self.client.get('/api/partidos?search=FAE')
        self.assertEqual(r.status_code, 200)
        self.assertEqual([p['id_partido'] for p in r.get_json()['data']], [pid])

    def test_el_calendario_del_torneo_trae_todos_sus_partidos(self):
        """La vista del torneo pide per_page=1000; con el tope de 50 el calendario se cortaba en la fecha del partido 50."""
        for k in range(60):
            self._jugar(1, 2, 70, 60, fecha=self.dia + timedelta(days=k))
        cuerpo = self.client.get('/api/partidos?id_torneo=1&per_page=1000').get_json()
        self.assertEqual(len(cuerpo['data']), 60)
        self.assertEqual(cuerpo['data'][-1]['fecha'], (self.dia + timedelta(days=59)).isoformat())


if __name__ == '__main__':
    unittest.main()
