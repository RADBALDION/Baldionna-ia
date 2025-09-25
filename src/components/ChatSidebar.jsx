import { useState } from "react";

export default function ChatSidebar({ chats, activeChat, setActiveChat, createChat, renameChat }) {
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState("");

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>BALDIONNA-ai</h2>
        <button onClick={createChat}>+ Nuevo</button>
      </div>
      <div className="sidebar-chats">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`sidebar-chat ${activeChat === chat.id ? "active" : ""}`}
            onClick={() => setActiveChat(chat.id)}
          >
            {editingId === chat.id ? (
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
              <div className="flex justify-between items-center">
                <span>{chat.name}</span>
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
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
