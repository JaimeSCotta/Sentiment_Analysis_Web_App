import sqlite3

class SqliteDatabaseManager:
    def __init__(self, db_name):
        self.db_name = db_name
        self.conn = None
        self.cursor = None

    def create_table(self):
        try:
            print("Creando tabla 'sentiment_counts' si no existe...")
            self.cursor.execute('''CREATE TABLE IF NOT EXISTS sentiment_counts
                                  (sentiment TEXT PRIMARY KEY, count INTEGER)''')
            self.conn.commit()
            print("Tabla 'sentiment_counts' creada correctamente o ya existe.")
        except Exception as e:
            print(f"Error al crear la tabla 'sentiment_counts': {e}")

    def update_sentiment_count(self, sentiment):
        try:
            self.cursor.execute("INSERT OR IGNORE INTO sentiment_counts VALUES (?, 0)", (sentiment,))
            self.cursor.execute("UPDATE sentiment_counts SET count = count + 1 WHERE sentiment = ?", (sentiment,))
            self.conn.commit()
        except Exception as e:
            print(f"Error al actualizar el recuento de sentimiento: {e}")

    def get_sentiment_counts(self):
        try:
            self.cursor.execute("SELECT * FROM sentiment_counts")
            rows = self.cursor.fetchall()
            sentiment_counts = {row[0]: row[1] for row in rows}
            return sentiment_counts
        except Exception as e:
            print(f"Error al obtener los recuentos de sentimiento: {e}")

    def close(self):
        try:
            self.conn.close()
            print("Conexión a la base de datos cerrada correctamente.")
        except Exception as e:
            print(f"Error al cerrar la conexión a la base de datos: {e}")

    def __enter__(self):
        self.conn = sqlite3.connect(self.db_name)
        self.cursor = self.conn.cursor()
        self.create_table()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

