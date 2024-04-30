/*
Aplicación JavaScript
Autor: Jaime Sánchez Cotta
Última actualización: 30/04/2024

Este archivo contiene el código JavaScript necesario para el funcionamiento de la aplicación web. 
Se encarga de manejar la lógica del lado del cliente, incluyendo la interacción con el DOM, 
la comunicación con el servidor a través de solicitudes HTTP, y el procesamiento de datos para su visualización en la interfaz de usuario.
El código se divide en secciones claramente identificadas, comenzando con el manejo dinámico de imágenes 
y continuando con la gestión de formularios para la entrada de URL y texto sin formato (raw). 
Además, se incluyen funciones para cargar proyectos, manejar la creación de nuevos proyectos, y visualizar gráficos de emociones asociadas a los proyectos seleccionados.
*/


// Definir la dirección base
const BASE_URL = "http://127.0.0.1:8000"; // IP Local


// --------------------- Código para añadir imágenes dinámicas --------------------- //
window.addEventListener('DOMContentLoaded', function() {
    // Seleccionar el contenedor donde se añadirán las imágenes
    var container = document.querySelector('.container');
    var numImages = 2;

    // Iterar para añadir cada imagen al contenedor
    for (var i = 0; i < numImages; i++) {
        var img = document.createElement('img');
        img.src = 'image' + (i + 1) + '.png';
        img.classList.add('overlay-image');
        container.appendChild(img);

        // Posicionar las imágenes en el lado izquierdo y derecho alternativamente
        if (i % 2 === 0) {
            img.style.left = '-100px'; // Lado izquierdo
            img.alt = "Imagen ejemplo google maps"; // Texto alternativo para accesibilidad
        } else {
            img.style.right = '-100px'; // Lado derecho
            img.alt = "Imagen reseña 4 estrellas"; 
        }
    }
});



 // --------------------- Código para el formulario de URL --------------------- //
document.getElementById("urlForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    // Limpiar la salida anterior
    document.getElementById("resultado").innerText = '';

    // Mostrar la barra de carga
    document.getElementById("progressBar").style.width = "100%";

    // Obtener los valores de entrada del formulario
    const urlInput = document.getElementById("urlInput").value;
    const opcionInput = document.getElementById("opcionInput").value;
    const projectName = document.getElementById("projectSelect").value;

    // Mostrar los valores en la consola
    console.log("Valor de urlInput:", urlInput);
    console.log("Valor de opcionInput:", opcionInput);
    console.log("Valor de projectName:", projectName);
    
    let timeoutId; // Variable para almacenar el identificador del temporizador

    // Realizar una solicitud POST para predecir las reseñas desde la URL
    const responseQ = await fetch(`${BASE_URL}/predict_reviews_from_url`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify({
            "url": {
                "Url": urlInput
            },
            "opcion": {
                "OpcionEnum": opcionInput
            },
            "project_name": {
                "ProjectName": projectName
            },
        })
    });

    // Establecer el tiempo de espera para mostrar el mensaje de retrying
    timeoutId = setTimeout(() => {
        document.getElementById("resultado").innerText = "Something went wrong, retrying...";
    }, 25000);

    try {
        // Esperar la respuesta
        const response = await responseQ;
        clearTimeout(timeoutId); // Limpiar el temporizador si la respuesta llega antes del tiempo de espera

        const data = await response.json();

        // Ocultar la barra de carga
        document.getElementById("progressBar").style.width = "0";

        // Comprobar si hay un error en la respuesta
        if (data.error) {
            // Mostrar el error al usuario
            document.getElementById("resultado").innerText = "Error: " + data.error;
        } else {
            // Construir el mensaje a mostrar
            const message = `Sentiment Label: ${data["Analisis Label"]}\nScore: ${data.Score.toFixed(4)}\nEmotion Label: ${data["Emotion Label"]}\nEmotion Score: ${data["Emotion Score"].toFixed(4)}`;
            document.getElementById("resultado").innerText = message;
            // Actualizar las emociones para el proyecto seleccionado
            const projectName = document.getElementById("projectSelect").value;
            await loadProjectEmotions(projectName);
            await loadGlobalProjectEmotions();
        }
    } catch (error) {
        if (!document.getElementById("resultado").innerText) {
            document.getElementById("resultado").innerText = "Something went wrong, retrying...";
        }
    }
});



// --------------------- Código para el formulario de texto raw --------------------- //
document.getElementById("rawTextForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    // Limpiar la salida anterior
    document.getElementById("rawTextResultado").innerText = '';

    // Mostrar la barra de carga
    document.getElementById("progressBar").style.width = "100%";

    // Obtener el texto ingresado
    const rawTextInput = document.getElementById("rawTextInput").value;
    const projectName = document.getElementById("projectSelect").value;

    console.log("Valor de projectName:", projectName);

    // Realizar una solicitud POST para predecir las reseñas desde el texto sin formato
    const response = await fetch(`${BASE_URL}/predict_reviews_from_raw_text`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify({
            "item": {
                "Review": rawTextInput
            },
            "project_name": {
                "ProjectName": projectName
            },
        })
    });
    
    const data = await response.json();

    // Ocultar la barra de carga
    document.getElementById("progressBar").style.width = "0";

    // Construir el mensaje a mostrar
    let message = '';
    if (data.error) {
        message = "Error: " + data.error;
    } else {
        message = `Sentiment Label: ${data["Analisis Label"]}\nScore: ${data.Score.toFixed(4)}\nEmotion Label: ${data["Emotion Label"]}\nEmotion Score: ${data["Emotion Score"].toFixed(4)}`;
        console.log("Received response from server:", data);
        // Actualizar las emociones para el proyecto seleccionado
        const projectName = document.getElementById("projectSelect").value;
        await loadProjectEmotions(projectName);
        await loadGlobalProjectEmotions();
    }
    // Mostrar el mensaje en la salida
    document.getElementById("rawTextResultado").innerText = message;
});



// --------------------- Código para manejar proyectos --------------------- //
// Función para cargar proyectos existentes
async function loadProjects() {
    // Obtener el select donde se mostrarán los proyectos
    const projectSelect = document.getElementById("projectSelect");
    // Limpiar opciones existentes
    projectSelect.innerHTML = '';

    try {
        // Realizar una solicitud GET para obtener los proyectos existentes
        const response = await fetch(`${BASE_URL}/workspace/projects`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            }
        });

        // Comprobar si la solicitud fue exitosa
        if (!response.ok) {
            throw new Error("Failed to fetch projects");
        }

        const data = await response.json();

        // Comprobar si se encontraron proyectos en la respuesta
        if (!data.projects) {
            throw new Error("No projects found in response");
        }

        // Iterar sobre los proyectos y agregarlos como opciones en el select
        data.projects.forEach(project => {
            const option = document.createElement("option");
            option.value = project;
            option.textContent = project;
            projectSelect.appendChild(option);
        });

        // Obtener el nombre del nuevo proyecto creado
        const newProjectName = document.getElementById("newProjectNameInput").value;
        // Buscar el elemento de opción correspondiente al nuevo proyecto
        const newProjectOption = projectSelect.querySelector(`option[value="${newProjectName}"]`);
        // Seleccionar el nuevo proyecto si se encontró
        if (newProjectOption) {
            newProjectOption.selected = true;
        }

        // Obtener el nombre del proyecto seleccionado
        const projectName = projectSelect.value;
        // Cargar las emociones asociadas al proyecto seleccionado
        await loadProjectEmotions(projectName);

    } catch (error) {
        console.error("Error loading projects:", error);
        alert("Error al cargar los proyectos. Por favor, inténtelo de nuevo.");
    }
}

// Cargar proyectos existentes al cargar la página
window.addEventListener('DOMContentLoaded', async function() {
    await loadProjects();
});

// Código para manejar la creación de un nuevo proyecto desde el cuadro de texto
document.getElementById("createNewProjectTextButton").addEventListener("click", async function(event) {
    event.preventDefault();
    const newProjectName = document.getElementById("newProjectTextInput").value;
    if (!newProjectName) {
        alert("Por favor, introduzca un nombre para el nuevo proyecto.");
        return;
    }

    try {
        // Realizar una solicitud POST para crear un nuevo proyecto
        const response = await fetch(`${BASE_URL}/workspace/projects`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({
                "project_name": newProjectName
            })
        });

        if (response.ok) {
            // Obtener los datos de la respuesta
            const responseData = await response.json();
            // Obtener el nombre del proyecto creado desde el mensaje de la respuesta
            const createdProjectName = responseData.message.split("'")[1];
            // Cargar proyectos nuevamente después de crear uno nuevo
            await loadProjects();
            document.getElementById("newProjectTextInput").value = "";
            // Buscar el elemento de opción correspondiente al nuevo proyecto
            const newProjectOption = projectSelect.querySelector(`option[value="${createdProjectName}"]`);
            // Seleccionar el nuevo proyecto si se encontró
            if (newProjectOption) {
                newProjectOption.selected = true;
            }
            await loadProjectEmotions(createdProjectName);
        } else {
            throw new Error("Failed to create new project");
        }
    } catch (error) {
        console.error("Error creating new project:", error);
        alert("Error creating the new project, please check if the name already exists. Please try again.");
    }
});

// Función para cargar las emociones asociadas al proyecto seleccionado
async function loadProjectEmotions(projectName) {
    console.log("Fetching emotions for project:", projectName);
    const projectEmotionsSection = document.getElementById("projectEmotions");

    // Limpiar emociones previas
    projectEmotionsSection.innerHTML = '';

    try {
        // Realizar una solicitud GET para obtener las emociones del proyecto seleccionado
        const response = await fetch(`${BASE_URL}/workspace/projects/${projectName}/emotions`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch emotions for the selected project");
        }

        const data = await response.json();
        console.log("Project emotion counts:", data);

        if (!data.emotions) {
            throw new Error("No emotions found for the selected project in response");
        }

        // Crear una lista para mostrar las emociones
        const emotionsList = document.createElement("ul");
        emotionsList.classList.add("emotions-list");

        // Iterar sobre las emociones y crear elementos de lista para cada una
        for (const emotion in data.emotions) {
            const emotionItem = document.createElement("li");
            emotionItem.textContent = `${emotion}: ${data.emotions[emotion]}`;
            emotionsList.appendChild(emotionItem);
        }

        // Agregar la lista de emociones al contenedor
        projectEmotionsSection.appendChild(emotionsList);

        // Crear y actualizar la gráfica de emociones
        createEmotionsChart(data, projectName);

    } catch (error) {
        console.error("Error loading emotions for the selected project:", error);
        alert("Error al cargar las emociones para el proyecto seleccionado. Por favor, inténtelo de nuevo.");
    }
}

// Cargar las emociones asociadas al proyecto seleccionado al cambiar la selección
document.getElementById("projectSelect").addEventListener("change", async function(event) {
    const projectName = event.target.value;
    console.log("Valor de projectName:", projectName);
    // Cargar las emociones asociadas al proyecto seleccionado
    await loadProjectEmotions(projectName);
});

// Función para cargar los recuentos de las emociones globales
async function loadGlobalProjectEmotions() {
    try {
        // Realizar una solicitud GET para obtener los recuentos de las emociones globales
        const response = await fetch(`${BASE_URL}/sentiment_counts`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            }
        });

        // Comprobar si la solicitud fue exitosa
        if (!response.ok) {
            throw new Error("Failed to fetch global emotion counts");
        }

        const data = await response.json();
        console.log("Global emotion counts:", data);

        // Llamar a la función para crear y actualizar el gráfico de emociones globales
        createGlobalEmotionsChart(data);

    } catch (error) {
        console.error("Error loading sentiment counts:", error);
        alert("Error al cargar los recuentos de sentimiento. Por favor, inténtelo de nuevo.");
    }
}

// Llamar a la función para cargar los recuentos de sentimiento al cargar la página
window.addEventListener('DOMContentLoaded', async function() {
    await loadGlobalProjectEmotions();
});



// ------------------------ Graficos que se muestran ------------------------------ //
// Definir un conjunto de colores consistente para las emociones
const emotionColors = {
    happy: {
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)'
    },
    sad: {
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)'
    },
    angry: {
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        borderColor: 'rgba(255, 206, 86, 1)'
    },
    // Agregar más emociones aquí si es necesario
};

// Función para crear y actualizar la gráfica de emociones
function createEmotionsChart(data, projectName) {
    // Obtener el contenedor donde se mostrará el gráfico
    const emotionsChartContainer = document.getElementById("emotionsChartContainer");

    // Limpiar el contenedor antes de agregar el nuevo gráfico
    emotionsChartContainer.innerHTML = '';

    // Crear un lienzo (canvas) para el gráfico
    const canvas = document.createElement('canvas');
    canvas.id = 'emotionsChart';
    emotionsChartContainer.appendChild(canvas);

    // Crear un contexto para el gráfico
    const ctx = canvas.getContext('2d');

    // Obtener las emociones presentes en los datos
    const emotions = Object.keys(data.emotions);

    // Filtrar las emociones que están definidas en emotionColors
    const validEmotions = emotions.filter(emotion => emotionColors.hasOwnProperty(emotion));

    // Obtener los datos de las emociones
    const emotionsData = {
        labels: validEmotions,
        datasets: [{
            label: `${projectName} Emotions`,
            data: validEmotions.map(emotion => data.emotions[emotion]),
            backgroundColor: validEmotions.map(emotion => emotionColors[emotion].backgroundColor),
            borderColor: validEmotions.map(emotion => emotionColors[emotion].borderColor),
            borderWidth: 1
        }]
    };

    // Crear la gráfica de barras
    const emotionsChart = new Chart(ctx, {
        type: 'bar',
        data: emotionsData,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Función para crear y actualizar el gráfico de emociones globales
function createGlobalEmotionsChart(data) {
    // Obtener el contenedor donde se mostrará el gráfico
    const globalEmotionsChartContainer = document.getElementById("globalEmotionsChartContainer");
    globalEmotionsChartContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'globalEmotionsChart';
    globalEmotionsChartContainer.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const emotions = Object.keys(data);
    const validEmotions = emotions.filter(emotion => emotionColors.hasOwnProperty(emotion));

    // Obtener los datos de las emociones globales
    const emotionsData = {
        labels: validEmotions, // Usar las emociones válidas
        datasets: [{
            label: 'Global Emotions',
            data: validEmotions.map(emotion => data[emotion]), // Usar los valores correspondientes a las emociones válidas
            backgroundColor: validEmotions.map(emotion => emotionColors[emotion].backgroundColor),
            borderColor: validEmotions.map(emotion => emotionColors[emotion].borderColor),
            borderWidth: 1
        }]
    };

    // Crear el gráfico de barras para las emociones globales
    const globalEmotionsChart = new Chart(ctx, {
        type: 'bar',
        data: emotionsData,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}