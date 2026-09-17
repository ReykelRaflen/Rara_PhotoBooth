'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Search, Grid3x3, LayoutGrid, Check, Sparkles } from 'lucide-react'
import { supabase, Frame } from '@/lib/supabase'

const TYPE_LABELS: Record<string, string> = {
  '3': '3 poses · 2×6 strip',
  '6': '6 poses · 2×6 strip',
}

export default function ChooseLayoutPage() {
  const router = useRouter()
  const [frames, setFrames] = useState<Frame[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | '3' | '6'>('all')
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    supabase.from('frames').select('*').eq('is_active', true).order('sort_order').order('created_at', { ascending: false })
      .then(({ data }) => { setFrames(data ?? []); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    let r = frames
    if (filter !== 'all') r = r.filter(f => f.type === filter)
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      r = r.filter(f => f.name.toLowerCase().includes(s) || (f.description ?? '').toLowerCase().includes(s) || (f.tags ?? []).join(' ').toLowerCase().includes(s))
    }
    return r
  }, [frames, filter, q])

  useEffect(() => {
    if (filtered.length && !selectedId) setSelectedId(filtered[0].id)
    if (filtered.length && selectedId && !filtered.find(f => f.id === selectedId)) setSelectedId(filtered[0].id)
    if (!filtered.length) setSelectedId(null)
  }, [filtered, selectedId])

  const selected = filtered.find(f => f.id === selectedId) ?? null

  const handleSelect = (frame: Frame) => {
    sessionStorage.setItem('selected_frame', JSON.stringify(frame))
    router.push('/booth')
  }

  return (
    <main className="min-h-screen bg-vanilla-50">
      <div className="border-y border-line bg-white/80 backdrop-blur overflow-hidden">
        <div className="marquee-track py-2 text-[11px] font-mono tracking-[0.18em] uppercase text-muted">
          {['choose your layout','pick your vibe','every frame tells a story','strike a pose'].concat(['choose your layout','pick your vibe','every frame tells a story','strike a pose']).map((t,i)=> (
            <span key={i} className="px-8 whitespace-nowrap">✦ {t}</span>
          ))}
        </div>
      </div>

      <nav className="glass sticky top-0 z-40">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 h-[64px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={()=>router.push('/')} className="h-9 w-9 rounded-full bg-white border border-line flex items-center justify-center text-muted hover:text-ink">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-display text-[18px] font-semibold tracking-tight text-ink hidden sm:block">idaadarii<span className="text-vanilla-600">.</span></span>
            <span className="hidden lg:inline-flex rounded-full bg-ink text-white px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase">Step 1 of 3</span>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end max-w-[560px]">
            <div className="relative flex-1 hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search frames, tags…" className="w-full rounded-full bg-white border border-line pl-9 pr-4 py-2.5 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-4 focus:ring-vanilla-100 focus:border-vanilla-300" />
            </div>
            <div className="hidden md:flex items-center gap-1 rounded-full bg-white border border-line p-1">
              {(['all','3','6'] as const).map(t=> (
                <button key={t} onClick={()=>setFilter(t)} className={`rounded-full px-3.5 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 ${filter===t ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>
                  {t==='all' ? 'All' : t==='3' ? <><Grid3x3 className="w-3.5 h-3.5"/>3</> : <><LayoutGrid className="w-3.5 h-3.5"/>6</>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* title row */}
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[32px] lg:text-[40px] font-light tracking-[-0.02em] text-ink leading-none">Choose your layout</h1>
            <p className="mt-2 font-body text-sm text-muted max-w-[640px]">Vanilla paper · hairline borders · quite luxury. Search or filter, tap a card, preview on the right.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted">
            <span className="rounded-full bg-white border border-line px-3 py-1.5">{filtered.length} layouts</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-vanilla-100 border border-line px-3 py-1.5"><Sparkles className="w-3 h-3" /> Vanilla</span>
          </div>
        </div>

        {/* mobile search */}
        <div className="mt-4 sm:hidden relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search frames, tags…" className="w-full rounded-2xl bg-white border border-line pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-vanilla-100" />
        </div>
        <div className="mt-3 flex md:hidden items-center gap-1 rounded-full bg-white border border-line p-1 w-fit">
          {(['all','3','6'] as const).map(t=> (
            <button key={t} onClick={()=>setFilter(t)} className={`rounded-full px-3.5 py-2 text-xs font-medium ${filter===t ? 'bg-ink text-white' : 'text-muted'}`}>{t==='all' ? 'All' : `${t} poses`}</button>
          ))}
        </div>
      </div>

      {/* main bento: gallery + sticky detail */}
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8 pb-12 grid lg:grid-cols-[1.35fr_0.75fr] gap-6 items-start">
        <section className="min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1,2,3,4,5,6,7,8].map(i=> <div key={i} className="skeleton rounded-[20px] border border-line" style={{ aspectRatio:'2/3.2' }} />)}
            </div>
          ) : filtered.length===0 ? (
            <div className="card p-10 text-center">
              <p className="font-display text-xl text-ink">No frames found</p>
              <p className="mt-1 font-body text-sm text-muted">Try another keyword or filter.</p>
              <button onClick={()=>{setQ(''); setFilter('all')}} className="btn-outline mt-4">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((frame, idx) => (
                <button key={frame.id} onClick={()=>setSelectedId(frame.id)} className={`group text-left rounded-[20px] overflow-hidden border bg-white transition-all animate-fade-up ${selectedId===frame.id ? 'border-ink shadow-medium ring-1 ring-ink/10' : 'border-line hover:border-vanilla-300 hover:shadow-soft'}`} style={{ animationDelay: `${0.05 * idx}s`, animationFillMode: 'both' }}>
                  <div className="relative bg-vanilla-50" style={{ aspectRatio:'2/3.3' }}>
                    {!imgErrors[frame.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={frame.image_url} alt={frame.name} className="h-full w-full object-cover" onError={()=>setImgErrors(e=>({...e,[frame.id]:true}))} />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-vanilla-100 to-white">
                        <span className="font-mono text-[10px] tracking-widest uppercase text-muted">No preview</span>
                      </div>
                    )}
                    <div className="absolute left-2 top-2 flex gap-1">
                      <span className={`rounded-full px-2 py-1 font-mono text-[10px] font-medium border ${selectedId===frame.id ? 'bg-ink text-white border-ink' : 'bg-white/90 backdrop-blur text-ink border-line'}`}>{frame.type}P</span>
                    </div>
                    {selectedId===frame.id && (
                      <span className="absolute right-2 top-2 h-6 w-6 rounded-full bg-ink text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-body text-[13px] font-medium leading-tight text-ink truncate">{frame.name}</p>
                    <p className="font-mono text-[11px] text-muted truncate">{TYPE_LABELS[frame.type]}</p>
                    {!!frame.tags?.length && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {frame.tags.slice(0,3).map(t=> <span key={t} className="rounded-full bg-vanilla-100 border border-line px-2 py-0.5 font-mono text-[10px] text-ink/70">{t}</span>)}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* sticky detail */}
        <aside className="lg:sticky lg:top-[80px] space-y-4 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <div className="card p-5">
            {!selected ? (
              <div className="py-10 text-center">
                <p className="font-display text-lg text-ink">Select a layout</p>
                <p className="mt-1 font-body text-sm text-muted">Tap any card to preview here.</p>
              </div>
            ) : (
              <>
                <div className="rounded-[16px] overflow-hidden border border-line bg-vanilla-50">
                  {!imgErrors[selected.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.image_url} alt={selected.name} className="w-full h-auto max-h-[420px] object-contain bg-white" onError={()=>setImgErrors(e=>({...e,[selected.id]:true}))} />
                  ) : (
                    <div className="h-[320px] flex items-center justify-center"><span className="font-mono text-xs tracking-widest uppercase text-muted">No preview</span></div>
                  )}
                </div>
                <div className="mt-4">
                  <h2 className="font-display text-[20px] font-medium leading-tight text-ink">{selected.name}</h2>
                  <p className="mt-1 font-body text-sm text-muted">{TYPE_LABELS[selected.type]}</p>
                  {selected.description && <p className="mt-2 font-body text-sm leading-6 text-ink/70">{selected.description}</p>}
                  {!!selected.tags?.length && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selected.tags.map(t=> <span key={t} className="rounded-full bg-vanilla-100 border border-line px-2.5 py-1 font-mono text-xs text-ink/70">{t}</span>)}
                    </div>
                  )}
                </div>
                <button onClick={()=>handleSelect(selected)} className="btn-primary w-full justify-center mt-5 py-4 text-[15px]">
                  Use this layout →
                </button>
                <p className="mt-2 text-center font-mono text-[11px] tracking-widest uppercase text-muted/60">Goes to camera · step 2 of 3</p>
              </>
            )}
          </div>

          <div className="rounded-[20px] bg-ink text-white p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-display text-sm font-medium">Need inspiration?</p>
              <p className="font-body text-xs text-white/60 mt-0.5">PNG transparan paling bagus untuk overlay.</p>
            </div>
            <span className="hidden sm:inline-flex rounded-full bg-white text-ink px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase">Vanilla</span>
          </div>
        </aside>
      </div>
    </main>
  )
}
