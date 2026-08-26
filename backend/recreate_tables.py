from app import create_app, db

app = create_app()
with app.app_context():
    print("Creating all tables...")
    db.create_all()
    print("Tables created successfully.")
