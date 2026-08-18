from app import create_app, db
from app.models.categoria import Categoria

# Inicializa la app de Flask para tener contexto de la base de datos
app = create_app()

def corregir_categorias_sin_limite(id_torneo):
    with app.app_context():
        # 1. Buscar y eliminar las categorías previas (las que tenían límites)
        nombres_a_borrar = ["Cadetes +30 Femenino", "Juniors +50 Femenino"]
        categorias_malas = Categoria.query.filter(
            Categoria.id_torneo == id_torneo,
            Categoria.nombre_categoria.in_(nombres_a_borrar)
        ).all()
        
        for cat in categorias_malas:
            db.session.delete(cat)
            
        if categorias_malas:
            print(f"🗑️ Se eliminaron {len(categorias_malas)} categorías con límites de edad.")
        else:
            print("⚠️ No se encontraron las categorías a borrar.")
        
        # 2. Agregar las categorías reales TOTALMENTE SIN LÍMITES
        nuevas_categorias = [
            Categoria(
                nombre_categoria="Cadetes +30 Femenino",
                genero_categoria="femenino",
                edad_minima=0,    # 0 = Sin límite de edad mínima
                edad_maxima=None, # None = Sin límite de edad máxima
                id_torneo=id_torneo
            ),
            Categoria(
                nombre_categoria="Juniors +50 Femenino",
                genero_categoria="femenino",
                edad_minima=0,    # 0 = Sin límite de edad mínima
                edad_maxima=None, 
                id_torneo=id_torneo
            )
        ]
        
        db.session.add_all(nuevas_categorias)
        db.session.commit()
        print(f"✅ ¡Éxito! Se han agregado las categorías 'Cadetes +30' y 'Juniors +50' al torneo ID {id_torneo} SIN LÍMITES DE EDAD.")

if __name__ == "__main__":
    # ¡Asegúrate de cambiar este número por el ID real del torneo en producción!
    ID_DEL_TORNEO = 1 
    corregir_categorias_sin_limite(ID_DEL_TORNEO)
