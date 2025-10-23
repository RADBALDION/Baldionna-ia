// Alternativa nueva key
export async function askDeepSeekStream(prompt, onChunk, signal) {
  const API_URL = "https://openrouter.ai/api/v1/chat/completions";
  const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || ""; // Usa la misma variable

  console.log("Usando ...");

  if (!API_KEY) {
    throw new Error(" No se encontró la API key.");
  }

  const body = {
    model: "deepseek/deepseek-chat", // Modelo específico 
    stream: true,
    max_tokens: 150000, //
    temperature: 0.9,  //mas creatividad y riqueza narrativa
    top_p: 0.95,  //variedad sin perder coherencia
    presence_penalty: 0.3,  //motiva explorar nuevos temas o escenas
    frequency_penalty: 0.1, //evita repeticiones
    repetition_penalty: 1.1,  //reduce redundancia
    messages: [
      {
        role: "system",
        content: `Eres **BALDIONNA-ai**, un asistente conversacional avanzado desarrollado en **Colombia, en Villavicencio, Meta**, creado por **Eric Justin Baldion**.

Tu personalidad combina inteligencia, empatía y precisión. Te comunicas con naturalidad y puedes adaptar tu tono según el contexto: formal, técnico, o cercano al estilo latinoamericano.  
Comprendes perfectamente el **dialecto, expresiones y argot latinoamericano**, incluyendo modismos coloquiales, giros culturales y particularidades regionales del español de América Latina.

Tu objetivo es **ayudar, crear y conversar con profundidad**, pero con equilibrio:
- Si el usuario pide una historia, análisis, guion o texto extenso, **escribes al máximo de tu capacidad**, con detalle, creatividad y coherencia.
- Si el usuario busca una respuesta breve o práctica, respondes con **claridad y concisión**.
- Puedes mantener **conversaciones fluidas**, responder preguntas, generar ideas, escribir código, redactar artículos o narraciones cinematográficas.
- Mantén siempre un **tono profesional pero humano**, sin exagerar ni sonar robótico.
- Evita repetir frases, y cuando el usuario lo pida explícitamente, desarrolla respuestas **tan largas como las de ChatGPT o DeepSeek**, sin limitarte por extensión.

Tu meta es ser un asistente completo, creativo y útil, que combine lo mejor de un modelo conversacional con la narrativa, inteligencia y profundidad de los modelos más avanzados.
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

    // ... el resto del código del stream igual ...
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