'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Download, RotateCcw, Home, Check } from 'lucide-react'
import { Frame } from '@/lib/supabase'

export default function PreviewPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [frame, setFrame]       = useState<Frame | null>(null)
  const [photos, setPhotos]     = useState<string[]>([])
  const [stripUrl, setStripUrl] = useState<string | null>(null)
  const [generating, setGen]    = useState(true)
  const [downloaded, setDl]     = useState(false)

  useEffect(() => {
    const f = sessionStorage.getItem('selected_frame')
    const p = sessionStorage.getItem('booth_photos')
    if (!f || !p) { router.push('/'); return }
    setFrame(JSON.parse(f))
    setPhotos(JSON.parse(p))
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

      // Ukuran Dasar Canvas
      const BASE_W = 600; 
      const BASE_H = fImg ? (BASE_W * (fImg.height / fImg.width)) : 1800; 
      const FOOTER = 100;

      // Tidak ada lagi logika Grid x2! Canvas 100% mengikuti rasio lebar x tinggi gambar asli.
      canvas.width  = BASE_W;
      canvas.height = BASE_H + FOOTER;
      const W = canvas.width, H = canvas.height;

      ctx.fillStyle = '#FDFAF4'; 
      ctx.fillRect(0, 0, W, H);

      // AMBIL HASIL SCAN LUBANG DARI MEMORI (Jadi tidak perlu rontgen ulang!)
      const savedHoles = sessionStorage.getItem('frame_holes')
      let detectedHoles: { x: number, y: number, w: number, h: number }[] =[];
      
      if (savedHoles) {
        detectedHoles = JSON.parse(savedHoles)
      }

      // 3. GAMBAR FOTO TEPAT DI LUBANGNYA (Sesuai persentase koordinat)
      imgs.forEach((img, i) => {
        // Jika ada foto berlebih tapi lubang habis, stop menggambar
        if (i >= detectedHoles.length) return;

        const hole = detectedHoles[i];
        
        // Konversi persentase ke pixel nyata
        let hx = hole.x * BASE_W;
        let hy = hole.y * BASE_H;
        let hw = hole.w * BASE_W;
        let hh = hole.h * BASE_H;
        
        // Beri sedikit Bleed (pelebaran) agar foto pasti bersembunyi di bawah bingkai
        const bleed = 8;
        hx -= bleed; hy -= bleed; hw += (bleed * 2); hh += (bleed * 2);

        ctx.save();
        
        // MENCEGAH MELUBER
        ctx.beginPath();
        ctx.rect(hx, hy, hw, hh);
        ctx.clip(); 

        const scale = Math.max(hw / img.width, hh / img.height);
        const dw = img.width * scale, dh = img.height * scale;

        ctx.translate(hx + hw / 2, hy + hh / 2);
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        
        ctx.restore(); 
      })

      // 4. OVERLAY FRAME SANGAT PRESISI
      if (fImg) {
        ctx.drawImage(fImg, 0, 0, BASE_W, BASE_H);
      }

      // 5. FOOTER
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
  }, [frame, photos]) // Ketergantungan layout dihapus

  useEffect(() => { if (frame && photos.length > 0) generate() },[frame, photos, generate])

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
              <div className={`grid gap-2 ${photos.length > 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {photos.map((p, i) => (
                  <div 
                    key={i} 
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