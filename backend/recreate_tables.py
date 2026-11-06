from app import create_app
from app.shared.infrastructure.db import db

app = create_app()
with app.app_context():
    print("Creating all tables...")
    db.create_all()
    print("Tables created successfully.")
