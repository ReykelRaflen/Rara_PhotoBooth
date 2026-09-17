'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ArrowRight, Sparkles, Grid3x3, Layers, Clock3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const MARQUEE = ['capture the moment','cherish the magic','relive the love','pose & play','made for idaadarii','every click counts']

export default function HomePage() {
  const router = useRouter()
  const [frameCount, setFrameCount] = useState<number | null>(null)
  const [daysSince, setDaysSince] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const EST_DATE = new Date('2026-04-21')

  useEffect(() => {
    setMounted(true)
    setDaysSince(Math.floor((Date.now() - EST_DATE.getTime())/86400000))
    supabase.from('frames').select('id', { count:'exact' }).eq('is_active', true).then(({count})=> setFrameCount(count ?? 0))
  }, [])

  return (
    <main className="min-h-screen bg-vanilla-50">
      {/* ticker — hairline, not matcha band */}
      <div className="border-y border-line bg-white/80 backdrop-blur overflow-hidden">
        <div className="marquee-track py-2.5 text-[11px] font-mono tracking-[0.18em] uppercase text-muted">
          {[...MARQUEE, ...MARQUEE].map((t,i)=> <span key={i} className="px-7 whitespace-nowrap">✦ {t}</span>)}
        </div>
      </div>

      <nav className="glass sticky top-0 z-40">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-ink flex items-center justify-center">
              <span className="font-display text-sm font-semibold text-white tracking-tight">i.</span>
            </div>
            <span className="font-display text-[18px] font-semibold tracking-tight text-ink">idaadarii<span className="text-vanilla-600">.</span></span>
            <span className="hidden sm:inline-flex ml-2 rounded-full bg-vanilla-100 border border-line px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase text-muted">Vanilla editorial</span>
          </div>
          <div className="hidden md:flex items-center gap-1 rounded-full bg-white border border-line p-1">
            <span className="rounded-full bg-ink text-white px-4 py-1.5 text-xs font-medium">Home</span>
            <a href="/choose-layout" className="px-4 py-1.5 text-xs font-medium text-muted hover:text-ink">Layouts</a>
          </div>
          <button onClick={()=>router.push('/choose-layout')} className="btn-primary text-sm !py-2.5">
            Start <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* HERO — asymmetric editorial, not centered blob */}
      <section className="mx-auto max-w-[1280px] px-6 lg:px-8 py-10 lg:py-16">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-center">
          {/* left copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-line px-3 py-1.5 shadow-soft animate-fade-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              <span className="h-2 w-2 rounded-full bg-vanilla-600 animate-pulse" />
              <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted">Est. Apr 21, 2026</span>
              {mounted && daysSince!==null && <span className="rounded-full bg-vanilla-100 border border-line px-2 py-0.5 font-mono text-[11px] text-ink">{daysSince}d</span>}
              {frameCount!==null && <span className="font-mono text-[11px] text-muted">· {frameCount} layouts</span>}
            </div>

            <h1 className="mt-6 font-display text-[clamp(2.8rem,6vw,4.6rem)] font-light leading-[0.9] tracking-[-0.03em] text-ink animate-fade-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              A photobooth
              <span className="block font-light italic text-vanilla-800">made for idaadarii.</span>
            </h1>
            <p className="mt-5 max-w-[520px] font-body text-[16px] leading-7 text-muted animate-fade-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
              Warm vanilla paper, hairline borders, quiet luxury. Pick a frame — 3 or 6 poses —
              pose with a 5s countdown, take it home as strip, live photo, or GIF.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3 animate-fade-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
              <button onClick={()=>router.push('/choose-layout')} className="btn-primary text-[15px] px-8">
                <Camera className="w-4 h-4" /> Choose layout
              </button>
              <a href="#how" className="btn-outline text-sm">How it works</a>
            </div>


          </div>

          {/* right visual — layered strips editorial */}
          <div className="relative lg:h-[520px] flex items-center justify-center animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
            <div className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-br from-vanilla-100 via-white to-vanilla-50 border border-line hidden lg:block" />
            <div className="flex items-end gap-4 lg:gap-5">
              <div className="hidden sm:block w-[150px] lg:w-[168px] rotate-[-3deg] translate-y-2">
                <Strip tone="paper" count={4} label="Strip A · vanilla" />
              </div>
              <div className="w-[168px] lg:w-[190px] rotate-[1.2deg] shadow-medium">
                <Strip tone="vanilla" count={4} label="Strip B · warm" featured />
              </div>
              <div className="hidden md:block w-[148px] lg:w-[164px] rotate-[3deg] -translate-y-1 opacity-95">
                <Strip tone="ink" count={4} label="Strip C · ink" />
              </div>
            </div>
          </div>
        </div>

        {/* proof / how */}
        <div id="how" className="mt-12 grid md:grid-cols-3 gap-4">
          {[
            { k:'01', title:'Pick a frame', desc:'Curated vanilla layouts — 3 or 6 poses. Tap to preview.', icon: Layers },
            { k:'02', title:'Pose — 5s countdown', desc:'Live camera, filters, mirror & live photo (3→0s).', icon: Clock3 },
            { k:'03', title:'Take it home', desc:'Save as strip, video, or GIF. QR share included.', icon: Grid3x3 },
          ].map(f=> (
            <div key={f.k} className="rounded-[20px] bg-white border border-line p-5 flex gap-4">
              <div className="h-10 w-10 rounded-xl bg-vanilla-100 border border-line flex items-center justify-center shrink-0">
                <f.icon className="w-4 h-4 text-ink" />
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-widest uppercase text-muted">{f.k}</p>
                <p className="font-display text-[15px] font-medium text-ink mt-0.5">{f.title}</p>
                <p className="font-body text-sm leading-6 text-muted mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[20px] bg-ink text-white p-6 lg:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-vanilla-200" />
            </div>
            <div>
              <p className="font-display text-[15px] font-medium">Ready to shoot?</p>
              <p className="font-body text-sm text-white/60">Choose a layout — your strip is one tap away.</p>
            </div>
          </div>
          <button onClick={()=>router.push('/choose-layout')} className="rounded-full bg-white text-ink px-6 py-3 text-sm font-medium hover:bg-vanilla-50 inline-flex items-center gap-2">
            Browse layouts <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <footer className="border-t border-line bg-white/70">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-4 flex items-center justify-between font-mono text-xs text-muted">
          <span>© {new Date().getFullYear()} idaadarii</span>
          <span className="tracking-widest uppercase hidden sm:block">Every click is a memory — vanilla edition</span>
        </div>
      </footer>
    </main>
  )
}

function Strip({ count, tone, label, featured }: { count:number; tone:'paper'|'vanilla'|'ink'; label:string; featured?:boolean }) {
  const bg = tone==='paper' ? 'bg-white' : tone==='vanilla' ? 'bg-vanilla-100' : 'bg-ink text-white'
  const border = tone==='ink' ? 'border-white/10' : 'border-line'
  return (
    <div className={`rounded-[20px] border ${border} ${bg} p-3 shadow-soft strip-shadow ${featured ? 'ring-1 ring-ink/10' : ''}`}>
      <div className="space-y-2">
        {Array.from({length: count}).map((_,i)=> (
          <div key={i} className={`aspect-[4/3] rounded-xl border overflow-hidden relative ${tone==='ink' ? 'bg-white/10 border-white/10' : 'bg-gradient-to-br from-vanilla-100 to-white border-line'}`}>
            <div className={`absolute inset-0 ${tone==='ink' ? 'bg-white/5' : 'opacity-40'}`} style={tone!=='ink' ? { background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.8) 50%, transparent 60%)'} : undefined} />
            <div className={`absolute bottom-1.5 left-1.5 right-1.5 h-1 rounded-full ${tone==='ink' ? 'bg-white/30' : 'bg-white/80 border border-line'}`} />
          </div>
        ))}
      </div>
      <div className={`mt-3 h-px ${tone==='ink' ? 'bg-white/10' : 'bg-line'}`} />
      <p className={`mt-2 text-center font-mono text-[9px] tracking-[0.16em] uppercase ${tone==='ink' ? 'text-white/60' : 'text-muted'}`}>{label}</p>
    </div>
  )
}
