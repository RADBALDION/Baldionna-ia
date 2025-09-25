import { motion } from "framer-motion";
import MessageBubble from "./MessageBubble";
import InputBar from "./InputBar";
import { useState } from "react";
import { askDeepSeek } from "../lib/api";

export default function ChatWindow() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hola, soy BALDIONNA-ai. ¿En qué te ayudo hoy?" }
  ]);

  const handleSend = async (text) => {
    const newMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, newMsg]);

    const reply = await askDeepSeek(text);
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
  };

  return (
    <motion.div
      className="flex flex-col h-screen max-w-3xl mx-auto p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex-1 overflow-y-auto space-y-2">
        {messages.map((msg, i) => (
          <MessageBubble key={i} role={msg.role} content={msg.content} />
        ))}
      </div>
      <InputBar onSend={handleSend} />
    </motion.div>
  );
}
