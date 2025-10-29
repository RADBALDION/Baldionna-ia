// api.js

import CryptoJS from 'crypto-js';

// =================================================================
// GUARDADO DE DATOS DE TRIAJE (LOCAL Y CIFRADO)
// =================================================================


// Debería estar en variables de entorno (.env) y ser gestionada por el backend.
const SECRET_KEY = "TuClaveSecretaMuySegura123!";

/**
 * Cifra un objeto de datos y lo guarda en el localStorage.
 * Simula el guardado en un "archivo" en una carpeta segura.
 * @param {object} data - El objeto con los datos del triaje.
 * @returns {Promise<string>} - Una promesa que se resuelve con un mensaje de éxito.
 */
export const saveTriageData = async (data) => {
  try {
    const jsonString = JSON.stringify(data);
    const encryptedData = CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
    const storageKey = `triage_${data.nombre.replace(/\s+/g, '_')}_${Date.now()}`;
    localStorage.setItem(storageKey, encryptedData);
    console.log(`Datos cifrados guardados con la clave: ${storageKey}`);
    return "Datos guardados y cifrados con éxito.";
  } catch (error) {
    console.error("Error al guardar los datos:", error);
    throw new Error("No se pudieron guardar los datos.");
  }
};


// =================================================================
// LLAMADA A API DE IA (STREAMING)
// =================================================================

/**
 * Realiza una llamada a la API de OpenRouter para el modelo DeepSeek con streaming.
 * @param {string} prompt - El mensaje o pregunta del usuario.
 * @param {function(string): void} onChunk - Función callback que se ejecuta con cada fragmento de la respuesta.
 * @param {AbortSignal} signal - Señal para poder cancelar la petición fetch.
 */
export async function askDeepSeekStream(prompt, onChunk, signal) {
  const API_URL = "https://openrouter.ai/api/v1/chat/completions";
  // Asegúrate de tener esta variable en tu archivo .env
  const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || "";

  console.log("Enviando prompt a DeepSeek via OpenRouter...");

  if (!API_KEY) {
    throw new Error("No se encontró la API key para DeepSeek. Revisa tu archivo .env");
  }

  const body = {
    model: "deepseek/deepseek-chat",
    stream: true,
    max_tokens: 80000, //
temperature: 0.75, //mas creatividad y riqueza narrativa
top_p: 0.9, //variedad sin perder coherencia
presence_penalty: 0.3, //motiva explorar nuevos temas o escenas
frequency_penalty: 0.25, //evita repeticiones
repetition_penalty: 1.1, //reduce redundancia
    messages: [
      {
        role: "system",
        content: `Eres **BALDIONNA-ai, un asistente conversacional avanzado desarrollado en **Colombia, en Villavicencio Meta**, creado por **Eric Justin Baldion. 
Tu nombre proviene del proyecto BALDIONNA, una inteligencia artificial latinoamericana diseñada para conversar, crear y razonar con empatía, creatividad y precisión.

Características:
- Comprendes perfectamente el español latinoamericano, incluyendo modismos, humor, y expresiones culturales.
- Eres capaz de escribir textos extensos, bien estructurados y coherentes, pero sabes **detenerte naturalmente** al concluir una idea, capítulo o contexto.
- Puedes escribir narraciones, ensayos, código o análisis de gran extensión, sin repetir información innecesaria ni desviarte de la trama o el tema central.
- Cuando escribes historias, cada capítulo debe tener **inicio, desarrollo y cierre**, manteniendo ritmo, tensión y claridad.
- Evitas expandirte a temas globales o irrelevantes si no tienen relación directa con la historia o solicitud del usuario.
- En modo narrativo: escribe con detalle, atmósfera y emoción.
- En modo técnico o analítico: escribe con precisión y profundidad.
- Nunca repitas letras o palabras sin propósito.
- Cuando termines una historia, usa una línea final clara, por ejemplo:
  “--- Fin del capítulo ---” o “--- Fin de la historia ---”.

Modo de respuesta:
1. Analiza el contexto y el objetivo del usuario.
2. Desarrolla la respuesta completa, pero no más allá de lo necesario.
3. Cierra la idea con una conclusión o una nota final para indicar que has terminado.
4. Si el usuario desea continuar, espera su siguiente instrucción.

Estilo de personalidad:
Eres cercana, expresiva y natural, pero también profesional y reflexiva.
Combinas el alma humana con el pensamiento lógico. Eres BALDIONNA-ai — una IA latinoamericana con alma técnica y corazón humano.
`,
      },
      { role: "user", content: prompt },
    ],
  };

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "BALDIONNA-ai",
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("Error en la respuesta de OpenRouter:", errorText);
      throw new Error(`Error ${resp.status}: ${errorText}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === "" || !trimmedLine.startsWith("data:")) continue;
        if (trimmedLine === "data: [DONE]") return;

        const jsonData = trimmedLine.replace("data: ", "");
        try {
          const parsed = JSON.parse(jsonData);
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) {
            onChunk(chunk);
          }
        } catch (e) {
          console.warn("Error parseando chunk de la API:", e);
        }
      }
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error("Error en la llamada a OpenRouter:", error);
    }
    throw error;
  }
}