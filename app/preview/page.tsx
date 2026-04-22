'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Download, RotateCcw, Home, Check, Layout, Grid } from 'lucide-react'
import { Frame } from '@/lib/supabase'

type LayoutType = 'vertical' | 'grid'

export default function PreviewPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [frame, setFrame]       = useState<Frame | null>(null)
  const[photos, setPhotos]     = useState<string[]>([])
  const [stripUrl, setStripUrl] = useState<string | null>(null)
  const [generating, setGen]    = useState(true)
  const [layout, setLayout]     = useState<LayoutType>('vertical')
  const[downloaded, setDl]     = useState(false)

  useEffect(() => {
    const f = sessionStorage.getItem('selected_frame')
    const p = sessionStorage.getItem('booth_photos')
    if (!f || !p) { router.push('/'); return }
    const frameData  = JSON.parse(f) as Frame
    const photosData = JSON.parse(p) as string[]
    setFrame(frameData)
    setPhotos(photosData)
    setLayout(photosData.length >= 6 ? 'grid' : 'vertical')
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
      if (frame.image_url) {
        fImg = await load(frame.image_url)
      }

      const BASE_W = 600; 
      const BASE_H = fImg ? (BASE_W * (fImg.height / fImg.width)) : 1800; 
      const FOOTER = 100;

      const cols = layout === 'grid' && photos.length === 6 ? 2 : 1;
      canvas.width  = BASE_W * cols;
      canvas.height = BASE_H + FOOTER;
      const W = canvas.width, H = canvas.height;

      ctx.fillStyle = '#FDFAF4'; 
      ctx.fillRect(0, 0, W, H);

      let rawHoles: { minX: number, maxX: number, minY: number, maxY: number }[] =[];
      let detectedHoles: { x: number, y: number, w: number, h: number }[] =[];

      if (fImg) {
        const tempC = document.createElement('canvas');
        tempC.width = BASE_W; tempC.height = BASE_H;
        const tCtx = tempC.getContext('2d', { willReadFrequently: true })!;
        tCtx.drawImage(fImg, 0, 0, BASE_W, BASE_H);
        
        const imgData = tCtx.getImageData(0, 0, BASE_W, BASE_H).data;
        const rowData =[];

        for (let y = 0; y < BASE_H; y++) {
          let transCount = 0;
          let minX = BASE_W, maxX = 0;
          for (let x = 0; x < BASE_W; x++) {
            if (imgData[(y * BASE_W + x) * 4 + 3] < 128) {
              transCount++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
            }
          }
          rowData.push({ transCount, minX, maxX });
        }

        let inHole = false;
        let curHole: any = null;

        for (let y = 0; y < BASE_H; y++) {
          if (rowData[y].transCount > 5) {
            if (!inHole) {
              inHole = true;
              curHole = { minY: y, maxY: y, minX: rowData[y].minX, maxX: rowData[y].maxX };
            } else {
              curHole.maxY = y;
              if (rowData[y].minX < curHole.minX) curHole.minX = rowData[y].minX;
              if (rowData[y].maxX > curHole.maxX) curHole.maxX = rowData[y].maxX;
            }
          } else {
            if (inHole) {
              inHole = false;
              rawHoles.push(curHole);
            }
          }
        }
        if (inHole) rawHoles.push(curHole);

        detectedHoles = rawHoles
          .filter(h => (h.maxY - h.minY) > (BASE_H * 0.05)) 
          .map(h => {
            const bleed = 5; 
            return {
              x: Math.max(0, h.minX - bleed),
              y: Math.max(0, h.minY - bleed),
              w: (h.maxX - h.minX) + (bleed * 2),
              h: (h.maxY - h.minY) + (bleed * 2)
            };
          });
      }

      imgs.forEach((img, i) => {
        const col = cols === 2 ? i % 2 : 0;
        const row = cols === 2 ? Math.floor(i / 2) : i; 

        let hx = 0, hy = 0, hw = 0, hh = 0;

        if (detectedHoles.length > 0) {
          const hole = detectedHoles[row] || detectedHoles[detectedHoles.length - 1];
          hx = hole.x + (col * BASE_W);
          hy = hole.y;
          hw = hole.w;
          hh = hole.h;
        } else {
          hw = BASE_W * 0.8; hh = (BASE_H / 3) * 0.8;
          hx = (BASE_W * 0.1) + (col * BASE_W); hy = (BASE_H / 3) * row + 50;
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(hx, hy, hw, hh);
        ctx.clip(); 

        const scale = Math.max(hw / img.width, hh / img.height);
        const dw = img.width * scale, dh = img.height * scale;

        ctx.translate(hx + hw / 2, hy + hh / 2);
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        ctx.restore(); 
      })

      if (fImg) {
        for (let c = 0; c < cols; c++) {
          ctx.drawImage(fImg, c * BASE_W, 0, BASE_W, BASE_H);
        }
      }

      const fy = BASE_H;
      ctx.fillStyle = '#FDFAF4'; ctx.fillRect(0, fy, W, FOOTER);
      
      ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 2; 
      ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();

      ctx.fillStyle = '#1f2937'; ctx.font = 'italic 600 20px "Georgia", serif'; ctx.textAlign = 'center';
      ctx.fillText("✦  idadari's photobooth  ✦", W / 2, fy + 45);
      
      ctx.fillStyle = '#6b7280'; ctx.font = '13px "DM Mono", monospace';
      ctx.fillText(new Date().toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' }), W / 2, fy + 70);

    } catch (e) { console.error(e) }

    setStripUrl(canvas.toDataURL('image/jpeg', 0.98))
    setGen(false)
  }, [frame, photos, layout])

  useEffect(() => { if (frame && photos.length > 0) generate() },[frame, photos, layout, generate])

  const download = () => {
    if (!stripUrl) return
    const a = document.createElement('a'); a.href = stripUrl; a.download = `idadari-photobooth-${Date.now()}.jpg`; a.click()
    setDl(true); setTimeout(() => setDl(false), 3000)
  }

  return (
    <main className="min-h-screen bg-cream">
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

            {photos.length === 6 && (
              <div className="flex gap-2 justify-center mb-5">
                {(['vertical', 'grid'] as const).map(l => (
                  <button
                    key={l} onClick={() => setLayout(l)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-body font-medium transition-all
                      ${layout === l ? 'bg-matcha-500 text-white' : 'bg-white text-gray-500 border border-parchment hover:border-matcha-300'}`}
                  >
                    {l === 'vertical' ? <Layout className="w-3.5 h-3.5" /> : <Grid className="w-3.5 h-3.5" />}
                    {l === 'vertical' ? 'Vertical Strip' : '2×3 Grid'}
                  </button>
                ))}
              </div>
            )}
            
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
                <p className="font-body text-xs font-medium text-gray-400 uppercase tracking-widest">Individual Photos</p>
                <p className="text-[10px] text-matcha-500 italic">Click to retake</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div 
                    key={i} 
                    // FUNGSI RETAKE INDIVIDUAL: Simpan nomor slot, lalu lempar ke halaman Booth!
                    onClick={() => {
                      sessionStorage.setItem('retake_idx', i.toString());
                      router.push('/booth');
                    }}
                    className="aspect-square rounded-xl overflow-hidden shadow-soft bg-gray-100 relative group cursor-pointer border border-gray-200 hover:border-matcha-400 transition-colors"
                  >
                    <img src={p} alt={`Photo ${i+1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <RotateCcw className="w-5 h-5 text-white mb-1" />
                      <span className="text-white text-[10px] font-medium tracking-wide">Retake</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <button onClick={download} disabled={!stripUrl || generating} className={`w-full flex items-center justify-center gap-2 py-4 rounded-full font-body font-medium text-base transition-all duration-300 ${stripUrl && !generating ? downloaded ? 'bg-green-500 text-white' : 'bg-matcha-500 hover:bg-matcha-600 text-white shadow-matcha hover:-translate-y-0.5' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>
                {downloaded ? <><Check className="w-5 h-5" /> Saved!</> : <><Download className="w-5 h-5" /> Download JPG</>}
              </button>
              <button onClick={() => { sessionStorage.removeItem('booth_photos'); router.push('/booth') }} className="btn-outline w-full justify-center py-3 rounded-full border-gray-200 hover:bg-gray-50 flex gap-2"><RotateCcw className="w-4 h-4" /> Retake All Photos</button>
              <button onClick={() => { sessionStorage.clear(); router.push('/') }} className="w-full justify-center text-sm text-gray-400 hover:text-gray-600 flex gap-2 py-2"><Home className="w-4 h-4" /> Back to Home</button>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}