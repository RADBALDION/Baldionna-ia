import { useState } from "react";
import Chat from "./components/Chat";
import Aura from "./components/aura";

export default function App() {
  const [view, setView] = useState("chat"); // Vista inicial: Chat

  return (
    <div className="app-container">
      {view === "chat" && <Chat setView={setView} />}
      {view === "aura" && <Aura setView={setView} />}
    </div>
  );
}
