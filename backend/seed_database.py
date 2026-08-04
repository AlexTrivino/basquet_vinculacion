"""
Script de Seed para BaloncestoManta.
Genera usuarios, torneos (con 2 categorías cada uno), equipos, jugadores, plantillas, partidos y sanciones de forma determinística e idempotente.
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


def seed_usuarios():
    print("Iniciando Seed de Usuarios...")
    usuarios_data = [
        {"id": ADMIN_ID, "nombre": "Super Admin", "correo": "admin@test.com", "rol": "super_admin"},
        {"id": DEL1_ID, "nombre": "Delegado 1", "correo": "delegado1@test.com", "rol": "delegado"},
        {"id": DEL2_ID, "nombre": "Delegado 2", "correo": "delegado2@test.com", "rol": "delegado"},
        {"id": DEL3_ID, "nombre": "Delegado 3", "correo": "delegado3@test.com", "rol": "delegado"},
        {"id": DEL4_ID, "nombre": "Delegado 4", "correo": "delegado4@test.com", "rol": "delegado"}
    ]
    
    correos = tuple(u["correo"] for u in usuarios_data)
    
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
    print("Iniciando Seed de Tablas (Torneos, 2 Categorías por Torneo, Equipos, Jugadores, Plantillas, Partidos, Sanciones)...", flush=True)
    
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

    # 2. Torneos y 2 Categorías por cada Torneo
    fecha_actual = datetime.now().date()
    torneo1 = Torneo(
        nombre="Copa Verano Manta 2026",
        estado="en_curso",
        fecha_inicio=fecha_actual - timedelta(days=10),
        fecha_fin=fecha_actual + timedelta(days=80)
    )
    torneo2 = Torneo(
        nombre="Liga de Campeones Manabi",
        estado="finalizado",
        fecha_inicio=fecha_actual - timedelta(days=100),
        fecha_fin=fecha_actual - timedelta(days=10)
    )
    db.session.add_all([torneo1, torneo2])
    db.session.flush()
    
    # Torneo 1: 2 Categorías
    cat_t1_libre = Categoria(
        nombre_categoria="Categoria Libre",
        genero_categoria="masculino",
        edad_minima=18,
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
        nombre_categoria="Categoria Libre",
        genero_categoria="masculino",
        edad_minima=18,
        id_torneo=torneo2.id_torneo
    )
    cat_t2_sub21 = Categoria(
        nombre_categoria="Sub-21",
        genero_categoria="masculino",
        edad_minima=15,
        edad_maxima=21,
        id_torneo=torneo2.id_torneo
    )
    
    db.session.add_all([cat_t1_libre, cat_t1_maxi, cat_t2_libre, cat_t2_sub21])
    db.session.commit()
    print(f"- 2 Torneos creados con 2 Categorías cada uno (Total: 4 categorías).", flush=True)

    # 3. Equipos y Distribución por Delegado
    equipos_config = [
        # (Nombre, Delegado, Torneo, Categoría, Estado Inscripción)
        ("Delfines BC", del1.id_usuario, torneo1, cat_t1_libre, "aprobado"),
        ("Manta Bulls", del1.id_usuario, torneo1, cat_t1_maxi, "rechazado"),
        ("Tiburones de Manta", del1.id_usuario, torneo1, cat_t1_libre, "pendiente"),
        ("Portoviejo Stars", del2.id_usuario, torneo1, cat_t1_libre, "aprobado"),
        ("Chone Heat", del2.id_usuario, torneo2, cat_t2_libre, "aprobado"),
        ("Jipijapa Lakers", del3.id_usuario, torneo2, cat_t2_libre, "aprobado"),
    ]

    equipos_creados = []
    for nombre, id_us, tor, cat, estado_ins in equipos_config:
        eq = Equipo(nombre_equipo=nombre, id_usuario=id_us, estado="activo")
        db.session.add(eq)
        db.session.flush()
        
        ins = Inscripcion(
            id_equipo=eq.id_equipo,
            id_torneo=tor.id_torneo,
            id_categoria=cat.id_categoria,
            estado_inscripcion=estado_ins
        )
        db.session.add(ins)
        equipos_creados.append((eq, tor, cat, estado_ins))

    db.session.commit()
    print(f"- 6 Equipos creados e inscritos: Del 1 (3), Del 2 (2), Del 3 (1), Del 4 (0).", flush=True)

    # 4. Generación de 48 Jugadores (8 jugadores por cada uno de los 6 equipos)
    nombres_base = ["Juan", "Carlos", "Luis", "Pedro", "Javier", "Andres", "Miguel", "Jose", "Diego", "Mateo", "Gabriel", "Fernando"]
    apellidos_base = ["Perez", "Gomez", "Lopez", "Garcia", "Martinez", "Rodriguez", "Sanchez", "Ramirez", "Torres", "Flores"]
    
    jugador_idx = 1
    primeros_jugadores = []
    jugadores_y_equipos = []

    for eq, tor, _, _ in equipos_creados:
        for camiseta in range(1, 9):  # 8 jugadores por equipo (números 1 al 8)
            nom = nombres_base[(jugador_idx - 1) % len(nombres_base)]
            ape = apellidos_base[((jugador_idx - 1) // len(nombres_base)) % len(apellidos_base)]
            
            jug = Jugador(
                nombre=f"{nom} {ape} {jugador_idx}",
                documento_identificacion=f"1300{jugador_idx:06d}",
                fecha_nacimiento=datetime(2000, 1, 1).date() - timedelta(days=jugador_idx * 80),
                genero="masculino",
                telefono=f"099{jugador_idx:07d}",
                correo=f"jugador{jugador_idx}@test.com",
                estado="activo"
            )
            db.session.add(jug)
            jugadores_y_equipos.append((jug, eq.id_equipo, tor.id_torneo, camiseta))
            
            if camiseta == 1:
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
    print(f"- 48 Jugadores y Plantillas creadas (8 jugadores exactamente por cada equipo).", flush=True)

    # 5. Partidos
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

    # Torneo 2 (Equipos aprobados en Categoría Libre: Equipos 4 -> Chone Heat y 5 -> Jipijapa Lakers)
    eq_chone = equipos_creados[4][0]
    eq_jipijapa = equipos_creados[5][0]

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
    p2_t2 = Partido(
        id_torneo=torneo2.id_torneo,
        id_categoria=cat_t2_libre.id_categoria,
        id_equipo_local=eq_jipijapa.id_equipo,
        id_equipo_visitante=eq_chone.id_equipo,
        fecha=fecha_actual - timedelta(days=25),
        hora=datetime.strptime('20:00', '%H:%M').time(),
        estado="finalizado",
        fase="Semifinal",
        marcador_local=88,
        marcador_visitante=85,
        stats_local_procesadas=True,
        stats_visitante_procesadas=True
    )

    db.session.add_all([p1_t1, p2_t1, p1_t2, p2_t2])
    db.session.flush()

    # 6. Sanciones de prueba
    if primeros_jugadores:
        s1 = Sancion(
            id_jugador=primeros_jugadores[0].id_jugador,
            id_partido=p1_t1.id_partido,
            motivo="Falta tecnica grave (Insulto al arbitro)",
            fecha=fecha_actual - timedelta(days=2),
            estado="activa"
        )
        s2 = Sancion(
            id_jugador=primeros_jugadores[3].id_jugador,
            id_partido=p1_t1.id_partido,
            motivo="Doble falta antideportiva",
            fecha=fecha_actual - timedelta(days=2),
            estado="cumplida"
        )
        s3 = Sancion(
            id_jugador=primeros_jugadores[4].id_jugador,
            id_partido=p1_t2.id_partido,
            motivo="Acumulacion de faltas personales",
            fecha=fecha_actual - timedelta(days=20),
            estado="activa"
        )
        db.session.add_all([s1, s2, s3])

    db.session.commit()
    print("- Partidos y Sanciones creadas.", flush=True)
    print("\nSEED DE TABLAS COMPLETADO EXITOSAMENTE.", flush=True)


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
