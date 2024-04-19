// --------------------- Código para añadir imagenes dinamicas --------------------- //
window.addEventListener('DOMContentLoaded', function() {
    var container = document.querySelector('.container');
    var numImages = 2; // Número de imágenes a superponer

    for (var i = 0; i < numImages; i++) {
        var img = document.createElement('img');
        img.src = 'image' + (i + 1) + '.png'; // Ruta de la imagen
        img.classList.add('overlay-image');
        container.appendChild(img);

        // Posiciona las imágenes en el lateral izquierdo y derecho
        if (i % 2 === 0) {
            img.style.left = '-100px'; // Lateral izquierdo
            img.alt = "Imagen ejemplo google maps";
        } else {
            img.style.right = '-100px'; // Lateral derecho
            img.alt = "Imagen reseña 4 estrellas";
        }
    }
});

 // --------------------- Código para el formulario de URL --------------------- //
document.getElementById("urlForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    // Limpiar la salida anterior
    document.getElementById("resultado").innerText = '';

    // Muestra la barra de carga
    document.getElementById("progressBar").style.width = "100%";

    const urlInput = document.getElementById("urlInput").value;
    const opcionInput = document.getElementById("opcionInput").value;
    const projectName = document.getElementById("projectSelect").value;

    console.log("Valor de urlInput:", urlInput);
    console.log("Valor de opcionInput:", opcionInput);
    console.log("Valor de projectName:", projectName);
    
    let timeoutId; // Variable para almacenar el identificador del temporizador

    const responseQ = await fetch("http://127.0.0.1:8000/predict_reviews_from_url", {
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

        // Oculta la barra de carga
        document.getElementById("progressBar").style.width = "0";

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

    // Muestra la barra de carga
    document.getElementById("progressBar").style.width = "100%";

    const rawTextInput = document.getElementById("rawTextInput").value;
    const projectName = document.getElementById("projectSelect").value;
    console.log("Valor de projectName:", projectName);

    const response = await fetch("http://127.0.0.1:8000/predict_reviews_from_raw_text", {
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

    // Oculta la barra de carga
    document.getElementById("progressBar").style.width = "0";

    // Construir el mensaje a mostrar
    let message = '';
    if (data.error) {
        // Mostrar el error al usuario
        message = "Error: " + data.error;
    } else {
        message = `Sentiment Label: ${data["Analisis Label"]}\nScore: ${data.Score.toFixed(4)}\nEmotion Label: ${data["Emotion Label"]}\nEmotion Score: ${data["Emotion Score"].toFixed(4)}`;
        console.log("Received response from server:", data);
        // Actualizar las emociones para el proyecto seleccionado
        const projectName = document.getElementById("projectSelect").value;
        await loadProjectEmotions(projectName);
        await loadGlobalProjectEmotions();
    }
    document.getElementById("rawTextResultado").innerText = message;
});

// --------------------- Código para manejar proyectos --------------------- //

// Función para cargar proyectos existentes
async function loadProjects() {
    const projectSelect = document.getElementById("projectSelect");
    projectSelect.innerHTML = ''; // Limpiar opciones existentes

    try {
        const response = await fetch("http://127.0.0.1:8000/workspace/projects", {
            method: "GET",
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch projects");
        }

        const data = await response.json();

        if (!data.projects) {
            throw new Error("No projects found in response");
        }

        data.projects.forEach(project => {
            const option = document.createElement("option");
            option.value = project;
            option.textContent = project;
            projectSelect.appendChild(option);
        });

        // Obtener el nombre del nuevo proyecto creado (puedes obtenerlo de la respuesta del servidor o del campo de entrada)
        const newProjectName = document.getElementById("newProjectNameInput").value; // Obtener el valor del campo de entrada
        // Buscar el elemento de opción correspondiente al nuevo proyecto
        const newProjectOption = projectSelect.querySelector(`option[value="${newProjectName}"]`);
        // Seleccionar el nuevo proyecto si se encontró
        if (newProjectOption) {
            newProjectOption.selected = true;
        }

        // Obtener el nombre del proyecto seleccionado
        const projectName = projectSelect.value;
        await loadProjectEmotions(projectName); // Cargar las emociones asociadas al proyecto seleccionado

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
        const response = await fetch("http://127.0.0.1:8000/workspace/projects", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({
                "project_name": newProjectName
            })
        });

        if (response.ok) {
            const responseData = await response.json(); // Obtener los datos de la respuesta
            const createdProjectName = responseData.message.split("'")[1]; // Obtener el nombre del proyecto creado desde el mensaje de la respuesta
            await loadProjects(); // Cargar proyectos nuevamente después de crear uno nuevo
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
        const response = await fetch(`http://127.0.0.1:8000/workspace/projects/${projectName}/emotions`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch emotions for the selected project");
        }

        const data = await response.json();
        console.log(data)

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
    await loadProjectEmotions(projectName); // Cargar las emociones asociadas al proyecto seleccionado
});

// Función para cargar los recuentos de las emociones globales
async function loadGlobalProjectEmotions() {
    try {
        const response = await fetch("http://127.0.0.1:8000/sentiment_counts", {
            method: "GET",
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            }
        });

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
    // Agrega más emociones aquí si es necesario
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

    // Obtener los datos de las emociones
    const emotionsData = {
        labels: Object.keys(data.emotions),
        datasets: [{
            label: `${projectName} Emotions`,
            data: Object.values(data.emotions),
            backgroundColor: Object.keys(data.emotions).map(emotion => emotionColors[emotion].backgroundColor),
            borderColor: Object.keys(data.emotions).map(emotion => emotionColors[emotion].borderColor),
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

    // Limpiar el contenedor antes de agregar el nuevo gráfico
    globalEmotionsChartContainer.innerHTML = '';

    // Crear un lienzo (canvas) para el gráfico
    const canvas = document.createElement('canvas');
    canvas.id = 'globalEmotionsChart';
    globalEmotionsChartContainer.appendChild(canvas);

    // Crear un contexto para el gráfico
    const ctx = canvas.getContext('2d');

    // Obtener los datos de las emociones globales
    const emotionsData = {
        labels: Object.keys(data), // Usar las claves del objeto recibido
        datasets: [{
            label: 'Global Emotions',
            data: Object.values(data), // Usar los valores del objeto recibido
            backgroundColor: Object.keys(data).map(emotion => emotionColors[emotion].backgroundColor),
            borderColor: Object.keys(data).map(emotion => emotionColors[emotion].borderColor),
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