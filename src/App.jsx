// App.jsx

import { useState } from 'react'; // 1. Importa useState
import Chat from './components/Chat'; // 
import Aura from './components/aura'; //
function App() {
  // 
  const [currentView, setCurrentView] = useState('chat');

  return (
    <div className="h-screen">
      {/* 5. Renderiza un componente u otro segun el estado */}
      {currentView === 'chat' ? (
        // Pasa la función para cambiar de vista al componente Chat
        <Chat setView={setCurrentView} />
      ) : (
        // Pasa la misma función al componente Aura para que pueda volver
        <Aura setView={setCurrentView} />
      )}
    </div>
  );
}

export default App;