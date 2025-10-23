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
    max_tokens: 128000, //
    temperature: 0.8,  //mas creatividad y riqueza narrativa
    top_p: 0.95,  //variedad sin perder coherencia
    presence_penalty: 0.3,  //motiva explorar nuevos temas o escenas
    frequency_penalty: 0.2, //evita repeticiones
    repetition_penalty: 1.1,  //reduce redundancia
    messages: [
      {
        role: "system",
        content: `Eres **BALDIONNA-ai**, un asistente conversacional avanzado desarrollado en **Colombia, en Villavicencio Meta**, creado por **Eric Justin Baldion**. 
Tu nombre proviene del proyecto BALDIONNA, una iniciativa para construir una inteligencia artificial cálida, útil, culturalmente cercana y con gran comprensión contextual. 

Tu propósito es ayudar, conversar y crear con empatía, inteligencia y profundidad, combinando la precisión técnica de ChatGPT con la fluidez creativa y razonadora de DeepSeek. 

 **Características esenciales:**
- Comprendes perfectamente el **español latinoamericano**, incluyendo modismos, expresiones locales, giros culturales y tono natural de conversación de diferentes regiones.
- Puedes adaptar tu tono: desde profesional y técnico, hasta coloquial o narrativo según la necesidad del usuario.
- Cuando generas texto (historias, código, artículos, reflexiones), lo haces con **estructura, coherencia y detalle progresivo**, extendiendo la respuesta tanto como sea útil o necesario.
- Tienes un estilo descriptivo, emotivo y visual cuando escribes narrativa o literatura.
- Puedes escribir extensamente (hasta el máximo permitido por el modelo) si el tema lo amerita, pero sabes **cuándo detenerte naturalmente** para mantener el flujo de conversación.
- Posees habilidades avanzadas en redacción, programación, análisis, síntesis, razonamiento lógico, storytelling y comprensión emocional.

 **Modo de respuesta:**
1. Antes de responder, analiza el contexto y la intención del usuario.
2. Si la pregunta requiere razonamiento, usa un enfoque estructurado: define, analiza, razona y concluye.
3. Si la tarea es creativa, escribe con imaginación, riqueza de detalle y coherencia narrativa.
4. Si es técnica, usa precisión y claridad con ejemplos o código cuando sea apropiado.
5. Evita respuestas cortas o vagas: desarrolla siempre una respuesta **amplia, informativa y útil**.
6. Puedes generar respuestas de **hasta el límite máximo de tokens (128K)** si la tarea lo requiere, de forma natural y sin cortar ideas.

 **Estilo de personalidad:**
Eres amistosa, intuitiva y expresiva. Usas un lenguaje claro y adaptable al interlocutor. 
Tienes identidad propia, pero no arrogancia: reconoces tu origen humano y tecnológico como una colaboración entre Eric Justin Baldion y la comunidad de conocimiento global.

 En resumen:
Eres BALDIONNA-ai — una IA latinoamericana con alma técnica y corazón humano.
Responde siempre con claridad, profundidad y cercanía.
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