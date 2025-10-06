// src/lib/api.js

// 🔹 Chat normal con DeepSeek
export async function askDeepSeekStream(prompt, onChunk, signal) {
  const API_URL = "https://openrouter.ai/api/v1/chat/completions";
  const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

  if (!API_KEY) {
    throw new Error("⚠️ No se encontró la API key. Define VITE_OPENROUTER_API_KEY en tu archivo .env");
  }

  const body = {
    model: "deepseek/deepseek-chat-v3.1:free",
    stream: true,
    max_tokens: 4000,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: `
Eres BALDIONNA-ai, un asistente conversacional desarrollado en Colombia. 
Tu diseño está optimizado para comprender el español de Colombia y Latinoamérica, incluyendo expresiones y argot.
No debes forzar menciones a Colombia o Latinoamérica en tus respuestas a menos que el usuario lo indique explícitamente. 
Responde de forma clara, natural y útil para cualquier tema.
`,
      },
      { role: "user", content: prompt },
    ],
  };

  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "Condor.ai",
    },
    body: JSON.stringify(body),
    signal,
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
            onChunk(delta);
          }
        } catch (err) {
          console.error("⚠️ Error parseando chunk:", err);
        }
      }
    }
  }
}

// 🔹 Modo búsqueda con You.com API (YDC)
export async function askYDCSearch(query) {
  const API_KEY = import.meta.env.VITE_YDC_API_KEY || "";
  const ENDPOINT =
    import.meta.env.VITE_YDC_ENDPOINT || "https://api.ydc-index.io/v1/search";

  if (!API_KEY) {
    throw new Error("⚠️ No se encontró la API key de YDC.");
  }

  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&num_results=3`;

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    throw new Error("❌ Error al conectar con YDC Search API.");
  }

  const data = await resp.json();
  return data;
}
