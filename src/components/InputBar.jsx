import { useState } from "react";
import { Send } from "lucide-react";

export default function InputBar({ onSend }) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
      <input
        className="flex-1 px-4 py-2 rounded-xl bg-neutral-900 text-white focus:outline-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe tu mensaje..."
      />
      <button
        type="submit"
        className="p-2 bg-blue-600 rounded-xl hover:bg-blue-500"
      >
        <Send size={20} />
      </button>
    </form>
  );
}
