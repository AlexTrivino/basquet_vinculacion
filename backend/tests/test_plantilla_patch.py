from datetime import date
import unittest
from marshmallow import ValidationError
from app import create_app
from app.schemas.plantilla_schema import (
    PlantillaUpdateSchema,
    PlantillaPublicSchema,
    _JugadorEnPlantillaSchema
)

class TestPlantillaPatchAndSchema(unittest.TestCase):
    def test_plantilla_update_schema_valid(self):
        schema = PlantillaUpdateSchema()
        data = {'numero_camiseta': 23}
        loaded = schema.load(data)
        self.assertEqual(loaded['numero_camiseta'], 23)

        # 0 and 99 are valid edge values
        self.assertEqual(schema.load({'numero_camiseta': 0})['numero_camiseta'], 0)
        self.assertEqual(schema.load({'numero_camiseta': 99})['numero_camiseta'], 99)

    def test_plantilla_update_schema_invalid_range(self):
        schema = PlantillaUpdateSchema()
        with self.assertRaises(ValidationError) as ctx:
            schema.load({'numero_camiseta': -1})
        self.assertIn('numero_camiseta', ctx.exception.messages)

        with self.assertRaises(ValidationError) as ctx:
            schema.load({'numero_camiseta': 100})
        self.assertIn('numero_camiseta', ctx.exception.messages)

    def test_plantilla_update_schema_required(self):
        schema = PlantillaUpdateSchema()
        with self.assertRaises(ValidationError) as ctx:
            schema.load({})
        self.assertIn('numero_camiseta', ctx.exception.messages)

    def test_jugador_en_plantilla_schema_fields(self):
        schema = _JugadorEnPlantillaSchema()
        data = {
            'id_jugador': 1,
            'nombre': 'Carlos Tevez',
            'genero': 'masculino',
            'documento_identificacion': '1234567890',
            'fecha_nacimiento': date(1995, 5, 15),
            'telefono': '0987654321',
            'correo': 'carlos@test.com',
            'url_foto': 'https://example.com/foto.jpg',
            'url_cedula': 'https://example.com/cedula.pdf',
            'url_acta_bachiller': 'https://example.com/acta.pdf',
        }
        dumped = schema.dump(data)
        self.assertEqual(dumped['telefono'], '0987654321')
        self.assertEqual(dumped['correo'], 'carlos@test.com')
        self.assertEqual(dumped['url_cedula'], 'https://example.com/cedula.pdf')
        self.assertEqual(dumped['url_acta_bachiller'], 'https://example.com/acta.pdf')

    def test_actualizar_numero_camiseta_signature(self):
        from app.services.plantilla_service import actualizar_numero_camiseta
        app = create_app()
        with app.app_context():
            # Non-existent entry returns None
            res = actualizar_numero_camiseta(999999, 10)
            self.assertIsNone(res)

    def test_roster_constants(self):
        from app.services.plantilla_service import MIN_JUGADORES_PLANTILLA, MAX_JUGADORES_PLANTILLA
        self.assertGreaterEqual(MIN_JUGADORES_PLANTILLA, 1)
        self.assertGreaterEqual(MAX_JUGADORES_PLANTILLA, MIN_JUGADORES_PLANTILLA)

if __name__ == '__main__':
    unittest.main()
