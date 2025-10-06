const API_KEY = "ydc-sk-c58cfa4f606d6450-An4pu0qpGtA88Ex2E6lRjzu34dXxDKpb-67c102ed<__>1SEB93ETU8N2v5f4naIWcLAY"; // tu clave real
const query = "últimas noticias de tecnología";

const endpoints = [
  "https://api.ydc-index.io/search",
  "https://api.ydc-index.io/v1/search",
  "https://api.ydc-index.io/v1/query",
  "https://api.ydc-index.io/query",
];

async function test() {
  for (const url of endpoints) {
    try {
      console.log("\n🔎 Probando:", url);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify({
          query,
          num_results: 3,
        }),
      });

      const data = await res.json();
      console.log("✅ Respuesta:", data);
    } catch (err) {
      console.error("❌ Error en", url, err.message);
    }
  }
}

test();
