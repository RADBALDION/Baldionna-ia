// api.js
// Alternativa nueva key
export async function askDeepSeekStream(prompt, onChunk, signal, options = {}) {
  const API_URL = "https://openrouter.ai/api/v1/chat/completions";
  const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || ""; // Usa la misma variable

  if (!API_KEY) {
    throw new Error(" No se encontró la API key.");
  }

  // Soportar tanto max_tokens (snake_case) como maxTokens (camelCase)
  const max_tokens = options.max_tokens ?? options.maxTokens ?? 80000;
  const temperature = options.temperature ?? 0.75;
  const top_p = options.top_p ?? 0.9;
  const presence_penalty = options.presence_penalty ?? 0.3;
  const frequency_penalty = options.frequency_penalty ?? 0.25;
  const repetition_penalty = options.repetition_penalty ?? 1.1;
  const stream = options.stream ?? true;

  const body = {
    model: "deepseek/deepseek-chat", // Modelo específico 
    stream,
    max_tokens,
    temperature,
    top_p,
    presence_penalty,
    frequency_penalty,
    repetition_penalty,
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

    console.log(" Status OpenRouter:", resp.status);

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(" Error OpenRouter:", errorText);
      throw new Error(`Error ${resp.status}: ${errorText}`);
    }

    // Stream reader
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
