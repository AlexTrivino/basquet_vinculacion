import unittest
import io
import os
from unittest.mock import patch
from marshmallow import ValidationError
from app import create_app, db
from app.models.torneo import Torneo
from app.models.categoria import Categoria
from app.services.torneo_service import anular_torneo, obtener_torneo_por_id
from app.services.categoria_service import agregar_categoria, eliminar_categoria
from app.schemas.torneo_schema import TorneoUpdateSchema

class TestFase4TorneosBusiness(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        # Crear torneo
        self.torneo = Torneo(nombre="Torneo Test", fecha_inicio="2026-01-01", fecha_fin="2026-12-31", estado="programado")
        db.session.add(self.torneo)
        db.session.commit()
        self.t_id = self.torneo.id_torneo

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_schema_torneo_update_estado_anulado(self):
        schema = TorneoUpdateSchema()
        # Valido anulado
        data_anulado = schema.load({'estado': 'anulado'})
        self.assertEqual(data_anulado['estado'], 'anulado')

        # Invalido
        with self.assertRaises(ValidationError):
            schema.load({'estado': 'inventado'})

    def test_anular_torneo_service(self):
        # Service normal
        torneo_mod = anular_torneo(self.t_id)
        self.assertIsNotNone(torneo_mod)
        self.assertEqual(torneo_mod.estado, 'anulado')

        # Verificar DB
        t_db = db.session.get(Torneo, self.t_id)
        self.assertEqual(t_db.estado, 'anulado')

        # Obtener public no debe traer anulados
        t_pub = obtener_torneo_por_id(self.t_id, incluir_inactivos=False)
        self.assertIsNone(t_pub)

        # Obtener admin debe traer anulados
        t_adm = obtener_torneo_por_id(self.t_id, incluir_inactivos=True)
        self.assertIsNotNone(t_adm)

    def test_crud_categorias_service(self):
        cat_data = {
            "nombre_categoria": "Sub-20",
            "genero_categoria": "masculino",
            "edad_minima": 15,
            "edad_maxima": 20,
            "id_torneo": self.t_id
        }
        # Agregar
        nueva_cat = agregar_categoria(cat_data)
        self.assertIsNotNone(nueva_cat)
        self.assertEqual(nueva_cat.nombre_categoria, "Sub-20")
        c_id = nueva_cat.id_categoria

        # Buscar en DB
        cat_db = db.session.get(Categoria, c_id)
        self.assertEqual(cat_db.id_torneo, self.t_id)

        # Eliminar
        res = eliminar_categoria(c_id)
        self.assertTrue(res)

        cat_deleted = db.session.get(Categoria, c_id)
        self.assertIsNone(cat_deleted)

    def test_validar_archivo_magic_bytes(self):
        from app.utils.storage import validar_archivo, TIPOS_DOCUMENTO, MAX_CALENDARIO_TORNEO
        import io

        fake_xlsx = b'PK\x03\x04\x00\x00\x00\x00\x00\x00FakeExcelContent'
        stream = io.BytesIO(fake_xlsx)
        mime = validar_archivo(stream, TIPOS_DOCUMENTO, MAX_CALENDARIO_TORNEO)
        self.assertIn(mime, ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'])

        # Archivo falso simulando magic bytes inválidos
        fake_malware = b'#!/bin/bash\nrm -rf /'
        stream_malware = io.BytesIO(fake_malware)
        with self.assertRaises(ValueError) as ctx:
            validar_archivo(stream_malware, TIPOS_DOCUMENTO, MAX_CALENDARIO_TORNEO)
        self.assertIn("Tipo de archivo no permitido", str(ctx.exception))

if __name__ == '__main__':
    unittest.main()
