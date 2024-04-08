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
        } else {
            img.style.right = '-100px'; // Lateral derecho
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

    let timeoutId; // Variable para almacenar el identificador del temporizador

    const responsePromise = fetch("http://127.0.0.1:8000/predict_reviews_from_url?url=" + encodeURIComponent(urlInput) + "&opcion=" + encodeURIComponent(opcionInput), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    });

    // Establecer el tiempo de espera para mostrar el mensaje de retrying
    timeoutId = setTimeout(() => {
        document.getElementById("resultado").innerText = "Something went wrong, retrying...";
    }, 25000);

    try {
        // Esperar la respuesta
        const response = await responsePromise;
        clearTimeout(timeoutId); // Limpiar el temporizador si la respuesta llega antes del tiempo de espera

        const data = await response.json();

        // Oculta la barra de carga
        document.getElementById("progressBar").style.width = "0";

        if (data.error) {
            // Mostrar el error al usuario
            document.getElementById("resultado").innerText = "Error: " + data.error;
        } else {
            if (data.overall_sentiment_label && data.overall_average_score) {
                // Construir el mensaje a mostrar
                const message = `Overall Sentiment Label: ${data.overall_sentiment_label}\nOverall Average Score: ${data.overall_average_score.toFixed(4)}`;
                document.getElementById("resultado").innerText = message;
            } else {
                document.getElementById("resultado").innerText = "Error: Datos inesperados recibidos del servidor.";
            }
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

    const response = await fetch("http://127.0.0.1:8000/predict_reviews_from_raw_text", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "Review": rawTextInput
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

