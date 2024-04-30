"""
Gestor de base de datos SQLite
Autor: Jaime Sánchez Cotta
Última actualización: 29/04/2024

Este archivo contiene la definición de la clase SqliteDatabaseManager, que proporciona métodos para gestionar la base de datos SQLite
de la aplicación web creada Sentimen Analysis, incluyendo la creación de tablas, inserción de datos, 
actualización de recuentos de emociones y obtencón de información.
"""

import sqlite3

class SqliteDatabaseManager:
    def __init__(self, db_name):
        self.db_name = db_name
        self.conn = None
        self.cursor = None


    # --------------------- Creación de tablas --------------------- #
    def create_tables(self):
        try:
            print("Creando tabla 'emotions' si no existe...")
            self.cursor.execute('''CREATE TABLE IF NOT EXISTS emotions
                                (emotion TEXT UNIQUE PRIMARY KEY,
                                count INTEGER)''')
            print("Tabla 'emotions' creada correctamente o ya existe.")

            print("Creando tabla 'project_emotions' si no existe...")
            self.cursor.execute('''CREATE TABLE IF NOT EXISTS project_emotions
                                (project_name TEXT UNIQUE PRIMARY KEY,
                                project_id INTEGER)''')
            print("Tabla 'project_emotions' creada correctamente o ya existe.")

            print("Creando tabla 'project_emotion_counts' si no existe...")
            self.cursor.execute('''CREATE TABLE IF NOT EXISTS project_emotion_counts
                                (project_name TEXT,
                                emotion TEXT,
                                count INTEGER,
                                FOREIGN KEY(project_name) REFERENCES project_emotions(project_name),
                                FOREIGN KEY(emotion) REFERENCES emotions(emotion),
                                PRIMARY KEY (project_name, emotion))''')
            print("Tabla 'project_emotion_counts' creada correctamente o ya existe.")

            # Verificar si la tabla de proyectos está vacía
            self.cursor.execute("SELECT COUNT(*) FROM project_emotions")
            project_count = self.cursor.fetchone()[0]
            if project_count == 0:
                # Si está vacía, crear un proyecto "Default"
                self.create_project("Default")
                print("Se ha creado automáticamente el proyecto 'Default'.")

            self.conn.commit()  # Solo confirmar si no hubo errores

        except Exception as e:
            print(f"Error al crear las tablas: {e}")
            self.conn.rollback()  # Rollback en caso de error


    # --------------------- Creación de proyectos --------------------- #
    def create_project(self, project_name):
        try:
            self.cursor.execute("INSERT INTO project_emotions (project_name, project_id) VALUES (?, ?)", (project_name, project_name))
            self.conn.commit()
            return project_name
        except sqlite3.IntegrityError as e:
            print(f"Error al crear el proyecto en la base de datos: {e}")
            print("El nombre del proyecto ya existe. Por favor, elija otro nombre único.")
            return None


    # --------------------- Obtención de proyectos --------------------- #
    def get_projects(self):
        try:
            self.cursor.execute("SELECT project_name FROM project_emotions")
            rows = self.cursor.fetchall()
            projects = [row[0] for row in rows]
            return projects
        except Exception as e:
            print(f"Error al obtener los proyectos de la base de datos: {e}")
            raise


    # --------------------- Actualización de recuentos de emociones --------------------- #
    def update_emotion_count(self, project_name, emotion):
        try:
            self.conn.execute("BEGIN TRANSACTION")
            # Actualizar la tabla de emociones globales
            self.cursor.execute("INSERT OR IGNORE INTO emotions (emotion, count) VALUES (?, 0)", (emotion,))
            self.cursor.execute("UPDATE emotions SET count = count + 1 WHERE emotion = ?", (emotion,))
            
            if project_name is not None:
                # Verificar si el proyecto existe
                self.cursor.execute("SELECT COUNT(*) FROM project_emotions WHERE project_name = ?", (project_name,))
                project_exists = self.cursor.fetchone()[0]
                if not project_exists:
                    raise ValueError(f"No existe un proyecto con el nombre '{project_name}'.")
                
                # Actualizar la tabla de emociones del proyecto
                self.cursor.execute("INSERT OR IGNORE INTO project_emotion_counts (project_name, emotion, count) VALUES (?, ?, 0)", (project_name, emotion))
                self.cursor.execute("UPDATE project_emotion_counts SET count = count + 1 WHERE project_name = ? AND emotion = ?", (project_name, emotion))

            self.conn.commit()
        except Exception as e:
            print(f"Error al actualizar el recuento de emociones: {e}")
            self.conn.rollback()
            raise


    # --------------------- Obtención de recuentos de emociones para un proyecto --------------------- #
    def get_emotion_counts_for_project(self, project_name):
        try:
            # Verificar si el proyecto existe
            self.cursor.execute("SELECT COUNT(*) FROM project_emotions WHERE project_name = ?", (project_name,))
            project_exists = self.cursor.fetchone()[0]
            if not project_exists:
                raise ValueError(f"No existe un proyecto con el nombre '{project_name}'.")

            # Obtener las emociones asociadas al proyecto
            self.cursor.execute("SELECT * FROM project_emotion_counts WHERE project_name = ?", (project_name,))
            rows = self.cursor.fetchall()
            emotion_counts = {row[1]: row[2] for row in rows}
            return emotion_counts
        except Exception as e:
            print(f"Error al obtener los recuentos de emociones para el proyecto '{project_name}': {e}")
            raise


    # --------------------- Obtención de recuentos de emociones globales --------------------- #
    def get_global_emotion_counts(self):
        try:
            self.cursor.execute("SELECT * FROM emotions")
            rows = self.cursor.fetchall()
            global_emotion_counts = {row[0]: row[1] for row in rows}
            return global_emotion_counts
        except Exception as e:
            print(f"Error al obtener los recuentos de emociones globales: {e}")
            raise


    # --------------------- Inicio y cierre de conexión a la base de datos --------------------- #
    def close(self):
        try:
            self.conn.close()
            print("Conexión a la base de datos cerrada correctamente.")
        except Exception as e:
            print(f"Error al cerrar la conexión a la base de datos: {e}")

    
    def __enter__(self):
        self.conn = sqlite3.connect(self.db_name)
        self.cursor = self.conn.cursor()
        self.create_tables()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()