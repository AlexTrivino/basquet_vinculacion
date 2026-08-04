from datetime import date
import unittest
from marshmallow import ValidationError
from app import create_app, db
from app.schemas.jugador_schema import JugadorUpdateSchema, JugadorAdminSchema
from app.services.jugador_service import listar_jugadores_admin


class TestJugadorAdminFiltersAndSchema(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        self.app_context.pop()

    def test_jugador_update_schema_estado(self):
        schema = JugadorUpdateSchema()
        # Valido activo
        data_act = schema.load({'estado': 'activo'})
        self.assertEqual(data_act['estado'], 'activo')

        # Valido inactivo
        data_inact = schema.load({'estado': 'inactivo'})
        self.assertEqual(data_inact['estado'], 'inactivo')

        # Invalido otro estado
        with self.assertRaises(ValidationError) as ctx:
            schema.load({'estado': 'suspendido'})
        self.assertIn('estado', ctx.exception.messages)

    def test_jugador_admin_schema_plantillas_method(self):
        schema = JugadorAdminSchema()
        
        class MockPlantilla:
            def __init__(self, id_plantilla, num, id_eq, eq_nom, id_tor, tor_nom, estado='activo'):
                self.id_plantilla = id_plantilla
                self.numero_camiseta = num
                self.id_equipo = id_eq
                self.equipo = type('MockEquipo', (), {'nombre_equipo': eq_nom})()
                self.id_torneo = id_tor
                self.torneo = type('MockTorneo', (), {'nombre_torneo': tor_nom})()
                self.estado = estado

        class MockJugador:
            def __init__(self):
                self.id_jugador = 1
                self.nombre = 'Juan Perez'
                self.genero = 'masculino'
                self.documento_identificacion = '1312345678'
                self.fecha_nacimiento = date(1998, 4, 10)
                self.url_foto = None
                self.url_cedula = 'https://example.com/ced.pdf'
                self.url_acta_bachiller = None
                self.correo = 'juan@test.com'
                self.telefono = '0987654321'
                self.estado = 'activo'
                self.created_at = None
                self.updated_at = None
                self.plantillas = [
                    MockPlantilla(10, 7, 2, 'Lakers', 1, 'Torneo Apertura', 'activo'),
                    MockPlantilla(11, 7, 3, 'Bulls', 2, 'Torneo Clausura', 'inactivo'),
                ]

        dumped = schema.dump(MockJugador())
        self.assertEqual(dumped['nombre'], 'Juan Perez')
        self.assertEqual(len(dumped['plantillas']), 1)
        self.assertEqual(dumped['plantillas'][0]['nombre_equipo'], 'Lakers')
        self.assertEqual(dumped['plantillas'][0]['nombre_torneo'], 'Torneo Apertura')

    def test_listar_jugadores_admin_query_construction(self):
        # Query sin filtros
        q1 = listar_jugadores_admin()
        self.assertIsNotNone(q1)

        # Query con búsqueda, género y estado
        q2 = listar_jugadores_admin(search='Juan', genero='masculino', estado='inactivo')
        self.assertIsNotNone(q2)

        # Query con filtros de torneo y equipo
        q3 = listar_jugadores_admin(id_torneo=1, id_equipo=2)
        self.assertIsNotNone(q3)


if __name__ == '__main__':
    unittest.main()
