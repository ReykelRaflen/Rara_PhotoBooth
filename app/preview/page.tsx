'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Download, RotateCcw, Home, Check, Share2, Film, X, Loader2, PlayCircle, Video } from 'lucide-react'
import { Frame } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import GIFEncoder from 'gif-encoder-2'

export default function PreviewPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [frame, setFrame]       = useState<Frame | null>(null)
  const [photos, setPhotos]     = useState<string[]>([])
  const[videos, setVideos]     = useState<(string | null)[]>([])
  const[isMirrored, setIsMirrored] = useState(true)
  const [hasLivePhoto, setHasLivePhoto] = useState(false)

  const [stripUrl, setStripUrl] = useState<string | null>(null)
  const [generating, setGen]    = useState(true)
  const [downloadedJPG, setDlJPG] = useState(false)
  const [downloadedVid, setDlVid] = useState(false)
  
  const [isGeneratingGif, setIsGeneratingGif] = useState(false)
  const[isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    const f = sessionStorage.getItem('selected_frame')
    const p = sessionStorage.getItem('booth_photos')
    const v = sessionStorage.getItem('booth_videos')
    const m = sessionStorage.getItem('is_mirrored')
    const l = sessionStorage.getItem('use_live_photo')

    if (!f || !p) { router.push('/'); return }
    
    setFrame(JSON.parse(f))
    setPhotos(JSON.parse(p))
    if (v) {
      const parsedV = JSON.parse(v);
      setVideos(parsedV);
      if (parsedV.some((vid: string | null) => vid !== null)) setHasLivePhoto(true);
    }
    if (m) setIsMirrored(m === 'true')
    if (l === 'false') setHasLivePhoto(false)
  }, [router])

  const generate = useCallback(async () => {
    if (!canvasRef.current || !frame || photos.length === 0) return
    setGen(true)
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')!

    const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image(); img.crossOrigin = 'anonymous'
      img.onload = () => res(img); img.onerror = rej; img.src = src
    })

    try {
      const imgs = await Promise.all(photos.map(load))
      let fImg: HTMLImageElement | null = null;
      if (frame.image_url) fImg = await load(frame.image_url);

      const BASE_W = 600; 
      const BASE_H = fImg ? (BASE_W * (fImg.height / fImg.width)) : 1800; 
      const FOOTER = 100;

      canvas.width  = BASE_W; canvas.height = BASE_H + FOOTER;
      const W = canvas.width, H = canvas.height;

      ctx.fillStyle = '#FDFAF4'; ctx.fillRect(0, 0, W, H);

      const savedHoles = sessionStorage.getItem('frame_holes')
      let detectedHoles: { x: number, y: number, w: number, h: number }[] =[];
      if (savedHoles) detectedHoles = JSON.parse(savedHoles)

      imgs.forEach((img, i) => {
        if (i >= detectedHoles.length) return;
        const hole = detectedHoles[i];
        
        let hx = hole.x * BASE_W; let hy = hole.y * BASE_H;
        let hw = hole.w * BASE_W; let hh = hole.h * BASE_H;
        
        const bleed = 8;
        hx -= bleed; hy -= bleed; hw += (bleed * 2); hh += (bleed * 2);

        ctx.save();
        ctx.beginPath(); ctx.rect(hx, hy, hw, hh); ctx.clip(); 
        const scale = Math.max(hw / img.width, hh / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        ctx.translate(hx + hw / 2, hy + hh / 2);
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        ctx.restore(); 
      })

      if (fImg) ctx.drawImage(fImg, 0, 0, BASE_W, BASE_H);

      const fy = BASE_H;
      ctx.fillStyle = '#FDFAF4'; ctx.fillRect(0, fy, W, FOOTER);
      ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();
      ctx.fillStyle = '#1f2937'; ctx.font = 'italic 600 20px "Georgia", serif'; ctx.textAlign = 'center';
      ctx.fillText("✦  idadari's photobooth  ✦", W / 2, fy + 45);
      ctx.fillStyle = '#6b7280'; ctx.font = '13px "DM Mono", monospace';
      ctx.fillText(new Date().toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' }), W / 2, fy + 70);

    } catch (e) { console.error(e) }

    setStripUrl(canvas.toDataURL('image/jpeg', 0.98))
    setGen(false)
  }, [frame, photos])

  useEffect(() => { if (frame && photos.length > 0) generate() },[frame, photos, generate])

  const downloadJPG = () => {
    if (!stripUrl) return
    const a = document.createElement('a'); a.href = stripUrl; a.download = `idadari-photobooth-${Date.now()}.jpg`; a.click()
    setDlJPG(true); setTimeout(() => setDlJPG(false), 3000)
  }

  const downloadFramedVideo = async () => {
    if (!frame?.image_url || videos.length === 0) return;
    setIsGeneratingVideo(true);

    try {
      const tempCanvas = document.createElement('canvas');
      const BASE_W = 600;
      
      const fImg = new Image(); fImg.crossOrigin = 'anonymous';
      await new Promise(r => { fImg.onload = r; fImg.src = frame.image_url });
      
      const BASE_H = BASE_W * (fImg.height / fImg.width);
      const FOOTER = 100;
      tempCanvas.width = BASE_W; tempCanvas.height = BASE_H + FOOTER;
      const tCtx = tempCanvas.getContext('2d')!;

      const savedHoles = sessionStorage.getItem('frame_holes');
      let detectedHoles: any[] = savedHoles ? JSON.parse(savedHoles) :[];

      const vidElements: (HTMLVideoElement | HTMLImageElement | null)[] = await Promise.all(
        videos.map(async (url, i) => {
          if (url) {
            const v = document.createElement('video');
            v.src = url; v.muted = true; v.playsInline = true; v.loop = true;
            await v.play().catch(()=>console.log('Video play error'));
            return v;
          } else if (photos[i]) {
            const img = new Image(); img.crossOrigin = 'anonymous';
            await new Promise(r => { img.onload = r; img.src = photos[i] });
            return img;
          }
          return null;
        })
      );

      const stream = tempCanvas.captureStream(30); 
      const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] =[];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) };

      let isRecording = true;
      const drawFrame = () => {
        if (!isRecording) return;
        
        tCtx.fillStyle = '#FDFAF4'; tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        vidElements.forEach((media, i) => {
          if (!media || i >= detectedHoles.length) return;
          const hole = detectedHoles[i];
          let hx = hole.x * BASE_W; let hy = hole.y * BASE_H;
          let hw = hole.w * BASE_W; let hh = hole.h * BASE_H;
          const bleed = 8; hx -= bleed; hy -= bleed; hw += (bleed * 2); hh += (bleed * 2);

          tCtx.save();
          tCtx.beginPath(); tCtx.rect(hx, hy, hw, hh); tCtx.clip();

          let mediaW = media instanceof HTMLVideoElement ? media.videoWidth : (media as HTMLImageElement).width;
          let mediaH = media instanceof HTMLVideoElement ? media.videoHeight : (media as HTMLImageElement).height;
          
          if(mediaW === 0) mediaW = 1920; 
          if(mediaH === 0) mediaH = 1080;

          const scale = Math.max(hw / mediaW, hh / mediaH);
          const dw = mediaW * scale, dh = mediaH * scale;

          tCtx.translate(hx + hw / 2, hy + hh / 2);
          if (isMirrored) tCtx.scale(-1, 1);
          
          tCtx.drawImage(media, -dw / 2, -dh / 2, dw, dh);
          tCtx.restore();
        });

        tCtx.drawImage(fImg, 0, 0, BASE_W, BASE_H);
        const fy = BASE_H;
        tCtx.fillStyle = '#FDFAF4'; tCtx.fillRect(0, fy, tempCanvas.width, FOOTER);
        tCtx.strokeStyle = '#e5e7eb'; tCtx.lineWidth = 2; tCtx.beginPath(); tCtx.moveTo(0, fy); tCtx.lineTo(tempCanvas.width, fy); tCtx.stroke();
        tCtx.fillStyle = '#1f2937'; tCtx.font = 'italic 600 20px "Georgia", serif'; tCtx.textAlign = 'center'; tCtx.fillText("✦  idadari's photobooth  ✦", tempCanvas.width / 2, fy + 45);
        tCtx.fillStyle = '#6b7280'; tCtx.font = '13px "DM Mono", monospace'; tCtx.fillText(new Date().toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' }), tempCanvas.width / 2, fy + 70);

        requestAnimationFrame(drawFrame);
      };

      recorder.start();
      drawFrame(); 

      setTimeout(() => {
        isRecording = false;
        recorder.stop();
        
        recorder.onstop = () => {
          vidElements.forEach(v => { if (v instanceof HTMLVideoElement) { v.pause(); v.src = ''; v.load(); } });
          
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `idadari-liveframe-${Date.now()}.mp4`; a.click();
          setIsGeneratingVideo(false);
          setDlVid(true); setTimeout(() => setDlVid(false), 3000);
        };
      }, 3500);

    } catch (err) {
      console.error("Gagal membuat Live Frame Video:", err);
      setIsGeneratingVideo(false);
    }
  };

  const downloadGIF = async () => {
    if (photos.length === 0) return;
    setIsGeneratingGif(true);
    try {
      const firstImg = new Image(); await new Promise(r => { firstImg.onload = r; firstImg.src = photos[0] });
      const gifW = 600; const gifH = Math.floor(gifW * (firstImg.height / firstImg.width));

      const encoder = new GIFEncoder(gifW, gifH);
      encoder.setDelay(500); encoder.start();

      const tempCanvas = document.createElement('canvas'); tempCanvas.width = gifW; tempCanvas.height = gifH;
      const tCtx = tempCanvas.getContext('2d')!;

      for (const p of photos) {
        if (!p) continue;
        const img = new Image(); await new Promise(r => { img.onload = r; img.src = p });
        tCtx.fillStyle = '#FDFAF4'; tCtx.fillRect(0, 0, gifW, gifH);
        const scale = Math.max(gifW / img.width, gifH / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        tCtx.save(); tCtx.translate(gifW / 2, gifH / 2); tCtx.drawImage(img, -dw / 2, -dh / 2, dw, dh); tCtx.restore();
        encoder.addFrame(tCtx);
      }
      encoder.finish();
      const blob = new Blob([encoder.out.getData()], { type: 'image/gif' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `idadari-anim-${Date.now()}.gif`; a.click();
    } catch (err) { console.error(err); }
    setIsGeneratingGif(false);
  };

  return (
    <main className="min-h-screen bg-cream relative">
      {showQR && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl animate-fade-in-up">
            <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X className="w-5 h-5 text-gray-600" /></button>
            <h3 className="font-display text-2xl font-medium text-matcha-700 mb-2">Scan & Share!</h3>
            <p className="text-sm text-gray-500 mb-6 font-body">Scan this QR Code with your phone to access the photobooth site.</p>
            <div className="bg-gray-50 p-4 rounded-2xl flex justify-center mb-4 border border-gray-100">
              <QRCodeSVG value={"https://idadari-photobooth.vercel.app"} size={200} bgColor={"#ffffff"} fgColor={"#1f2937"} level={"H"} />
            </div>
          </div>
        </div>
      )}

      <header className="glass border-b border-white/60 sticky top-0 z-20 px-5 py-4 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="btn-ghost text-sm"><Home className="w-4 h-4" /> Home</button>
        <span className="font-display text-xl font-medium text-matcha-700">Preview & Save</span>
        <div className="w-24" />
      </header>

      <div className="max-w-5xl mx-auto px-5 py-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          <div className="flex-1 w-full flex flex-col items-center">
            <div className="text-center mb-6 stagger">
              <h1 className="font-display text-4xl font-light text-gray-800 mb-1">Your photostrip is ready ✨</h1>
            </div>
            
            <div className="rounded-xl overflow-hidden shadow-2xl bg-white flex items-center justify-center p-4 min-h-[70vh] w-full max-w-[500px]">
              {generating ? (
                <div className="text-center p-16">
                  <div className="w-10 h-10 border-4 border-matcha-200 border-t-matcha-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="font-body text-sm text-matcha-600 font-medium">Crafting Photostrip...</p>
                </div>
              ) : stripUrl ? (
                <img src={stripUrl} alt="Photostrip" className="w-full h-auto object-contain rounded-md shadow" />
              ) : null}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="lg:w-72 space-y-4 lg:sticky lg:top-24 w-full">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-body text-xs font-medium text-gray-400 uppercase tracking-widest">Live Photos</p>
                <p className="text-[10px] text-matcha-500 italic">Hover to play</p>
              </div>
              <div className={`grid gap-2 ${photos.length > 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {photos.map((p, i) => (
                  <div 
                    key={i} 
                    onClick={() => { sessionStorage.setItem('retake_idx', i.toString()); router.push('/booth'); }}
                    className="aspect-[4/3] rounded-xl overflow-hidden shadow-soft bg-gray-100 relative group cursor-pointer border border-gray-200 hover:border-matcha-400 transition-colors"
                    onMouseEnter={(e) => { const vid = e.currentTarget.querySelector('video'); if (vid) vid.play(); }}
                    onMouseLeave={(e) => { const vid = e.currentTarget.querySelector('video'); if (vid) { vid.pause(); vid.currentTime = 0; } }}
                  >
                    <img src={p} alt={`Photo ${i+1}`} className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0" />
                    
                    {videos[i] && (
                      <video src={videos[i]!} muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)' }} />
                    )}
                    
                    {videos[i] && (
                      <div className="absolute top-1.5 right-1.5 bg-black/40 p-1 rounded-full opacity-100 group-hover:opacity-0 transition-opacity">
                        <PlayCircle className="w-3 h-3 text-white" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <RotateCcw className="w-5 h-5 text-white mb-1" />
                      <span className="text-white text-[10px] font-medium tracking-wide">Retake</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <button onClick={downloadJPG} disabled={!stripUrl || generating} className={`w-full flex items-center justify-center gap-2 py-4 rounded-full font-body font-medium text-base transition-all duration-300 ${stripUrl && !generating ? downloadedJPG ? 'bg-green-500 text-white' : 'bg-matcha-500 hover:bg-matcha-600 text-white shadow-matcha hover:-translate-y-0.5' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>
                {downloadedJPG ? <><Check className="w-5 h-5" /> Saved Image!</> : <><Download className="w-5 h-5" /> Save Image</>}
              </button>

              {hasLivePhoto && (
                 <button onClick={downloadFramedVideo} disabled={isGeneratingVideo || generating} className={`w-full flex items-center justify-center gap-2 py-4 rounded-full font-body font-medium text-base transition-all duration-300 ${isGeneratingVideo ? 'bg-indigo-100 text-indigo-400' : downloadedVid ? 'bg-green-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:-translate-y-0.5'}`}>
                   {isGeneratingVideo ? <><Loader2 className="w-5 h-5 animate-spin" /> Rendering Video...</> : downloadedVid ? <><Check className="w-5 h-5" /> Saved Video!</> : <><Video className="w-5 h-5" /> Save Video</>}
                 </button>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <button onClick={downloadGIF} disabled={isGeneratingGif || generating} className="flex items-center justify-center gap-1.5 py-3 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium text-sm transition-colors border border-blue-100">
                  {isGeneratingGif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />} Save GIF
                </button>
                <button onClick={() => setShowQR(true)} className="flex items-center justify-center gap-1.5 py-3 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 font-medium text-sm transition-colors border border-purple-100">
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>

              <div className="h-px bg-gray-100 w-full my-2" />

              <button onClick={() => { router.push('/booth') }} className="btn-outline w-full justify-center py-3 rounded-full border-gray-200 hover:bg-gray-50 flex gap-2"><RotateCcw className="w-4 h-4" /> Retake Photos</button>
              <button onClick={() => { sessionStorage.clear(); router.push('/') }} className="w-full justify-center text-sm text-gray-400 hover:text-gray-600 flex gap-2 py-2"><Home className="w-4 h-4" /> Back to Home</button>
            </div>
          </div>

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
      `}} />
    </main>
  )
}