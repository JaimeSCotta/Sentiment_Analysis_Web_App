# Aplicación Web de Análisis de Sentimientos

Esta aplicación utiliza diversas bibliotecas de Python para analizar sentimientos de reseñas de texto y extraer datos de raspado web de sitios populares de reseñas como Google Reviews, TripAdvisor y Yelp.

## Requisitos Previos

Antes de ejecutar la aplicación, asegúrate de tener instaladas las siguientes dependencias:

- **FastAPI**: La principal biblioteca para construir APIs web con Python. Instálese usando `pip install fastapi uvicorn`.
- **Playwright**: Utilizado para automatización del navegador. Instálese usando `pip install playwright`.
- **BeautifulSoup4**: Utilizado para análisis de HTML. Instálese usando `pip install beautifulsoup4`.
- **Transformers**: Proporciona acceso a modelos preentrenados de NLP. Instálese usando `pip install transformers`.
- **Pydantic**: Una biblioteca para validación de datos en Python. Instálese usando `pip install pydantic`.

## Uso

Sigue estos pasos para ejecutar la aplicación:

1. Abra una terminal y ejecuta el servidor. En este caso, se utiliza FastAPI como backend. Ejecute el siguiente comando: `$ uvicorn sentimentAnalysisApp_v8:app`.
2. Si se está utilizando Visual Studio Code como entorno de desarrollo, descarge la extensión Live Server. Puede abrir el archivo `index.html` con este servidor.
3. Una vez que tanto el cliente como el servidor estén en funcionamiento, navege a las URL locales, típicamente `http://127.0.0.1:8000/` para FastAPI y `http://127.0.0.1:5500/` para Live Server.

## Copmentarios

Revisar el código correspondiente a la actualización de las emociones en la base de datos, codigos `sentimentAnalysisApp_v9.py`, `database.py`, `index.html` y `scripts.js`.

