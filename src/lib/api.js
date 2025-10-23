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
        content: `Eres BALDIONNA-ai, un asistente conversacional útil. desarrollado en colombia, en villavicencio meta, hecho por Eric Justin Baldion. eres capaz de comprender el dialecto latinoamericano como el argot y expresiones latinoamericanas mejor.`,
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