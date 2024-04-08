import logging
import asyncio
from fastapi import FastAPI, Query, Depends
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from transformers import pipeline
from enum import Enum
from pydantic import BaseModel
import random
from fastapi.middleware.cors import CORSMiddleware
from database import SqliteDatabaseManager


class Review(BaseModel):
    Review: str

class OpcionEnum(str, Enum):
    GoogleReview = "GoogleReview"
    TripAdvisor = "TripAdvisor"
    Yelp = "Yelp"

app = FastAPI()

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"], 
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Configuración de trazas de registro
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Conexión a la base de datos SQLite
db_manager = SqliteDatabaseManager('sentiment_database.db')

model_name = "mrcaelumn/yelp_restaurant_review_sentiment_analysis"
sentiment_pipeline = pipeline("text-classification", model=model_name)
classifier_pipeline = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")


def map_label(label):
    if label == "LABEL_2":
        return "POSITIVE"
    elif label == "LABEL_1":
        return "NEUTRAL"
    elif label == "LABEL_0":
        return "NEGATIVE"
    else:
        return "UNKNOWN"
    
def contar_apariciones(sentimientos):
    # Inicializar contadores
    contador_positivo = 0
    contador_negativo = 0
    
    # Contar apariciones de POSITIVE y NEGATIVE
    for sentimiento in sentimientos:
        if sentimiento == "POSITIVE":
            contador_positivo += 1
        elif sentimiento == "NEGATIVE":
            contador_negativo += 1
    
    # Determinar el sentimiento dominante
    if contador_positivo > contador_negativo:
        return "POSITIVE"
    elif contador_positivo < contador_negativo:
        return "NEGATIVE"
    else:
        return "NEUTRAL"
    
# ---------------------------------------------------------- SQL y analisis de emociones ----------------------------------------------------------- #
def update_sentiment_counts(result, db_manager):
    try:
        # Obtener la etiqueta de sentimiento predominante
        predominant_sentiment = result.get('labels', [])[0]
        # Acceder al recurso
        db_manager.__enter__()
        # Actualizar el recuento del sentimiento en la base de datos
        db_manager.update_sentiment_count(predominant_sentiment)
        logger.info(f"Recuento de sentimiento actualizado para '{predominant_sentiment}'.")
    except Exception as e:
        logger.error(f"Error al actualizar el recuento de sentimiento en la base de datos: {e}")
    finally:
        # Asegurarse de liberar el recurso
        try:
            db_manager.__exit__(None, None, None)
        except Exception as e:
            logger.error(f"Error al liberar el recurso: {e}")
      


def analyze_emotions(review_text: str, db_manager):
    if review_text is None:
        logger.error("Texto de revisión no proporcionado.")
        return {"error": "Texto de revisión no proporcionado."}
    
    logger.info(f"Texto de revisión: {review_text}")
    
    # Ejecutar el modelo zero-shot-classification
    classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
    result = classifier(
        review_text,
        candidate_labels=["happy", "sad", "angry"]
    )
    
    # Verificar la salida del modelo
    if 'labels' in result and 'scores' in result:
        # Actualizar los recuentos de sentimiento si db_manager no es None
        if db_manager is not None:
            update_sentiment_counts(result, db_manager)
        
        return result
    else:
        logger.error("La salida del modelo no es válida.")
        return {"error": "La salida del modelo no es válida."}
        
def get_db_manager():
    return db_manager

    
@app.get("/sentiment_counts")
async def get_sentiment_counts(db_manager=Depends(get_db_manager)):
    try:
        db_manager.__enter__()
        sentiment_counts = db_manager.get_sentiment_counts()
    finally:
        db_manager.__exit__(None, None, None)
    
    return sentiment_counts
# ------------------------------------------------------------------------------------------------------------------------------------------------- #

def analyze_sentiment(review_text: str):
    predictions = sentiment_pipeline(review_text)
    mapped_predictions = [{'label': map_label(prediction['label']), 'score': prediction['score']} for prediction in predictions]
    return {'predictions': mapped_predictions}

async def analyze_sentiment_severalReviews(reviews: list):
    predictions = [review for review in reviews]
    scores = []
    labels = []
    
    for review_text in predictions:
        try:
            prediction = sentiment_pipeline(review_text)
            scores.extend([p['score'] for p in prediction])
            mapped_labels = [map_label(p['label']) for p in prediction]
            labels.extend(mapped_labels)
            logger.info("Scores de la reseña: %s", [p['score'] for p in prediction])
            logger.info("Labels de la reseña: %s", mapped_labels)
        except Exception as e:
            logger.error(f"Error al analizar sentimiento de la reseña: {e}")

    overall_average_score = sum(scores) / len(scores)
    overall_sentiment_label = contar_apariciones(labels)
    
    logger.info("Scores totales: %s", scores)
    logger.info("Labels totales: %s", labels)
    logger.info("Average Score: %s", overall_average_score)
    logger.info("Overall Sentiment Label: %s", overall_sentiment_label)
    
    return overall_average_score, overall_sentiment_label

async def extract_google_reviews(page):
    logger.info("Esperando a que aparezcan las reseñas de Google...")
    await page.wait_for_selector('.MyEned', timeout=10000)
    logger.info("Las reseñas de Google están disponibles. Extrayendo...")
    html = await page.inner_html('body')
    soup = BeautifulSoup(html, 'html.parser')
    review_elements = soup.select('.MyEned')
    reviews_text = [review.text.strip() for review in review_elements]
    logger.info(f"Se han extraído {len(reviews_text)} reseñas de Google.")
    return reviews_text

async def extract_tripadvisor_reviews(page):
    logger.info("Esperando a que aparezcan las reseñas de TripAdvisor...")
    await page.wait_for_selector('.entry', timeout=10000)
    logger.info("Las reseñas de TripAdvisor están disponibles. Extrayendo...")
    html = await page.inner_html('body')
    soup = BeautifulSoup(html, 'html.parser')
    review_elements = soup.select('.entry')
    reviews_text = [review.text.strip() for review in review_elements]
    logger.info(f"Se han extraído {len(reviews_text)} reseñas de TripAdvisor.")
    return reviews_text

async def extract_yelp_reviews(page):
    logger.info("Esperando a que aparezcan las reseñas de Yelp...")
    await page.wait_for_selector('.css-9ul5p9', timeout=10000)
    logger.info("Las reseñas de Yelp están disponibles. Extrayendo...")
    html = await page.inner_html('body')
    soup = BeautifulSoup(html, 'html.parser')
    review_elements = soup.select('.css-9ul5p9')
    reviews_text = [review.text.strip() for review in review_elements]
    logger.info(f"Se han extraído {len(reviews_text)} reseñas de Yelp.")
    return reviews_text

async def scrape_with_retry(url, opcion):
    attempt = 0
    while attempt < 3:
        try:
            logger.info(f"Iniciando intento de scraping ({attempt + 1})...")
            async with async_playwright() as pw:
                browser = await pw.chromium.launch(headless=True)
                context = await browser.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36')
                page = await context.new_page() 
                await asyncio.sleep(random.uniform(1, 3))
                logger.info(f"Navegando a la URL: {url}")
                await page.goto(url)
                await page.wait_for_timeout(1000)

                if opcion == OpcionEnum.GoogleReview:
                    logger.info("Aceptando cookies GoogleReviews...")
                    cookie_dialog_selector = 'text="Aceptar todo"'
                elif opcion == OpcionEnum.TripAdvisor:
                    logger.info("Aceptando cookies TripAdvisor...")
                    cookie_dialog_selector = 'text="Acepto"'
                elif opcion == OpcionEnum.Yelp:
                    logger.info("Aceptando cookies Yelp...")
                    cookie_dialog_selector = 'text="Permitir todas las cookies"'   #Aceptar solo las cookies necesarias
                
                if await page.is_visible(cookie_dialog_selector):
                    logger.info("Aceptando cookies...")
                    await page.click(cookie_dialog_selector)
                    
                if opcion == OpcionEnum.GoogleReview:
                    reviews = await extract_google_reviews(page)
                elif opcion == OpcionEnum.TripAdvisor:
                    reviews = await extract_tripadvisor_reviews(page)
                elif opcion == OpcionEnum.Yelp:
                    reviews = await extract_yelp_reviews(page)
                
                logger.info("Cerrando el navegador...")
                await browser.close()
                logger.info("Extracción completada con éxito.")
                return reviews
        except Exception as e:
            logger.error(f"Error en el intento {attempt + 1}: {e}")
            attempt += 1
            logger.info(f"Reintentando en {1.5 ** attempt} segundos...")
            await asyncio.sleep(1.5 ** attempt)  # Backoff exponencial
    raise Exception("The extraction could not be completed after several attempts.")

async def validate_url_and_option(url: str, opcion: OpcionEnum):
    if opcion == OpcionEnum.GoogleReview:
        if "google." not in url:
            logger.error(f"The provided URL does not seem to be from Google Reviews: {url}")
            raise ValueError("The provided URL does not seem to be from Google Reviews.")
    elif opcion == OpcionEnum.TripAdvisor:
        if "tripadvisor." not in url:
            logger.error(f"The provided URL does not seem to be from TripAdvisor: {url}")
            raise ValueError("The provided URL does not seem to be from TripAdvisor.")
    elif opcion == OpcionEnum.Yelp:
        if "yelp." not in url:
            logger.error(f"The provided URL does not seem to be from Yelp: {url}")
            raise ValueError("The provided URL does not seem to be from Yelp.")
    else:
        logger.error(f"Invalid option: {opcion}")
        raise ValueError("Invalid option. It must be GoogleReview, TripAdvisor, or Yelp.")


@app.post("/predict_reviews_from_raw_text")
def predict_reviews_raw(item: Review, db_manager=Depends(get_db_manager)):
    logger.info(f"Recibida solicitud para procesar texto crudo: {item.Review}") 
    try:
        # Realizar análisis de emociones
        result1 = analyze_emotions(item.Review, db_manager)  
        max_score_index = result1["scores"].index(max(result1["scores"]))
        predominant_emotion = result1["labels"][max_score_index]
        predominant_emotion_score = result1["scores"][max_score_index]
        logger.info("Clasificación de emociones completada.")
        
        # Realizar análisis de sentimiento
        result2 = analyze_sentiment(item.Review) 
        logger.info("Análisis de sentimiento completado.")
        
        # Crear el resultado final combinando ambas análisis
        final_result = {
            "Analisis Label": result2["predictions"][0]["label"],  
            "Score": result2["predictions"][0]["score"],           
            "Emotion Label": predominant_emotion,
            "Emotion Score": predominant_emotion_score
        }
        logger.info("Resultado final: %s", final_result)
        return final_result  
    except Exception as e:
        logger.error(f"Error al procesar texto crudo: {e}")
        return {"error": str(e)}


@app.post("/predict_reviews_from_url")
async def predict_reviews_url(url: str = Query(..., description="URL del restaurante específico"), opcion: OpcionEnum = Query(..., description="Selecciona una opción: GoogleReview, TripAdvisor o Yelp")):
    logger.info(f"Iniciando scraping de reseñas ({opcion})...")
    try:
        await validate_url_and_option(url, opcion)
        reviews = await scrape_with_retry(url, opcion)
        overall_average_score, overall_sentiment_label = await analyze_sentiment_severalReviews(reviews)
        logger.info("Análisis de sentimiento completado.")
        return {"overall_sentiment_label": overall_sentiment_label, "overall_average_score": overall_average_score}
    except ValueError as ve:
        error_message = f"The provided URL does not seem to be from {opcion}." 
        logger.error(f"Error de validación: {error_message}")
        return {"error": error_message}
    except Exception as e:
        logger.error(f"Error durante el scraping: {e}")
        return {"error": str(e)}


@app.get('/')
async def read_root():
    return {"message": "Welcome to the review sentiment analysis API"}


# Esta ya es la mejor version que tengo, en las sucesivas se intentara añadir una opcion de idioma y mediante el uso de mas de un modelo, predecir
# el sentimiento positivo o negativo en base al idioma
# solucionado el bloqueo de yelp
# se intento con theFork pero bloqueaba por bot

# ejemplo para comparar opiniones tripAdv> 
            # link en inlges: https://www.tripadvisor.com/ShowUserReviews-g187499-d14171649-r626683710-Bar_Catalunya_Kts-Girona_Province_of_Girona_Catalonia.html
            # link en español: https://www.tripadvisor.es/Restaurant_Review-g187499-d14171649-Reviews-Bar_Catalunya_Kts-Girona_Province_of_Girona_Catalonia.html

#The staff was friendly and attentive throughout our dining experience.