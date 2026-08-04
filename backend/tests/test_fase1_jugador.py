import unittest
from datetime import date
from marshmallow import ValidationError
from app import create_app
from app.schemas.jugador_schema import JugadorCreateSchema, JugadorUpdateSchema

class TestJugadorSchema(unittest.TestCase):
    def test_schema_telefono_required(self):
        schema = JugadorCreateSchema()
        data = {
            'nombre': 'Juan Perez',
            'documento_identificacion': '1234567890',
            'fecha_nacimiento': '2000-01-01',
        }
        with self.assertRaises(ValidationError) as ctx:
            schema.load(data)
        self.assertIn('telefono', ctx.exception.messages)

    def test_schema_telefono_invalid_length(self):
        schema = JugadorCreateSchema()
        # 9 digits
        data = {
            'nombre': 'Juan Perez',
            'documento_identificacion': '1234567890',
            'fecha_nacimiento': '2000-01-01',
            'telefono': '098765432'
        }
        with self.assertRaises(ValidationError) as ctx:
            schema.load(data)
        self.assertIn('telefono', ctx.exception.messages)

        # 11 digits
        data['telefono'] = '09876543210'
        with self.assertRaises(ValidationError) as ctx:
            schema.load(data)
        self.assertIn('telefono', ctx.exception.messages)

    def test_schema_telefono_non_numeric(self):
        schema = JugadorCreateSchema()
        data = {
            'nombre': 'Juan Perez',
            'documento_identificacion': '1234567890',
            'fecha_nacimiento': '2000-01-01',
            'telefono': '098765432a'
        }
        with self.assertRaises(ValidationError) as ctx:
            schema.load(data)
        self.assertIn('telefono', ctx.exception.messages)
        self.assertIn('solo dígitos numéricos', str(ctx.exception.messages['telefono']))

    def test_schema_telefono_valid(self):
        schema = JugadorCreateSchema()
        data = {
            'nombre': 'Juan Perez',
            'documento_identificacion': '1234567890',
            'fecha_nacimiento': '2000-01-01',
            'telefono': '0987654321'
        }
        loaded = schema.load(data)
        self.assertEqual(loaded['telefono'], '0987654321')
        self.assertEqual(loaded['nombre'], 'Juan Perez')

    def test_schema_update_telefono_validation(self):
        schema = JugadorUpdateSchema()
        # Invalid length in update
        with self.assertRaises(ValidationError):
            schema.load({'telefono': '123'})
        
        # Non numeric in update
        with self.assertRaises(ValidationError):
            schema.load({'telefono': '098765432a'})
            
        # Valid 10 digits
        loaded = schema.load({'telefono': '0987654321'})
        self.assertEqual(loaded['telefono'], '0987654321')
        
        # Omitted telefono is valid in update
        loaded_empty = schema.load({'nombre': 'Nuevo Nombre'})
        self.assertNotIn('telefono', loaded_empty)

    def test_verificar_jugador_en_torneo_signature(self):
        from app.services.plantilla_service import verificar_jugador_en_torneo
        app = create_app()
        with app.app_context():
            # Non-existent player / tournament
            res = verificar_jugador_en_torneo(999999, 999999)
            self.assertIsInstance(res, dict)
            self.assertIn('ya_en_torneo', res)
            self.assertIn('equipo_torneo', res)
            self.assertIn('id_equipo', res)
            self.assertFalse(res['ya_en_torneo'])
            self.assertIsNone(res['equipo_torneo'])
            self.assertIsNone(res['id_equipo'])

    def test_buscar_jugador_param_validation(self):
        app = create_app()
        client = app.test_client()
        
        # Test without cedula (auth token will fail or cedula check)
        res = client.get('/api/jugadores/buscar')
        # Without auth header, returns 401
        self.assertEqual(res.status_code, 401)

if __name__ == '__main__':
    from app import create_app
    unittest.main()
