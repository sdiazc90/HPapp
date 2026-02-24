// server.js completo listo para Render
import express from 'express';
import fetch from 'node-fetch';
import path from 'path';

const app = express();

// Cargar dotenv SOLO en desarrollo para no interferir con variables de Render
if (process.env.NODE_ENV !== 'production') {
  await import('dotenv').then(mod => mod.config());
}

// DEBUG temporal: longitud de GEMINI_API_KEY
console.log("DEBUG - GEMINI_API_KEY length:", (process.env.GEMINI_API_KEY || "").length);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.resolve('public/index.html'));
});

// Puerto dinámico
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

  const body = { contents: [{ parts: [{ text: finalPrompt }] }] };

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      title: "Historia de Terror",
      story: "⚠️ GEMINI_API_KEY no definida. Revisá tu configuración en Render."
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000); // 30s timeout

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify(body),
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini API error:", response.status, text.slice(0, 500));
      return res.status(502).json({
        title: "Historia de Terror",
        story: `⚠️ Error del servicio Gemini (HTTP ${response.status}). Revisa logs.`
      });
    }

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
    const isTimeout = error.name === 'AbortError';
    res.status(isTimeout ? 504 : 500).json({
      title: "Historia de Terror",
      story: isTimeout
        ? "⚠️ Timeout llamando al servicio generativo."
        : "⚠️ Error interno generando la historia."
    });
  }
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
