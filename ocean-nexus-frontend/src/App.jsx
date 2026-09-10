import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import FloatChatDashboard from './components/FloatChatDashboard';

function App() {
  const [isDived, setIsDived] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden font-sans">
      {!isDived ? (
        <LandingPage onDive={() => setIsDived(true)} />
      ) : (
        <FloatChatDashboard onBack={() => setIsDived(false)} />
      )}
    </div>
  );
}

export default App;