# Aplicación Web de Análisis de Sentimientos

Esta aplicación utiliza diversas bibliotecas de Python para analizar sentimientos de reseñas de texto y extraer datos de raspado web de sitios populares de reseñas como Google Reviews, TripAdvisor y Yelp.

## Requisitos Previos

Antes de ejecutar la aplicación, asegúrate de tener instaladas las siguientes dependencias:

- **FastAPI**: La principal biblioteca para construir APIs web con Python. Instálala usando `pip install fastapi uvicorn`.
- **Playwright**: Utilizado para automatización del navegador. Instálalo usando `pip install playwright`.
- **BeautifulSoup4**: Utilizado para análisis de HTML. Instálalo usando `pip install beautifulsoup4`.
- **Transformers**: Proporciona acceso a modelos preentrenados de NLP. Instálalo usando `pip install transformers`.
- **Pydantic**: Una biblioteca para validación de datos en Python. Instálala usando `pip install pydantic`.

## Uso

Sigue estos pasos para ejecutar la aplicación:

1. Abre una terminal y comienza el servidor. En este caso, utilizamos FastAPI como backend. Ejecuta el siguiente comando: $ uvicorn sentimentAnalysisApp_v9.py
2. Si estás utilizando Visual Studio Code como tu entorno de desarrollo, descarga la extensión Live Server. Puedes abrir el archivo `index.html` con este servidor.
3. Una vez que tanto el cliente como el servidor estén en funcionamiento, navega a las URL locales, típicamente `http://127.0.0.1:8000/` para FastAPI y `http://127.0.0.1:5500/` para Live Server.

