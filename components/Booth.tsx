
import React, { useState, useEffect, useRef } from 'react';
import { BoothStage, Filter, Frame, PhotoCapture, PhotoSession, LayoutType } from '../types';
import { FILTERS, FRAMES, LAYOUTS } from '../constants';
import Curtains from './Curtains';
import CapturePreview from './CapturePreview';

interface BoothProps {
  onBack: () => void;
}

const Booth: React.FC<BoothProps> = ({ onBack }) => {
  const [stage, setStage] = useState<BoothStage>(BoothStage.CLOSED);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [sourceMode, setSourceMode] = useState<'camera' | 'upload'>('camera');
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState<Filter>(FILTERS[0]);
  const [activeFrame, setActiveFrame] = useState<Frame>(FRAMES[0]);
  const [activeLayout, setActiveLayout] = useState<LayoutType>(LayoutType.SINGLE);
  
  const [shotsTaken, setShotsTaken] = useState<PhotoCapture[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isCapturingSession, setIsCapturingSession] = useState(false);
  const [capturedSession, setCapturedSession] = useState<PhotoSession | null>(null);
  
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [isShutterActive, setIsShutterActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<number>(null);

  const activeLayoutData = LAYOUTS.find(l => l.id === activeLayout) || LAYOUTS[0];
  const shotLimit = activeLayoutData.shots;

  useEffect(() => {
    const timer = setTimeout(() => {
      setStage(BoothStage.OPENING);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Initialize camera
  useEffect(() => {
    if (stage === BoothStage.ACTIVE && sourceMode === 'camera' && !stream) {
      const initCamera = async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user"
            },
            audio: false
          });
          setStream(mediaStream);
        } catch (err) {
          console.error("Error accessing camera:", err);
          setSourceMode('upload');
        }
      };
      initCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    };
  }, [stage, sourceMode]);

  useEffect(() => {
    if (videoRef.current && stream) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play().catch(e => console.error("Playback failed:", e));
        if (previewCanvasRef.current) {
          previewCanvasRef.current.width = video.videoWidth;
          previewCanvasRef.current.height = video.videoHeight;
        }
      };
      video.oncanplay = () => setIsCameraReady(true);
    }
  }, [stream]);

  const drawGrain = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 45; 
      data[i] = noise;
      data[i + 1] = noise;
      data[i + 2] = noise;
      data[i + 3] = 35; 
    }
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCanvas.getContext('2d')?.putImageData(imageData, 0, 0);
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  };

  const renderPreview = () => {
    if (videoRef.current && previewCanvasRef.current && stream) {
      const video = videoRef.current;
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext('2d', { alpha: false });
      
      if (ctx && video.readyState >= 2 && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        // Draw Mirrored Video
        ctx.save();
        ctx.filter = `
          brightness(${activeFilter.brightness}) 
          contrast(${activeFilter.contrast}) 
          saturate(${activeFilter.saturation}) 
          ${activeFilter.cssFilter === 'none' ? '' : activeFilter.cssFilter}
        `;
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        if (activeFilter.hasGrain) {
          drawGrain(ctx, canvas.width, canvas.height);
        }
      }
    }
    requestRef.current = requestAnimationFrame(renderPreview);
  };

  useEffect(() => {
    if (stage === BoothStage.ACTIVE && sourceMode === 'camera' && stream) {
      requestRef.current = requestAnimationFrame(renderPreview);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [stage, sourceMode, activeFilter, stream]);

  const handleCurtainComplete = () => {
    setStage(BoothStage.ACTIVE);
  };

  const startSession = async () => {
    if (isCapturingSession) return;
    setIsCapturingSession(true);
    
    if (sourceMode === 'camera') {
      const sessionPhotos: PhotoCapture[] = [];
      for (let i = 0; i < shotLimit; i++) {
        await runCountdown(3);
        setIsShutterActive(true);
        setIsFlashActive(true);
        
        const photo = captureFromCanvas();
        if (photo) {
          sessionPhotos.push(photo);
          setShotsTaken([...sessionPhotos]);
        }
        
        await new Promise(r => setTimeout(r, 200));
        setIsShutterActive(false);
        setIsFlashActive(false);
        if (i < shotLimit - 1) await new Promise(r => setTimeout(r, 1200));
      }
      finalizeSession(sessionPhotos);
    } else {
      if (uploadedFiles.length < shotLimit) {
        alert(`Please upload ${shotLimit} photos.`);
        setIsCapturingSession(false);
        return;
      }
      setIsShutterActive(true);
      const processedPhotos = await Promise.all(uploadedFiles.map(async (dataUrl) => {
        const img = new Image();
        img.src = dataUrl;
        await new Promise(resolve => img.onload = resolve);
        return captureFromFileImage(img);
      }));
      setTimeout(() => {
        setIsShutterActive(false);
        finalizeSession(processedPhotos.filter(p => p !== null) as PhotoCapture[]);
      }, 500);
    }
  };

  const finalizeSession = (photos: PhotoCapture[]) => {
    setCapturedSession({ photos, frame: activeFrame, filter: activeFilter, layout: activeLayout });
    setIsCapturingSession(false);
    setShotsTaken([]);
    setUploadedFiles([]);
  };

  const runCountdown = (seconds: number) => {
    return new Promise<void>((resolve) => {
      let current = seconds;
      setCountdown(current);
      const interval = setInterval(() => {
        current -= 1;
        if (current === 0) {
          clearInterval(interval);
          setCountdown(null);
          resolve();
        } else {
          setCountdown(current);
        }
      }, 1000);
    });
  };

  const captureFromCanvas = (): PhotoCapture | null => {
    if (!previewCanvasRef.current) return null;
    return { 
      dataUrl: previewCanvasRef.current.toDataURL('image/jpeg', 0.95), 
      timestamp: Date.now() 
    };
  };

  const captureFromFileImage = (img: HTMLImageElement): PhotoCapture | null => {
    if (!captureCanvasRef.current) return null;
    const canvas = captureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    ctx.filter = `
      brightness(${activeFilter.brightness}) 
      contrast(${activeFilter.contrast}) 
      saturate(${activeFilter.saturation}) 
      ${activeFilter.cssFilter === 'none' ? '' : activeFilter.cssFilter}
    `;
    
    ctx.drawImage(img, 0, 0);
    if (activeFilter.hasGrain) {
      drawGrain(ctx, canvas.width, canvas.height);
    }
    
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.95), timestamp: Date.now() };
  };

  return (
    <div className="w-full h-full p-4 md:p-8 flex items-center justify-center">
      <div className="bg-studio-canvas w-full max-w-[1440px] h-full max-h-[900px] rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col">
        <canvas ref={captureCanvasRef} className="opacity-0 pointer-events-none absolute" />
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="opacity-0 pointer-events-none absolute w-[10px] h-[10px]" 
        />

        {/* Header Area */}
        <header className={`px-10 py-6 flex items-center justify-between border-b border-black/5 z-40 transition-opacity duration-700 ${stage === BoothStage.ACTIVE ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="text-studio-muted hover:text-black transition-colors font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth={3}/></svg> Back
            </button>
            <div className="h-4 w-px bg-black/10 hidden md:block"></div>
            <h1 className="text-lg font-black tracking-tighter uppercase hidden md:block">Velvet Studio.</h1>
          </div>

          <div className="flex bg-black/5 backdrop-blur-md p-1 rounded-xl border border-black/5">
            <button 
              onClick={() => { setSourceMode('camera'); setShotsTaken([]); setUploadedFiles([]); setIsCameraReady(false); }}
              className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sourceMode === 'camera' ? 'bg-white text-black shadow-md' : 'text-studio-muted'}`}
            >
              Camera
            </button>
            <button 
              onClick={() => { setSourceMode('upload'); setShotsTaken([]); setUploadedFiles([]); }}
              className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sourceMode === 'upload' ? 'bg-white text-black shadow-md' : 'text-studio-muted'}`}
            >
              Upload
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3">
             <div className="text-right">
                <div className="text-[10px] font-black tracking-widest uppercase">Studio Mode</div>
                <div className="text-[8px] font-bold text-studio-muted uppercase tracking-widest">{shotLimit} Shot Session</div>
             </div>
          </div>
        </header>

        {/* Main Interface Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          <section className={`flex-1 flex items-center justify-center bg-black/5 p-8 relative z-10 transition-opacity duration-700 ${stage === BoothStage.ACTIVE ? 'opacity-100' : 'opacity-0'}`}>
             <div className="relative w-full h-full flex items-center justify-center">
                {shotLimit > 1 && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-3 z-30">
                    {Array.from({ length: shotLimit }).map((_, i) => (
                      <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i < shotsTaken.length ? 'bg-black w-8' : 'bg-black/10 w-4'}`} />
                    ))}
                  </div>
                )}

                <div className={`relative transition-all duration-300 rounded-[20px] overflow-hidden shadow-2xl mx-auto ${activeFrame.className} ${isShutterActive ? 'blur-sm scale-[1.01]' : 'blur-0 scale-100'}`} style={{ maxWidth: 'fit-content' }}>
                  {sourceMode === 'camera' ? (
                    <div className="relative flex items-center justify-center bg-black/10 rounded-[4px] min-w-[320px] md:min-w-[480px] aspect-[4/3]">
                      {!isCameraReady && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 animate-pulse">
                           <div className="flex gap-2">
                             <div className="w-2 h-2 bg-black/20 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                             <div className="w-2 h-2 bg-black/20 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                             <div className="w-2 h-2 bg-black/20 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                           </div>
                           <span className="text-[9px] font-black uppercase tracking-widest text-black/40">
                             Calibrating Lens...
                           </span>
                        </div>
                      )}
                      <canvas 
                        ref={previewCanvasRef} 
                        className={`max-h-[40vh] md:max-h-[50vh] aspect-[4/3] object-cover bg-white/5 rounded-[4px] transition-opacity duration-700 ${isCameraReady ? 'opacity-100' : 'opacity-0'}`} 
                      />
                    </div>
                  ) : (
                    <div className="max-h-[40vh] md:max-h-[50vh] aspect-[4/3] bg-white/20 flex flex-col items-center justify-center min-w-[300px] md:min-w-[500px]">
                      {shotsTaken.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 p-6 w-full h-full overflow-y-auto no-scrollbar">
                          {shotsTaken.map((shot, idx) => (
                            <div key={idx} className="aspect-[4/3] rounded-xl overflow-hidden shadow-inner border border-black/5 relative group">
                               <img src={shot.dataUrl} className="w-full h-full object-cover" />
                               <button onClick={() => {
                                 const newUploads = uploadedFiles.filter((_, i) => i !== idx);
                                 setUploadedFiles(newUploads);
                                 setShotsTaken(newUploads.map(d => ({ dataUrl: d, timestamp: Date.now() })));
                               }} className="absolute top-2 right-2 w-6 h-6 bg-studio-accent text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg>
                               </button>
                            </div>
                          ))}
                          {shotsTaken.length < shotLimit && (
                            <button onClick={() => fileInputRef.current?.click()} className="aspect-[4/3] bg-black/5 border-2 border-dashed border-black/10 rounded-xl flex flex-col items-center justify-center text-studio-muted hover:text-black hover:bg-black/10 transition-all">
                               <svg className="w-6 h-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" strokeWidth={2}/></svg>
                               <span className="text-[10px] font-black uppercase tracking-widest">Add Photo {shotsTaken.length + 1}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center cursor-pointer group text-center p-10">
                          <div className="w-20 h-20 rounded-full border-2 border-dashed border-black/20 flex items-center justify-center mb-6 group-hover:border-black transition-all">
                            <svg className="w-8 h-8 text-studio-muted group-hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" strokeWidth={2}/></svg>
                          </div>
                          <span className="text-xs font-black uppercase tracking-widest text-studio-muted group-hover:text-black">Upload {shotLimit} Photos</span>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => {
                             const files = e.target.files;
                             if (!files) return;
                             const remaining = shotLimit - uploadedFiles.length;
                             const fileList = Array.from(files).slice(0, remaining);
                             const readers = fileList.map(file => {
                               return new Promise<string>((resolve) => {
                                 const reader = new FileReader();
                                 reader.onload = (ev) => resolve(ev.target?.result as string);
                                 reader.readAsDataURL(file);
                               });
                             });
                             Promise.all(readers).then(results => {
                               const newUploads = [...uploadedFiles, ...results];
                               setUploadedFiles(newUploads);
                               setShotsTaken(newUploads.map(dataUrl => ({ dataUrl, timestamp: Date.now() })));
                             });
                          }} />
                        </div>
                      )}
                    </div>
                  )}
                  {countdown !== null && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 z-20 backdrop-blur-[2px]">
                      <span className="text-white text-8xl md:text-9xl font-black drop-shadow-2xl animate-pulse tracking-tighter">{countdown}</span>
                      <span className="text-white/80 uppercase tracking-[0.5em] text-[10px] mt-4 font-black">Shot {shotsTaken.length + 1} of {shotLimit}</span>
                    </div>
                  )}
                  {isFlashActive && <div className="absolute inset-0 bg-white z-[60]" />}
                </div>
             </div>
          </section>

          {/* Control Sidebar */}
          <aside className={`w-full md:w-[380px] border-l border-black/5 flex flex-col h-full bg-white/30 backdrop-blur-xl transition-transform duration-700 ${stage === BoothStage.ACTIVE ? 'translate-x-0' : 'translate-x-full'}`}>
             <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
                
                {/* 1. Layout */}
                <section>
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center justify-between">
                     <span>Layout Selection</span>
                     <span className="text-studio-muted opacity-50">{shotsTaken.length}/{shotLimit}</span>
                   </h3>
                   <div className="grid grid-cols-2 gap-3">
                      {LAYOUTS.map(l => (
                        <button key={l.id} disabled={isCapturingSession} onClick={() => { setActiveLayout(l.id); setShotsTaken([]); setUploadedFiles([]); }}
                          className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${activeLayout === l.id ? 'bg-studio-accent text-white border-black shadow-lg scale-[1.02]' : 'bg-white/40 border-black/5 text-studio-muted hover:bg-white/60'}`}
                        >
                          {l.name}
                        </button>
                      ))}
                   </div>
                </section>

                {/* 2. Advanced Filters */}
                <section>
                   <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Cinematic Aesthetic</h3>
                      {activeFilter.hasGrain && (
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                           <span className="text-[7px] font-black uppercase tracking-widest text-studio-muted">Grain Active</span>
                        </div>
                      )}
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      {FILTERS.map(f => (
                        <button key={f.id} onClick={() => setActiveFilter(f)}
                          className={`px-3 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex flex-col gap-1 ${activeFilter.id === f.id ? 'bg-studio-accent text-white border-black shadow-md scale-[1.02]' : 'bg-white/40 border-black/5 text-studio-muted hover:bg-white/60'}`}
                        >
                          {f.name}
                        </button>
                      ))}
                   </div>
                </section>

                {/* 3. Designer Frames */}
                <section>
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4">Designer Frame</h3>
                   <div className="grid grid-cols-2 gap-2">
                      {FRAMES.map(fr => (
                        <button key={fr.id} onClick={() => setActiveFrame(fr)}
                          className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${activeFrame.id === fr.id ? 'bg-studio-accent text-white border-black shadow-md scale-[1.02]' : 'bg-white/40 border-black/5 text-studio-muted hover:bg-white/60'}`}
                        >
                          {fr.name}
                        </button>
                      ))}
                   </div>
                </section>
             </div>

             <div className="p-8 border-t border-black/5 bg-white/40">
                <button 
                  onClick={startSession} 
                  disabled={isCapturingSession || (sourceMode === 'upload' && uploadedFiles.length < shotLimit) || (sourceMode === 'camera' && !isCameraReady)}
                  className={`w-full py-6 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden group ${
                    isCapturingSession || (sourceMode === 'upload' && uploadedFiles.length < shotLimit) || (sourceMode === 'camera' && !isCameraReady)
                    ? 'bg-black/10 opacity-50 cursor-not-allowed'
                    : 'bg-studio-accent text-white shadow-2xl hover:bg-black hover:-translate-y-1'
                  }`}
                >
                   <span className="text-xs font-black uppercase tracking-[0.4em] mb-1">
                      {isCapturingSession ? 'Session Live' : sourceMode === 'camera' ? 'Start Session' : 'Create Strip'}
                   </span>
                   {!isCapturingSession && (
                     <span className="text-[8px] font-bold opacity-60 uppercase tracking-widest">
                       {sourceMode === 'camera' ? '3s Timer' : 'Process Photos'}
                     </span>
                   )}
                   {isCapturingSession && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
                </button>
             </div>
          </aside>
        </div>

        {stage !== BoothStage.ACTIVE && (
          <Curtains opening={stage === BoothStage.OPENING} onAnimationComplete={handleCurtainComplete} />
        )}

        {capturedSession && (
          <CapturePreview session={capturedSession} onClose={() => setCapturedSession(null)} />
        )}
      </div>
    </div>
  );
};

export default Booth;
