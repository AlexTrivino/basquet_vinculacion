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
    print("Iniciando Seed de Tablas (Torneos, Categorías, Equipos con Roster Reglamentario >=10, Comprobantes, Partidos, Sanciones)...", flush=True)
    
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

    # 2. Torneos y Categorías
    fecha_actual = datetime.now().date()
    torneo1 = Torneo(
        nombre="Copa Verano Manta 2026",
        estado="en_curso",
        fecha_inicio=fecha_actual - timedelta(days=10),
        fecha_fin=fecha_actual + timedelta(days=80)
    )
    torneo2 = Torneo(
        nombre="Liga de Campeones Manabí",
        estado="finalizado",
        fecha_inicio=fecha_actual - timedelta(days=100),
        fecha_fin=fecha_actual - timedelta(days=10)
    )
    db.session.add_all([torneo1, torneo2])
    db.session.flush()
    
    # Torneo 1: 2 Categorías
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
    
    # Torneo 2: 2 Categorías
    cat_t2_libre = Categoria(
        nombre_categoria="Senior Libre",
        genero_categoria="masculino",
        edad_minima=18,
        id_torneo=torneo2.id_torneo
    )
    cat_t2_sub21 = Categoria(
        nombre_categoria="Sub-21 Juvenil",
        genero_categoria="masculino",
        edad_minima=15,
        edad_maxima=21,
        id_torneo=torneo2.id_torneo
    )
    
    db.session.add_all([cat_t1_libre, cat_t1_maxi, cat_t2_libre, cat_t2_sub21])
    db.session.commit()
    print(f"- 2 Torneos creados con sus Categorías (Total: 4 categorías).", flush=True)

    # 3. Equipos, Inscripciones con Comprobantes y Estados
    equipos_config = [
        # (Nombre, Delegado, Torneo, Categoría, Estado Inscripcion, Comprobante URL, Num Jugadores)
        (
            "Delfines BC",
            del1.id_usuario,
            torneo1,
            cat_t1_libre,
            "aprobado",
            "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
            11
        ),
        (
            "Tiburones de Manta",
            del1.id_usuario,
            torneo1,
            cat_t1_libre,
            "pendiente",
            "https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4?auto=format&fit=crop&w=800&q=80",
            11
        ),
        (
            "Manta Bulls",
            del1.id_usuario,
            torneo1,
            cat_t1_maxi,
            "rechazado",
            DOC_PDF_DEMO,
            10
        ),
        (
            "Portoviejo Stars",
            del2.id_usuario,
            torneo1,
            cat_t1_libre,
            "aprobado",
            DOC_PDF_DEMO,
            11
        ),
        (
            "Halcones del Mar",
            del2.id_usuario,
            torneo1,
            cat_t1_libre,
            "borrador",
            None,
            6  # Demuestra estado incompleto (<10 jugadores)
        ),
        (
            "Chone Heat",
            del2.id_usuario,
            torneo2,
            cat_t2_libre,
            "aprobado",
            "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
            11
        ),
        (
            "Jipijapa Lakers",
            del3.id_usuario,
            torneo2,
            cat_t2_libre,
            "aprobado",
            "https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4?auto=format&fit=crop&w=800&q=80",
            11
        ),
    ]

    equipos_creados = []
    for nombre, id_us, tor, cat, estado_ins, url_comp, num_jug in equipos_config:
        eq = Equipo(
            nombre_equipo=nombre,
            id_usuario=id_us,
            estado="activo"
        )
        db.session.add(eq)
        db.session.flush()
        
        ins = Inscripcion(
            id_equipo=eq.id_equipo,
            id_torneo=tor.id_torneo,
            id_categoria=cat.id_categoria,
            estado_inscripcion=estado_ins,
            url_comprobante_pago=url_comp
        )
        db.session.add(ins)
        equipos_creados.append((eq, tor, cat, estado_ins, num_jug))

    db.session.commit()
    print(f"- 7 Equipos creados e inscritos con comprobantes y estados (Aprobado, Pendiente, Rechazado, Borrador).", flush=True)

    # 4. Generación de Jugadores Reglamentarios con Fotos y Documentos
    nombres_base = [
        "Michael", "Carlos", "Luis", "Pedro", "Javier", "Andres", "Miguel", "Jose",
        "Diego", "Mateo", "Gabriel", "Fernando", "Alejandro", "Daniel", "Lucas", "Christian"
    ]
    apellidos_base = [
        "Jordan", "Gomez", "Lopez", "Garcia", "Martinez", "Rodriguez", "Sanchez",
        "Ramirez", "Torres", "Flores", "Cedeño", "Alvarado", "Zambrano", "Mendoza"
    ]
    
    jugador_idx = 1
    primeros_jugadores = []
    jugadores_y_equipos = []

    for eq, tor, cat, _, num_jug in equipos_creados:
        # Año base ajustado según edad mínima de categoría
        anio_base = 2000 if not cat.edad_minima or cat.edad_minima < 30 else 1986

        for camiseta_idx in range(1, num_jug + 1):
            nom = nombres_base[(jugador_idx - 1) % len(nombres_base)]
            ape = apellidos_base[((jugador_idx - 1) // len(nombres_base)) % len(apellidos_base)]
            
            # Asignar foto de demostración
            url_foto = FOTOS_JUGADORES_DEMO[(jugador_idx - 1) % len(FOTOS_JUGADORES_DEMO)]
            
            # Asignar cédula (y acta de bachiller al 50% de jugadores)
            url_cedula = DOC_PDF_DEMO if jugador_idx % 2 == 0 else DOC_IMG_DEMO
            url_acta = DOC_PDF_DEMO if jugador_idx % 3 == 0 else None

            # Dorsales comunes de baloncesto
            dorsales_comunes = [4, 5, 7, 8, 9, 10, 11, 13, 15, 23, 24, 30, 32, 33]
            numero_camiseta = dorsales_comunes[(camiseta_idx - 1) % len(dorsales_comunes)] + (camiseta_idx // len(dorsales_comunes))

            jug = Jugador(
                nombre=f"{nom} {ape}",
                documento_identificacion=f"130{jugador_idx:07d}",
                fecha_nacimiento=datetime(anio_base, 1, 1).date() - timedelta(days=(camiseta_idx * 150)),
                genero="masculino",
                url_foto=url_foto,
                url_cedula=url_cedula,
                url_acta_bachiller=url_acta,
                telefono=f"099{jugador_idx:07d}",
                correo=f"jugador{jugador_idx}@test.com",
                estado="activo"
            )
            db.session.add(jug)
            jugadores_y_equipos.append((jug, eq.id_equipo, tor.id_torneo, numero_camiseta))
            
            if camiseta_idx == 1:
                primeros_jugadores.append(jug)
            jugador_idx += 1

    db.session.flush()

    for jug, id_eq, id_tor, camiseta in jugadores_y_equipos:
        plan = Plantilla(
            id_jugador=jug.id_jugador,
            id_equipo=id_eq,
            id_torneo=id_tor,
            numero_camiseta=camiseta,
            estado="activo"
        )
        db.session.add(plan)

    db.session.commit()
    print(f"- {len(jugadores_y_equipos)} Jugadores y Plantillas creadas con fotos, cédulas y dorsales reglamentarios.", flush=True)

    # 5. Partidos de Demostración
    # Torneo 1 (Equipos aprobados en Categoría Libre: Equipos 0 -> Delfines BC y 3 -> Portoviejo Stars)
    eq_delfines = equipos_creados[0][0]
    eq_portoviejo = equipos_creados[3][0]

    p1_t1 = Partido(
        id_torneo=torneo1.id_torneo,
        id_categoria=cat_t1_libre.id_categoria,
        id_equipo_local=eq_delfines.id_equipo,
        id_equipo_visitante=eq_portoviejo.id_equipo,
        fecha=fecha_actual - timedelta(days=2),
        hora=datetime.strptime('18:00', '%H:%M').time(),
        estado="finalizado",
        fase="Fase de Grupos",
        marcador_local=82,
        marcador_visitante=78,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )
    p2_t1 = Partido(
        id_torneo=torneo1.id_torneo,
        id_categoria=cat_t1_libre.id_categoria,
        id_equipo_local=eq_portoviejo.id_equipo,
        id_equipo_visitante=eq_delfines.id_equipo,
        fecha=fecha_actual + timedelta(days=5),
        hora=datetime.strptime('20:00', '%H:%M').time(),
        estado="programado",
        fase="Fase de Grupos",
        marcador_local=0,
        marcador_visitante=0,
        stats_local_procesadas=False,
        stats_visitante_procesadas=False
    )

    # Torneo 2 (Equipos aprobados: Equipos 5 -> Chone Heat y 6 -> Jipijapa Lakers)
    eq_chone = equipos_creados[5][0]
    eq_jipijapa = equipos_creados[6][0]

    p1_t2 = Partido(
        id_torneo=torneo2.id_torneo,
        id_categoria=cat_t2_libre.id_categoria,
        id_equipo_local=eq_chone.id_equipo,
        id_equipo_visitante=eq_jipijapa.id_equipo,
        fecha=fecha_actual - timedelta(days=20),
        hora=datetime.strptime('18:00', '%H:%M').time(),
        estado="finalizado",
        fase="Final",
        marcador_local=95,
        marcador_visitante=90,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )

    db.session.add_all([p1_t1, p2_t1, p1_t2])
    db.session.flush()

    # 6. Sanciones de prueba
    if len(primeros_jugadores) >= 3:
        s1 = Sancion(
            id_jugador=primeros_jugadores[0].id_jugador,
            id_partido=p1_t1.id_partido,
            motivo="Falta técnica grave (Reclamo airado al árbitro)",
            fecha=fecha_actual - timedelta(days=2),
            estado="activa"
        )
        s2 = Sancion(
            id_jugador=primeros_jugadores[1].id_jugador,
            id_partido=p1_t1.id_partido,
            motivo="Doble falta antideportiva",
            fecha=fecha_actual - timedelta(days=2),
            estado="cumplida"
        )
        db.session.add_all([s1, s2])

    db.session.commit()
    print("- Partidos y Sanciones creadas exitosamente.", flush=True)
    print("\n========================================", flush=True)
    print(" SEED DE TABLAS COMPLETADO EXITOSAMENTE ", flush=True)
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
