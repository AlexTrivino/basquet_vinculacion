from datetime import date
import unittest
from marshmallow import ValidationError
from app import create_app, db
from app.modules.plantel.domain.jugador import Jugador, PlantillaDeJugador
from app.modules.plantel.http.esquemas import JugadorUpdateSchema, JugadorAdminSchema
from app.modules.plantel.infrastructure.repositorio import RepositorioJugadores


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
        jugador = Jugador(
            1, 'Juan Perez', '1312345678', date(1998, 4, 10), 'masculino',
            url_cedula='https://example.com/ced.pdf', correo='juan@test.com', telefono='0987654321',
            plantillas=[
                PlantillaDeJugador(10, 7, 2, 'Lakers', 1, 'Torneo Apertura', 'activo'),
                PlantillaDeJugador(11, 7, 3, 'Bulls', 2, 'Torneo Clausura', 'inactivo'),
            ],
        )

        dumped = schema.dump(jugador)
        self.assertEqual(dumped['nombre'], 'Juan Perez')
        self.assertEqual(len(dumped['plantillas']), 1)
        self.assertEqual(dumped['plantillas'][0]['nombre_equipo'], 'Lakers')
        self.assertEqual(dumped['plantillas'][0]['nombre_torneo'], 'Torneo Apertura')

    def test_listar_jugadores_admin_query_construction(self):
        repositorio = RepositorioJugadores()
        for filtros in (
            {},  # sin filtros
            {'search': 'Juan', 'genero': 'masculino', 'estado': 'inactivo'},  # búsqueda, género y estado
            {'id_torneo': 1, 'id_equipo': 2},  # torneo y equipo
        ):
            jugadores, meta = repositorio.listar(1, 20, **filtros)
            self.assertEqual((jugadores, meta['total']), ([], 0))


if __name__ == '__main__':
    unittest.main()
