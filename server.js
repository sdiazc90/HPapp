import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config(); // Carga las variables de entorno desde .env en desarrollo

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public')); // Carpeta para CSS, JS, imágenes, etc.

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.resolve('public/index.html')); // Asegúrate de que index.html esté en public
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 10000;

// Endpoint para generar historias
app.post('/api/generate', async (req, res) => {
  const userKeywords = req.body.prompt || ""; 
  const basePrompt = process.env.INITIAL_PROMPT || ""; 

  const finalPrompt = `
${basePrompt}
Palabras clave: ${userKeywords}
Por favor, devuelve el resultado en el siguiente formato:
TÍTULO: <el título de la historia>
CUENTO: <el texto del cuento>
`;

  const body = { contents: [ { parts: [{ text: finalPrompt }] } ] };

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "TÍTULO: Historia de Terror\nCUENTO: ⚠️ Sin respuesta";

    let title = "Historia de Terror";
    let story = rawText;

    const titleMatch = rawText.match(/TÍTULO:\s*(.*)/i);
    const storyMatch = rawText.match(/CUENTO:\s*([\s\S]*)/i);

    if (titleMatch) title = titleMatch[1].trim();
    if (storyMatch) story = storyMatch[1].trim();

    res.json({ title, story });
  } catch (error) {
    console.error("Error generando la historia:", error);
    res.status(500).json({ title: "Historia de Terror", story: "⚠️ Error generando la historia" });
  }
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

