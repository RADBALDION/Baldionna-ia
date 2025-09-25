import { useEffect, useRef, useState } from "react";
import { askDeepSeekStream } from "../lib/api";
import "./Chat.css";

export default function Chat() {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const listRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Cargar chats desde localStorage al iniciar
  useEffect(() => {
    const saved = localStorage.getItem("chats");
    if (saved) {
      const parsed = JSON.parse(saved);
      setChats(parsed);
      if (parsed.length > 0) setActiveChat(parsed[0].id);
    } else {
      createChat();
    }
  }, []);

  // Limpiar peticiones al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Autoscroll en mensajes
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
        { sender: "bot", text: "🔵 Hola, soy Baldionna-ai. ¿En qué te ayudo hoy?" }
      ]
    };
    const updatedChats = [newChat, ...chats];
    setChats(updatedChats);
    setActiveChat(id);
    localStorage.setItem("chats", JSON.stringify(updatedChats));
  };

  // Renombrar chat
  const renameChat = (id, newName) => {
    const updatedChats = chats.map((chat) =>
      chat.id === id ? { ...chat, name: newName } : chat
    );
    setChats(updatedChats);
    localStorage.setItem("chats", JSON.stringify(updatedChats));
  };

  // Eliminar chat
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

  // Enviar mensaje
  const handleSend = async () => {
    if (!input.trim() || isTyping || !activeChat) return;

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
            updated[botIndex] = { sender: "bot", text: "⚠️ Error al conectar con la API." };
            return { ...chat, messages: updated };
          }
          return chat;
        })
      );
    } finally {
      setIsTyping(false);
    }
  };

  const currentChat = chats.find((c) => c.id === activeChat);

  return (
    <div className="chat-app">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="sidebar">
          <div className="sidebar-header">
            <h4>BALDIONNA-ai</h4>
            <div className="flex gap-2">
              <button onClick={createChat}>+ Nuevo</button>
              <button onClick={() => setSidebarOpen(false)}>⬅️</button>
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
                    className="bg-gray-800 text-white px-2 py-1 w-full rounded"
                    autoFocus
                  />
                ) : (
                  <div className="flex justify-between items-center w-full">
                    <span>{chat.name}</span>
                    <div className="flex gap-1">
                      <button
                        className="rename-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(chat.id);
                          setNewName(chat.name);
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        className="rename-btn text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón para abrir sidebar si está cerrada */}
      {!sidebarOpen && (
        <button
          className="absolute top-4 left-2 bg-gray-800 text-white px-2 py-1 rounded z-50"
          onClick={() => setSidebarOpen(true)}
        >
          ➡️
        </button>
      )}

      {/* Chat principal */}
      <div className="chat-container">
        <div className="chat-header">
          <div className="logo">🔵 {currentChat?.name || "Nuevo Chat"}</div>
        </div>

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

        <div className="chat-input">
          <input
            type="text"
            placeholder={isTyping ? "El asistente está escribiendo..." : "Escribe tu mensaje..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            disabled={isTyping}
          />
          <button onClick={handleSend} disabled={isTyping}>
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
