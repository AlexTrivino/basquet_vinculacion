"""
Script de Seed para BaloncestoManta.
Genera usuarios, torneos (con 2 categorías cada uno), equipos con logos, comprobantes de pago,
jugadores reglamentarios (>=10 por plantilla con fotos y documentos), plantillas, partidos y sanciones
de forma determinística e idempotente.
"""
import uuid
import sys
from datetime import datetime, timedelta
from app import create_app, db
from sqlalchemy import text

from app.models.usuario import Usuario
from app.models.torneo import Torneo
from app.models.categoria import Categoria
from app.models.equipo import Equipo
from app.models.inscripcion import Inscripcion
from app.models.jugador import Jugador
from app.models.plantilla import Plantilla
from app.models.partido import Partido
from app.models.estadistica import Estadistica
from app.models.sancion import Sancion

# IDs fijos para los usuarios
ADMIN_ID = "659ec13b-2d07-4b57-8841-35acd54d1017"
DEL1_ID = "d1a25d4e-7a7a-4e0c-9200-6a82df459078"
DEL2_ID = "e99de3aa-8902-4189-a0de-8615748c594e"
DEL3_ID = "47aae445-9c91-4006-ba9a-e75e7f10ebc5"
DEL4_ID = "b07591e5-40e9-4796-85d4-49a7632f10db"

# URLs de fotos de perfil de demostración para jugadores
FOTOS_JUGADORES_DEMO = [
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1528892952291-009c663ce843?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80"
]

DOC_PDF_DEMO = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
DOC_IMG_DEMO = "https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4?auto=format&fit=crop&w=800&q=80"


def seed_usuarios():
    print("Iniciando Seed de Usuarios...")
    usuarios_data = [
        {"id": ADMIN_ID, "nombre": "Super Admin", "correo": "admin@test.com", "rol": "super_admin"},
        {"id": DEL1_ID, "nombre": "Delegado 1 (Carlos)", "correo": "delegado1@test.com", "rol": "delegado"},
        {"id": DEL2_ID, "nombre": "Delegado 2 (Marcos)", "correo": "delegado2@test.com", "rol": "delegado"},
        {"id": DEL3_ID, "nombre": "Delegado 3 (Esteban)", "correo": "delegado3@test.com", "rol": "delegado"},
        {"id": DEL4_ID, "nombre": "Delegado 4 (Roberto)", "correo": "delegado4@test.com", "rol": "delegado"}
    ]
    
    for u in usuarios_data:
        # Insertar en auth.users (Supabase)
        query_auth = text("""
            INSERT INTO auth.users (
                id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
                raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                confirmation_token, recovery_token, email_change_token_new, email_change,
                is_super_admin, is_sso_user, phone
            ) VALUES (
                :id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', :correo, 
                crypt('sadmin', gen_salt('bf')), now(), 
                '{"provider":"email","providers":["email"]}', :meta_data, now(), now(),
                '', '', '', '',
                false, false, NULL
            ) ON CONFLICT (id) DO NOTHING;
        """)
        try:
            db.session.execute(query_auth, {
                "id": u["id"], 
                "correo": u["correo"],
                "meta_data": f'{{"rol":"{u["rol"]}"}}'
            })

            query_identity = text("""
                INSERT INTO auth.identities (
                    id, user_id, identity_data, provider, provider_id, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), :id, CAST(:identity_data AS jsonb), 'email', :id, now(), now()
                ) ON CONFLICT DO NOTHING;
            """)
            db.session.execute(query_identity, {
                "id": u["id"], 
                "identity_data": f'{{"sub":"{u["id"]}","email":"{u["correo"]}"}}'
            })
        except Exception:
            pass
        
        # Insertar o Actualizar en public.usuarios
        query_public = text("""
            INSERT INTO usuarios (id_usuario, nombre, correo, rol, estado, created_at, updated_at)
            VALUES (:id, :nombre, :correo, :rol, 'activo', now(), now())
            ON CONFLICT (id_usuario) DO UPDATE 
            SET nombre = EXCLUDED.nombre, rol = EXCLUDED.rol, updated_at = now();
        """)
        db.session.execute(query_public, {
            "id": u["id"], 
            "nombre": u["nombre"],
            "correo": u["correo"],
            "rol": u["rol"]
        })
        
    db.session.commit()
    print("5 usuarios creados con contraseña 'sadmin'.")


def seed_tablas():
    print("Iniciando Seed de Tablas (Torneos, Múltiples Categorías, Equipos Multi-Inscripción, Jugadores Multi-Roster, Partidos y Estadísticas)...", flush=True)
    
    # 0. Limpieza previa de tablas en orden de dependencias para asegurar idempotencia
    print("- Limpiando datos antiguos...", flush=True)
    try:
        db.session.execute(text("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE pid <> pg_backend_pid()
              AND datname = current_database()
              AND state = 'idle in transaction';
        """))
        db.session.commit()
    except Exception:
        db.session.rollback()

    db.session.execute(text("DELETE FROM estadisticas;"))
    db.session.execute(text("DELETE FROM sanciones;"))
    db.session.execute(text("DELETE FROM partidos;"))
    db.session.execute(text("DELETE FROM plantillas;"))
    db.session.execute(text("DELETE FROM inscripciones;"))
    db.session.execute(text("DELETE FROM equipos;"))
    db.session.execute(text("DELETE FROM documentos_jugadores;"))
    db.session.execute(text("DELETE FROM jugadores;"))
    db.session.execute(text("DELETE FROM categorias;"))
    db.session.execute(text("DELETE FROM torneos;"))
    db.session.commit()
    
    # 1. Asegurarse de que los usuarios delegados existen
    del1 = Usuario.query.filter_by(correo="delegado1@test.com").first()
    del2 = Usuario.query.filter_by(correo="delegado2@test.com").first()
    del3 = Usuario.query.filter_by(correo="delegado3@test.com").first()
    del4 = Usuario.query.filter_by(correo="delegado4@test.com").first()
    
    if not del1 or not del2 or not del3:
        print("Error: No se encontraron los usuarios delegados en la BD. Ejecuta la Opción 1 primero.", flush=True)
        return

    # 2. Torneos y Múltiples Categorías (4 Años: 2026, 2024, 2023, 2022)
    fecha_actual = datetime.now().date()
    torneo1 = Torneo(
        nombre="Copa Verano Manta 2026",
        estado="en_curso",
        fecha_inicio=datetime(2026, 6, 15).date(),
        fecha_fin=datetime(2026, 8, 30).date()
    )
    torneo2 = Torneo(
        nombre="Liga Provincial Manabí 2024",
        estado="finalizado",
        fecha_inicio=datetime(2024, 5, 10).date(),
        fecha_fin=datetime(2024, 9, 15).date()
    )
    torneo3 = Torneo(
        nombre="Torneo Interclubes Costa 2023",
        estado="finalizado",
        fecha_inicio=datetime(2023, 7, 1).date(),
        fecha_fin=datetime(2023, 10, 20).date()
    )
    torneo4 = Torneo(
        nombre="Copa Ciudad de Manta 2022",
        estado="finalizado",
        fecha_inicio=datetime(2022, 8, 15).date(),
        fecha_fin=datetime(2022, 11, 30).date()
    )
    db.session.add_all([torneo1, torneo2, torneo3, torneo4])
    db.session.flush()
    
    # Categorías Torneo 1 (2026)
    cat_t1_libre = Categoria(
        nombre_categoria="Senior Libre",
        genero_categoria="masculino",
        edad_minima=18,
        edad_maxima=35,
        id_torneo=torneo1.id_torneo
    )
    cat_t1_maxi = Categoria(
        nombre_categoria="Maxibasquet +35",
        genero_categoria="masculino",
        edad_minima=35,
        id_torneo=torneo1.id_torneo
    )
    cat_t1_fem = Categoria(
        nombre_categoria="Femenino Abierto",
        genero_categoria="femenino",
        edad_minima=16,
        id_torneo=torneo1.id_torneo
    )
    
    # Categorías Torneo 2 (2024)
    cat_t2_libre = Categoria(
        nombre_categoria="Senior Libre",
        genero_categoria="masculino",
        edad_minima=18,
        id_torneo=torneo2.id_torneo
    )
    cat_t2_sub21 = Categoria(
        nombre_categoria="Sub-21 Promesas",
        genero_categoria="masculino",
        edad_minima=15,
        edad_maxima=21,
        id_torneo=torneo2.id_torneo
    )
    cat_t2_maxi = Categoria(
        nombre_categoria="Maxibasquet +35",
        genero_categoria="masculino",
        edad_minima=35,
        id_torneo=torneo2.id_torneo
    )

    # Categorías Torneo 3 (2023)
    cat_t3_libre = Categoria(
        nombre_categoria="Senior Libre",
        genero_categoria="masculino",
        edad_minima=18,
        id_torneo=torneo3.id_torneo
    )
    cat_t3_maxi = Categoria(
        nombre_categoria="Maxibasquet +40",
        genero_categoria="masculino",
        edad_minima=40,
        id_torneo=torneo3.id_torneo
    )

    # Categorías Torneo 4 (2022)
    cat_t4_libre = Categoria(
        nombre_categoria="Senior Libre",
        genero_categoria="masculino",
        edad_minima=18,
        id_torneo=torneo4.id_torneo
    )
    cat_t4_maxi = Categoria(
        nombre_categoria="Maxibasquet +35",
        genero_categoria="masculino",
        edad_minima=35,
        id_torneo=torneo4.id_torneo
    )
    
    db.session.add_all([
        cat_t1_libre, cat_t1_maxi, cat_t1_fem,
        cat_t2_libre, cat_t2_sub21, cat_t2_maxi,
        cat_t3_libre, cat_t3_maxi,
        cat_t4_libre, cat_t4_maxi
    ])
    db.session.commit()
    print(f"- 4 Torneos creados (2026, 2024, 2023, 2022) con sus Categorías (Total: 10 categorías).", flush=True)

    # 3. Equipos Base
    equipos_raw = [
        ("Delfines BC", del1.id_usuario, "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=200&q=80"),
        ("Tiburones de Manta", del1.id_usuario, "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=200&q=80"),
        ("Manta Bulls", del1.id_usuario, "https://images.unsplash.com/photo-1519766304817-4f37bda74a29?auto=format&fit=crop&w=200&q=80"),
        ("Portoviejo Stars", del2.id_usuario, "https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&w=200&q=80"),
        ("Halcones del Mar", del2.id_usuario, "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=200&q=80"),
        ("Chone Heat", del2.id_usuario, "https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=200&q=80"),
        ("Jipijapa Lakers", del3.id_usuario, "https://images.unsplash.com/photo-1577471488278-16eec37ffcc2?auto=format&fit=crop&w=200&q=80"),
        ("Montecristi Warriors", del3.id_usuario, "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=200&q=80"),
        ("Bahía Celtics", del4.id_usuario, "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=200&q=80"),
    ]

    equipos_map = {}
    for nombre, id_us, url_logo in equipos_raw:
        eq = Equipo(
            nombre_equipo=nombre,
            id_usuario=id_us,
            url_logo=url_logo,
            estado="activo"
        )
        db.session.add(eq)
        db.session.flush()
        equipos_map[nombre] = eq

    # Inscripciones Multi-Torneo y Multi-Categoría para los Equipos
    inscripciones_config = [
        # (Equipo, Torneo, Categoría, Estado, Comprobante)
        # ── Torneo 1 (2026) ──
        ("Delfines BC", torneo1, cat_t1_libre, "aprobado", "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80"),
        ("Delfines BC", torneo1, cat_t1_maxi, "aprobado", "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80"),
        ("Tiburones de Manta", torneo1, cat_t1_libre, "aprobado", "https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4?auto=format&fit=crop&w=800&q=80"),
        ("Manta Bulls", torneo1, cat_t1_maxi, "aprobado", DOC_PDF_DEMO),
        ("Portoviejo Stars", torneo1, cat_t1_libre, "aprobado", DOC_PDF_DEMO),
        ("Chone Heat", torneo1, cat_t1_libre, "aprobado", "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80"),
        ("Jipijapa Lakers", torneo1, cat_t1_libre, "aprobado", "https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4?auto=format&fit=crop&w=800&q=80"),
        ("Halcones del Mar", torneo1, cat_t1_libre, "borrador", None),

        # ── Torneo 2 (2024) ──
        ("Delfines BC", torneo2, cat_t2_libre, "aprobado", "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80"),
        ("Tiburones de Manta", torneo2, cat_t2_libre, "aprobado", "https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4?auto=format&fit=crop&w=800&q=80"),
        ("Tiburones de Manta", torneo2, cat_t2_sub21, "aprobado", DOC_PDF_DEMO),
        ("Manta Bulls", torneo2, cat_t2_maxi, "aprobado", DOC_PDF_DEMO),
        ("Portoviejo Stars", torneo2, cat_t2_libre, "aprobado", DOC_PDF_DEMO),
        ("Portoviejo Stars", torneo2, cat_t2_sub21, "aprobado", DOC_PDF_DEMO),
        ("Chone Heat", torneo2, cat_t2_libre, "aprobado", "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80"),
        ("Jipijapa Lakers", torneo2, cat_t2_libre, "aprobado", "https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4?auto=format&fit=crop&w=800&q=80"),
        ("Montecristi Warriors", torneo2, cat_t2_maxi, "aprobado", DOC_PDF_DEMO),
        ("Bahía Celtics", torneo2, cat_t2_libre, "aprobado", DOC_PDF_DEMO),

        # ── Torneo 3 (2023) ──
        ("Delfines BC", torneo3, cat_t3_libre, "aprobado", DOC_PDF_DEMO),
        ("Tiburones de Manta", torneo3, cat_t3_libre, "aprobado", DOC_PDF_DEMO),
        ("Manta Bulls", torneo3, cat_t3_maxi, "aprobado", DOC_PDF_DEMO),
        ("Portoviejo Stars", torneo3, cat_t3_libre, "aprobado", DOC_PDF_DEMO),
        ("Chone Heat", torneo3, cat_t3_libre, "aprobado", DOC_PDF_DEMO),
        ("Jipijapa Lakers", torneo3, cat_t3_libre, "aprobado", DOC_PDF_DEMO),

        # ── Torneo 4 (2022) ──
        ("Delfines BC", torneo4, cat_t4_libre, "aprobado", DOC_PDF_DEMO),
        ("Tiburones de Manta", torneo4, cat_t4_libre, "aprobado", DOC_PDF_DEMO),
        ("Manta Bulls", torneo4, cat_t4_maxi, "aprobado", DOC_PDF_DEMO),
        ("Portoviejo Stars", torneo4, cat_t4_libre, "aprobado", DOC_PDF_DEMO),
        ("Chone Heat", torneo4, cat_t4_libre, "aprobado", DOC_PDF_DEMO),
        ("Jipijapa Lakers", torneo4, cat_t4_libre, "aprobado", DOC_PDF_DEMO),
    ]


    for eq_nom, tor, cat, est, comp in inscripciones_config:
        eq_obj = equipos_map[eq_nom]
        ins = Inscripcion(
            id_equipo=eq_obj.id_equipo,
            id_torneo=tor.id_torneo,
            id_categoria=cat.id_categoria,
            estado_inscripcion=est,
            url_comprobante_pago=comp
        )
        db.session.add(ins)

    db.session.commit()
    print(f"- 9 Equipos registrados con 24 inscripciones distribuidas en 4 torneos y categorías.", flush=True)

    # 4. Creación de Jugadores Reglamentarios y Jugadores Multi-Equipo / Multi-Categoría
    nombres_base = [
        "Michael", "Carlos", "Luis", "Pedro", "Javier", "Andres", "Miguel", "Jose",
        "Diego", "Mateo", "Gabriel", "Fernando", "Alejandro", "Daniel", "Lucas", "Christian",
        "Esteban", "Ricardo", "Gonzalo", "Mauricio", "Sebastian", "Patricio", "Hernan"
    ]
    apellidos_base = [
        "Jordan", "Gomez", "Lopez", "Garcia", "Martinez", "Rodriguez", "Sanchez",
        "Ramirez", "Torres", "Flores", "Cedeño", "Alvarado", "Zambrano", "Mendoza",
        "Intriago", "Paredes", "Delgado", "Castro", "Vera", "Moreira", "Macias"
    ]
    
    # 🌟 A. EL "SUPER JUGADOR" (Participa en plantillas a través de los 4 torneos y varios equipos)
    super_jugador = Jugador(
        nombre="Alexander Triviño",
        documento_identificacion="1312345678",
        fecha_nacimiento=datetime(1996, 4, 15).date(),
        genero="masculino",
        url_foto="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
        url_cedula=DOC_PDF_DEMO,
        url_acta_bachiller=DOC_PDF_DEMO,
        telefono="0998877665",
        correo="alex.trivino@test.com",
        estado="activo"
    )
    
    # 🌟 B. Jugador Veterano Multi-Categoría (Libre + Maxi +35)
    veterano_estrella = Jugador(
        nombre="Carlos 'El Fenomeno' Mendoza",
        documento_identificacion="1309876543",
        fecha_nacimiento=datetime(1987, 8, 20).date(),
        genero="masculino",
        url_foto="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        url_cedula=DOC_IMG_DEMO,
        url_acta_bachiller=None,
        telefono="0991122334",
        correo="carlos.mendoza@test.com",
        estado="activo"
    )

    # 🌟 C. Promesa Juvenil Multi-Equipo (Sub-21 + Senior Libre)
    promesa_estrella = Jugador(
        nombre="Mateo Delgado",
        documento_identificacion="1305544332",
        fecha_nacimiento=datetime(2005, 11, 10).date(),
        genero="masculino",
        url_foto="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
        url_cedula=DOC_PDF_DEMO,
        url_acta_bachiller=DOC_PDF_DEMO,
        telefono="0994433221",
        correo="mateo.delgado@test.com",
        estado="activo"
    )

    db.session.add_all([super_jugador, veterano_estrella, promesa_estrella])
    db.session.flush()

    # Asignaciones del Super Jugador a nóminas diferentes en los 4 torneos:
    plantillas_super_jugador = [
        Plantilla(id_jugador=super_jugador.id_jugador, id_equipo=equipos_map["Delfines BC"].id_equipo, id_torneo=torneo1.id_torneo, numero_camiseta=10, estado="activo"),
        Plantilla(id_jugador=super_jugador.id_jugador, id_equipo=equipos_map["Delfines BC"].id_equipo, id_torneo=torneo2.id_torneo, numero_camiseta=23, estado="activo"),
        Plantilla(id_jugador=super_jugador.id_jugador, id_equipo=equipos_map["Tiburones de Manta"].id_equipo, id_torneo=torneo2.id_torneo, numero_camiseta=77, estado="activo"),
        Plantilla(id_jugador=super_jugador.id_jugador, id_equipo=equipos_map["Portoviejo Stars"].id_equipo, id_torneo=torneo3.id_torneo, numero_camiseta=30, estado="activo"),
        Plantilla(id_jugador=super_jugador.id_jugador, id_equipo=equipos_map["Chone Heat"].id_equipo, id_torneo=torneo3.id_torneo, numero_camiseta=99, estado="activo"),
        Plantilla(id_jugador=super_jugador.id_jugador, id_equipo=equipos_map["Delfines BC"].id_equipo, id_torneo=torneo4.id_torneo, numero_camiseta=10, estado="activo"),
    ]
    db.session.add_all(plantillas_super_jugador)

    # Asignaciones de Veterano y Promesa:
    db.session.add_all([
        Plantilla(id_jugador=veterano_estrella.id_jugador, id_equipo=equipos_map["Manta Bulls"].id_equipo, id_torneo=torneo1.id_torneo, numero_camiseta=33, estado="activo"),
        Plantilla(id_jugador=veterano_estrella.id_jugador, id_equipo=equipos_map["Manta Bulls"].id_equipo, id_torneo=torneo2.id_torneo, numero_camiseta=33, estado="activo"),
        Plantilla(id_jugador=veterano_estrella.id_jugador, id_equipo=equipos_map["Montecristi Warriors"].id_equipo, id_torneo=torneo2.id_torneo, numero_camiseta=15, estado="activo"),
        Plantilla(id_jugador=veterano_estrella.id_jugador, id_equipo=equipos_map["Manta Bulls"].id_equipo, id_torneo=torneo3.id_torneo, numero_camiseta=33, estado="activo"),
        Plantilla(id_jugador=veterano_estrella.id_jugador, id_equipo=equipos_map["Manta Bulls"].id_equipo, id_torneo=torneo4.id_torneo, numero_camiseta=33, estado="activo"),
        
        Plantilla(id_jugador=promesa_estrella.id_jugador, id_equipo=equipos_map["Tiburones de Manta"].id_equipo, id_torneo=torneo2.id_torneo, numero_camiseta=3, estado="activo"),
        Plantilla(id_jugador=promesa_estrella.id_jugador, id_equipo=equipos_map["Portoviejo Stars"].id_equipo, id_torneo=torneo1.id_torneo, numero_camiseta=8, estado="activo"),
    ])

    # Generar el resto de jugadores reglamentarios para completar rosters (>=10 jugadores por equipo)
    jugador_idx = 10
    todos_jugadores = [super_jugador, veterano_estrella, promesa_estrella]
    
    # Generar jugadores reglamentarios para completar rosters
    dorsales_pool = [0, 1, 2, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 16, 20, 21, 22, 24, 25, 32, 34, 44, 91]
    
    nuevos_jugadores = []
    jugadores_plan_mapping = []

    for nom_eq, eq_obj in equipos_map.items():
        # Para cada equipo, asociarlo a torneos inscritos
        torneos_del_equipo = [t for _, t, _, est, _ in inscripciones_config if _ == nom_eq and est == "aprobado"]
        if not torneos_del_equipo:
            torneos_del_equipo = [torneo1]

        for tor_target in set(torneos_del_equipo):
            for i in range(1, 11):
                nom = nombres_base[(jugador_idx) % len(nombres_base)]
                ape = apellidos_base[(jugador_idx // len(nombres_base)) % len(apellidos_base)]
                url_foto = FOTOS_JUGADORES_DEMO[jugador_idx % len(FOTOS_JUGADORES_DEMO)]
                dorsal = dorsales_pool[i % len(dorsales_pool)]

                jug = Jugador(
                    nombre=f"{nom} {ape}",
                    documento_identificacion=f"130{jugador_idx:07d}",
                    fecha_nacimiento=datetime(1998, 1, 1).date() - timedelta(days=(i * 120)),
                    genero="masculino",
                    url_foto=url_foto,
                    url_cedula=DOC_PDF_DEMO if i % 2 == 0 else DOC_IMG_DEMO,
                    url_acta_bachiller=DOC_PDF_DEMO if i % 3 == 0 else None,
                    telefono=f"099{jugador_idx:07d}",
                    correo=f"jugador{jugador_idx}@test.com",
                    estado="activo"
                )
                nuevos_jugadores.append(jug)
                jugadores_plan_mapping.append((jug, eq_obj.id_equipo, tor_target.id_torneo, dorsal))
                todos_jugadores.append(jug)
                jugador_idx += 1

    # Insertar en lotes eficientes
    db.session.add_all(nuevos_jugadores)
    db.session.flush()

    nuevas_plantillas = []
    for jug, eq_id, tor_id, dorsal in jugadores_plan_mapping:
        plan = Plantilla(
            id_jugador=jug.id_jugador,
            id_equipo=eq_id,
            id_torneo=tor_id,
            numero_camiseta=dorsal,
            estado="activo"
        )
        nuevas_plantillas.append(plan)

    db.session.add_all(nuevas_plantillas)
    db.session.commit()
    print(f"- {len(todos_jugadores)} Jugadores registrados con rosters reglamentarios completos.", flush=True)
    print(f"  * Super Jugador '{super_jugador.nombre}' inscrito en 6 nóminas a través de 4 torneos.", flush=True)
    print(f"  * Veterano Estrella '{veterano_estrella.nombre}' inscrito en 5 nóminas multi-categoría.", flush=True)

    # 5. Partidos de Demostración en Múltiples Torneos y Fechas
    partidos_a_crear = []
    
    # ── Torneo 1: Copa Verano Manta 2026 (En Curso) ──────────────────────────
    # Senior Libre: Jornada 1
    p1_t1 = Partido(
        id_torneo=torneo1.id_torneo,
        id_categoria=cat_t1_libre.id_categoria,
        id_equipo_local=equipos_map["Delfines BC"].id_equipo,
        id_equipo_visitante=equipos_map["Portoviejo Stars"].id_equipo,
        fecha=fecha_actual - timedelta(days=8),
        hora=datetime.strptime('18:00', '%H:%M').time(),
        estado="finalizado",
        fase="Jornada 1",
        marcador_local=88,
        marcador_visitante=82,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )
    p2_t1 = Partido(
        id_torneo=torneo1.id_torneo,
        id_categoria=cat_t1_libre.id_categoria,
        id_equipo_local=equipos_map["Tiburones de Manta"].id_equipo,
        id_equipo_visitante=equipos_map["Chone Heat"].id_equipo,
        fecha=fecha_actual - timedelta(days=8),
        hora=datetime.strptime('20:00', '%H:%M').time(),
        estado="finalizado",
        fase="Jornada 1",
        marcador_local=79,
        marcador_visitante=74,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )

    # Senior Libre: Jornada 2
    p3_t1 = Partido(
        id_torneo=torneo1.id_torneo,
        id_categoria=cat_t1_libre.id_categoria,
        id_equipo_local=equipos_map["Delfines BC"].id_equipo,
        id_equipo_visitante=equipos_map["Tiburones de Manta"].id_equipo,
        fecha=fecha_actual - timedelta(days=3),
        hora=datetime.strptime('18:30', '%H:%M').time(),
        estado="finalizado",
        fase="Jornada 2",
        marcador_local=94,
        marcador_visitante=91,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )
    p4_t1 = Partido(
        id_torneo=torneo1.id_torneo,
        id_categoria=cat_t1_libre.id_categoria,
        id_equipo_local=equipos_map["Portoviejo Stars"].id_equipo,
        id_equipo_visitante=equipos_map["Chone Heat"].id_equipo,
        fecha=fecha_actual - timedelta(days=2),
        hora=datetime.strptime('20:15', '%H:%M').time(),
        estado="finalizado",
        fase="Jornada 2",
        marcador_local=85,
        marcador_visitante=80,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )

    # Senior Libre: Jornada 3 (Próximos)
    p5_t1 = Partido(
        id_torneo=torneo1.id_torneo,
        id_categoria=cat_t1_libre.id_categoria,
        id_equipo_local=equipos_map["Delfines BC"].id_equipo,
        id_equipo_visitante=equipos_map["Chone Heat"].id_equipo,
        fecha=fecha_actual + timedelta(days=2),
        hora=datetime.strptime('19:00', '%H:%M').time(),
        estado="programado",
        fase="Jornada 3",
        marcador_local=0,
        marcador_visitante=0,
        stats_local_procesadas=False,
        stats_visitante_procesadas=False
    )
    p6_t1 = Partido(
        id_torneo=torneo1.id_torneo,
        id_categoria=cat_t1_libre.id_categoria,
        id_equipo_local=equipos_map["Portoviejo Stars"].id_equipo,
        id_equipo_visitante=equipos_map["Tiburones de Manta"].id_equipo,
        fecha=fecha_actual + timedelta(days=4),
        hora=datetime.strptime('20:30', '%H:%M').time(),
        estado="programado",
        fase="Jornada 3",
        marcador_local=0,
        marcador_visitante=0,
        stats_local_procesadas=False,
        stats_visitante_procesadas=False
    )

    # Maxi +35: Torneo 1
    p7_t1 = Partido(
        id_torneo=torneo1.id_torneo,
        id_categoria=cat_t1_maxi.id_categoria,
        id_equipo_local=equipos_map["Delfines BC"].id_equipo,
        id_equipo_visitante=equipos_map["Manta Bulls"].id_equipo,
        fecha=fecha_actual - timedelta(days=5),
        hora=datetime.strptime('19:30', '%H:%M').time(),
        estado="finalizado",
        fase="Fase Regular",
        marcador_local=74,
        marcador_visitante=79,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )
    p8_t1 = Partido(
        id_torneo=torneo1.id_torneo,
        id_categoria=cat_t1_maxi.id_categoria,
        id_equipo_local=equipos_map["Manta Bulls"].id_equipo,
        id_equipo_visitante=equipos_map["Montecristi Warriors"].id_equipo,
        fecha=fecha_actual - timedelta(days=1),
        hora=datetime.strptime('18:00', '%H:%M').time(),
        estado="finalizado",
        fase="Fase Regular",
        marcador_local=83,
        marcador_visitante=71,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )

    # ── Torneo 2: Liga Provincial Manabí 2024 (Finalizado Completo) ──────────
    p1_t2 = Partido(
        id_torneo=torneo2.id_torneo,
        id_categoria=cat_t2_libre.id_categoria,
        id_equipo_local=equipos_map["Chone Heat"].id_equipo,
        id_equipo_visitante=equipos_map["Jipijapa Lakers"].id_equipo,
        fecha=datetime(2024, 8, 20).date(),
        hora=datetime.strptime('18:00', '%H:%M').time(),
        estado="finalizado",
        fase="Cuartos de Final",
        marcador_local=92,
        marcador_visitante=86,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )
    p2_t2 = Partido(
        id_torneo=torneo2.id_torneo,
        id_categoria=cat_t2_libre.id_categoria,
        id_equipo_local=equipos_map["Delfines BC"].id_equipo,
        id_equipo_visitante=equipos_map["Bahía Celtics"].id_equipo,
        fecha=datetime(2024, 8, 22).date(),
        hora=datetime.strptime('20:00', '%H:%M').time(),
        estado="finalizado",
        fase="Cuartos de Final",
        marcador_local=101,
        marcador_visitante=88,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )
    p3_t2 = Partido(
        id_torneo=torneo2.id_torneo,
        id_categoria=cat_t2_libre.id_categoria,
        id_equipo_local=equipos_map["Delfines BC"].id_equipo,
        id_equipo_visitante=equipos_map["Tiburones de Manta"].id_equipo,
        fecha=datetime(2024, 8, 28).date(),
        hora=datetime.strptime('20:00', '%H:%M').time(),
        estado="finalizado",
        fase="Semifinal",
        marcador_local=97,
        marcador_visitante=103,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )
    p4_t2 = Partido(
        id_torneo=torneo2.id_torneo,
        id_categoria=cat_t2_libre.id_categoria,
        id_equipo_local=equipos_map["Tiburones de Manta"].id_equipo,
        id_equipo_visitante=equipos_map["Chone Heat"].id_equipo,
        fecha=datetime(2024, 9, 5).date(),
        hora=datetime.strptime('20:00', '%H:%M').time(),
        estado="finalizado",
        fase="Gran Final",
        marcador_local=105,
        marcador_visitante=99,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )

    # Sub-21 Promesas Torneo 2 (2024)
    p5_t2 = Partido(
        id_torneo=torneo2.id_torneo,
        id_categoria=cat_t2_sub21.id_categoria,
        id_equipo_local=equipos_map["Tiburones de Manta"].id_equipo,
        id_equipo_visitante=equipos_map["Portoviejo Stars"].id_equipo,
        fecha=datetime(2024, 8, 15).date(),
        hora=datetime.strptime('17:00', '%H:%M').time(),
        estado="finalizado",
        fase="Fase Regular",
        marcador_local=68,
        marcador_visitante=64,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )

    # ── Torneo 3: Torneo Interclubes Costa 2023 (Finalizado Completo) ────────
    p1_t3 = Partido(
        id_torneo=torneo3.id_torneo,
        id_categoria=cat_t3_libre.id_categoria,
        id_equipo_local=equipos_map["Portoviejo Stars"].id_equipo,
        id_equipo_visitante=equipos_map["Chone Heat"].id_equipo,
        fecha=datetime(2023, 9, 25).date(),
        hora=datetime.strptime('18:00', '%H:%M').time(),
        estado="finalizado",
        fase="Semifinal 1",
        marcador_local=95,
        marcador_visitante=91,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )
    p2_t3 = Partido(
        id_torneo=torneo3.id_torneo,
        id_categoria=cat_t3_libre.id_categoria,
        id_equipo_local=equipos_map["Delfines BC"].id_equipo,
        id_equipo_visitante=equipos_map["Jipijapa Lakers"].id_equipo,
        fecha=datetime(2023, 9, 25).date(),
        hora=datetime.strptime('20:00', '%H:%M').time(),
        estado="finalizado",
        fase="Semifinal 2",
        marcador_local=89,
        marcador_visitante=82,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )
    p3_t3 = Partido(
        id_torneo=torneo3.id_torneo,
        id_categoria=cat_t3_libre.id_categoria,
        id_equipo_local=equipos_map["Portoviejo Stars"].id_equipo,
        id_equipo_visitante=equipos_map["Delfines BC"].id_equipo,
        fecha=datetime(2023, 10, 5).date(),
        hora=datetime.strptime('19:30', '%H:%M').time(),
        estado="finalizado",
        fase="Gran Final",
        marcador_local=104,
        marcador_visitante=98,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )

    p4_t3 = Partido(
        id_torneo=torneo3.id_torneo,
        id_categoria=cat_t3_libre.id_categoria,
        id_equipo_local=equipos_map["Tiburones de Manta"].id_equipo,
        id_equipo_visitante=equipos_map["Chone Heat"].id_equipo,
        fecha=datetime(2023, 9, 20).date(),
        hora=datetime.strptime('18:00', '%H:%M').time(),
        estado="finalizado",
        fase="Cuartos de Final",
        marcador_local=88,
        marcador_visitante=84,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )

    # ── Torneo 4: Copa Ciudad de Manta 2022 (Finalizado Completo) ───────────
    p1_t4 = Partido(
        id_torneo=torneo4.id_torneo,
        id_categoria=cat_t4_libre.id_categoria,
        id_equipo_local=equipos_map["Tiburones de Manta"].id_equipo,
        id_equipo_visitante=equipos_map["Manta Bulls"].id_equipo,
        fecha=datetime(2022, 10, 15).date(),
        hora=datetime.strptime('18:00', '%H:%M').time(),
        estado="finalizado",
        fase="Semifinal",
        marcador_local=85,
        marcador_visitante=80,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )
    p2_t4 = Partido(
        id_torneo=torneo4.id_torneo,
        id_categoria=cat_t4_libre.id_categoria,
        id_equipo_local=equipos_map["Portoviejo Stars"].id_equipo,
        id_equipo_visitante=equipos_map["Delfines BC"].id_equipo,
        fecha=datetime(2022, 11, 20).date(),
        hora=datetime.strptime('19:30', '%H:%M').time(),
        estado="finalizado",
        fase="Gran Final",
        marcador_local=98,
        marcador_visitante=95,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )
    p3_t4 = Partido(
        id_torneo=torneo4.id_torneo,
        id_categoria=cat_t4_libre.id_categoria,
        id_equipo_local=equipos_map["Chone Heat"].id_equipo,
        id_equipo_visitante=equipos_map["Jipijapa Lakers"].id_equipo,
        fecha=datetime(2022, 10, 10).date(),
        hora=datetime.strptime('17:00', '%H:%M').time(),
        estado="finalizado",
        fase="Cuartos de Final",
        marcador_local=78,
        marcador_visitante=72,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )

    partidos_todos = [
        p1_t1, p2_t1, p3_t1, p4_t1, p5_t1, p6_t1, p7_t1, p8_t1,
        p1_t2, p2_t2, p3_t2, p4_t2, p5_t2,
        p1_t3, p2_t3, p3_t3, p4_t3,
        p1_t4, p2_t4, p3_t4
    ]
    db.session.add_all(partidos_todos)
    db.session.flush()

    # 6. Generador de Boxscore FIBA y Estadísticas Completas por Partido
    # Obtenemos los mapas de plantillas por (id_equipo, id_torneo)
    plantillas_por_equipo_torneo = {}
    todas_plantillas = Plantilla.query.all()
    for plan in todas_plantillas:
        k = (plan.id_equipo, plan.id_torneo)
        if k not in plantillas_por_equipo_torneo:
            plantillas_por_equipo_torneo[k] = []
        plantillas_por_equipo_torneo[k].append(plan)

    estadisticas_generadas = []
    
    # Generar estadísticas para TODOS los partidos finalizados
    partidos_finalizados = [p for p in partidos_todos if p.estado == "finalizado"]
    for part in partidos_finalizados:
        jugadores_usados_en_partido = set()

        def generar_boxscore(partido, eq_id, marcador_total, es_local=True):
            jugadores_disp = plantillas_por_equipo_torneo.get((eq_id, partido.id_torneo), [])
            # Filtrar jugadores que ya hayan actuado en el otro equipo para este mismo partido
            jugadores_elegibles = [p for p in jugadores_disp if p.id_jugador not in jugadores_usados_en_partido]
            if not jugadores_elegibles:
                return
            
            # Tomar los primeros 6-8 jugadores para simular la rotación del partido
            rotacion = jugadores_elegibles[:min(len(jugadores_elegibles), 8)]
            num_jugadores = len(rotacion)
            if num_jugadores == 0:
                return

            # Distribución de puntos entre los jugadores
            pts_restantes = marcador_total
            puntos_asignados = []
            
            for idx in range(num_jugadores):
                if idx == num_jugadores - 1:
                    pts = max(0, pts_restantes)
                elif idx == 0:
                    pts = min(pts_restantes, int(marcador_total * 0.32))
                elif idx == 1:
                    pts = min(pts_restantes, int(marcador_total * 0.22))
                elif idx == 2:
                    pts = min(pts_restantes, int(marcador_total * 0.16))
                else:
                    pts = min(pts_restantes, max(2, int(pts_restantes / (num_jugadores - idx))))
                
                puntos_asignados.append(pts)
                pts_restantes -= pts

            for idx, plan_item in enumerate(rotacion):
                jugadores_usados_en_partido.add(plan_item.id_jugador)
                pts = puntos_asignados[idx]
                triples = min(pts // 3, 2 + (idx % 3))
                reb = 2 + (idx * 2) % 9
                ast = 1 + (idx * 3) % 8
                falt = 1 + (idx % 4)
                tl = max(0, pts - (triples * 3) - 2) // 2

                est = Estadistica(
                    id_partido=partido.id_partido,
                    id_jugador=plan_item.id_jugador,
                    puntos_anotados=pts,
                    triples_anotados=triples,
                    rebotes=reb,
                    asistencias=ast,
                    faltas_cometidas=falt,
                    tiros_libres_anotados=tl,
                    robos=1 + (idx % 3),
                    tapones=idx % 2,
                    valoracion=pts + reb + ast - falt
                )
                estadisticas_generadas.append(est)

        generar_boxscore(part, part.id_equipo_local, part.marcador_local, es_local=True)
        generar_boxscore(part, part.id_equipo_visitante, part.marcador_visitante, es_local=False)

    db.session.add_all(estadisticas_generadas)

    # 7. Sanciones de prueba contextuales
    s1 = Sancion(
        id_jugador=super_jugador.id_jugador,
        id_partido=p3_t1.id_partido,
        motivo="Falta técnica por reclamo airado a la mesa de control",
        fecha=fecha_actual - timedelta(days=3),
        estado="activa"
    )
    s2 = Sancion(
        id_jugador=veterano_estrella.id_jugador,
        id_partido=p7_t1.id_partido,
        motivo="Falta antideportiva en penetración ofensiva",
        fecha=fecha_actual - timedelta(days=5),
        estado="cumplida"
    )
    s3 = Sancion(
        id_jugador=promesa_estrella.id_jugador,
        id_partido=p5_t2.id_partido,
        motivo="Doble amonestación técnica (descalificación de partido)",
        fecha=fecha_actual - timedelta(days=7),
        estado="activa"
    )
    db.session.add_all([s1, s2, s3])

    db.session.commit()
    print(f"- {len(partidos_todos)} Partidos creados (Finalizados con marcadores y Programados).", flush=True)
    print(f"- {len(estadisticas_generadas)} Estadísticas individuales FIBA generadas con boxscore consistente.", flush=True)
    print("- 3 Sanciones disciplinarias registradas.", flush=True)
    print("\n========================================", flush=True)
    print(" SIMULACIÓN DE TORNEO REAL COMPLETADA ", flush=True)
    print("========================================", flush=True)


def seed_usuarios_produccion():
    print("========================================", flush=True)
    print(" INICIANDO SEED DE USUARIOS PRODUCCION ", flush=True)
    print("========================================", flush=True)
    
    PJCEDENO_ID = str(uuid.uuid5(uuid.NAMESPACE_DNS, "pjcedeno87@gmail.com"))

    usuarios_prod = [
        {
            "id": ADMIN_ID,
            "nombre": "Super Admin",
            "correo": "admin@test.com",
            "password": "sadmin",
            "rol": "super_admin"
        },
        {
            "id": PJCEDENO_ID,
            "nombre": "Pedro Cedeño",
            "correo": "pjcedeno87@gmail.com",
            "password": "Elianc12",
            "rol": "super_admin"
        }
    ]

    for u in usuarios_prod:
        # Verificar si el usuario ya existe en auth.users por email
        res_auth = db.session.execute(
            text("SELECT id FROM auth.users WHERE email = :correo"),
            {"correo": u["correo"]}
        ).fetchone()

        if res_auth:
            user_id = str(res_auth[0])
            # Actualizar contraseña, metadatos y confirmar email
            query_update_auth = text("""
                UPDATE auth.users 
                SET encrypted_password = crypt(:password, gen_salt('bf')),
                    raw_user_meta_data = CAST(:meta_data AS jsonb),
                    email_confirmed_at = COALESCE(email_confirmed_at, now()),
                    updated_at = now()
                WHERE id = :id;
            """)
            try:
                db.session.execute(query_update_auth, {
                    "id": user_id,
                    "password": u["password"],
                    "meta_data": f'{{"rol":"{u["rol"]}"}}'
                })
            except Exception:
                pass
        else:
            user_id = u["id"]
            query_insert_auth = text("""
                INSERT INTO auth.users (
                    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
                    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                    confirmation_token, recovery_token, email_change_token_new, email_change,
                    is_super_admin, is_sso_user, phone
                ) VALUES (
                    :id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', :correo, 
                    crypt(:password, gen_salt('bf')), now(), 
                    '{"provider":"email","providers":["email"]}', CAST(:meta_data AS jsonb), now(), now(),
                    '', '', '', '',
                    false, false, NULL
                ) ON CONFLICT (id) DO UPDATE
                SET encrypted_password = crypt(:password, gen_salt('bf')),
                    raw_user_meta_data = CAST(:meta_data AS jsonb),
                    email_confirmed_at = now(),
                    updated_at = now();
            """)
            try:
                db.session.execute(query_insert_auth, {
                    "id": user_id,
                    "correo": u["correo"],
                    "password": u["password"],
                    "meta_data": f'{{"rol":"{u["rol"]}"}}'
                })

                query_identity = text("""
                    INSERT INTO auth.identities (
                        id, user_id, identity_data, provider, provider_id, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), :id, CAST(:identity_data AS jsonb), 'email', :id, now(), now()
                    ) ON CONFLICT DO NOTHING;
                """)
                db.session.execute(query_identity, {
                    "id": user_id,
                    "identity_data": f'{{"sub":"{user_id}","email":"{u["correo"]}"}}'
                })
            except Exception:
                pass

        # Insertar o Actualizar en public.usuarios
        query_public = text("""
            INSERT INTO usuarios (id_usuario, nombre, correo, rol, estado, created_at, updated_at)
            VALUES (:id, :nombre, :correo, :rol, 'activo', now(), now())
            ON CONFLICT (id_usuario) DO UPDATE 
            SET nombre = EXCLUDED.nombre, rol = EXCLUDED.rol, estado = 'activo', updated_at = now();
        """)
        db.session.execute(query_public, {
            "id": user_id,
            "nombre": u["nombre"],
            "correo": u["correo"],
            "rol": u["rol"]
        })
        
        print(f"- Usuario configurado como Super Admin: {u['correo']}", flush=True)

    db.session.commit()
    print("\nSEED DE USUARIOS DE PRODUCCION COMPLETADO EXITOSAMENTE.", flush=True)


def main():
    app = create_app()
    with app.app_context():
        print("========================================")
        print("       SEED DE BASE DE DATOS MOCK       ")
        print("========================================")
        print("1. Hacer seed SOLO de usuarios (Crea 5 usuarios base)")
        print("2. Hacer seed de TODAS LAS DEMAS TABLAS (Excluye usuarios)")
        print("3. Hacer seed COMPLETO (Usuarios + Tablas)")
        print("4. Hacer seed de USUARIOS DE PRODUCCION (admin@test.com y pjcedeno87@gmail.com como super_admin)")
        print("========================================")
        
        opcion = None
        if len(sys.argv) > 1:
            opcion = sys.argv[1].strip()
            print(f"Opcion seleccionada por argumento: {opcion}")
        else:
            try:
                opcion = input("Elige una opcion (1, 2, 3 o 4): ").strip()
            except (EOFError, KeyboardInterrupt):
                print("Ejecución no interactiva detectada. Ejecutando seed completo...")
                opcion = "3"
            
        if opcion == "1":
            seed_usuarios()
        elif opcion == "2":
            seed_tablas()
        elif opcion == "3":
            seed_usuarios()
            seed_tablas()
        elif opcion == "4":
            seed_usuarios_produccion()
        else:
            print("Opcion invalida. Saliendo.")

if __name__ == '__main__':
    main()
