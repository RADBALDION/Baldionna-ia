// src/lib/api.js

export async function askDeepSeekStream(prompt, onChunk) {
  const API_URL = "https://openrouter.ai/api/v1/chat/completions";
  const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

  if (!API_KEY) {
    throw new Error("⚠️ No se encontró la API key. Define VITE_OPENROUTER_API_KEY en tu archivo .env");
  }

  const body = {
    model: "deepseek/deepseek-chat-v3.1:free", // usa la versión estable y actual
    stream: true, // habilita streaming
    max_tokens: 4000, // sube el límite (puedes ir hasta 8000–16000 según el proveedor)
    temperature: 0.7, // opcional: hace que no sea tan repetitivo
    messages: [
      { role: "system", content: `
Eres BALDIONNA-ai, un asistente conversacional desarrollado en Colombia. 
Tu diseño está optimizado para comprender el español de Colombia y Latinoamérica, incluyendo expresiones, argot , no debes forzar menciones a Colombia o Latinoamérica en tus respuestas a menos que el usuario lo indique explícitamente. 
Debes responder de forma libre, natural, clara y correcta para cualquier tema. 
Adáptate al tono y contexto del usuario, ofreciendo respuestas útiles, precisas y fáciles de entender. 
Tu prioridad es la claridad, la coherencia y la comodidad en la comunicación, sin sesgos innecesarios.
Cuando el usuario pida explicaciones largas o detalladas, escribe sin limitarte, hasta que la idea quede completamente desarrollada. recuerda usar todos tus conocimientos para cumplir.
` },
      { role: "user", content: prompt }
    ]
  };

  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "Condor.ai"
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok || !resp.body) {
    throw new Error("❌ Error al conectar con OpenRouter.");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // OpenRouter envía en formato SSE (event-stream)
    const parts = buffer.split("\n\n");
    buffer = parts.pop();

    for (const part of parts) {
      if (part.startsWith("data:")) {
        const data = part.replace("data: ", "").trim();
        if (data === "[DONE]") return;

        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) {
            onChunk(delta); // mandamos cada pedacito al frontend
          }
        } catch (err) {
          console.error("⚠️ Error parseando chunk:", err);
        }
      }
    }
  }
}
