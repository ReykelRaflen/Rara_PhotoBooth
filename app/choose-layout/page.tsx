'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Camera, ArrowLeft, ArrowRight, Grid3x3, LayoutGrid } from 'lucide-react'
import { supabase, Frame } from '@/lib/supabase'


const TYPE_LABELS: Record<string, string> = {
  '3': 'Size 2 × 6 Strip  (3 Pose)',
  '6': 'Size 2 × 6 Strip  (6 Pose)',
}

export default function ChooseLayoutPage() {
  const router = useRouter()
  const [frames, setFrames] = useState<Frame[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIdx, setActiveIdx] = useState(0)
  const [filter, setFilter] = useState<'all' | '3' | '6'>('all')
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from('frames')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setFrames(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = frames.filter(f => filter === 'all' || f.type === filter)

  const prev = () => setActiveIdx(i => (i - 1 + filtered.length) % filtered.length)
  const next = () => setActiveIdx(i => (i + 1) % filtered.length)

  useEffect(() => { setActiveIdx(0) }, [filter])

  const handleSelect = (frame: Frame) => {
    sessionStorage.setItem('selected_frame', JSON.stringify(frame))
    router.push('/booth')
  }

  // Visible cards: center + 2 neighbors each side
  const getVisible = () => {
    if (filtered.length === 0) return []
    return [-2, -1, 0, 1, 2].map(offset => {
      const idx = ((activeIdx + offset) % filtered.length + filtered.length) % filtered.length
      return { frame: filtered[idx], offset }
    })
  }

  return (
    <main className="min-h-screen bg-cream relative overflow-hidden">
      {/* Mesh bg */}
      <div className="absolute inset-0 -z-10 pointer-events-none"
        style={{ background: `
          radial-gradient(ellipse 80% 60% at 30% 20%, rgba(197,223,177,0.35) 0%, transparent 70%),
          radial-gradient(ellipse 60% 50% at 80% 80%, rgba(242,168,184,0.2) 0%, transparent 60%)
        `}} />

      {/* Top banner */}
      <div className="w-full py-2 bg-matcha-500 overflow-hidden">
        <div className="marquee-track text-xs font-body font-medium text-white tracking-widest uppercase">
          {['✦ choose your layout', '♡ pick your vibe', '✦ every frame tells a story', '♡ strike a pose'].concat(
            ['✦ choose your layout', '♡ pick your vibe', '✦ every frame tells a story', '♡ strike a pose']
          ).map((item, i) => (
            <span key={i} className="px-10">{item}</span>
          ))}
        </div>
      </div>

      {/* Navbar */}
      <nav className="glass border-b border-white/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-matcha-600 hover:text-matcha-800 font-body text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            back
          </a>
          <span className="font-display text-2xl font-semibold text-matcha-700 tracking-tight">
            idadari<span className="text-matcha-400">.</span>
          </span>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Heading */}
        <div className="text-center mb-12 stagger">
          <h1 className="font-display text-5xl lg:text-6xl font-light text-gray-800 mb-3">
            choose your layout
          </h1>
          <p className="font-body text-gray-400 text-base">
            Select from our collection of photo booth layouts
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {(['all', '3', '6'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-full font-body text-sm font-medium transition-all duration-200
                ${filter === t
                  ? 'bg-matcha-500 text-white shadow-matcha'
                  : 'bg-white/80 text-gray-500 hover:bg-matcha-50 hover:text-matcha-600 border border-parchment'}`}
            >
              {t === 'all' && <span>All</span>}
              {t === '3' && <><Grid3x3 className="w-3.5 h-3.5" /> 3 Photos</>}
              {t === '6' && <><LayoutGrid className="w-3.5 h-3.5" /> 6 Photos</>}
            </button>
          ))}
        </div>

        {/* Carousel */}
        {loading ? (
          <div className="flex gap-5 justify-center">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-32 skeleton rounded-2xl" style={{ aspectRatio: '2/5' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-display text-3xl text-matcha-300 mb-3">No frames yet</p>
            <p className="font-body text-gray-400 text-sm">Admin can add frames from the admin panel</p>
          </div>
        ) : (
          <>
            <div className="relative flex items-center justify-center gap-4 py-8 px-16 min-h-[480px]">
              {/* Prev button */}
              <button
                onClick={prev}
                className="absolute left-0 z-10 w-12 h-12 rounded-full glass border border-white/60
                           flex items-center justify-center shadow-soft hover:shadow-medium
                           text-gray-500 hover:text-matcha-600 transition-all hover:scale-105"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Cards */}
              <div className="flex items-center gap-5">
                {getVisible().map(({ frame, offset }) => (
                  <LayoutCard
                    key={frame.id + offset}
                    frame={frame}
                    offset={offset}
                    imgError={!!imgErrors[frame.id]}
                    onImgError={() => setImgErrors(e => ({ ...e, [frame.id]: true }))}
                    onClick={() => offset === 0 ? handleSelect(frame) : setActiveIdx(
                      ((activeIdx + offset) % filtered.length + filtered.length) % filtered.length
                    )}
                  />
                ))}
              </div>

              {/* Next button */}
              <button
                onClick={next}
                className="absolute right-0 z-10 w-12 h-12 rounded-full glass border border-white/60
                           flex items-center justify-center shadow-soft hover:shadow-medium
                           text-gray-500 hover:text-matcha-600 transition-all hover:scale-105"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Active frame info */}
            {filtered[activeIdx] && (
              <div className="text-center mt-2 stagger">
                <h3 className="font-display text-2xl font-medium text-gray-700 mb-1">
                  {filtered[activeIdx].name}
                </h3>
                <p className="font-body text-sm text-gray-400 mb-1">
                  {TYPE_LABELS[filtered[activeIdx].type]}
                </p>
                {filtered[activeIdx].description && (
                  <p className="font-body text-sm text-matcha-500 italic mb-5">
                    {filtered[activeIdx].description}
                  </p>
                )}
                {/* Tags */}
                {filtered[activeIdx].tags?.length > 0 && (
                  <div className="flex gap-2 justify-center mb-6">
                    {filtered[activeIdx].tags.map(t => (
                      <span key={t} className="font-body text-xs text-matcha-600 bg-matcha-50 border border-matcha-200 px-3 py-1 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => handleSelect(filtered[activeIdx])}
                  className="btn-primary px-12 py-4 text-base group"
                >
                  <Camera className="w-5 h-5" />
                  Use This Layout
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            )}

            {/* Dots */}
            <div className="flex gap-2 justify-center mt-8">
              {filtered.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`rounded-full transition-all duration-300
                    ${i === activeIdx
                      ? 'w-6 h-2 bg-matcha-500'
                      : 'w-2 h-2 bg-matcha-200 hover:bg-matcha-300'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

// ── Card ──
interface LayoutCardProps {
  frame: Frame
  offset: number
  imgError: boolean
  onImgError: () => void
  onClick: () => void
}

function LayoutCard({ frame, offset, imgError, onImgError, onClick }: LayoutCardProps) {
  const isCenter = offset === 0
  const absOffset = Math.abs(offset)

  const scale   = isCenter ? 1 : absOffset === 1 ? 0.85 : 0.72
  const opacity = isCenter ? 1 : absOffset === 1 ? 0.75 : 0.5
  const zIndex  = isCenter ? 10 : absOffset === 1 ? 5 : 1
  const shadow  = isCenter ? '0 24px 60px rgba(0,0,0,0.18)' : '0 8px 24px rgba(0,0,0,0.10)'

  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 cursor-pointer transition-all duration-500 select-none"
      style={{ transform: `scale(${scale})`, opacity, zIndex, position: 'relative' }}
    >
      <div
        className="relative rounded-2xl overflow-hidden bg-white"
        style={{
          width: isCenter ? '160px' : absOffset === 1 ? '140px' : '120px',
          aspectRatio: '2/5',
          boxShadow: shadow,
          transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Badge */}
        {isCenter && (
          <div className="absolute top-2 right-2 z-20 bg-matcha-500 text-white text-[10px] font-body font-bold px-2 py-0.5 rounded-full shadow">
            {frame.type} foto
          </div>
        )}

        {/* Image */}
        {!imgError ? (
          <img
            src={frame.image_url}
            alt={frame.name}
            className="w-full h-full object-cover"
            onError={onImgError}
          />
        ) : (
          <FramePlaceholder type={frame.type} name={frame.name} />
        )}

        {/* Center overlay */}
        {isCenter && (
          <div className="absolute inset-0 bg-matcha-500/0 hover:bg-matcha-500/10 transition-colors duration-200" />
        )}
      </div>

      {/* Name below center card */}
      {isCenter && (
        <p className="text-center font-body text-xs font-medium text-gray-500 mt-3 tracking-wide">
          {frame.name}
        </p>
      )}
    </div>
  )
}

function FramePlaceholder({ type, name }: { type: string; name: string }) {
  const count = parseInt(type)
  const cols  = count === 6 ? 2 : 1
  const rows  = count === 6 ? 3 : 3
  const shades = ['#c5dfb1', '#b8d49e', '#aac98c', '#9dbf7a', '#c5dfb1', '#b8d49e']

  return (
    <div className="w-full h-full flex flex-col p-2 gap-1.5 bg-matcha-50">
      <div className={`flex-1 grid gap-1.5 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
        style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-md" style={{ background: shades[i % shades.length] }} />
        ))}
      </div>
      <p className="text-center font-mono text-[8px] text-matcha-400 tracking-widest pb-1">IDADARI</p>
    </div>
  )
}
