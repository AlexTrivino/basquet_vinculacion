"""
Script de Factory Reset para BaloncestoManta.
ADVERTENCIA: Este script borrará TODOS los datos de la base de datos (tablas públicas)
y TODOS los usuarios registrados en Supabase Auth.
"""
import sys
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError

# Importamos la app de Flask para usar el contexto y la conexión a BD
from app import create_app, db

def reset_database():
    app = create_app()
    with app.app_context():
        print("ADVERTENCIA: ESTAS A PUNTO DE BORRAR TODA LA BASE DE DATOS Y USUARIOS.")
        # confirmacion = input("Escribe 'BORRAR TODO' para continuar: ")
        # 
        # if confirmacion.strip() != 'BORRAR TODO':
        #     print("Operacion cancelada.")
        #     sys.exit(0)
            
        print("\nIniciando limpieza profunda...")
        
        # 1. Borrar Usuarios de Supabase Auth
        try:
            print("1. Borrando usuarios de Supabase Auth (auth.users)...")
            db.session.execute(text("DELETE FROM auth.users;"))
            print("   - Usuarios borrados exitosamente.")
        except ProgrammingError as e:
            # Si el usuario de la BD no tiene permisos sobre el esquema auth, lo notificamos
            print("   - No se pudieron borrar los usuarios automaticamente (posible falta de permisos sobre el esquema auth).")
            print("   Por favor, borra los usuarios manualmente desde el panel de Supabase -> Authentication -> Users.")
            db.session.rollback() # Hacemos rollback para que la siguiente transaccion funcione
        except Exception as e:
            print(f"   - Error inesperado borrando usuarios: {e}")
            db.session.rollback()

        # 2. Borrar todos los datos de las tablas públicas
        try:
            print("2. Vaciando tablas publicas (TRUNCATE CASCADE)...")
            truncate_query = text("""
                TRUNCATE TABLE 
                  estadisticas, 
                  sanciones, 
                  partidos, 
                  documentos_jugadores, 
                  plantillas, 
                  jugadores, 
                  documentacion, 
                  inscripciones, 
                  equipos, 
                  torneos, 
                  categorias,
                  patrocinadores,
                  patrocinadores_torneos,
                  usuarios
                RESTART IDENTITY CASCADE;
            """)
            db.session.execute(truncate_query)
            db.session.commit()
            print("   - Todas las tablas han sido vaciadas y los IDs reiniciados a 1.")
        except Exception as e:
            db.session.rollback()
            print(f"   - Error vaciando tablas: {e}")
            sys.exit(1)
            
        # 3. Borrar los archivos de Supabase Storage
        try:
            print("3. Vaciando archivos del Storage de Supabase (S3)...")
            import os
            import urllib.request
            from dotenv import load_dotenv
            load_dotenv('.env')
            
            bucket = os.getenv('SUPABASE_STORAGE_BUCKET', 'archivos')
            supabase_url = os.getenv('SUPABASE_URL', '').rstrip('/')
            service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            
            if supabase_url and service_role_key:
                empty_url = f"{supabase_url}/storage/v1/bucket/{bucket}/empty"
                req = urllib.request.Request(
                    empty_url,
                    headers={'Authorization': f'Bearer {service_role_key}'},
                    method='POST'
                )
                with urllib.request.urlopen(req) as response:
                    print("   - Cola de limpieza en Storage iniciada exitosamente (podría demorar en reflejarse completamente).")
            else:
                print("   - Omitido: No se encontraron las credenciales de Supabase en el entorno.")
        except Exception as e:
            print(f"   - Advertencia: Error vaciando Storage: {e}")
            
        print("\nFACTORY RESET COMPLETADO!")
        print("Tu base de datos esta limpia como recien instalada.")
        print("El bucket de Storage también ha sido programado para vaciarse.")

if __name__ == '__main__':
    reset_database()
