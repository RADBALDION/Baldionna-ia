import { useEffect, useRef, useState } from "react";
import { askGeminiStream } from "../lib/api";
import "./Chat.css";
import { 
  Plus, ArrowLeft, MoreVertical, Edit2, Trash2, Send, Square, 
  Settings, Sun, Moon 
} from "lucide-react";

export default function Chat() {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(null);
  const [isScraping, setIsScraping] = useState(false);

  // Estado único de configuración
  const [settings, setSettings] = useState({
    theme: "light",
    inputPosition: "top",
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);


  const listRef = useRef(null);
  const abortControllerRef = useRef(null);

  // API Keys desde variables de entorno
  const SERPER_API_KEY = import.meta.env.VITE_SERPER_API_KEY;
  const APP_NAME = import.meta.env.VITE_APP_NAME || "BALDIONNA-ai";

  // Cerrar menús si hago click fuera
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest(".chat-menu") && !e.target.closest(".chat-menu-dropdown")) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Cargar chats y configuración desde localStorage
  useEffect(() => {
    const savedChats = localStorage.getItem("chats");
    if (savedChats) {
      const parsed = JSON.parse(savedChats);
      setChats(parsed);
      if (parsed.length > 0) setActiveChat(parsed[0].id);
    } else {
      createChat();
    }

    const savedSettings = localStorage.getItem("settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Guardar configuración y aplicar tema
  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settings));
    document.body.setAttribute("data-theme", settings.theme);
  }, [settings]);

  // Limpiar peticiones al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Autoscroll
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight + 200;
    }
  }, [chats, activeChat]);

  // Crear nuevo chat
  const createChat = () => {
    const id = Date.now().toString();
    const newChat = {
      id,
      name: "Nuevo chat",
      messages: [
        { sender: "bot", text: "Hola, soy Baldionna-ai. ¿En qué te ayudo hoy?" }
      ]
    };
    const updatedChats = [newChat, ...chats];
    setChats(updatedChats);
    setActiveChat(id);
    localStorage.setItem("chats", JSON.stringify(updatedChats));
  };

  // Renombrar
  const renameChat = (id, newName) => {
    const updatedChats = chats.map((chat) =>
      chat.id === id ? { ...chat, name: newName } : chat
    );
    setChats(updatedChats);
    localStorage.setItem("chats", JSON.stringify(updatedChats));
  };

  // Eliminar
  const deleteChat = (id) => {
    const updatedChats = chats.filter((chat) => chat.id !== id);
    setChats(updatedChats);
    localStorage.setItem("chats", JSON.stringify(updatedChats));
    if (activeChat === id) {
      setActiveChat(updatedChats.length > 0 ? updatedChats[0].id : null);
    }
  };

  // Parsear Markdown
  const parseMarkdown = (text) => {
    if (!text) return "";
    let html = text;
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");
    html = html.replace(/^\s*-\s+(.*)/gim, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/gim, "<ul>$1</ul>");
    html = html.replace(/\n/g, "<br />");
    return html;
  };

  // Enviar mensaje o detener
  const handleSend = async () => {
    if (isTyping) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsTyping(false);
      }
      return;
    }

    if (!input.trim() || !activeChat) return;

    const text = input.trim();
    setInput("");

    let updatedChats = chats.map((chat) => {
      if (chat.id === activeChat) {
        const updated = {
          ...chat,
          messages: [...chat.messages, { sender: "user", text }]
        };
        if (chat.messages.length === 1) {
          updated.name = text.slice(0, 30);
        }
        return updated;
      }
      return chat;
    });

    setChats(updatedChats);
    localStorage.setItem("chats", JSON.stringify(updatedChats));

    const botIndex = updatedChats.find((c) => c.id === activeChat).messages.length;
    updatedChats = updatedChats.map((chat) =>
      chat.id === activeChat
        ? { ...chat, messages: [...chat.messages, { sender: "bot", text: "" }] }
        : chat
    );
    setChats(updatedChats);
    localStorage.setItem("chats", JSON.stringify(updatedChats));

    setIsTyping(true);

    if (abortControllerRef.current) {
      try { abortControllerRef.current.abort(); } catch (e) {}
    }
    abortControllerRef.current = new AbortController();

    try {
      await askGeminiStream(
        text,
        (chunk) => {
          setChats((prevChats) => {
            const newChats = prevChats.map((chat) => {
              if (chat.id === activeChat) {
                const updated = [...chat.messages];
                updated[botIndex] = {
                  sender: "bot",
                  text: (updated[botIndex]?.text || "") + chunk
                };
                return { ...chat, messages: updated };
              }
              return chat;
            });
            localStorage.setItem("chats", JSON.stringify(newChats));
            return newChats;
          });
        },
        abortControllerRef.current.signal
      );
    } catch (err) {
      console.error("Error askDeepSeekStream:", err);
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === activeChat) {
            const updated = [...chat.messages];
            updated[botIndex] = { sender: "bot", text: "❌ Error al conectar con la API." };
            return { ...chat, messages: updated };
          }
          return chat;
        })
      );
    } finally {
      setIsTyping(false);
    }
  };

  // SCRAPING CON JINA AI - CON TU API KEY
  const scrapeWithJinaAI = async (url) => {
    try {
      console.log("🔍 Scraping con Jina AI:", url);
      const response = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          'Authorization': 'Bearer jina_8b9cf0c3d9b947419d845f92d52552f43v7gpNPDJJUxA1HuXLINb7Q9lvLr',
          'X-With-Generated-Alt': 'true'
        }
      });
      
      if (response.ok) {
        const content = await response.text();
        return content
          .replace(/\s+/g, ' ')
          .substring(0, 4000)
          .trim();
      }
      return null;
    } catch (error) {
      console.error("Error Jina AI:", error);
      return null;
    }
  };

  // SCRAPING CON CORS PROXY - ALTERNATIVA GRATUITA
  const scrapeWithCorsProxy = async (url) => {
    try {
      console.log("🔍 Scraping con CORS proxy:", url);
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const data = await response.json();
        const html = data.contents;
        
        // Extraer texto del HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        let content = tempDiv.textContent || tempDiv.innerText || "";
        
        return content
          .replace(/\s+/g, ' ')
          .substring(0, 3000)
          .trim();
      }
      return null;
    } catch (error) {
      console.error("Error CORS proxy:", error);
      return null;
    }
  };

  // Función para delay
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // BUSQUEDA HÍBRIDA MEJORADA
  const handleSearch = async () => {
    if (!input.trim() || !activeChat) return;

    const query = input.trim();
    console.log("🔍 Iniciando búsqueda híbrida:", query);

    // Agrega mensajes al chat
    const userMessage = { sender: "user", text: query };
    const analyzingMessage = { sender: "bot", text: "🔍 Analizando y recopilando información..." };

    let updatedChats = chats.map((chat) =>
      chat.id === activeChat
        ? { ...chat, messages: [...chat.messages, userMessage, analyzingMessage] }
        : chat
    );
    setChats(updatedChats);
    localStorage.setItem("chats", JSON.stringify(updatedChats));

    const botIndex = updatedChats.find((c) => c.id === activeChat).messages.length - 1;
    setIsScraping(true);

    try {
      // FASE 1: Búsqueda con Serper
      console.log("📡 Fase 1: Consultando Serper API...");
      
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": SERPER_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: query,
          gl: "es",
          hl: "es",
          num: 8
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      console.log("📦 Datos recibidos de Serper:", data);

      // FASE 2: Delay de análisis (10-12 segundos)
      console.log("⏳ Fase 2: Delay de análisis...");
      for (let i = 1; i <= 12; i++) {
        await delay(1000);
        const progressText = `🔍 Analizando y recopilando información... ${i}/12 segundos`;
        setChats((prevChats) =>
          prevChats.map((chat) => {
            if (chat.id === activeChat) {
              const updated = [...chat.messages];
              updated[botIndex] = { 
                sender: "bot", 
                text: progressText 
              };
              return { ...chat, messages: updated };
            }
            return chat;
          })
        );
      }

      // FASE 3: Scraping de contenido
      console.log("🌐 Fase 3: Realizando scraping...");
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === activeChat) {
            const updated = [...chat.messages];
            updated[botIndex] = { 
              sender: "bot", 
              text: "📖 Extrayendo contenido completo de las fuentes..." 
            };
            return { ...chat, messages: updated };
          }
          return chat;
        })
      );

      let scrapedContent = "";
      
      if (data.organic && data.organic.length > 0) {
        // Tomar los 3-4 mejores resultados para scraping
        const scrapingTargets = data.organic.slice(0, 4);
        const successfulScrapes = [];

        for (let i = 0; i < scrapingTargets.length; i++) {
          const result = scrapingTargets[i];
          
          // Hacer scraping del contenido con Jina AI
          let fullContent = await scrapeWithJinaAI(result.link);
          
          // Si Jina AI falla, intentar con CORS proxy
          if (!fullContent) {
            fullContent = await scrapeWithCorsProxy(result.link);
          }
          
          if (fullContent && fullContent.length > 200) {
            successfulScrapes.push({
              title: result.title,
              snippet: result.snippet,
              content: fullContent,
              link: result.link,
              date: result.date
            });
          }
        }

        // Construir prompt para DeepSeek
        scrapedContent = `Por favor, analiza y resume las siguientes noticias sobre "${query}":\n\n`;
        
        successfulScrapes.forEach((item, index) => {
          scrapedContent += `--- NOTICIA ${index + 1} ---\n`;
          scrapedContent += `Título: ${item.title}\n`;
          scrapedContent += `Resumen original: ${item.snippet}\n`;
          scrapedContent += `Contenido completo: ${item.content.substring(0, 1500)}\n`;
          scrapedContent += `Fuente: ${item.link}\n`;
          if (item.date) scrapedContent += `Fecha: ${item.date}\n`;
          scrapedContent += `\n`;
        });

        // Agregar otros resultados como contexto
        if (data.organic.length > successfulScrapes.length) {
          scrapedContent += `--- OTRAS FUENTES RELEVANTES ---\n`;
          data.organic.slice(successfulScrapes.length, 8).forEach((result, index) => {
            scrapedContent += `${index + 1}. ${result.title}\n`;
            scrapedContent += `Resumen: ${result.snippet}\n`;
            scrapedContent += `Enlace: ${result.link}\n\n`;
          });
        }

      } else {
        scrapedContent = `No se encontraron resultados específicos para "${query}". Por favor, intenta con una búsqueda más concreta.`;
      }

      // FASE 4: Procesar con DeepSeek
      console.log("🤖 Fase 4: Procesando con DeepSeek...");
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === activeChat) {
            const updated = [...chat.messages];
            updated[botIndex] = { 
              sender: "bot", 
              text: "🧠 Procesando y organizando la información..." 
            };
            return { ...chat, messages: updated };
          }
          return chat;
        })
      );

      // Preparar el mensaje para DeepSeek
      const geminiPrompt = `Como asistente experto en análisis de noticias, organiza y presenta la siguiente información de manera clara y estructurada en markdown. Incluye los puntos más importantes, resume la información y proporciona un análisis conciso:\n\n${scrapedContent}`;

      // Limpiar el mensaje actual y preparar para streaming
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === activeChat) {
            const updated = [...chat.messages];
            updated[botIndex] = { 
              sender: "bot", 
              text: "" 
            };
            return { ...chat, messages: updated };
          }
          return chat;
        })
      );

      // Usar DeepSeek para procesar y mostrar el resultado
      setIsTyping(true);

      if (abortControllerRef.current) {
        try { abortControllerRef.current.abort(); } catch (e) {}
      }
      abortControllerRef.current = new AbortController();

      await askGeminiStream(
        deepSeekPrompt,
        (chunk) => {
          setChats((prevChats) => {
            const newChats = prevChats.map((chat) => {
              if (chat.id === activeChat) {
                const updated = [...chat.messages];
                updated[botIndex] = {
                  sender: "bot",
                  text: (updated[botIndex]?.text || "") + chunk
                };
                return { ...chat, messages: updated };
              }
              return chat;
            });
            localStorage.setItem("chats", JSON.stringify(newChats));
            return newChats;
          });
        },
        abortControllerRef.current.signal
      );

      console.log("✅ Búsqueda híbrida completada");

    } catch (err) {
      console.error("❌ Error en búsqueda híbrida:", err);
      
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === activeChat) {
            const updated = [...chat.messages];
            updated[botIndex] = { 
              sender: "bot", 
              text: `❌ Error al procesar la búsqueda: ${err.message}` 
            };
            return { ...chat, messages: updated };
          }
          return chat;
        })
      );
    } finally {
      setIsTyping(false);
      setIsScraping(false);
    }
  };

  const currentChat = chats.find((c) => c.id === activeChat);

  return (
    <div className={`chat-app ${settings.theme}`}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="sidebar">
          <div className="sidebar-header">
            <h4>{APP_NAME}</h4>
            <div className="flex gap-2">
              <button onClick={createChat}><Plus size={12} /></button>
              <button onClick={() => setSidebarOpen(false)}><ArrowLeft size={12} /></button>
            </div>
          </div>
          <div className="sidebar-chats">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`sidebar-chat ${activeChat === chat.id ? "active" : ""}`}
                onClick={() => setActiveChat(chat.id)}
              >
                {chat.id === editingId ? (
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={() => {
                      renameChat(chat.id, newName);
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        renameChat(chat.id, newName);
                        setEditingId(null);
                      }
                    }}
                    className="chat-rename-input"
                    autoFocus
                  />
                ) : (
                  <div className="chat-row">
                    <span>{chat.name}</span>
                    <div
                      className="chat-menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === chat.id ? null : chat.id);
                      }}
                    >
                      <MoreVertical size={18} />
                      {menuOpen === chat.id && (
                        <div className="chat-menu-dropdown">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(chat.id);
                              setNewName(chat.name);
                              setMenuOpen(null);
                            }}
                          >
                            <Edit2 size={14} /> Renombrar
                          </button>
                          <button
                            className="delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChat(chat.id);
                              setMenuOpen(null);
                            }}
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

                    {/* Configuración */}
          <div className="sidebar-footer">
            <button onClick={() => setSettingsOpen(true)}>
              <Settings size={18} /> Configuración
            </button>
          </div>

          {/* Modelos */}
          <div className="sidebar-footer1">
            <button onClick={() => setModelsOpen(true)}>
              <Square size={17} /> Modelos
            </button>
          </div>
        </div> 
      )} 

     
      

      {/* Botón para abrir sidebar */}
      {!sidebarOpen && (
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
      )}

      {/* Chat principal */}
      <div className="chat-container">
        {/* Barra de entrada dinámica */}
        {settings.inputPosition === "top" && (
          <div className="chat-input top-input">
            <input
              type="text"
              placeholder={isTyping || isScraping ? "Procesando búsqueda..." : "Escribe tu mensaje..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { 
                if (e.key === "Enter") handleSend(); 
              }}
              disabled={(isTyping || isScraping) && !input}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() && !isTyping}
            >
              {isTyping ? <Square size={18} /> : <Send size={18} />}
            </button>
            <button
              onClick={handleSearch}
              title="Búsqueda avanzada con análisis"
              disabled={!input.trim() || isTyping || isScraping}
              style={{ marginLeft: 4 }}
            >
              {isScraping ? "⏳" : "🔍"}
            </button>
          </div>
        )}

        <div ref={listRef} className="chat-box" aria-live="polite">
          {currentChat?.messages.map((m, i) => (
            <div key={i} className={`message ${m.sender === "user" ? "user" : "bot"}`}>
              {m.sender === "bot" ? (
                <div dangerouslySetInnerHTML={{ __html: parseMarkdown(m.text) }} />
              ) : (
                m.text
              )}
            </div>
          ))}
        </div>

        {settings.inputPosition === "bottom" && (
          <div className="chat-input bottom-input">
            <input
              type="text"
              placeholder={isTyping || isScraping ? "Procesando búsqueda..." : "Escribe tu mensaje..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { 
                if (e.key === "Enter") handleSend(); 
              }}
              disabled={(isTyping || isScraping) && !input}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() && !isTyping}
            >
              {isTyping ? <Square size={18} /> : <Send size={18} />}
            </button>
            <button
              onClick={handleSearch}
              title="Búsqueda avanzada con análisis"
              disabled={!input.trim() || isTyping || isScraping}
              style={{ marginLeft: 4 }}
            >
              {isScraping ? "⏳" : "🔍"}
            </button>
          </div>
        )}
      </div>

 {/* Modal de Configuración */}
{settingsOpen && (
  <div className="settings-modal">
    <div className="settings-content">
      <h3>Configuración</h3>

      {/* Tema */}
      <div className="settings-row">
        <span>Tema</span>
        <button
          onClick={() =>
            setSettings((prev) => ({
              ...prev,
              theme: prev.theme === "light" ? "dark" : "light",
            }))
          }
        >
          {settings.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          {settings.theme === "light" ? "Modo oscuro" : "Modo claro"}
        </button>
      </div>

      {/* Posición barra */}
      <div className="settings-row">
        <span>Posición de barra de texto</span>
        <select
          value={settings.inputPosition}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, inputPosition: e.target.value }))
          }
        >
          <option value="top">Arriba</option>
          <option value="bottom">Abajo</option>
        </select>
      </div>

      <div className="settings-footer">
        <button onClick={() => setSettingsOpen(false)}>Cerrar</button>
      </div>
    </div>
  </div>
)}


{/* Modal de Modelos */}
{modelsOpen && (
  <div className="settings-modal">
    <div className="settings-content">
      <h3>Modelos disponibles</h3>

      <div className="model-slider">
        {["Baldionna-ia A1", "Baldionna-ia A2", "B-IA"].map((model) => (
          <div
            key={model}
            className={`model-option ${settings.model === model ? "active" : ""}`}
            onClick={() => setSettings((prev) => ({ ...prev, model }))}
          >
            {model}
          </div>
        ))}
      </div>

      <p className="model-info">
        Modelo actual: <strong>{settings.model}</strong>
      </p>

      <div className="settings-footer">
        <button onClick={() => setModelsOpen(false)}>Cerrar</button>
      </div>
    </div>
  </div>
)}

</div>
);
}
