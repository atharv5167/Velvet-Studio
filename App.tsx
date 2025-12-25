
import React, { useState } from 'react';
import Landing from './components/Landing';
import Booth from './components/Booth';
import { View } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.LANDING);

  const startBooth = () => setView(View.BOOTH);
  const backToLanding = () => setView(View.LANDING);

  return (
    <div className="w-full h-screen overflow-hidden bg-slate-950 relative">
      {view === View.LANDING ? (
        <Landing onStart={startBooth} />
      ) : (
        <Booth onBack={backToLanding} />
      )}
    </div>
  );
};

export default App;
