"""Desempate FIBA D.1: solo cuentan los partidos entre los empatados, y el procedimiento se reinicia."""
import unittest

from app.services.standings import desempatar

G = {i: {'DIF': 0, 'PF': 0} for i in 'ABCD'}


class TestDesempate(unittest.TestCase):
    def test_dos_empatados_supremacia(self):
        # B le ganó a A: B arriba aunque A tenga mejor diferencia global
        g = {'A': {'DIF': 30, 'PF': 300}, 'B': {'DIF': -5, 'PF': 250}}
        self.assertEqual(desempatar(['A', 'B'], [('A', 'B', 60, 70)], g), ['B', 'A'])

    def test_triple_empate_circular_decide_la_diferencia_entre_si(self):
        # Cada uno ganó uno y perdió uno: manda la diferencia solo en esos tres partidos
        r = [('A', 'B', 70, 60), ('B', 'C', 80, 75), ('C', 'A', 65, 64)]
        # Diferencia entre sí: A +10 -1 = +9, B -10 +5 = -5, C -5 +1 = -4
        self.assertEqual(desempatar(['A', 'B', 'C'], r, G), ['A', 'C', 'B'])

    def test_triple_empate_con_diferencia_igual_decide_los_puntos_anotados(self):
        r = [('A', 'B', 72, 62), ('B', 'C', 70, 60), ('C', 'A', 70, 60)]
        # Todos con diferencia 0 entre sí. Puntos anotados: A 132, B 132, C 130 → C queda tercero
        # y entre A y B se reinicia el procedimiento: A le ganó a B
        self.assertEqual(desempatar(['A', 'B', 'C'], r, G), ['A', 'B', 'C'])

    def test_se_separa_uno_y_el_resto_se_reinicia(self):
        # Entre los cuatro: A ganó 2, B ganó 2, C 1, D 1 → {A,B} arriba, {C,D} abajo.
        # Entre A y B: B le ganó a A (aunque A tenga mejor diferencia entre los cuatro).
        r = [('A', 'C', 90, 50), ('A', 'D', 90, 50), ('B', 'A', 61, 60), ('B', 'C', 70, 65), ('C', 'D', 80, 70), ('D', 'B', 75, 70)]
        self.assertEqual(desempatar(['A', 'B', 'C', 'D'], r, G), ['B', 'A', 'C', 'D'])

    def test_sin_partidos_entre_si_usa_la_diferencia_global(self):
        g = {'A': {'DIF': -3, 'PF': 200}, 'B': {'DIF': 12, 'PF': 180}}
        self.assertEqual(desempatar(['A', 'B'], [], g), ['B', 'A'])

    def test_wo_cuenta_como_20_a_0(self):
        self.assertEqual(desempatar(['A', 'B'], [('A', 'B', 20, 0)], G), ['A', 'B'])


if __name__ == '__main__':
    unittest.main()
