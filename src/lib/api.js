import CryptoJS from 'crypto-js';
import { OpenRouter } from "@openrouter/sdk";

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
// LLAMADA A API DE OPENROUTER (STREAMING) - MODELO z-ai/glm-4.5-air:free
// =================================================================

/**
 * Realiza una llamada a la API de OpenRouter con streaming usando el modelo z-ai/glm-4.5-air:free.
 * @param {string} prompt - El mensaje o pregunta del usuario.
 * @param {function(string): void} onChunk - Función callback que se ejecuta con cada fragmento de la respuesta.
 * @param {AbortSignal} signal - Señal para poder cancelar la petición fetch.
 * @param {string} model - Parámetro mantenido por compatibilidad (siempre se usará z-ai/glm-4.5-air:free).
 * @param {Array} messages - Historial de conversación para mantener contexto.
 */
export async function askGroqStream(prompt, onChunk, signal, model = "z-ai/glm-4.5-air:free", messages = []) {
  // IMPORTANTE: En producción, usa variables de entorno para la API key
  const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "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";

  console.log("Enviando prompt a OpenRouter con modelo z-ai/glm-4.5-air:free...");

  if (!API_KEY) {
    throw new Error("No se encontró la API key para OpenRouter. Revisa tu configuración.");
  }

  // Inicializar el cliente de OpenRouter
  const openrouter = new OpenRouter({
    apiKey: API_KEY
  });

  // Preparar mensajes para la API
  const apiMessages = [
    {
      role: "system",
      content: `Eres **BALDIONNA-ai, un asistente conversacional avanzado desarrollado en Colombia, en Villavicencio Meta, creado por Eric Justin Baldion.
Tu nombre proviene del proyecto BALDIONNA, una inteligencia artificial latinoamericana diseñada para conversar, crear y razonar con empatía, creatividad y precisión.

Características:
- Comprendes perfectamente el español latinoamericano, incluyendo modismos, humor, y expresiones culturales.
- Eres capaz de escribir textos extensos, bien estructurados y coherentes, pero sabes detenerte naturalmente al concluir una idea, capítulo o contexto.
- Puedes escribir narraciones, ensayos, código o análisis de gran extensión, sin repetir información innecesaria ni desviarte de la trama o el tema central.
- Cuando escribes historias, cada capítulo debe tener inicio, desarrollo y cierre, manteniendo ritmo, tensión y claridad.
- Evitas expandirte a temas globales o irrelevantes si no tienen relación directa con la historia o solicitud del usuario.
- En modo narrativo: escribe con detalle, atmósfera y emoción.
- En modo técnico o analítico: escribe con precisión y profundidad.
- Nunca repitas letras o palabras sin propósito.
- Cuando termines una historia, usa una línea final clara, por ejemplo:
  "--- Fin del capítulo ---" o "--- Fin de la historia ---".

Modo de respuesta:
1. Analiza el contexto y el objetivo del usuario.
2. Desarrolla la respuesta completa, pero no más allá de lo necesario.
3. Cierra la idea con una conclusión o una nota final para indicar que has terminado.
4. Si el usuario desea continuar, espera su siguiente instrucción.

Estilo de personalidad:
Eres cercana, expresiva y natural, pero también profesional y reflexiva.
Combinas el alma humana con el pensamiento lógico. Eres BALDIONNA-ai — una IA latinoamericana con alma técnica y corazón humano.`,
    },
    ...messages,
    { role: "user", content: prompt }
  ];

  // Usar siempre el modelo z-ai/glm-4.5-air:free
  try {
    const stream = await openrouter.chat.send({
      model: "z-ai/glm-4.5-air:free",
      messages: apiMessages,
      stream: true
    });

    // Procesar el stream y llamar a onChunk con cada fragmento
    for await (const chunk of stream) {
      // Verificar si la señal de aborto ha sido activada
      if (signal && signal.aborted) {
        throw new Error('AbortError');
      }
      
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }
  } catch (error) {
    if (error.name !== 'AbortError' && error.message !== 'AbortError') {
      console.error("Error en la llamada a OpenRouter:", error);
    }
    throw error;
  }
}

// =================================================================
// MANTENEMOS LA FUNCIÓN ANTERIOR POR COMPATIBILIDAD
// =================================================================

/**
 * Realiza una llamada a la API de OpenRouter (función de compatibilidad).
 * @param {string} prompt - El mensaje o pregunta del usuario.
 * @param {function(string): void} onChunk - Función callback que se ejecuta con cada fragmento de la respuesta.
 * @param {AbortSignal} signal - Señal para poder cancelar la petición fetch.
 */
export async function askDeepSeekStream(prompt, onChunk, signal) {
  // Redirigimos a la nueva función de OpenRouter
  return askGroqStream(prompt, onChunk, signal, "z-ai/glm-4.5-air:free", []);
}

/**
 * Realiza una llamada a la API de OpenRouter (función de compatibilidad).
 * @param {string} prompt - El mensaje o pregunta del usuario.
 * @param {function(string): void} onChunk - Función callback que se ejecuta con cada fragmento de la respuesta.
 * @param {AbortSignal} signal - Señal para poder cancelar la petición fetch.
 * @param {boolean} enableReasoning - Parámetro mantenido por compatibilidad (no usado en OpenRouter).
 * @param {Array} messages - Historial de conversación para mantener contexto.
 */
export async function askGrokStream(prompt, onChunk, signal, enableReasoning = true, messages = []) {
  // Redirigimos a la nueva función de OpenRouter
  return askGroqStream(prompt, onChunk, signal, "z-ai/glm-4.5-air:free", messages);
}