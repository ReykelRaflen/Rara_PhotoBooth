'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, RotateCcw, ChevronLeft, Zap, Focus, Check, Palette, FlipHorizontal, Loader2 } from 'lucide-react'
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

  const [frame, setFrame]          = useState<Frame | null>(null)
  const [state, setState]          = useState<State>('scanning')
  const[countdown, setCountdown]  = useState(3)
  
  const [photos, setPhotos]        = useState<(string | null)[]>([])
  const [curIdx, setCurIdx]        = useState(0)
  const [totalHoles, setTotalHoles] = useState(3) 
  
  const[flash, setFlash]          = useState(false)
  const[camFacing, setCamFacing]  = useState<'user' | 'environment'>('user')
  const[activeFilter, setFilter]  = useState<string>('Normal')
  const [isMirrored, setIsMirrored]= useState(true) 

  const filledCount = photos.filter(p => p !== null).length

  // 🚀 ALGORITMA COMPUTER VISION: PENDETEKSI LUBANG DINAMIS (BFS)
  const scanFrame = async (imageUrl: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imageUrl; });

    const SCAN_W = 400; 
    const SCAN_H = Math.floor(SCAN_W * (img.height / img.width));

    const canvas = document.createElement('canvas');
    canvas.width = SCAN_W; canvas.height = SCAN_H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, SCAN_W, SCAN_H);

    const imgData = ctx.getImageData(0, 0, SCAN_W, SCAN_H).data;
    const visited = new Uint8Array(SCAN_W * SCAN_H);
    const holes =[];

    const queue = new Int32Array(SCAN_W * SCAN_H);

    for (let y = 0; y < SCAN_H; y++) {
      for (let x = 0; x < SCAN_W; x++) {
        const i = y * SCAN_W + x;
        if (visited[i]) continue;

        if (imgData[i * 4 + 3] < 128) {
          let minX = x, maxX = x, minY = y, maxY = y;
          let head = 0, tail = 0;
          let area = 0;
          
          queue[tail++] = i;
          visited[i] = 1;

          while (head < tail) {
            const curr = queue[head++];
            const cx = curr % SCAN_W;
            const cy = Math.floor(curr / SCAN_W);
            area++;

            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;

            if (cx > 0) { const ni = curr - 1; if (!visited[ni] && imgData[ni * 4 + 3] < 128) { visited[ni] = 1; queue[tail++] = ni; } }
            if (cx < SCAN_W - 1) { const ni = curr + 1; if (!visited[ni] && imgData[ni * 4 + 3] < 128) { visited[ni] = 1; queue[tail++] = ni; } }
            if (cy > 0) { const ni = curr - SCAN_W; if (!visited[ni] && imgData[ni * 4 + 3] < 128) { visited[ni] = 1; queue[tail++] = ni; } }
            if (cy < SCAN_H - 1) { const ni = curr + SCAN_W; if (!visited[ni] && imgData[ni * 4 + 3] < 128) { visited[ni] = 1; queue[tail++] = ni; } }
          }

          if (area > 200) {
            holes.push({ x: minX / SCAN_W, y: minY / SCAN_H, w: (maxX - minX) / SCAN_W, h: (maxY - minY) / SCAN_H });
          }
        } else {
          visited[i] = 1;
        }
      }
    }

    holes.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 0.05) return a.x - b.x;
      return a.y - b.y;
    });

    return holes;
  };

  useEffect(() => {
    const init = async () => {
      const s = sessionStorage.getItem('selected_frame')
      if (!s) { router.push('/choose-layout'); return }
      
      const parsedFrame = JSON.parse(s) as Frame
      setFrame(parsedFrame)
      setState('scanning')

      let detectedHoles: any[] =[];
      if (parsedFrame.image_url) {
        try {
          detectedHoles = await scanFrame(parsedFrame.image_url)
        } catch (e) { console.error("Scan gagal, fallback ke default", e) }
      }

      const finalTotal = detectedHoles.length > 0 ? detectedHoles.length : (parseInt(parsedFrame.type) || 3)
      setTotalHoles(finalTotal)
      sessionStorage.setItem('frame_holes', JSON.stringify(detectedHoles))

      const existing = sessionStorage.getItem('booth_photos')
      const retakeIdx = sessionStorage.getItem('retake_idx')
      let initialPhotos = Array(finalTotal).fill(null)
      
      if (existing) {
        const parsed = JSON.parse(existing)
        if (parsed.length === finalTotal) initialPhotos = parsed
      }
      setPhotos(initialPhotos)
      
      if (retakeIdx !== null) {
        setCurIdx(parseInt(retakeIdx))
        sessionStorage.removeItem('retake_idx')
      }

      startCamera()
    }
    
    init()
  }, [router])

  useEffect(() => {
    if (state !== 'scanning' && frame) {
      startCamera()
    }
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
    } catch {
      setState('error')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const capture = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null
    const v = videoRef.current
    const c = canvasRef.current
    
    c.width  = v.videoWidth  || 1920
    c.height = v.videoHeight || 1080
    
    const ctx = c.getContext('2d')!
    ctx.save()
    ctx.filter = FILTERS[activeFilter] || 'none'
    
    if (isMirrored) {
      ctx.translate(c.width, 0)
      ctx.scale(-1, 1)
    }
    
    ctx.drawImage(v, 0, 0, c.width, c.height)
    ctx.restore()
    
    return c.toDataURL('image/jpeg', 0.98)
  },[camFacing, activeFilter, isMirrored])

  const takePhoto = useCallback(() => {
    if (state !== 'ready') return
    setState('countdown')
    let c = 3
    setCountdown(c)
    
    const tick = () => {
      c--
      setCountdown(c)
      if (c > 0) { 
        setTimeout(tick, 1000); 
      } else {
        setTimeout(() => {
          setFlash(true)
          setTimeout(() => setFlash(false), 300)
          
          const p = capture()
          if (p) {
            const newPhotos = [...photos]
            newPhotos[curIdx] = p 
            setPhotos(newPhotos)

            const nextEmpty = newPhotos.findIndex(img => img === null)
            
            if (nextEmpty === -1) {
              setState('done')
              sessionStorage.setItem('booth_photos', JSON.stringify(newPhotos))
            } else {
              setCurIdx(nextEmpty)
              setState('ready')
            }
          } else {
            setState('ready') // Fallback jika capture gagal
          }
        }, 300)
      }
    }
    setTimeout(tick, 1000)
  }, [capture, state, curIdx, photos])

  const handleRetakeAll = () => {
    setPhotos(Array(totalHoles).fill(null))
    setCurIdx(0)
    setState('ready')
  }

  const handleNext = () => { 
    sessionStorage.setItem('booth_photos', JSON.stringify(photos))
    stopCamera(); 
    router.push('/preview') 
  }
  
  const handleBack = () => { stopCamera(); router.push('/choose-layout') }

  if (!frame) return null

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
        <button onClick={handleBack} className="btn-ghost flex items-center gap-1.5 text-sm">
          <ChevronLeft className="w-4 h-4" /> Layout
        </button>
        <div className="text-center absolute left-1/2 -translate-x-1/2">
          <p className="font-display text-xl font-medium text-matcha-700 tracking-wide">{frame.name}</p>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Live Studio</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMirrored(!isMirrored)} 
            className={`p-2 rounded-full flex items-center gap-2 text-sm transition-colors ${isMirrored ? 'bg-matcha-100 text-matcha-700' : 'text-gray-500 hover:bg-gray-100'}`}
            title="Mirror Camera"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setCamFacing(f => f === 'user' ? 'environment' : 'user')} 
            className="p-2 rounded-full flex items-center gap-2 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
            title="Flip Camera"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 relative flex items-center justify-center p-4 lg:p-8 bg-dot-pattern-light">
          {state === 'error' ? (
             <div className="text-center p-8 bg-white rounded-3xl border border-red-200 shadow-xl">
               <div className="text-5xl mb-4">📷</div>
               <p className="font-display text-xl text-gray-800 mb-2">Camera Access Denied</p>
               <button onClick={startCamera} className="bg-matcha-500 text-white px-6 py-2.5 rounded-full font-medium hover:bg-matcha-600">Try Again</button>
             </div>
          ) : (
            <div className="relative w-full max-w-4xl aspect-[4/3] bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl ring-4 ring-white">
              <video 
                ref={videoRef} 
                autoPlay playsInline muted 
                className="w-full h-full object-cover transition-all duration-300"
                style={{ filter: FILTERS[activeFilter], transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)' }} 
              />
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
                <div className="border-r border-b border-white/50" />
                <div className="border-r border-b border-white/50" />
                <div className="border-b border-white/50" />
                <div className="border-r border-b border-white/50" />
                <div className="border-r border-b border-white/50" />
                <div className="border-b border-white/50" />
                <div className="border-r border-white/50" />
                <div className="border-r border-white/50" />
                <div></div>
              </div>
              <div className="absolute inset-8 pointer-events-none opacity-60 hidden sm:block">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-2xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-40">
                  <Focus className="w-10 h-10 stroke-[1.5]" />
                </div>
              </div>
              {state === 'countdown' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
                  <div className="font-display text-[15rem] font-medium text-white drop-shadow-2xl animate-pop">{countdown > 0 ? countdown : ''}</div>
                </div>
              )}
              {state === 'done' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-md">
                  <div className="text-center transform animate-fade-in-up bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
                    <div className="w-20 h-20 bg-matcha-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-matcha">
                      <Check className="w-10 h-10 text-white" />
                    </div>
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
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4 text-matcha-600" />
                  <p className="text-xs font-bold text-matcha-700 uppercase tracking-widest">Choose Filter</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {Object.keys(FILTERS).map((fName) => (
                    <button key={fName} onClick={() => setFilter(fName)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeFilter === fName ? 'bg-matcha-500 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-matcha-100 border border-gray-200'}`}>
                      {fName}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="flex justify-between items-end mb-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Session Progress</p>
                <span className="text-xs font-mono text-matcha-600 font-bold bg-matcha-100 px-2 py-1 rounded-md">{filledCount} / {totalHoles}</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                <div className="h-full bg-matcha-400 rounded-full transition-all duration-500 ease-out" style={{ width: `${(filledCount / totalHoles) * 100}%` }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Captured Frame</p>
                <p className="text-[10px] text-gray-400 italic">Click photo to retake</p>
              </div>
              <div className={`grid gap-2 ${totalHoles > 4 ? 'grid-cols-2' : 'grid-cols-1'} bg-gray-50 p-4 rounded-2xl border border-gray-100`}>
                
                {photos.map((p, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      // DI SINI ERRORNYA BERASAL: pengecekan state !== 'scanning' dihapus
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
                onClick={takePhoto} 
                disabled={state !== 'ready'} 
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-full font-medium text-base transition-all duration-300 active:scale-95 ${state === 'ready' ? 'bg-matcha-500 hover:bg-matcha-600 text-white shadow-matcha' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                <Camera className="w-5 h-5" />
                {/* DI SINI JUGA DIHAPUS: pengecekan state === 'scanning' */}
                {state === 'loading' ? 'Initializing…' 
                  : state === 'countdown' ? 'Get Ready!' 
                  : photos[curIdx] ? `Retake Photo ${curIdx + 1}` : `Take Photo ${curIdx + 1}`}
              </button>
            )}
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <style dangerouslySetInnerHTML={{__html: `
        .bg-dot-pattern-light { background-image: radial-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px); background-size: 24px 24px; }
        @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 40% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        .animate-pop { animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  )
}