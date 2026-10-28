import unittest
import io
from datetime import date
import os
from unittest.mock import patch
from marshmallow import ValidationError
from app import create_app, db
from app.models.torneo import Torneo
from app.models.categoria import Categoria
from app.modules.torneos.application import casos_de_uso as torneos
from app.modules.torneos.http.esquemas import TorneoUpdateSchema
from app.modules.torneos.infrastructure.repositorio import RepositorioTorneos
from app.shared.domain.errores import NoEncontrado
from app.shared.infrastructure.unidad_de_trabajo import UnidadDeTrabajo

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
        self.torneo = Torneo(nombre="Torneo Test", fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 12, 31), estado="programado")
        db.session.add(self.torneo)
        db.session.commit()
        self.t_id = self.torneo.id_torneo

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_no_acepta_inscripciones_si_no_esta_programado(self):
        from app.services.inscripcion_service import crear_inscripcion
        self.torneo.estado = 'anulado'
        db.session.commit()
        with self.assertRaises(ValueError):
            crear_inscripcion({'id_torneo': self.t_id, 'id_equipo': 1, 'id_categoria': 1})

    def test_schema_torneo_update_estado_anulado(self):
        schema = TorneoUpdateSchema()
        # Valido anulado
        data_anulado = schema.load({'estado': 'anulado'})
        self.assertEqual(data_anulado['estado'], 'anulado')

        # Invalido
        with self.assertRaises(ValidationError):
            schema.load({'estado': 'inventado'})

    def test_anular_torneo_service(self):
        repositorio = RepositorioTorneos()
        torneos.anular(self.t_id, repositorio=repositorio, unidad=UnidadDeTrabajo())

        # Verificar DB
        t_db = db.session.get(Torneo, self.t_id)
        self.assertEqual(t_db.estado, 'anulado')

        # La vista pública no trae anulados
        with self.assertRaises(NoEncontrado):
            torneos.obtener(self.t_id, repositorio)

        # El repositorio (lo que usa la administración) sí
        self.assertEqual(repositorio.obtener(self.t_id).estado, 'anulado')

    def test_crud_categorias_service(self):
        cat_data = {
            "nombre_categoria": "Sub-20",
            "genero_categoria": "masculino",
            "edad_minima": 15,
            "edad_maxima": 20,
        }
        piezas = {'repositorio': RepositorioTorneos(), 'unidad': UnidadDeTrabajo()}
        # Agregar
        nueva_cat = torneos.agregar_categoria(self.t_id, cat_data, **piezas)
        self.assertIsNotNone(nueva_cat)
        self.assertEqual(nueva_cat.nombre_categoria, "Sub-20")
        c_id = nueva_cat.id_categoria

        # Buscar en DB
        cat_db = db.session.get(Categoria, c_id)
        self.assertEqual(cat_db.id_torneo, self.t_id)

        # Eliminar
        torneos.eliminar_categoria(c_id, **piezas)

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
