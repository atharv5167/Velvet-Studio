
import React from 'react';

interface LandingProps {
  onStart: () => void;
}

const Landing: React.FC<LandingProps> = ({ onStart }) => {
  return (
    <div className="w-full h-full p-4 md:p-10 flex items-center justify-center">
      <div className="bg-studio-canvas w-full max-w-[1440px] h-full max-h-[900px] rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col animate-in fade-in zoom-in-95 duration-1000">
        
        {/* Navbar */}
        <nav className="flex items-center justify-between px-8 md:px-16 py-8 md:py-10 z-20">
          <div className="flex items-center">
            <h1 className="text-2xl font-black tracking-tighter uppercase cursor-default">Velvet Studio.</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={onStart}
              className="px-8 py-3 bg-studio-accent text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
              Try Booth
            </button>
          </div>
        </nav>

        {/* Hero Content */}
        <main className="flex-1 px-8 md:px-16 flex flex-col md:flex-row items-center justify-between relative z-10 overflow-hidden pb-10">
          {/* Left Text Column */}
          <div className="w-full md:w-1/2 flex flex-col items-start pt-4 md:pt-0">
            <h2 className="text-4xl md:text-6xl lg:text-8xl font-black leading-[0.9] tracking-tighter uppercase mb-6 md:mb-10">
              CAPTURE THE <br /> MOMENT IN <br /> OUR BOOTH.
            </h2>
            
            <div className="flex flex-col items-start gap-8 mb-8 md:mb-12 max-w-md">
              <p className="text-studio-muted text-sm font-medium leading-relaxed opacity-80">
                Step into our cinematic photo booth experience. Featuring elegant layouts, studio-grade lighting, and instant digital reveals for your most precious memories.
              </p>
              
              <button 
                onClick={onStart}
                className="group flex items-center gap-4 bg-studio-accent text-white pl-8 pr-4 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all hover:-translate-y-1 active:translate-y-0"
              >
                ENTER STUDIO
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* Right Image Column - Responsive Sizing */}
          <div className="w-full md:w-1/2 h-full flex items-center justify-center relative mt-6 md:mt-0">
             <div className="relative w-full h-full flex items-center justify-center animate-in slide-in-from-right-20 duration-1000">
               <div className="relative group flex items-center justify-center h-full max-h-[70vh] md:max-h-[75vh] lg:max-h-[80vh]">
                 {/* Top Sign Header */}
                 <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-studio-accent text-white px-10 py-2.5 rounded-t-2xl shadow-xl z-20 hidden lg:block transform hover:scale-105 transition-transform">
                   <span className="text-xl font-black tracking-[0.4em] uppercase">PHOTOS</span>
                 </div>
                 
                 {/* Booth Image with dynamic height/width ratio */}
                 <img 
                   src="https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80&w=1200" 
                   alt="Premium Photo Booth" 
                   className="h-full w-auto object-cover rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.25)] border-[12px] border-white/80 ring-1 ring-black/5"
                 />
                 
                 {/* Ambient Polish */}
                 <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none"></div>
                 <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-studio-accent/5 rounded-full blur-3xl -z-10"></div>
                 <div className="absolute -top-4 -left-4 w-32 h-32 bg-studio-accent/5 rounded-full blur-3xl -z-10"></div>
               </div>
             </div>
          </div>
        </main>

        {/* Subtle Footer Accent */}
        <div className="absolute bottom-10 left-16 hidden md:block">
          <div className="flex items-center gap-4">
            <div className="w-12 h-px bg-black/10"></div>
            <span className="text-[8px] font-black uppercase tracking-[0.5em] text-studio-muted">Velvet Booth Studio • 2024</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
