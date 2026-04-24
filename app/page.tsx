'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ArrowRight, Sparkles } from 'lucide-react'
import { supabase, Frame } from '@/lib/supabase'

// Placeholder photostrip images (grayscale placeholder strips)
const STRIP_PLACEHOLDERS = [
  { rotate: '-6deg', side: 'left',  delay: '0s' },
  { rotate: '5deg',  side: 'right', delay: '0.3s' },
]

const MARQUEE_ITEMS = [
  '✦ capture the moment',
  '♡ cherish the magic',
  '✦ relive the love',
  '♡ pose & play',
  '✦ made for idaadarii',
  '♡ every click counts',
]

export default function HomePage() {
  const router = useRouter()
  const [frames, setFrames] = useState<Frame[]>([])
  const [frameCount, setFrameCount] = useState(0)
  const [daysSince, setDaysSince] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Established date — can be changed
  const EST_DATE = new Date('2025-02-09')

  useEffect(() => {
    setMounted(true)
    // Calculate days since
    const now = new Date()
    const diff = Math.floor((now.getTime() - EST_DATE.getTime()) / (1000 * 60 * 60 * 24))
    setDaysSince(diff)

    // Fetch frame count
    supabase
      .from('frames')
      .select('id', { count: 'exact' })
      .eq('is_active', true)
      .then(({ count }) => setFrameCount(count ?? 0))
  }, [])

  const handleStart = () => router.push('/choose-layout')

  return (
    <main className="min-h-screen bg-cream relative overflow-hidden">
      {/* ── Mesh background ── */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-warm-mesh opacity-80" />
        <div className="absolute top-0 left-0 w-full h-full"
          style={{
            background: `
              radial-gradient(ellipse 70% 50% at 20% 10%, rgba(197,223,177,0.45) 0%, transparent 70%),
              radial-gradient(ellipse 50% 60% at 80% 90%, rgba(242,168,184,0.25) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 60% 40%, rgba(253,250,244,0.9) 0%, transparent 70%)
            `
          }}
        />
      </div>

      {/* ── Top banner ── */}
      <div className="w-full py-2 bg-matcha-500 text-center overflow-hidden">
        <div className="marquee-track text-xs font-body font-medium text-white tracking-widest uppercase">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="px-8">{item}</span>
          ))}
        </div>
      </div>

      {/* ── Navbar ── */}
      <nav className="glass border-b border-white/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-display text-2xl font-semibold text-matcha-700 tracking-tight">
            idaadarii<span className="text-matcha-400">.</span>
          </span>
          <div className="hidden md:flex items-center gap-8">
            {['home', 'layouts', 'gallery'].map(item => (
              <a
                key={item}
                href={item === 'home' ? '/' : item === 'layouts' ? '/choose-layout' : '#'}
                className="font-body text-sm text-gray-500 hover:text-matcha-600 transition-colors capitalize tracking-wide"
              >
                {item}
              </a>
            ))}
            <a
              href="/choose-layout"
              className="font-body text-sm font-medium text-matcha-600 hover:text-matcha-700 transition-colors tracking-wide"
            >
              choose layout →
            </a>
          </div>
          <button
            onClick={handleStart}
            className="btn-primary text-sm py-2.5 px-5"
          >
            <Camera className="w-4 h-4" />
            Start
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[calc(100vh-112px)] flex items-center justify-center px-6">

        {/* Floating strip LEFT */}
        <div
          className="absolute left-8 lg:left-24 top-1/2 -translate-y-1/2 w-28 lg:w-36 animate-float-slow hidden sm:block"
          style={{ animationDelay: '0s' }}
        >
          <PlaceholderStrip count={4} rotate="-6deg" />
        </div>

        {/* Floating strip RIGHT */}
        <div
          className="absolute right-8 lg:right-24 top-1/2 -translate-y-1/2 w-28 lg:w-36 animate-float-med hidden sm:block"
          style={{ animationDelay: '0.8s' }}
        >
          <PlaceholderStrip count={4} rotate="5deg" />
        </div>

        {/* Center content */}
        <div className="text-center max-w-2xl mx-auto stagger">
          {/* Est. pill */}
          <div className="inline-flex items-center gap-3 glass border border-matcha-200/60 rounded-full px-5 py-2.5 mb-8 shadow-soft">
            <span className="text-rose text-lg">★</span>
            <span className="font-mono text-xs font-medium text-matcha-600 tracking-widest uppercase">
              Est. April 21, 2026
            </span>
            {mounted && (
              <span className="font-mono text-xs text-matcha-500 bg-matcha-50 px-2 py-0.5 rounded-full">
                {daysSince}d
              </span>
            )}
          </div>

          {/* Headline */}
          <h1 className="font-display text-[clamp(3.5rem,10vw,7rem)] font-light leading-none text-gray-800 tracking-tight mb-2">
            idaadarii
          </h1>
          <h2 className="font-display text-[clamp(2rem,6vw,4rem)] font-light italic text-matcha-500 leading-none mb-8">
            photobooth
          </h2>

          {/* Tagline */}
          <p className="font-body text-gray-500 text-base lg:text-lg leading-relaxed mb-10 max-w-sm mx-auto">
            Capture the moment, cherish the magic,<br />
            <span className="text-matcha-500 italic font-light">relive the love.</span>
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            <button onClick={handleStart} className="btn-primary text-base px-10 py-4 group">
              <Camera className="w-5 h-5" />
              START
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <a href="/choose-layout" className="btn-outline text-sm">
              choose layout
            </a>
          </div>

          {/* Stats */}
          {frameCount > 0 && (
            <p className="font-body text-xs text-matcha-400 mt-8">
              {frameCount} beautiful frame{frameCount !== 1 ? 's' : ''} available
            </p>
          )}
        </div>
      </section>

      {/* ── Bottom ornament ── */}
      <div className="pb-8 text-center">
        <p className="font-display italic text-matcha-400 text-sm">
          made for idaadarii
        </p>
      </div>

      {/* ── Admin link ── */}
      <a
        href="/admin"
        className="fixed bottom-5 right-5 z-50 glass text-xs font-body text-matcha-500 hover:text-matcha-700
                   px-3 py-2 rounded-full border border-matcha-200 shadow-soft transition-colors"
      >
        ⚙ admin
      </a>
    </main>
  )
}

// ── Placeholder photo strip component ──
function PlaceholderStrip({ count, rotate }: { count: number; rotate: string }) {
  const colors = ['#d1e8c4', '#c5dfb1', '#b8d49e', '#aac98c']
  return (
    <div
      className="rounded-xl overflow-hidden strip-shadow bg-white p-2 pb-6 space-y-1.5"
      style={{ transform: `rotate(${rotate})` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full rounded-lg overflow-hidden"
          style={{ aspectRatio: '4/3', background: colors[i % colors.length] }}
        />
      ))}
      <div className="pt-2 text-center">
        <p className="font-mono text-[8px] text-matcha-400 tracking-widest">IDAADARII</p>
      </div>
    </div>
  )
}
