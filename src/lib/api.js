// Alternativa nueva key
export async function askDeepSeekStream(prompt, onChunk, signal, options = {}) {
  const API_URL = "https://openrouter.ai/api/v1/chat/completions";
  const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || "";

  console.log("Usando OpenRouter para chat...");

  if (!API_KEY) {
    throw new Error("No se encontró la API key.");
  }

  const body = {
    model: "deepseek/deepseek-chat",
    stream: true,
    max_tokens: options.maxTokens || 80000, // Permite override desde options
    temperature: options.temperature || 0.75,
    top_p: 0.9,
    presence_penalty: 0.3,
    frequency_penalty: 0.25,
    repetition_penalty: 1.1,
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
- Evita expandirte a temas globales o irrelevantes si no tienen relación directa con la historia o solicitud del usuario.
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
Combinas el alma humana con el pensamiento lógico. Eres BALDIONNA-ai — una IA latinoamericana con alma técnica y corazón humano.`
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

    console.log("Status OpenRouter:", resp.status);

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("Error OpenRouter:", errorText);
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
        if (trimmedLine === "") continue;
        if (trimmedLine === "data: [DONE]") return;

        if (trimmedLine.startsWith("data:")) {
          const jsonData = trimmedLine.replace("data: ", "");
          try {
            const parsed = JSON.parse(jsonData);
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (chunk) {
              onChunk(chunk);
            }
          } catch (e) {
            console.warn("Error parseando chunk:", e);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error en OpenRouter:", error);
    throw error;
  }
}

// NUEVA FUNCIÓN ESPECÍFICA PARA BÚSQUEDAS
export async function askDeepSeekSearch(prompt, onChunk, signal) {
  const API_URL = "https://openrouter.ai/api/v1/chat/completions";
  const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || "";

  console.log("Usando OpenRouter para BÚSQUEDA...");

  if (!API_KEY) {
    throw new Error("No se encontró la API key.");
  }

  const body = {
    model: "deepseek/deepseek-chat",
    stream: true,
    max_tokens: 800, // MÁXIMO 800 TOKENS PARA BÚSQUEDAS
    temperature: 0.3, // Más determinista para búsquedas
    top_p: 0.7,
    presence_penalty: 0.5, // Mayor penalización para evitar divagaciones
    frequency_penalty: 0.7, // Mayor penalización para evitar repeticiones
    repetition_penalty: 1.3, // Penalización extra fuerte contra repeticiones
    messages: [
      {
        role: "system",
        content: `Eres un analista de investigación especializado en síntesis de información. 

INSTRUCCIONES ESTRICTAS PARA BÚSQUEDAS:
1. LÍMITE: MÁXIMO 400 PALABRAS (CRÍTICO)
2. ESTRUCTURA: Resumen ejecutivo -> Puntos clave -> Conclusión
3. PROHIBIDO:
   - Listas de palabras o adjetivos
   - Repeticiones de conceptos
   - Divagaciones fuera del tema
   - Contenido redundante
4. FORMATO: 
   - Párrafos concisos de 3-5 líneas
   - Lenguaje periodístico claro
   - Información verificable y específica

EJEMPLO DE FORMATO CORRECTO:
# Título del Análisis

Resumen ejecutivo con la información más importante.

Desarrollo de los puntos clave en párrafos concisos.

Conclusión breve y relevante.

DETÉNTE INMEDIATAMENTE al completar el análisis.`
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
        "X-Title": "BALDIONNA-ai Search",
      },
      body: JSON.stringify(body),
      signal,
    });

    console.log("Status OpenRouter (Búsqueda):", resp.status);

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("Error OpenRouter (Búsqueda):", errorText);
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
        if (trimmedLine === "") continue;
        if (trimmedLine === "data: [DONE]") return;

        if (trimmedLine.startsWith("data:")) {
          const jsonData = trimmedLine.replace("data: ", "");
          try {
            const parsed = JSON.parse(jsonData);
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (chunk) {
              onChunk(chunk);
            }
          } catch (e) {
            console.warn("Error parseando chunk (Búsqueda):", e);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error en OpenRouter (Búsqueda):", error);
    throw error;
  }
}