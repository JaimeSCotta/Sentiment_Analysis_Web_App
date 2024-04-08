# Sentiment_Analysis_Web_App

Para el uso y ejecución de la aplicación, se tienen que tener instaldas las dependencias necesarias, entre ellas fastapi (pip install fastapi uvicorn) es la biblioteca principal para construir API web con Python, Playwright (pip install playwright) se utiliza para la automatización del navegador. Ademas BeautifulSoup4 (pip install beautifulsoup4) se utiliza para analizar el HTML, Transformers (pip install transformers) y Pydantic (pip install pydantic) es una biblioteca para la validación de datos en Python.

El proceso para la ejecucíon de la aplicación es el siguiente:
1. Abrir una terminal y ejecutar el servidor, en este caso se utiliza FastAPI como backend. Comando: $ uvicorn sentimentAnalysisApp_v9.py
2. Si se tiene como entorno de desarrollo Visual Studio Code, descargando la extensión Live Server, se puede abrir el archivo "index.html" con este servidor.
3. Una vez se tenga tanto el cliente como el servidor en ejecución navegar a las rutas locales, siendo en la mayoría de casos, http://127.0.0.1:8000/ y http://127.0.0.1:5500/ para FastAPI como Live Server respectivamente.
   
