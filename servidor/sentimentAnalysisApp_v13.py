# Intento de evitar el bloqueo por bot de tripAdvisor, sin finalizar

import logging
import asyncio
from random import randint
from fake_useragent import UserAgent
from random import randint
from fastapi import FastAPI, Depends, HTTPException, Request
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from transformers import pipeline
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from database_v2 import SqliteDatabaseManager
from fastapi.responses import JSONResponse
from time import sleep


class Review(BaseModel):
    Review: str

class ProjectName(BaseModel):
    ProjectName: str

class Url(BaseModel):
    Url: str

class OpcionEnum(BaseModel):
    OpcionEnum: str

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
db_manager = SqliteDatabaseManager('sentiment_database_v2.db')

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
def contar_apariciones_emociones(emociones):
    # Inicializar contadores
    contador_happy = 0
    contador_sad = 0
    contador_angry = 0
    
    # Contar apariciones de cada emoción
    for emocion in emociones:
        if emocion == "happy":
            contador_happy += 1
        elif emocion == "sad":
            contador_sad += 1
        elif emocion == "angry":
            contador_angry += 1
    
    # Determinar la emoción dominante
    if contador_happy > contador_sad and contador_happy > contador_angry:
        return "happy"
    elif contador_sad > contador_happy and contador_sad > contador_angry:
        return "sad"
    elif contador_angry > contador_happy and contador_angry > contador_sad:
        return "angry"
    else:
        return "neutral"  # Si todas las emociones tienen el mismo recuento


def update_sentiment_counts(result, db_manager):
    try:        
        # Actualizar el recuento del sentimiento en la base de datos
        with db_manager:
            db_manager.update_emotion_count(result)
        logger.info(f"Recuento de sentimiento actualizado para '{result}'.")
    except Exception as e:
        logger.error(f"Error al actualizar el recuento de sentimiento en la base de datos: {e}")


def analyze_emotions(review_text: str):
    if review_text is None:
        logger.error("Texto de revisión no proporcionado.")
        return {"error": "Texto de revisión no proporcionado."}
    
    logger.info(f"Texto para analizar la emocion: {review_text}")
    
    # Ejecutar el modelo zero-shot-classification
    classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
    result = classifier(
        review_text,
        candidate_labels=["happy", "sad", "angry"]
    )
    
    # Verificar la salida del modelo
    if 'labels' in result and 'scores' in result:
        result.get('labels', [])[0]
        
        return result
    else:
        logger.error("La salida del modelo no es válida.")
        return {"error": "La salida del modelo no es válida."}
    

async def analyze_emotions_severalReviews(reviews: list):
    emotions = [review for review in reviews]
    scores = {'happy': [], 'sad': [], 'angry': []}
    labels = []
    
    for review_text in emotions:
        try:
            emotion_result = analyze_emotions(review_text)
            predominant_emotion = emotion_result["labels"][0]
            scores[predominant_emotion].append(emotion_result["scores"][0])
            labels.append(predominant_emotion)
        except Exception as e:
            logger.error(f"Error al analizar emociones de la reseña: {e}")

    overall_emotion_score = sum(sum(scores.values(), [])) / sum(len(v) for v in scores.values())
    overall_emotion_label = contar_apariciones_emociones(labels)
    
    logger.info("Scores totales: %s", scores)
    logger.info("Labels totales: %s", labels)
    logger.info("Average Score: %s", overall_emotion_score)
    logger.info("Overall Emotion Label: %s", overall_emotion_label)
    
    return overall_emotion_score, overall_emotion_label
        

def get_db_manager():
    return db_manager

    
@app.get("/sentiment_counts")
async def get_sentiment_counts(db_manager=Depends(get_db_manager)):
    try:
        with db_manager:
            sentiment_counts = db_manager.get_global_emotion_counts()
            return sentiment_counts
    except Exception as e:
        logger.error(f"Error al obtener recuentos de sentimiento: {e}")
        return JSONResponse(status_code=500, content={"error": "Error al obtener recuentos de sentimiento"})
# ------------------------------------------------------------------------------------------------------------------------------------------------- #

def analyze_sentiment(review_text: str):
    logger.info(f"Texto para analizar el sentimiento: {review_text}")
    predictions = sentiment_pipeline(review_text)
    mapped_predictions = [{'label': map_label(prediction['label']), 'score': prediction['score']} for prediction in predictions]
    return {'predictions': mapped_predictions}

async def analyze_sentiment_severalReviews(reviews: list):
    predictions = [review for review in reviews]
    scores = []
    labels = []
    
    for review_text in predictions:
        try:
            logger.info(f"Texto para analizar el sentimiento: {review_text}")
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
    await asyncio.sleep(randint(1,5))
    logger.info("Esperando a que aparezcan las reseñas de TripAdvisor...")
    await page.screenshot(path=f"C:/Users/jaime/Desktop/Sentiment_Analysis_Web_App/screenshot1.png") ##########################################################
    await page.wait_for_selector('.JguWG', timeout=10000)
    logger.info("Las reseñas de TripAdvisor están disponibles. Extrayendo...")
    html = await page.inner_html('body')
    soup = BeautifulSoup(html, 'html.parser')
    review_elements = soup.select('.JguWG')
    reviews_text = [review.text.strip() for review in review_elements]
    logger.info(f"Se han extraído {len(reviews_text)} reseñas de TripAdvisor.")

    for review in soup.find_all('div', {'class': 'review-container'}): 
        review_text = review.find('p', {'class': 'partial_entry'}).text
        logger.info(f"Texto yelp sentimiento: {review_text}")
    return reviews_text

async def extract_yelp_reviews(page):
    logger.info("Esperando a que aparezcan las reseñas de Yelp...")
    await page.wait_for_selector('.raw__09f24__T4Ezm', timeout=10000)
    await asyncio.sleep(randint(1,5))
    logger.info("Las reseñas de Yelp están disponibles. Extrayendo...")
    html = await page.inner_html('body')
    soup = BeautifulSoup(html, 'html.parser')
    review_elements = soup.select('.raw__09f24__T4Ezm')
    reviews_text = [review.text.strip() for review in review_elements]
    logger.info(f"Se han extraído {len(reviews_text)} reseñas de Yelp.")
    return reviews_text

async def scrape_with_retry(url, opcion):
    attempt = 0
    ua = UserAgent()
    while attempt < 3:
        try:
            logger.info(f"Iniciando intento de scraping ({attempt + 1})...")
            async with async_playwright() as pw:
                browser = await pw.chromium.launch(headless=False)
                context = await browser.new_context(user_agent=ua.random)
                #context = await browser.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36')
                await asyncio.sleep(randint(3, 7))  # Espera aleatoria entre 3 y 7 segundos
                page = await context.new_page() 
                await asyncio.sleep(randint(1, 3))  # Espera aleatoria entre 1 y 3 segundos
                logger.info(f"Navegando a la URL: {url}")
                await page.goto(url)
                await page.wait_for_timeout(1000)
                await asyncio.sleep(randint(1,5))

                # Verificar si se ha detectado un bloqueo
                if opcion == "TripAdvisor":
                    await page.wait_for_timeout(1000)
                    html = await page.inner_html('body')
                    soup = BeautifulSoup(html, 'html.parser')
                    captcha_title = soup.find('p', {'class': 'captcha__human__title'})
                    if captcha_title and captcha_title.text:
                        logger.error("¡Has sido bloqueado por TripAdvisor!")
                        await browser.close()
                        return None  # Devolver None indica que el scraping no se completó debido al bloqueo
                    else:
                        logger.info("No se ha detectado bloqueo.")


                if opcion == "GoogleReview":
                    logger.info("Aceptando cookies GoogleReviews...")
                    await page.wait_for_timeout(1000)
                    cookie_dialog_selector = 'text="Aceptar todo"'
                elif opcion == "TripAdvisor":
                    await asyncio.sleep(randint(3, 7))
                    await page.wait_for_timeout(1000)
                    logger.info("Aceptando cookies TripAdvisor...")
                    cookie_dialog_selector = 'text="Acepto"'
                elif opcion == "Yelp":
                    logger.info("Aceptando cookies Yelp...")
                    await page.wait_for_timeout(1000)
                    cookie_dialog_selector = 'text="Permitir todas las cookies"'   #Aceptar solo las cookies necesarias
                
                if await page.is_visible(cookie_dialog_selector):
                    logger.info("Aceptando cookies...")
                    await page.wait_for_timeout(1000)
                    await page.click(cookie_dialog_selector)
                    
                if opcion == "GoogleReview":
                    reviews = await extract_google_reviews(page)
                elif opcion == "TripAdvisor":
                    await asyncio.sleep(randint(3, 7))
                    reviews = await extract_tripadvisor_reviews(page)
                elif opcion == "Yelp":
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

async def validate_url_and_option(url, opcion):
    logger.info(f"Validando URL {url}") 
    logger.info(f"Validando opcion {opcion}") 
    if opcion == "GoogleReview":
        if "google." not in url:
            logger.error(f"The provided URL does not seem to be from Google Reviews: {url}")
            raise ValueError("The provided URL does not seem to be from Google Reviews.")
    elif opcion == "TripAdvisor":
        if "tripadvisor." not in url:
            logger.error(f"The provided URL does not seem to be from TripAdvisor: {url}")
            raise ValueError("The provided URL does not seem to be from TripAdvisor.")
    elif opcion == "Yelp":
        if "yelp." not in url:
            logger.error(f"The provided URL does not seem to be from Yelp: {url}")
            raise ValueError("The provided URL does not seem to be from Yelp.")
    else:
        logger.error(f"Invalid option: {opcion}")
        raise ValueError("Invalid option. It must be GoogleReview, TripAdvisor, or Yelp.")


@app.post("/predict_reviews_from_raw_text")
def predict_reviews_raw(item: Review, project_name: ProjectName, db_manager=Depends(get_db_manager)):
    logger.info(f"Recibida solicitud para procesar texto crudo: {item.Review}") 
    logger.info("Nombre del proyecto recibido: %s", project_name.ProjectName)
    try:
        # Realizar análisis de emociones
        result1 = analyze_emotions(item.Review)  
        if result1 is None:
            raise Exception("Error al analizar emociones")
        
        max_score_index = result1["scores"].index(max(result1["scores"]))
        predominant_emotion = result1["labels"][max_score_index]
        predominant_emotion_score = result1["scores"][max_score_index]
        logger.info("Clasificación de emociones completada.")
        
        # Actualizar la base de datos con la emoción y el proyecto correspondiente si se proporciona un proyecto
        with db_manager:
            db_manager.update_emotion_count(project_name.ProjectName, predominant_emotion)
        
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
        return JSONResponse(content=final_result, headers={"Content-Type": "application/json; charset=utf-8"})  
    except Exception as e:
        logger.error(f"Error al procesar texto crudo: {e}")
        return JSONResponse(content={"error": str(e)}, headers={"Content-Type": "application/json; charset=utf-8"})   


@app.post("/predict_reviews_from_url")
async def predict_reviews_url(url: Url, opcion: OpcionEnum, project_name: ProjectName, db_manager=Depends(get_db_manager)):
    logger.info(f"Iniciando scraping de reseñas ({opcion.OpcionEnum})...")
    try:
        # Realizar análisis de emociones
        await validate_url_and_option(url.Url, opcion.OpcionEnum)
        reviews = await scrape_with_retry(url.Url, opcion.OpcionEnum)
        overall_average_score, overall_sentiment_label = await analyze_sentiment_severalReviews(reviews)
        logger.info("Análisis de sentimiento completado.")
    
        # Realizar análisis de sentimiento
        overall_emotion_score, overall_emotion_label = await analyze_emotions_severalReviews(reviews)
        logger.info("Clasificación de emociones completada.")

        # Actualizar la base de datos con la emoción y el proyecto correspondiente si se proporciona un proyecto
        with db_manager:
            db_manager.update_emotion_count(project_name.ProjectName, overall_emotion_label)

        # Crear el resultado final combinando ambos análisis
        final_result = {
            "Analisis Label": overall_sentiment_label,  
            "Score": overall_average_score,           
            "Emotion Label": overall_emotion_label,
            "Emotion Score": overall_emotion_score
        }
        logger.info("Resultado final: %s", final_result)

        return JSONResponse(content=final_result, headers={"Content-Type": "application/json; charset=utf-8"}) 
    except ValueError as ve:
        error_message = f"The provided URL does not seem to be from {opcion.OpcionEnum}." 
        logger.error(f"Error de validación: {error_message}")
        return JSONResponse(content={"error": error_message}, headers={"Content-Type": "application/json; charset=utf-8"})
    except Exception as e:
        logger.error(f"Error durante el scraping: {e}")
        return JSONResponse(content={"error": str(e)}, headers={"Content-Type": "application/json; charset=utf-8"})
    
# ---------------------------------------------------------- Workspace y proyectos ----------------------------------------------------------- #

@app.post("/workspace/projects")
async def create_project(request: Request):
    """
    Crea un nuevo proyecto en el workspace.
    """
    data = await request.json()
    project_name = data.get('project_name')
    if not project_name:
        raise HTTPException(status_code=400, detail="El nombre del proyecto no fue proporcionado en el cuerpo de la solicitud.")
    
    with db_manager:
        created_project = db_manager.create_project(project_name)
        if created_project:
            return {"message": f"Proyecto '{created_project}' creado correctamente"}
        else:
            raise HTTPException(status_code=400, detail="El proyecto ya existe")

@app.get("/workspace/projects")
async def get_projects():
    """
    Obtiene información sobre los proyectos existentes en el workspace.
    """
    with db_manager:
        projects = db_manager.get_projects()
        return {"projects": projects}

@app.get("/workspace/projects/{project_name}/emotions")
async def get_project_emotions(project_name: str):
    """
    Obtiene información sobre las emociones asociadas a un proyecto específico en el workspace.
    """
    try:
        with db_manager:
            emotions = db_manager.get_emotion_counts_for_project(project_name)
        if emotions is None:
            return JSONResponse(status_code=404, content={"error": f"No existen emociones para el proyecto '{project_name}'."})
        else:
            return {"project": project_name, "emotions": emotions}
    except ValueError as ve:
        return JSONResponse(status_code=404, content={"error": f"El proyecto '{project_name}' no existe."})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Error al obtener emociones del proyecto '{project_name}': {e}"})

# ------------------------------------------------------------------------------------------------------------------------------------------------- #

@app.get('/')
async def read_root():
    return {"message": "Welcome to the review sentiment analysis API"}