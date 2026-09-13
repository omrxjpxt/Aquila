from app.services.repositories.db import get_db_connection

try:
    with get_db_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        print("Success")
except Exception as e:
    print("Error:", e)
