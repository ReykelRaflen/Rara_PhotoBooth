'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, RotateCcw, ChevronLeft, Zap, Focus, Check, Palette, FlipHorizontal, Loader2, Video, VideoOff } from 'lucide-react'
import { Frame } from '@/lib/supabase'

type State = 'scanning' | 'loading' | 'ready' | 'countdown' | 'done' | 'error'

const FILTERS: Record<string, string> = {
  Normal: 'none',
  'B & W': 'grayscale(100%)',
  Sepia: 'sepia(80%)',
  Vintage: 'sepia(50%) contrast(120%) brightness(90%)',
  Soft: 'contrast(90%) brightness(110%) saturate(85%)'
}

export default function BoothPage() {
  const router = useRouter()
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])

  const [frame, setFrame]          = useState<Frame | null>(null)
  const [state, setState]          = useState<State>('scanning')
  const [countdown, setCountdown]  = useState(5)
  
  const [photos, setPhotos]        = useState<(string | null)[]>([])
  const [videos, setVideos]        = useState<(string | null)[]>([]) 
  const [curIdx, setCurIdx]        = useState(0)
  const[totalHoles, setTotalHoles] = useState(3) 
  
  const [flash, setFlash]          = useState(false)
  const [camFacing, setCamFacing]  = useState<'user' | 'environment'>('user')
  const [activeFilter, setFilter]  = useState<string>('Normal')
  const[isMirrored, setIsMirrored]= useState(true) 
  const [useLivePhoto, setUseLivePhoto] = useState(true)

  const filledCount = photos.filter(p => p !== null).length

  const scanFrame = async (imageUrl: string) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imageUrl; });
    const SCAN_W = 400; const SCAN_H = Math.floor(SCAN_W * (img.height / img.width));
    const canvas = document.createElement('canvas'); canvas.width = SCAN_W; canvas.height = SCAN_H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, SCAN_W, SCAN_H);
    const imgData = ctx.getImageData(0, 0, SCAN_W, SCAN_H).data;
    const visited = new Uint8Array(SCAN_W * SCAN_H);
    const holes =[]; const queue = new Int32Array(SCAN_W * SCAN_H);

    for (let y = 0; y < SCAN_H; y++) {
      for (let x = 0; x < SCAN_W; x++) {
        const i = y * SCAN_W + x; if (visited[i]) continue;
        if (imgData[i * 4 + 3] < 128) {
          let minX = x, maxX = x, minY = y, maxY = y, head = 0, tail = 0, area = 0;
          queue[tail++] = i; visited[i] = 1;
          while (head < tail) {
            const curr = queue[head++]; const cx = curr % SCAN_W; const cy = Math.floor(curr / SCAN_W); area++;
            if (cx < minX) minX = cx; if (cx > maxX) maxX = cx; if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
            if (cx > 0) { const ni = curr - 1; if (!visited[ni] && imgData[ni * 4 + 3] < 128) { visited[ni] = 1; queue[tail++] = ni; } }
            if (cx < SCAN_W - 1) { const ni = curr + 1; if (!visited[ni] && imgData[ni * 4 + 3] < 128) { visited[ni] = 1; queue[tail++] = ni; } }
            if (cy > 0) { const ni = curr - SCAN_W; if (!visited[ni] && imgData[ni * 4 + 3] < 128) { visited[ni] = 1; queue[tail++] = ni; } }
            if (cy < SCAN_H - 1) { const ni = curr + SCAN_W; if (!visited[ni] && imgData[ni * 4 + 3] < 128) { visited[ni] = 1; queue[tail++] = ni; } }
          }
          const boxW = maxX - minX;
          const boxH = maxY - minY;
          if (area > 2000 && boxH > (SCAN_H * 0.05) && boxW > (SCAN_W * 0.1)) {
            holes.push({ x: minX / SCAN_W, y: minY / SCAN_H, w: boxW / SCAN_W, h: boxH / SCAN_H });
          }
        } else { visited[i] = 1; }
      }
    }
    holes.sort((a, b) => { if (Math.abs(a.y - b.y) < 0.05) return a.x - b.x; return a.y - b.y; });
    return holes;
  };

  useEffect(() => {
    const init = async () => {
      const s = sessionStorage.getItem('selected_frame')
      if (!s) { router.push('/choose-layout'); return }
      
      const parsedFrame = JSON.parse(s) as Frame
      setFrame(parsedFrame)

      let detectedHoles: any[] =[];
      if (parsedFrame.image_url) {
        try { detectedHoles = await scanFrame(parsedFrame.image_url) } catch (e) { console.error(e) }
      }

      const finalTotal = detectedHoles.length > 0 ? detectedHoles.length : (parseInt(parsedFrame.type) || 3)
      setTotalHoles(finalTotal)
      sessionStorage.setItem('frame_holes', JSON.stringify(detectedHoles))

      const existingPhotos = sessionStorage.getItem('booth_photos')
      const existingVideos = sessionStorage.getItem('booth_videos')
      const retakeIdx = sessionStorage.getItem('retake_idx')
      
      let initPhotos = Array(finalTotal).fill(null)
      let initVideos = Array(finalTotal).fill(null)
      
      if (existingPhotos) {
        const p = JSON.parse(existingPhotos); if (p.length === finalTotal) initPhotos = p;
      }
      if (existingVideos) {
        const v = JSON.parse(existingVideos); if (v.length === finalTotal) initVideos = v;
      }
      
      setPhotos(initPhotos); setVideos(initVideos);
      
      if (retakeIdx !== null) {
        setCurIdx(parseInt(retakeIdx))
        sessionStorage.removeItem('retake_idx')
      }
      startCamera()
    }
    init()
  },[router])

  useEffect(() => {
    if (state !== 'scanning' && frame) startCamera()
    return () => stopCamera()
  }, [camFacing])

  const startCamera = async () => {
    stopCamera()
    setState('loading')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920, max: 3840 }, height: { ideal: 1080, max: 2160 }, facingMode: camFacing },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setState('ready')
    } catch { setState('error') }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const capture = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null
    const v = videoRef.current; const c = canvasRef.current;
    c.width = v.videoWidth || 1920; c.height = v.videoHeight || 1080;
    const ctx = c.getContext('2d')!;
    ctx.save();
    ctx.filter = FILTERS[activeFilter] || 'none';
    if (isMirrored) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0, c.width, c.height);
    ctx.restore();
    return c.toDataURL('image/jpeg', 0.98);
  }, [activeFilter, isMirrored])

  const takePhoto = useCallback(() => {
    if (state !== 'ready') return
    setState('countdown')
    let c = 5 
    setCountdown(c)
    
    const tick = () => {
      c--
      setCountdown(c)
      
      if (c === 3 && streamRef.current && useLivePhoto) {
        chunksRef.current =[];
        try {
          const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
          recorderRef.current = new MediaRecorder(streamRef.current, { mimeType });
          recorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) };
          recorderRef.current.start();
        } catch (err) { console.warn("Live photo error:", err) }
      }

      if (c > 0) { 
        setTimeout(tick, 1000); 
      } else {
        setTimeout(() => {
          setFlash(true); setTimeout(() => setFlash(false), 300);
          
          const p = capture(); 
          
          if (useLivePhoto && recorderRef.current && recorderRef.current.state === 'recording') {
            recorderRef.current.onstop = () => {
              const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
              const blob = new Blob(chunksRef.current, { type: mimeType });
              const vidUrl = URL.createObjectURL(blob);
              updateData(p, vidUrl);
            };
            recorderRef.current.stop();
          } else {
            updateData(p, null);
          }
        }, 300)
      }
    }

    const updateData = (photoData: string | null, videoData: string | null) => {
        if (!photoData) { setState('ready'); return; }
        
        const newPhotos = [...photos]; newPhotos[curIdx] = photoData;
        const newVideos = [...videos]; newVideos[curIdx] = videoData;
        setPhotos(newPhotos); setVideos(newVideos);

        const nextEmpty = newPhotos.findIndex(img => img === null)
        
        if (nextEmpty === -1) {
          setState('done')
          sessionStorage.setItem('booth_photos', JSON.stringify(newPhotos))
          sessionStorage.setItem('booth_videos', JSON.stringify(newVideos)) 
          sessionStorage.setItem('is_mirrored', isMirrored.toString()) 
          sessionStorage.setItem('use_live_photo', useLivePhoto.toString()) 
        } else {
          setCurIdx(nextEmpty)
          setState('ready')
        }
    }

    setTimeout(tick, 1000)
  },[capture, state, curIdx, photos, videos, isMirrored, useLivePhoto])

  const handleRetakeAll = () => {
    setPhotos(Array(totalHoles).fill(null)); setVideos(Array(totalHoles).fill(null));
    setCurIdx(0); setState('ready');
  }

  const handleNext = () => { 
    sessionStorage.setItem('booth_photos', JSON.stringify(photos))
    sessionStorage.setItem('booth_videos', JSON.stringify(videos))
    stopCamera(); router.push('/preview') 
  }
  
  if (state === 'scanning') {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center font-body text-matcha-700">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-matcha-500" />
        <h2 className="text-2xl font-display font-medium mb-2">Analyzing Frame Layout...</h2>
        <p className="text-gray-500 text-sm">Our AI is detecting the photo slots for you ✨</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream text-gray-800 relative flex flex-col font-body">
      {flash && <div className="absolute inset-0 bg-white z-[100] transition-opacity duration-150" />}

      <header className="glass border-b border-white/60 flex items-center justify-between px-6 py-4 z-20 sticky top-0">
        <button onClick={() => { stopCamera(); router.push('/choose-layout') }} className="btn-ghost flex items-center gap-1.5 text-sm">
          <ChevronLeft className="w-4 h-4" /> Layout
        </button>
        <div className="text-center absolute left-1/2 -translate-x-1/2">
          <p className="font-display text-xl font-medium text-matcha-700 tracking-wide">{frame?.name}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setUseLivePhoto(!useLivePhoto)} 
            className={`p-2 rounded-full flex items-center gap-2 text-sm transition-colors ${useLivePhoto ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
            title={useLivePhoto ? "Live Photo: ON" : "Live Photo: OFF"}
          >
            {useLivePhoto ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button onClick={() => setIsMirrored(!isMirrored)} className={`p-2 rounded-full flex items-center gap-2 text-sm transition-colors ${isMirrored ? 'bg-matcha-100 text-matcha-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            <FlipHorizontal className="w-4 h-4" />
          </button>
          <button onClick={() => setCamFacing(f => f === 'user' ? 'environment' : 'user')} className="p-2 rounded-full flex items-center gap-2 text-sm text-gray-500 hover:bg-gray-100 transition-colors">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 relative flex items-center justify-center p-4 lg:p-8 bg-dot-pattern-light">
          {state === 'error' ? (
             <div className="text-center p-8 bg-white rounded-3xl border border-red-200 shadow-xl"><div className="text-5xl mb-4">📷</div><p className="font-display text-xl text-gray-800 mb-2">Camera Access Denied</p><button onClick={startCamera} className="bg-matcha-500 text-white px-6 py-2.5 rounded-full font-medium hover:bg-matcha-600">Try Again</button></div>
          ) : (
            <div className="relative w-full max-w-4xl aspect-[4/3] bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl ring-4 ring-white">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transition-all duration-300" style={{ filter: FILTERS[activeFilter], transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)' }} />
              
              {state === 'countdown' && countdown <= 3 && useLivePhoto && (
                <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full animate-pulse">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                  <span className="text-white text-xs font-medium tracking-widest uppercase">Live</span>
                </div>
              )}

              {state === 'countdown' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
                  <div className="font-display text-[15rem] font-medium text-white drop-shadow-2xl animate-pop">{countdown > 0 ? countdown : ''}</div>
                </div>
              )}
              {state === 'done' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-md">
                  <div className="text-center transform animate-fade-in-up bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
                    <div className="w-20 h-20 bg-matcha-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-matcha"><Check className="w-10 h-10 text-white" /></div>
                    <p className="font-display text-3xl font-medium text-gray-800 mb-2">Great Shots!</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:w-[360px] bg-white border-l border-gray-100 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.03)] relative z-10">
          <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
            {state === 'ready' && (
              <div className="bg-matcha-50 p-4 rounded-2xl border border-matcha-100">
                <div className="flex items-center gap-2 mb-3"><Palette className="w-4 h-4 text-matcha-600" /><p className="text-xs font-bold text-matcha-700 uppercase tracking-widest">Choose Filter</p></div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {Object.keys(FILTERS).map((fName) => (
                    <button key={fName} onClick={() => setFilter(fName)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeFilter === fName ? 'bg-matcha-500 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-matcha-100 border border-gray-200'}`}>{fName}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="flex justify-between items-end mb-2"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Session Progress</p><span className="text-xs font-mono text-matcha-600 font-bold bg-matcha-100 px-2 py-1 rounded-md">{filledCount} / {totalHoles}</span></div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200"><div className="h-full bg-matcha-400 rounded-full transition-all duration-500 ease-out" style={{ width: `${(filledCount / totalHoles) * 100}%` }} /></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Captured Frame</p><p className="text-[10px] text-gray-400 italic">Click photo to retake</p></div>
              <div className={`grid gap-2 ${totalHoles > 4 ? 'grid-cols-2' : 'grid-cols-1'} bg-gray-50 p-4 rounded-2xl border border-gray-100`}>
                
                {photos.map((p, i) => (
                  <div 
                    key={i} 
                    onClick={() => { 
                      // 🚀 DI SINI SUDAH SAYA PERBAIKI: Tidak ada lagi `state !== 'scanning'`
                      if (state !== 'countdown' && state !== 'loading') { 
                        setCurIdx(i); 
                        if (state === 'done') setState('ready'); 
                      } 
                    }}
                    className={`w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-200 relative transition-all duration-300 shadow-sm cursor-pointer group
                      ${i === curIdx ? 'ring-4 ring-matcha-500 ring-offset-2' : p ? 'ring-1 ring-gray-300 hover:ring-matcha-300' : 'border-2 border-dashed border-gray-300 hover:border-matcha-400'}
                      ${i === curIdx && state === 'countdown' ? 'ring-4 ring-red-300 animate-pulse' : ''}`}
                  >
                    {p ? (
                      <>
                        <img src={p} alt={`Shot ${i + 1}`} className="w-full h-full object-cover" />
                        {videos[i] && <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-md"><Video className="w-3 h-3 text-white" /></div>}
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <RotateCcw className="w-6 h-6 text-white mb-1" />
                          <span className="text-white text-xs font-medium tracking-wide">Retake</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        {i === curIdx && state === 'countdown' ? <Zap className="w-6 h-6 text-red-400 animate-bounce" /> : <span className="font-display text-2xl opacity-40">{i + 1}</span>}
                      </div>
                    )}
                  </div>
                ))}

              </div>
            </div>
          </div>
          <div className="p-6 bg-white border-t border-gray-100 space-y-3">
            {state === 'done' ? (
              <>
                <button onClick={handleNext} className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-matcha-500 hover:bg-matcha-600 text-white font-medium text-base transition-transform active:scale-95 shadow-matcha">Preview Photostrip →</button>
                <button onClick={handleRetakeAll} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 font-medium text-sm transition-colors"><RotateCcw className="w-4 h-4" /> Retake All Photos</button>
              </>
            ) : (
              <button 
                onClick={takePhoto} disabled={state !== 'ready'} 
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-full font-medium text-base transition-all duration-300 active:scale-95 ${state === 'ready' ? 'bg-matcha-500 hover:bg-matcha-600 text-white shadow-matcha' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                <Camera className="w-5 h-5" />
                {/* 🚀 DI SINI JUGA SUDAH SAYA PERBAIKI: Tidak ada lagi `state === 'scanning'` */}
                {state === 'loading' ? 'Initializing…' : state === 'countdown' ? 'Get Ready!' : photos[curIdx] ? `Retake Photo ${curIdx + 1}` : `Take Photo ${curIdx + 1}`}
              </button>
            )}
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </main>
  )
}