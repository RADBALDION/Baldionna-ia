import { useEffect, useRef, useState } from "react";
import { askDeepSeekStream } from "../lib/api";
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

  // Estado único de configuración
  const [settings, setSettings] = useState({
    theme: "light",
    inputPosition: "top",
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      await askDeepSeekStream(
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

  // BUSQUEDA CON SERPER (YA FUNCIONAL)
  const handleSearch = async () => {
    if (!input.trim() || !activeChat) return;

    const query = input.trim();
    console.log("🔍 Iniciando búsqueda con Serper:", query);

    // Agrega mensajes al chat
    const userMessage = { sender: "user", text: query };
    const searchingMessage = { sender: "bot", text: "🔍 Buscando información en tiempo real..." };

    let updatedChats = chats.map((chat) =>
      chat.id === activeChat
        ? { ...chat, messages: [...chat.messages, userMessage, searchingMessage] }
        : chat
    );
    setChats(updatedChats);
    localStorage.setItem("chats", JSON.stringify(updatedChats));

    const botIndex = updatedChats.find((c) => c.id === activeChat).messages.length - 1;

    try {
      console.log("📡 Consultando Serper API...");
      
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": SERPER_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: query,
          gl: "es", // España
          hl: "es"  // Español
        })
      });

      console.log("📊 Status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("📦 Datos recibidos de Serper:", data);

      // Procesar resultados
      let resultText = "No se encontraron resultados relevantes para tu búsqueda.";
      
      if (data.organic && data.organic.length > 0) {
        const bestResult = data.organic[0];
        resultText = `**${bestResult.title}**\n\n${bestResult.snippet}`;
        
        if (bestResult.link) {
          resultText += `\n\n🔗 *Fuente: ${bestResult.link}*`;
        }
        
        // Si hay answerBox (respuesta directa), usarla
        if (data.answerBox?.snippet) {
          resultText = `📋 **Respuesta directa:** ${data.answerBox.snippet}\n\n---\n${resultText}`;
        }
      } else if (data.answerBox?.snippet) {
        resultText = `📋 **Respuesta encontrada:** ${data.answerBox.snippet}`;
      } else if (data.knowledgeGraph?.description) {
        resultText = `📚 **Información:** ${data.knowledgeGraph.description}`;
      }

      console.log("✅ Resultado final:", resultText);

      // Actualizar chat
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === activeChat) {
            const updated = [...chat.messages];
            updated[botIndex] = { 
              sender: "bot", 
              text: resultText 
            };
            return { ...chat, messages: updated };
          }
          return chat;
        })
      );
      
      localStorage.setItem("chats", JSON.stringify(chats));

    } catch (err) {
      console.error("❌ Error en búsqueda Serper:", err);
      
      let errorMessage = "Error al realizar la búsqueda. ";
      
      if (err.message.includes("401")) {
        errorMessage += "API Key inválida o falta de créditos.";
      } else if (err.message.includes("429")) {
        errorMessage += "Límite de requests excedido.";
      } else if (err.message.includes("Failed to fetch")) {
        errorMessage += "Problema de conexión a internet.";
      } else {
        errorMessage += err.message;
      }

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === activeChat) {
            const updated = [...chat.messages];
            updated[botIndex] = { 
              sender: "bot", 
              text: `❌ ${errorMessage}` 
            };
            return { ...chat, messages: updated };
          }
          return chat;
        })
      );
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
              placeholder={isTyping ? "El asistente está escribiendo..." : "Escribe tu mensaje..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { 
                if (e.key === "Enter") handleSend(); 
              }}
              disabled={isTyping && !input}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() && !isTyping}
            >
              {isTyping ? <Square size={18} /> : <Send size={18} />}
            </button>
            <button
              onClick={handleSearch}
              title="Buscar con Serper"
              disabled={!input.trim() || isTyping}
              style={{ marginLeft: 4 }}
            >
              🔍
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
              placeholder={isTyping ? "El asistente está escribiendo..." : "Escribe tu mensaje..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { 
                if (e.key === "Enter") handleSend(); 
              }}
              disabled={isTyping && !input}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() && !isTyping}
            >
              {isTyping ? <Square size={18} /> : <Send size={18} />}
            </button>
            <button
              onClick={handleSearch}
              title="Buscar con Serper"
              disabled={!input.trim() || isTyping}
              style={{ marginLeft: 4 }}
            >
              🔍
            </button>
          </div>
        )}
      </div>

      {/* Modal configuración */}
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
    </div>
  );
}