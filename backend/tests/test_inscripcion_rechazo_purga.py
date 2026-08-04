import unittest
import uuid
from datetime import date
from app import create_app, db
from app.models.usuario import Usuario
from app.models.inscripcion import Inscripcion
from app.models.equipo import Equipo
from app.models.torneo import Torneo
from app.models.categoria import Categoria
from app.models.jugador import Jugador
from app.models.plantilla import Plantilla
from app.services import inscripcion_service

class TestInscripcionRechazoPurga(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        db.session.rollback()
        self.app_context.pop()

    def test_rechazar_inscripcion_purga_jugador_exclusivo(self):
        user = Usuario.query.first()
        if not user:
            user = Usuario(
                id_usuario=f"user-{uuid.uuid4().hex[:8]}",
                nombre="Delegado Test Purga",
                correo=f"purga_{uuid.uuid4().hex[:6]}@test.com",
                rol="delegado"
            )
            db.session.add(user)
            db.session.flush()

        t = Torneo(nombre=f"Torneo Purga {uuid.uuid4().hex[:4]}", fecha_inicio=date.today(), fecha_fin=date.today(), estado="en_curso")
        db.session.add(t)
        db.session.flush()

        c = Categoria(nombre_categoria="Cat Purga", genero_categoria="masculino", edad_minima=15, edad_maxima=40, id_torneo=t.id_torneo)
        db.session.add(c)
        db.session.flush()

        eq = Equipo(nombre_equipo=f"Equipo Purga {uuid.uuid4().hex[:4]}", id_usuario=user.id_usuario)
        db.session.add(eq)
        db.session.flush()

        insc = Inscripcion(
            id_torneo=t.id_torneo,
            id_equipo=eq.id_equipo,
            id_categoria=c.id_categoria,
            estado_inscripcion='pendiente'
        )
        db.session.add(insc)
        db.session.flush()

        cedula_test = f"ci_{uuid.uuid4().hex[:10]}"
        jug = Jugador(
            nombre="Jugador Exclusivo Test",
            documento_identificacion=cedula_test,
            fecha_nacimiento=date(2000, 1, 1),
            estado="activo"
        )
        db.session.add(jug)
        db.session.flush()

        plant = Plantilla(
            id_jugador=jug.id_jugador,
            id_equipo=eq.id_equipo,
            id_torneo=t.id_torneo,
            numero_camiseta=10,
            estado='activo'
        )
        db.session.add(plant)
        db.session.commit()

        id_insc = insc.id_inscripcion
        id_eq = eq.id_equipo
        id_jug = jug.id_jugador

        # Rechazamos la inscripción
        resultado = inscripcion_service.cambiar_estado_inscripcion(id_insc, 'rechazado')

        self.assertEqual(resultado, 'DELETED')
        self.assertIsNone(db.session.get(Inscripcion, id_insc))
        self.assertIsNone(db.session.get(Equipo, id_eq))
        self.assertEqual(Plantilla.query.filter_by(id_equipo=id_eq).count(), 0)
        # El jugador exclusivo debe haberse eliminado para liberar la cédula
        self.assertIsNone(db.session.get(Jugador, id_jug))
        self.assertIsNone(Jugador.query.filter_by(documento_identificacion=cedula_test).first())

    def test_rechazar_inscripcion_preserva_jugador_compartido(self):
        user = Usuario.query.first()
        if not user:
            user = Usuario(
                id_usuario=f"user-{uuid.uuid4().hex[:8]}",
                nombre="Delegado Test Preserva",
                correo=f"preserva_{uuid.uuid4().hex[:6]}@test.com",
                rol="delegado"
            )
            db.session.add(user)
            db.session.flush()

        t = Torneo(nombre=f"Torneo Shared {uuid.uuid4().hex[:4]}", fecha_inicio=date.today(), fecha_fin=date.today(), estado="en_curso")
        db.session.add(t)
        db.session.flush()

        c1 = Categoria(nombre_categoria="Cat 1", genero_categoria="masculino", edad_minima=15, edad_maxima=40, id_torneo=t.id_torneo)
        c2 = Categoria(nombre_categoria="Cat 2", genero_categoria="masculino", edad_minima=15, edad_maxima=40, id_torneo=t.id_torneo)
        db.session.add_all([c1, c2])
        db.session.flush()

        # Equipo 1 Aprobado
        eq1 = Equipo(nombre_equipo=f"Equipo Aprobado {uuid.uuid4().hex[:4]}", id_usuario=user.id_usuario)
        db.session.add(eq1)
        db.session.flush()
        insc1 = Inscripcion(id_torneo=t.id_torneo, id_equipo=eq1.id_equipo, id_categoria=c1.id_categoria, estado_inscripcion='aprobado')
        db.session.add(insc1)
        db.session.flush()

        # Equipo 2 Pendiente (el que será rechazado)
        eq2 = Equipo(nombre_equipo=f"Equipo Rechazado {uuid.uuid4().hex[:4]}", id_usuario=user.id_usuario)
        db.session.add(eq2)
        db.session.flush()
        insc2 = Inscripcion(id_torneo=t.id_torneo, id_equipo=eq2.id_equipo, id_categoria=c2.id_categoria, estado_inscripcion='pendiente')
        db.session.add(insc2)
        db.session.flush()

        # Jugador compartido en ambos equipos
        cedula_shared = f"ci_sh_{uuid.uuid4().hex[:10]}"
        jug_shared = Jugador(
            nombre="Jugador Compartido Test",
            documento_identificacion=cedula_shared,
            fecha_nacimiento=date(2000, 1, 1),
            estado="activo"
        )
        db.session.add(jug_shared)
        db.session.flush()

        plant1 = Plantilla(id_jugador=jug_shared.id_jugador, id_equipo=eq1.id_equipo, id_torneo=t.id_torneo, numero_camiseta=7, estado='activo')
        plant2 = Plantilla(id_jugador=jug_shared.id_jugador, id_equipo=eq2.id_equipo, id_torneo=t.id_torneo, numero_camiseta=7, estado='activo')
        db.session.add_all([plant1, plant2])
        db.session.commit()

        id_jug = jug_shared.id_jugador
        id_insc2 = insc2.id_inscripcion

        # Rechazamos solo la inscripción 2
        resultado = inscripcion_service.cambiar_estado_inscripcion(id_insc2, 'rechazado')

        self.assertEqual(resultado, 'DELETED')
        # El jugador NO debe ser eliminado porque pertenece también al Equipo 1
        jug_db = db.session.get(Jugador, id_jug)
        self.assertNotNull = self.assertIsNotNone(jug_db)
        self.assertEqual(jug_db.documento_identificacion, cedula_shared)
        # La plantilla de eq1 sigue viva
        self.assertEqual(Plantilla.query.filter_by(id_equipo=eq1.id_equipo, id_jugador=id_jug).count(), 1)
