
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
    <div className="w-full h-full p-0 md:p-8 flex items-center justify-center">
      <div className="bg-studio-canvas w-full max-w-[1440px] h-full md:h-[90vh] md:max-h-[900px] md:rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col">
        <canvas ref={captureCanvasRef} className="opacity-0 pointer-events-none absolute" />
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="opacity-0 pointer-events-none absolute w-[10px] h-[10px]" 
        />

        {/* Header Area */}
        <header className={`px-4 md:px-10 py-4 md:py-6 flex items-center justify-between border-b border-black/5 z-40 transition-opacity duration-700 bg-studio-canvas/80 backdrop-blur-sm shrink-0 ${stage === BoothStage.ACTIVE ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-3 md:gap-6">
            <button onClick={onBack} className="text-studio-muted hover:text-black transition-colors font-bold text-[9px] md:text-[10px] uppercase tracking-widest flex items-center gap-1.5 md:gap-2">
              <svg className="w-3.5 h-3.5 md:w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth={3}/></svg> 
              <span className="hidden xs:inline">Back</span>
            </button>
            <div className="h-4 w-px bg-black/10 hidden md:block"></div>
            <h1 className="text-sm md:text-lg font-black tracking-tighter uppercase">Velvet.</h1>
          </div>

          <div className="flex bg-black/5 backdrop-blur-md p-0.5 md:p-1 rounded-lg md:rounded-xl border border-black/5">
            <button 
              onClick={() => { setSourceMode('camera'); setShotsTaken([]); setUploadedFiles([]); setIsCameraReady(false); }}
              className={`px-3 md:px-6 py-1.5 md:py-2 rounded-md md:rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${sourceMode === 'camera' ? 'bg-white text-black shadow-md' : 'text-studio-muted'}`}
            >
              Camera
            </button>
            <button 
              onClick={() => { setSourceMode('upload'); setShotsTaken([]); setUploadedFiles([]); }}
              className={`px-3 md:px-6 py-1.5 md:py-2 rounded-md md:rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${sourceMode === 'upload' ? 'bg-white text-black shadow-md' : 'text-studio-muted'}`}
            >
              Upload
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3">
             <div className="text-right">
                <div className="text-[10px] font-black tracking-widest uppercase">Studio</div>
                <div className="text-[8px] font-bold text-studio-muted uppercase tracking-widest">{shotLimit} Shots</div>
             </div>
          </div>
        </header>

        {/* Main Interface Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          <section className={`flex-[0_0_40vh] md:flex-1 flex items-center justify-center bg-black/5 p-4 md:p-8 relative z-10 transition-opacity duration-700 min-h-0 ${stage === BoothStage.ACTIVE ? 'opacity-100' : 'opacity-0'}`}>
             <div className="relative w-full h-full flex items-center justify-center">
                {shotLimit > 1 && (
                  <div className="absolute top-2 md:top-0 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 z-30">
                    {Array.from({ length: shotLimit }).map((_, i) => (
                      <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i < shotsTaken.length ? 'bg-black w-6 md:w-8' : 'bg-black/10 w-3 md:w-4'}`} />
                    ))}
                  </div>
                )}

                <div className={`relative transition-all duration-300 rounded-xl md:rounded-[20px] overflow-hidden shadow-2xl mx-auto h-full max-h-[85%] aspect-[4/3] ${activeFrame.className} ${isShutterActive ? 'blur-sm scale-[1.01]' : 'blur-0 scale-100'}`} style={{ maxWidth: 'fit-content' }}>
                  {sourceMode === 'camera' ? (
                    <div className="relative flex items-center justify-center bg-black/10 w-full h-full">
                      {!isCameraReady && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 animate-pulse">
                           <div className="flex gap-2">
                             <div className="w-2 h-2 bg-black/20 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                             <div className="w-2 h-2 bg-black/20 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                             <div className="w-2 h-2 bg-black/20 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                           </div>
                           <span className="text-[9px] font-black uppercase tracking-widest text-black/40">
                             Lens...
                           </span>
                        </div>
                      )}
                      <canvas 
                        ref={previewCanvasRef} 
                        className={`w-full h-full object-cover bg-white/5 transition-opacity duration-700 ${isCameraReady ? 'opacity-100' : 'opacity-0'}`} 
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-white/20 flex flex-col items-center justify-center">
                      {shotsTaken.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 md:gap-3 p-3 md:p-6 w-full h-full overflow-y-auto no-scrollbar">
                          {shotsTaken.map((shot, idx) => (
                            <div key={idx} className="aspect-[4/3] rounded-lg md:rounded-xl overflow-hidden shadow-inner border border-black/5 relative group">
                               <img src={shot.dataUrl} className="w-full h-full object-cover" />
                               <button onClick={() => {
                                 const newUploads = uploadedFiles.filter((_, i) => i !== idx);
                                 setUploadedFiles(newUploads);
                                 setShotsTaken(newUploads.map(d => ({ dataUrl: d, timestamp: Date.now() })));
                               }} className="absolute top-1 right-1 md:top-2 md:right-2 w-5 h-5 md:w-6 md:h-6 bg-studio-accent text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                 <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg>
                               </button>
                            </div>
                          ))}
                          {shotsTaken.length < shotLimit && (
                            <button onClick={() => fileInputRef.current?.click()} className="aspect-[4/3] bg-black/5 border-2 border-dashed border-black/10 rounded-lg md:rounded-xl flex flex-col items-center justify-center text-studio-muted hover:text-black hover:bg-black/10 transition-all">
                               <svg className="w-5 h-5 md:w-6 md:h-6 mb-1 md:mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" strokeWidth={2}/></svg>
                               <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Add {shotsTaken.length + 1}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center cursor-pointer group text-center p-6 md:p-10">
                          <div className="w-14 h-14 md:w-20 md:h-20 rounded-full border-2 border-dashed border-black/20 flex items-center justify-center mb-4 md:mb-6 group-hover:border-black transition-all">
                            <svg className="w-6 h-6 md:w-8 md:h-8 text-studio-muted group-hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" strokeWidth={2}/></svg>
                          </div>
                          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-studio-muted group-hover:text-black">Upload {shotLimit} Photos</span>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => {
                             const files = e.target.files;
                             if (!files) return;
                             const remaining = shotLimit - uploadedFiles.length;
                             // Fix: Explicitly cast the file collection to File[] to ensure the subsequent reader.readAsDataURL 
                             // receives a Blob (which File extends), resolving the 'unknown' inference error on line 372.
                             const fileList = Array.from(files).slice(0, remaining) as File[];
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 z-20 backdrop-blur-[2px]">
                      <span className="text-white text-7xl md:text-9xl font-black drop-shadow-2xl animate-pulse tracking-tighter">{countdown}</span>
                      <span className="text-white/80 uppercase tracking-[0.5em] text-[8px] md:text-[10px] mt-2 md:mt-4 font-black">Shot {shotsTaken.length + 1}</span>
                    </div>
                  )}
                  {isFlashActive && <div className="absolute inset-0 bg-white z-[60]" />}
                </div>
             </div>
          </section>

          {/* Control Sidebar / Bottom Bar */}
          <aside className={`flex-1 w-full md:w-[380px] border-t md:border-t-0 md:border-l border-black/5 flex flex-col min-h-0 bg-white/30 backdrop-blur-xl transition-transform duration-700 ${stage === BoothStage.ACTIVE ? 'translate-x-0' : 'translate-y-full md:translate-x-full'}`}>
             <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-10 no-scrollbar">
                
                {/* 1. Layout */}
                <section>
                   <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] mb-3 flex items-center justify-between">
                     <span>Layout</span>
                     <span className="text-studio-muted opacity-50">{shotsTaken.length}/{shotLimit}</span>
                   </h3>
                   <div className="grid grid-cols-3 md:grid-cols-2 gap-2 md:gap-3">
                      {LAYOUTS.map(l => (
                        <button key={l.id} disabled={isCapturingSession} onClick={() => { setActiveLayout(l.id); setShotsTaken([]); setUploadedFiles([]); }}
                          className={`py-2.5 md:py-4 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all border ${activeLayout === l.id ? 'bg-studio-accent text-white border-black shadow-lg scale-[1.02]' : 'bg-white/40 border-black/5 text-studio-muted hover:bg-white/60'}`}
                        >
                          {l.name.replace('Shot', '').replace('Classic', '').replace('Grid', 'Grid')}
                        </button>
                      ))}
                   </div>
                </section>

                {/* 2. Filters */}
                <section>
                   <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em]">Cinematic Aesthetic</h3>
                   </div>
                   <div className="flex md:grid md:grid-cols-2 gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 no-scrollbar">
                      {FILTERS.map(f => (
                        <button key={f.id} onClick={() => setActiveFilter(f)}
                          className={`flex-shrink-0 md:flex-shrink px-4 md:px-3 py-2.5 md:py-3 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all border flex flex-col gap-1 ${activeFilter.id === f.id ? 'bg-studio-accent text-white border-black shadow-md scale-[1.02]' : 'bg-white/40 border-black/5 text-studio-muted hover:bg-white/60'}`}
                        >
                          {f.name}
                        </button>
                      ))}
                   </div>
                </section>

                {/* 3. Designer Frames */}
                <section>
                   <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] mb-3">Designer Frame</h3>
                   <div className="flex md:grid md:grid-cols-2 gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 no-scrollbar">
                      {FRAMES.map(fr => (
                        <button key={fr.id} onClick={() => setActiveFrame(fr)}
                          className={`flex-shrink-0 md:flex-shrink px-4 md:px-3 py-2.5 md:py-3 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all border ${activeFrame.id === fr.id ? 'bg-studio-accent text-white border-black shadow-md scale-[1.02]' : 'bg-white/40 border-black/5 text-studio-muted hover:bg-white/60'}`}
                        >
                          {fr.name}
                        </button>
                      ))}
                   </div>
                </section>
             </div>

             <div className="p-4 md:p-8 border-t border-black/5 bg-white/50 backdrop-blur-md sticky bottom-0 z-50 shrink-0">
                <button 
                  onClick={startSession} 
                  disabled={isCapturingSession || (sourceMode === 'upload' && uploadedFiles.length < shotLimit) || (sourceMode === 'camera' && !isCameraReady)}
                  className={`w-full py-4 md:py-6 rounded-xl md:rounded-2xl flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden group shadow-xl ${
                    isCapturingSession || (sourceMode === 'upload' && uploadedFiles.length < shotLimit) || (sourceMode === 'camera' && !isCameraReady)
                    ? 'bg-black/10 opacity-50 cursor-not-allowed'
                    : 'bg-studio-accent text-white hover:bg-black hover:-translate-y-1 active:scale-95'
                  }`}
                >
                   <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] mb-0.5 md:mb-1">
                      {isCapturingSession ? 'Recording...' : sourceMode === 'camera' ? 'Capture Moments' : 'Build Masterpiece'}
                   </span>
                   {!isCapturingSession && (
                     <span className="text-[7px] md:text-[8px] font-bold opacity-60 uppercase tracking-widest">
                       {sourceMode === 'camera' ? '3 Second Timer' : 'Merge Assets'}
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
