import unittest
import uuid
from datetime import date
from marshmallow import ValidationError
from app import create_app, db
from app.schemas.inscripcion_schema import InscripcionEstadoSchema
from app.models.usuario import Usuario
from app.models.inscripcion import Inscripcion
from app.models.equipo import Equipo
from app.models.torneo import Torneo
from app.models.categoria import Categoria
from app.models.jugador import Jugador
from app.models.plantilla import Plantilla
from app.services import plantilla_service

class TestInscripcionDraftAndRoster(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        db.session.rollback()
        self.app_context.pop()

    def test_inscripcion_estado_schema_borrador(self):
        schema = InscripcionEstadoSchema()
        data = schema.load({'estado_inscripcion': 'borrador'})
        self.assertEqual(data['estado_inscripcion'], 'borrador')

        data_pen = schema.load({'estado_inscripcion': 'pendiente'})
        self.assertEqual(data_pen['estado_inscripcion'], 'pendiente')

        with self.assertRaises(ValidationError):
            schema.load({'estado_inscripcion': 'invalido'})

    def test_crear_plantilla_permite_borrador_y_pendiente(self):
        # Obtener o crear un usuario válido
        user = Usuario.query.first()
        if not user:
            user = Usuario(
                id_usuario="test-uuid-delegado-draft",
                nombre="Delegado Draft",
                correo="delegadodraft@test.com",
                rol="delegado"
            )
            db.session.add(user)
            db.session.flush()

        t = Torneo(nombre="Torneo Unit Test", fecha_inicio=date.today(), fecha_fin=date.today(), estado="en_curso")
        db.session.add(t)
        db.session.flush()

        c = Categoria(nombre_categoria="Libre Test", genero_categoria="masculino", edad_minima=15, edad_maxima=50, id_torneo=t.id_torneo)
        db.session.add(c)
        db.session.flush()

        eq = Equipo(nombre_equipo="Test Draft FC", id_usuario=user.id_usuario)
        db.session.add(eq)
        db.session.flush()

        insc = Inscripcion(id_torneo=t.id_torneo, id_equipo=eq.id_equipo, id_categoria=c.id_categoria, estado_inscripcion="borrador")
        db.session.add(insc)
        db.session.flush()

        unique_doc = str(uuid.uuid4().int)[:10].zfill(10)
        j = Jugador(documento_identificacion=unique_doc, nombre="Jugador Draft Unit", fecha_nacimiento=date(2000, 1, 1), telefono="0999999999")
        db.session.add(j)
        db.session.flush()

        p = plantilla_service.crear_plantilla({
            'id_equipo': eq.id_equipo,
            'id_torneo': t.id_torneo,
            'id_jugador': j.id_jugador,
            'numero_camiseta': 7
        })

        self.assertIsNotNone(p)
        self.assertEqual(p.numero_camiseta, 7)

        # Rollback test data
        db.session.rollback()

    def test_listar_inscripciones_aislamiento_borrador(self):
        from app.services import inscripcion_service

        user = Usuario.query.first()
        if not user:
            user = Usuario(
                id_usuario="test-uuid-admin-draft",
                nombre="Admin Draft",
                correo="admindraft@test.com",
                rol="super_admin"
            )
            db.session.add(user)
            db.session.flush()

        t = Torneo(nombre="Torneo Filter Test", fecha_inicio=date.today(), fecha_fin=date.today(), estado="en_curso")
        db.session.add(t)
        db.session.flush()

        c = Categoria(nombre_categoria="Libre Filter", genero_categoria="masculino", edad_minima=15, edad_maxima=50, id_torneo=t.id_torneo)
        db.session.add(c)
        db.session.flush()

        eq1 = Equipo(nombre_equipo="Equipo Borrador", id_usuario=user.id_usuario)
        eq2 = Equipo(nombre_equipo="Equipo Pendiente", id_usuario=user.id_usuario)
        db.session.add_all([eq1, eq2])
        db.session.flush()

        insc_borrador = Inscripcion(id_torneo=t.id_torneo, id_equipo=eq1.id_equipo, id_categoria=c.id_categoria, estado_inscripcion="borrador")
        insc_pendiente = Inscripcion(id_torneo=t.id_torneo, id_equipo=eq2.id_equipo, id_categoria=c.id_categoria, estado_inscripcion="pendiente")
        db.session.add_all([insc_borrador, insc_pendiente])
        db.session.flush()

        # Query sin incluir borradores (por defecto para admin/auditoría)
        query_admin = inscripcion_service.listar_inscripciones(id_torneo=t.id_torneo, incluir_borradores=False)
        resultados_admin = query_admin.all()
        ids_admin = [i.id_inscripcion for i in resultados_admin]
        self.assertIn(insc_pendiente.id_inscripcion, ids_admin)
        self.assertNotIn(insc_borrador.id_inscripcion, ids_admin)

        # Query incluyendo borradores (para delegado)
        query_delegado = inscripcion_service.listar_inscripciones(id_torneo=t.id_torneo, incluir_borradores=True)
        resultados_delegado = query_delegado.all()
        ids_delegado = [i.id_inscripcion for i in resultados_delegado]
        self.assertIn(insc_borrador.id_inscripcion, ids_delegado)
        self.assertIn(insc_pendiente.id_inscripcion, ids_delegado)

        db.session.rollback()

