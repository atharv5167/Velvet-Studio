
import React, { useRef, useEffect } from 'react';
import { PhotoSession, LayoutType } from '../types';

interface CapturePreviewProps {
  session: PhotoSession;
  onClose: () => void;
}

const CapturePreview: React.FC<CapturePreviewProps> = ({ session, onClose }) => {
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);
  const { photos, frame, layout, filter } = session;

  const downloadImage = () => {
    const canvas = resultCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `velvet-studio-${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 1.0);
    link.click();
  };

  const drawGrain = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 50;
      data[i] = noise;
      data[i + 1] = noise;
      data[i + 2] = noise;
      data[i + 3] = 40;
    }
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCanvas.getContext('2d')?.putImageData(imageData, 0, 0);
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  };

  useEffect(() => {
    const renderFinal = async () => {
      const canvas = resultCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const loadedImages = await Promise.all(
        photos.map(p => {
          return new Promise<HTMLImageElement>(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = p.dataUrl;
          });
        })
      );

      const singleWidth = 1000;
      const singleHeight = (loadedImages[0].height / loadedImages[0].width) * singleWidth;
      const padding = 60;
      const gap = 40;
      const footerExtra = frame.id === 'polaroid' ? 250 : 120;
      let canvasWidth = 0, canvasHeight = 0;

      if (layout === LayoutType.SINGLE) {
        canvasWidth = singleWidth + (padding * 2);
        canvasHeight = singleHeight + padding + footerExtra;
      } else if (layout === LayoutType.STRIP) {
        canvasWidth = singleWidth + (padding * 2);
        canvasHeight = (singleHeight * photos.length) + (gap * (photos.length - 1)) + padding + footerExtra;
      } else if (layout === LayoutType.GRID) {
        canvasWidth = (singleWidth * 2) + gap + (padding * 2);
        canvasHeight = (singleHeight * 2) + gap + padding + footerExtra;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      if (frame.id === 'classic-white' || frame.id === 'polaroid') ctx.fillStyle = 'white';
      else if (frame.id === 'retro-black') ctx.fillStyle = '#0a0a0a';
      else if (frame.id === 'golden') ctx.fillStyle = '#b8860b';
      else ctx.fillStyle = 'white';
      
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const drawPhoto = (img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
        ctx.save();
        // Since the photos already have filters baked into them from the Booth capture logic,
        // we just draw them. If they didn't, we'd apply filter here.
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
      };

      if (layout === LayoutType.SINGLE) {
        drawPhoto(loadedImages[0], padding, padding, singleWidth, singleHeight);
      } else if (layout === LayoutType.STRIP) {
        loadedImages.forEach((img, index) => {
          drawPhoto(img, padding, padding + (index * (singleHeight + gap)), singleWidth, singleHeight);
        });
      } else if (layout === LayoutType.GRID) {
        loadedImages.forEach((img, index) => {
          const row = Math.floor(index / 2), col = index % 2;
          drawPhoto(img, padding + (col * (singleWidth + gap)), padding + (row * (singleHeight + gap)), singleWidth, singleHeight);
        });
      }

      ctx.fillStyle = (frame.id === 'retro-black') ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)';
      ctx.font = 'bold 36px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`VELVET STUDIO • ${new Date().toLocaleDateString()}`, canvas.width / 2, canvas.height - (footerExtra / 2) + 10);
      
      if (filter.hasGrain) {
         // Re-apply grain to the entire masterpiece for extra texture
         drawGrain(ctx, canvasWidth, canvasHeight);
      }
    };
    renderFinal();
  }, [session]);

  return (
    <div className="fixed inset-0 z-[200] bg-[#1A1A1A]/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-6xl h-full flex flex-col md:flex-row items-center gap-10">
        
        <div className="flex-1 h-full flex items-center justify-center overflow-hidden">
          <div className="bg-[#D1C7BC] p-2 rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] transform rotate-1 animate-in zoom-in-95 duration-700">
            <canvas ref={resultCanvasRef} className="max-w-full h-auto rounded block shadow-2xl" style={{ maxHeight: '80vh' }} />
          </div>
        </div>

        <div className="w-full md:w-80 flex flex-col items-center md:items-start text-white text-center md:text-left">
           <div className="mb-10">
              <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Masterpiece <br /> Finalized.</h2>
              <div className="w-12 h-1 bg-white/20 mb-4 mx-auto md:mx-0"></div>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.3em] leading-relaxed">
                High-resolution {session.filter.name} session. 
                {session.filter.hasGrain && " Infused with cinematic film grain."}
              </p>
           </div>

           <div className="flex flex-col gap-3 w-full">
              <button onClick={downloadImage} className="w-full bg-white text-black py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-slate-100 transition-all hover:-translate-y-1 active:translate-y-0">
                Download JPG
              </button>
              <button onClick={onClose} className="w-full bg-white/10 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/20 transition-all">
                New Session
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CapturePreview;
