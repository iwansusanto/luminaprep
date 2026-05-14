# Compatibility shim — all code should import from app.db.database
from app.db.database import engine, SessionLocal, Base, get_db, text  # noqa: F401
