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
            "url": urlInput,
            "opcion": opcionInput,
            "project_name": projectName
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
            method: "GET"
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
        } else {
            throw new Error("Failed to create new project");
        }
    } catch (error) {
        console.error("Error creating new project:", error);
        alert("Error creating the new project, please check if the name already exists. Please try again.");
    }
});


