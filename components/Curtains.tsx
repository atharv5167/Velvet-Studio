
import React, { useEffect, useState } from 'react';

interface CurtainsProps {
  opening: boolean;
  onAnimationComplete: () => void;
}

const Curtains: React.FC<CurtainsProps> = ({ opening, onAnimationComplete }) => {
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (opening) {
      setHasStarted(true);
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [opening, onAnimationComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex pointer-events-none overflow-hidden">
      {/* Left Panel */}
      <div 
        className={`w-1/2 h-full bg-[#7D0A0A] curtain-texture shadow-[10px_0_30px_rgba(0,0,0,0.5)] z-10 transition-transform duration-[2000ms] ease-in-out`}
        style={{ transform: hasStarted ? 'translateX(-100%)' : 'translateX(0)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />
      </div>

      {/* Right Panel */}
      <div 
        className={`w-1/2 h-full bg-[#7D0A0A] curtain-texture shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10 transition-transform duration-[2000ms] ease-in-out`}
        style={{ transform: hasStarted ? 'translateX(100%)' : 'translateX(0)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-transparent to-black/20" />
      </div>

      {/* Welcome Message */}
      {!hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <div className="text-white text-center animate-in fade-in zoom-in duration-700">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">VELVET STUDIO.</h2>
            <div className="flex items-center justify-center gap-4">
               <div className="w-12 h-px bg-white/30"></div>
               <p className="text-white/60 uppercase tracking-[0.4em] text-[10px] font-black">Ready to Shoot</p>
               <div className="w-12 h-px bg-white/30"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Curtains;
