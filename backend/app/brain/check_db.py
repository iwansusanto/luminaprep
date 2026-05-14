from sqlalchemy import create_engine, inspect
from app.core.config import settings

def check_db():
    engine = create_engine(settings.database_url)
    inspector = inspect(engine)
    
    tables = inspector.get_table_names()
    print(f"Tables found: {tables}")
    
    for table in tables:
        columns = [col['name'] for col in inspector.get_columns(table)]
        print(f"Table '{table}' columns: {columns}")

if __name__ == "__main__":
    try:
        check_db()
    except Exception as e:
        print(f"Error checking DB: {e}")
