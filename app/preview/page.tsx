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
    if (v) { const parsedV = JSON.parse(v); setVideos(parsedV); if (parsedV.some((vid: string | null) => vid !== null)) setHasLivePhoto(true); }
    if (m) setIsMirrored(m === 'true')
    if (l === 'false') setHasLivePhoto(false)
  }, [router])

  const generate = useCallback(async () => {
    if (!canvasRef.current || !frame || photos.length === 0) return
    setGen(true)
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')!
    const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => res(img); img.onerror = rej; img.src = src })
    try {
      const imgs = await Promise.all(photos.map(load))
      let fImg: HTMLImageElement | null = null;
      if (frame.image_url) fImg = await load(frame.image_url);
      const BASE_W = 600;
      const BASE_H = fImg ? (BASE_W * (fImg.height / fImg.width)) : 1800;
      const FOOTER = 100;
      canvas.width  = BASE_W; canvas.height = BASE_H + FOOTER;
      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = '#FFFCF5'; ctx.fillRect(0, 0, W, H);
      const savedHoles = sessionStorage.getItem('frame_holes')
      let detectedHoles: { x: number, y: number, w: number, h: number }[] =[];
      if (savedHoles) detectedHoles = JSON.parse(savedHoles)
      imgs.forEach((img, i) => {
        if (i >= detectedHoles.length) return;
        const hole = detectedHoles[i];
        let hx = hole.x * BASE_W; let hy = hole.y * BASE_H;
        let hw = hole.w * BASE_W; let hh = hole.h * BASE_H;
        const bleed = 8; hx -= bleed; hy -= bleed; hw += (bleed * 2); hh += (bleed * 2);
        ctx.save(); ctx.beginPath(); ctx.rect(hx, hy, hw, hh); ctx.clip();
        const scale = Math.max(hw / img.width, hh / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        ctx.translate(hx + hw / 2, hy + hh / 2); ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh); ctx.restore();
      })
      if (fImg) ctx.drawImage(fImg, 0, 0, BASE_W, BASE_H);
      const fy = BASE_H;
      ctx.fillStyle = '#FFFCF5'; ctx.fillRect(0, fy, W, FOOTER);
      ctx.strokeStyle = '#EDE5D3'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();
      ctx.fillStyle = '#141412'; ctx.font = 'italic 600 18px "Cormorant Garamond", Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText("idaadarii  ·  photobooth", W / 2, fy + 42);
      ctx.fillStyle = '#8C857A'; ctx.font = '11px "DM Mono", monospace';
      ctx.fillText(new Date().toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' }), W / 2, fy + 66);
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
          if (url) { const v = document.createElement('video'); v.src = url; v.muted = true; v.playsInline = true; v.loop = true; await v.play().catch(()=>{}); return v; }
          else if (photos[i]) { const img = new Image(); img.crossOrigin = 'anonymous'; await new Promise(r => { img.onload = r; img.src = photos[i] }); return img; }
          return null;
        })
      );
      const stream = tempCanvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] =[]; recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) };
      let isRecording = true;
      const drawFrame = () => {
        if (!isRecording) return;
        tCtx.fillStyle = '#FFFCF5'; tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        vidElements.forEach((media, i) => {
          if (!media || i >= detectedHoles.length) return;
          const hole = detectedHoles[i]; let hx = hole.x * BASE_W; let hy = hole.y * BASE_H; let hw = hole.w * BASE_W; let hh = hole.h * BASE_H;
          const bleed = 8; hx -= bleed; hy -= bleed; hw += (bleed * 2); hh += (bleed * 2);
          tCtx.save(); tCtx.beginPath(); tCtx.rect(hx, hy, hw, hh); tCtx.clip();
          let mediaW = media instanceof HTMLVideoElement ? media.videoWidth : (media as HTMLImageElement).width;
          let mediaH = media instanceof HTMLVideoElement ? media.videoHeight : (media as HTMLImageElement).height;
          if(mediaW === 0) mediaW = 1920; if(mediaH === 0) mediaH = 1080;
          const scale = Math.max(hw / mediaW, hh / mediaH); const dw = mediaW * scale, dh = mediaH * scale;
          tCtx.translate(hx + hw / 2, hy + hh / 2); if (isMirrored) tCtx.scale(-1, 1);
          tCtx.drawImage(media, -dw / 2, -dh / 2, dw, dh); tCtx.restore();
        });
        tCtx.drawImage(fImg, 0, 0, BASE_W, BASE_H);
        const fy = BASE_H; tCtx.fillStyle = '#FFFCF5'; tCtx.fillRect(0, fy, tempCanvas.width, FOOTER);
        tCtx.strokeStyle = '#EDE5D3'; tCtx.lineWidth = 1.5; tCtx.beginPath(); tCtx.moveTo(0, fy); tCtx.lineTo(tempCanvas.width, fy); tCtx.stroke();
        tCtx.fillStyle = '#141412'; tCtx.font = 'italic 600 18px "Cormorant Garamond", serif'; tCtx.textAlign = 'center'; tCtx.fillText("idaadarii  ·  photobooth", tempCanvas.width / 2, fy + 42);
        tCtx.fillStyle = '#8C857A'; tCtx.font = '11px "DM Mono", monospace'; tCtx.fillText(new Date().toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' }), tempCanvas.width / 2, fy + 66);
        requestAnimationFrame(drawFrame);
      };
      recorder.start(); drawFrame();
      setTimeout(() => {
        isRecording = false; recorder.stop();
        recorder.onstop = () => {
          vidElements.forEach(v => { if (v instanceof HTMLVideoElement) { v.pause(); v.src = ''; v.load(); } });
          const blob = new Blob(chunks, { type: mimeType }); const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `idadari-liveframe-${Date.now()}.mp4`; a.click();
          setIsGeneratingVideo(false); setDlVid(true); setTimeout(() => setDlVid(false), 3000);
        };
      }, 3500);
    } catch (err) { console.error(err); setIsGeneratingVideo(false); }
  };

  const downloadGIF = async () => {
    if (photos.length === 0) return;
    setIsGeneratingGif(true);
    try {
      const firstImg = new Image(); await new Promise(r => { firstImg.onload = r; firstImg.src = photos[0] });
      const gifW = 600; const gifH = Math.floor(gifW * (firstImg.height / firstImg.width));
      const encoder = new GIFEncoder(gifW, gifH); encoder.setDelay(500); encoder.start();
      const tempCanvas = document.createElement('canvas'); tempCanvas.width = gifW; tempCanvas.height = gifH;
      const tCtx = tempCanvas.getContext('2d')!;
      for (const p of photos) {
        if (!p) continue; const img = new Image(); await new Promise(r => { img.onload = r; img.src = p });
        tCtx.fillStyle = '#FFFCF5'; tCtx.fillRect(0, 0, gifW, gifH);
        const scale = Math.max(gifW / img.width, gifH / img.height); const dw = img.width * scale, dh = img.height * scale;
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
    <main className="min-h-screen bg-vanilla-50">
      {showQR && (
        <div className="fixed inset-0 z-[200] bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] p-8 max-w-sm w-full text-center relative shadow-strong border border-line">
            <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 h-9 w-9 rounded-full bg-vanilla-100 border border-line flex items-center justify-center hover:bg-vanilla-200"><X className="w-4 h-4 text-ink" /></button>
            <h3 className="font-display text-2xl font-medium text-ink">Scan & share</h3>
            <p className="mt-1 font-body text-sm text-muted">Open on your phone — send to friends instantly.</p>
            <div className="mt-5 bg-vanilla-50 p-4 rounded-2xl flex justify-center border border-line">
              <QRCodeSVG value={"https://idadari-photobooth.vercel.app"} size={200} bgColor={"#ffffff"} fgColor={"#141412"} level={"H"} />
            </div>
            <p className="mt-3 font-mono text-[11px] tracking-widest uppercase text-muted">Vanilla edition</p>
          </div>
        </div>
      )}

      {/* stepper header */}
      <header className="glass sticky top-0 z-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 h-[64px] flex items-center justify-between gap-3">
          <button onClick={()=>router.push('/')} className="h-9 w-9 rounded-full bg-white border border-line flex items-center justify-center text-muted hover:text-ink">
            <Home className="w-4 h-4" />
          </button>
          <div className="hidden sm:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-white border border-line px-2.5 py-1 font-mono text-[11px] text-muted">1 Layout ✓</span>
            <span className="rounded-full bg-white border border-line px-2.5 py-1 font-mono text-[11px] text-muted">2 Shoot ✓</span>
            <span className="rounded-full bg-ink text-white px-2.5 py-1 font-mono text-[11px]">3 Save</span>
          </div>
          <span className="sm:hidden font-mono text-[11px] tracking-widest uppercase text-muted">Step 3 of 3</span>
          <div className="flex items-center gap-2">
            <button onClick={()=>setShowQR(true)} className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white border border-line px-4 h-9 text-xs font-medium text-ink hover:bg-vanilla-50"><Share2 className="w-3.5 h-3.5"/> Share</button>
            <button onClick={downloadJPG} disabled={!stripUrl || generating} className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-5 h-9 text-xs font-medium hover:bg-ink/90 disabled:opacity-40"><Download className="w-3.5 h-3.5"/> Save image</button>
          </div>
        </div>
      </header>

      {/* stage — asymmetric bento */}
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-6 grid lg:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
        {/* left: strip */}
        <section className="min-w-0">
          <div className="flex items-baseline justify-between mb-3">
            <h1 className="font-display text-[26px] font-light tracking-tight text-ink">Your photostrip</h1>
            <span className="hidden sm:inline-flex rounded-full bg-white border border-line px-3 py-1 font-mono text-[11px] text-muted">{photos.length} photos · vanilla paper</span>
          </div>

          <div className="rounded-[28px] bg-white border border-line shadow-soft p-4 sm:p-6 flex items-center justify-center min-h-[560px]">
            {generating ? (
              <div className="text-center py-16 w-full max-w-[420px]">
                <div className="mx-auto mb-4 h-9 w-9 rounded-full border-2 border-vanilla-200 border-t-ink animate-spin" />
                <p className="font-display text-lg font-medium text-ink">Crafting photostrip…</p>
                <p className="mt-1 font-mono text-xs text-muted">Compositing {photos.length} photos into vanilla frame</p>
                <div className="mt-6 space-y-2">
                  <div className="h-2 rounded-full bg-vanilla-100 border border-line overflow-hidden">
                    <div className="h-full w-2/3 bg-ink rounded-full animate-pulse" />
                  </div>
                  <p className="font-mono text-[11px] tracking-widest uppercase text-muted/60">600px · bleed 8px · footer 100px</p>
                </div>
              </div>
            ) : stripUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stripUrl} alt="Photostrip" className="w-full max-w-[460px] h-auto rounded-[16px] border border-line shadow-soft" />
            ) : null}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <p className="mt-3 text-center font-mono text-[11px] tracking-widest uppercase text-muted/60">Tip: tap any thumbnail to retake — hover live photos to play</p>
        </section>

        {/* right: bento controls */}
        <aside className="space-y-4 lg:sticky lg:top-[80px]">
          {/* filmstrip */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[11px] tracking-widest uppercase text-muted">Captured — tap to retake</p>
              <span className="rounded-full bg-vanilla-100 border border-line px-2 py-1 font-mono text-[11px] text-ink">{photos.length}</span>
            </div>
            <div className={`grid gap-2 ${photos.length>4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {photos.map((p, i) => (
                <button key={i} onClick={() => { sessionStorage.setItem('retake_idx', i.toString()); router.push('/booth'); }}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-vanilla-50 text-left hover:border-vanilla-300"
                  onMouseEnter={(e) => { const vid = e.currentTarget.querySelector('video'); if (vid) (vid as HTMLVideoElement).play(); }}
                  onMouseLeave={(e) => { const vid = e.currentTarget.querySelector('video'); if (vid) { const v = vid as HTMLVideoElement; v.pause(); v.currentTime = 0; } }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt={`Photo ${i+1}`} className="absolute inset-0 h-full w-full object-cover group-hover:opacity-0 transition-opacity duration-300" />
                  {videos[i] && <video src={videos[i]!} muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }} />}
                  {videos[i] && <span className="absolute right-1.5 top-1.5 rounded-full bg-ink/70 p-1 group-hover:opacity-0"><PlayCircle className="w-3 h-3 text-white" /></span>}
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-ink text-white px-1.5 py-0.5 font-mono text-[10px]">{i+1}</span>
                  <span className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-colors">
                    <RotateCcw className="w-5 h-5 text-white" /><span className="mt-1 font-body text-[11px] font-medium text-white">Retake</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* actions bento */}
          <div className="card p-4">
            <div className="grid grid-cols-1 gap-3">
              <button onClick={downloadJPG} disabled={!stripUrl || generating} className={`w-full rounded-full py-4 text-[15px] font-medium inline-flex items-center justify-center gap-2 border ${stripUrl && !generating ? (downloadedJPG ? 'bg-vanilla-200 border-vanilla-300 text-ink' : 'bg-ink text-white border-ink hover:bg-ink/90 shadow-soft') : 'bg-vanilla-100 text-muted border-line cursor-not-allowed'}`}>
                {downloadedJPG ? <><Check className="w-4 h-4" /> Saved</> : <><Download className="w-4 h-4" /> Save image</>}
              </button>
              {hasLivePhoto && (
                <button onClick={downloadFramedVideo} disabled={isGeneratingVideo || generating} className={`w-full rounded-full py-4 text-[15px] font-medium inline-flex items-center justify-center gap-2 border ${isGeneratingVideo ? 'bg-vanilla-100 text-muted border-line' : downloadedVid ? 'bg-vanilla-200 border-vanilla-300 text-ink' : 'bg-white border-line text-ink hover:bg-vanilla-50'}`}>
                  {isGeneratingVideo ? <><Loader2 className="w-4 h-4 animate-spin" /> Rendering…</> : downloadedVid ? <><Check className="w-4 h-4" /> Video saved</> : <><Video className="w-4 h-4" /> Save video</>}
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={downloadGIF} disabled={isGeneratingGif || generating} className="rounded-full bg-vanilla-100 border border-line py-3.5 text-sm font-medium text-ink hover:bg-vanilla-200 inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {isGeneratingGif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />} GIF
                </button>
                <button onClick={() => setShowQR(true)} className="rounded-full bg-white border border-line py-3.5 text-sm font-medium text-ink hover:bg-vanilla-50 inline-flex items-center justify-center gap-1.5">
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>
            </div>
            <div className="mt-4 h-px bg-line" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => router.push('/booth')} className="btn-outline w-full justify-center text-sm"><RotateCcw className="w-4 h-4" /> Retake</button>
              <button onClick={() => { sessionStorage.clear(); router.push('/') }} className="btn-ghost w-full justify-center text-sm"><Home className="w-4 h-4" /> Home</button>
            </div>
            <p className="mt-3 text-center font-mono text-[11px] tracking-widest uppercase text-muted/50">Vanilla · 600px · share via QR</p>
          </div>

          {/* mobile primary dock */}
          <div className="lg:hidden card p-3 flex gap-2">
            <button onClick={downloadJPG} disabled={!stripUrl || generating} className="flex-1 rounded-full bg-ink text-white py-3.5 text-sm font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-40"><Download className="w-4 h-4"/> Save</button>
            <button onClick={()=>setShowQR(true)} className="rounded-full bg-white border border-line px-5 py-3.5 text-sm font-medium text-ink"><Share2 className="w-4 h-4"/></button>
          </div>
        </aside>
      </div>
    </main>
  )
}
