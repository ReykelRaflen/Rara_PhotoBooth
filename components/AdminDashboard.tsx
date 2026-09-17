'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Trash2, Edit3, Save, X, LogOut, Image as ImgIcon,
  ToggleLeft, ToggleRight, Upload, AlertCircle, CheckCircle,
  Grid3x3, LayoutGrid, ExternalLink, Eye, RefreshCw, Search,
  LayoutDashboard, Sparkles,
} from 'lucide-react'
import { Frame } from '@/lib/supabase'

interface Props { onLogout: () => void }

const EMPTY = {
  name: '', description: '', type: '3' as '3' | '6',
  is_active: true, sort_order: 0, tags: [] as string[],
}

export default function AdminDashboard({ onLogout }: Props) {
  const [frames, setFrames]   = useState<Frame[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)
  const [form, setForm]       = useState({ ...EMPTY })
  const [tagInput, setTagInput] = useState('')
  const [file, setFile]       = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null)
  const [delConfirm, setDel]  = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | '3' | '6'>('all')
  const [q, setQ] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/frames')
      const d = await r.json()
      setFrames(d.frames ?? [])
    } catch { notify('Failed to load frames', false) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleFileChange = (f: File | null) => {
    if (!f) return
    if (!['image/png','image/jpeg','image/webp'].includes(f.type)) {
      notify('Only PNG, JPG, WEBP allowed', false); return
    }
    if (f.size > 8 * 1024 * 1024) { notify('File too large (max 8MB)', false); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFileChange(f)
  }, [])

  const handleSubmit = async () => {
    if (!form.name.trim()) { notify('Name is required', false); return }
    if (!file && !editId) { notify('Please upload a file', false); return }
    setUploading(true)
    try {
      if (editId) {
        if (file) {
          const fd = new FormData()
          fd.append('file', file); fd.append('name', form.name.trim())
          fd.append('description', form.description.trim()); fd.append('type', form.type)
          fd.append('tags', JSON.stringify(form.tags)); fd.append('sort_order', String(form.sort_order))
          const r = await fetch('/api/upload', { method: 'POST', body: fd })
          const d = await r.json(); if (!r.ok) throw new Error(d.error)
          const oldFrame = frames.find(f => f.id === editId)
          if (oldFrame) await fetch(`/api/frames?id=${editId}&path=${encodeURIComponent(oldFrame.storage_path)}`, { method: 'DELETE' })
        } else {
          const r = await fetch('/api/frames', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editId, name: form.name.trim(), description: form.description.trim(), type: form.type, is_active: form.is_active, sort_order: form.sort_order, tags: form.tags }),
          })
          if (!r.ok) throw new Error('Update failed')
        }
        notify('Frame updated')
      } else {
        const fd = new FormData()
        fd.append('file', file!); fd.append('name', form.name.trim())
        fd.append('description', form.description.trim()); fd.append('type', form.type)
        fd.append('tags', JSON.stringify(form.tags)); fd.append('sort_order', String(form.sort_order))
        const r = await fetch('/api/upload', { method: 'POST', body: fd })
        const d = await r.json(); if (!r.ok) throw new Error(d.error)
        notify(`"${form.name}" uploaded`)
      }
      resetForm(); await load()
    } catch (e: any) { notify(e.message || 'Error', false) }
    setUploading(false)
  }

  const handleDelete = async (frame: Frame) => {
    if (delConfirm !== frame.id) { setDel(frame.id); setTimeout(() => setDel(null), 3000); return }
    try {
      const r = await fetch(`/api/frames?id=${frame.id}&path=${encodeURIComponent(frame.storage_path)}`, { method: 'DELETE' })
      if (!r.ok) throw new Error()
      notify('Frame deleted'); setDel(null); await load()
    } catch { notify('Delete failed', false) }
  }

  const handleToggle = async (frame: Frame) => {
    try {
      await fetch('/api/frames', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: frame.id, is_active: !frame.is_active }) })
      await load()
    } catch { notify('Update failed', false) }
  }

  const startEdit = (frame: Frame) => {
    setEditId(frame.id)
    setForm({ name: frame.name, description: frame.description ?? '', type: frame.type, is_active: frame.is_active, sort_order: frame.sort_order, tags: frame.tags ?? [] })
    setFile(null); setPreview(frame.image_url); setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => { setShowForm(false); setEditId(null); setForm({ ...EMPTY }); setFile(null); setPreview(null); setTagInput('') }
  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) { setForm(p => ({ ...p, tags: [...p.tags, t] })); setTagInput('') }
  }

  const filtered = frames.filter(f => {
    if (activeTab !== 'all' && f.type !== activeTab) return false
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      return f.name.toLowerCase().includes(s) || (f.description ?? '').toLowerCase().includes(s) || (f.tags ?? []).join(' ').toLowerCase().includes(s)
    }
    return true
  })
  const stats = { total: frames.length, active: frames.filter(f => f.is_active).length, t3: frames.filter(f => f.type === '3').length, t6: frames.filter(f => f.type === '6').length }

  return (
    <div className="min-h-screen bg-vanilla-50 flex">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-strong text-sm font-medium border ${toast.ok ? 'bg-ink text-white border-ink' : 'bg-white text-red-600 border-red-200'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* slim rail — layout swap: sidebar stats → top bento */}
      <aside className="hidden lg:flex w-[72px] shrink-0 flex-col items-center py-4 bg-white border-r border-line sticky top-0 h-screen">
        <div className="h-9 w-9 rounded-xl bg-ink flex items-center justify-center">
          <span className="font-display text-sm font-semibold text-white">i.</span>
        </div>
        <nav className="mt-6 flex flex-col gap-2">
          <span className="h-9 w-9 rounded-xl bg-ink text-white flex items-center justify-center" title="Manage"><LayoutDashboard className="w-4 h-4" /></span>
          <a href="/" target="_blank" rel="noreferrer" className="h-9 w-9 rounded-xl bg-vanilla-100 border border-line flex items-center justify-center text-muted hover:text-ink" title="View site"><Eye className="w-4 h-4" /></a>
          <a href="https://supabase.com" target="_blank" rel="noreferrer" className="h-9 w-9 rounded-xl bg-white border border-line flex items-center justify-center text-muted hover:text-ink" title="Supabase"><ExternalLink className="w-4 h-4" /></a>
        </nav>
        <div className="mt-auto flex flex-col items-center gap-3">
          <button onClick={onLogout} className="h-9 w-9 rounded-xl bg-white border border-line flex items-center justify-center text-muted hover:text-ink" title="Log out"><LogOut className="w-4 h-4" /></button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* top command bar */}
        <header className="sticky top-0 z-20 bg-vanilla-50/80 backdrop-blur border-b border-line">
          <div className="px-4 lg:px-6 h-[64px] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="lg:hidden h-8 w-8 rounded-xl bg-ink flex items-center justify-center shrink-0"><span className="font-display text-xs font-semibold text-white">i.</span></div>
              <div className="min-w-0">
                <h1 className="font-display text-[18px] font-medium tracking-tight text-ink leading-none">Frame library</h1>
                <p className="hidden sm:block font-mono text-[11px] tracking-widest uppercase text-muted">Vanilla editorial · live Supabase</p>
              </div>
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-white border border-line px-2.5 py-1 font-mono text-[11px] text-muted"><Sparkles className="w-3 h-3" /> Vanilla</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden md:flex relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
                <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, tag…" className="w-[240px] rounded-full bg-white border border-line pl-9 pr-3 py-2.5 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-4 focus:ring-vanilla-100 focus:border-vanilla-300" />
              </div>
              <button onClick={load} aria-label="Refresh" className="h-9 w-9 rounded-full bg-white border border-line flex items-center justify-center text-muted hover:text-ink">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY }); setFile(null); setPreview(null); window.scrollTo({top:0, behavior:'smooth'}) }} className="btn-primary text-sm !py-2.5">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add frame</span><span className="sm:hidden">Add</span>
              </button>
              <button onClick={onLogout} className="lg:hidden h-9 w-9 rounded-full bg-white border border-line flex items-center justify-center text-muted"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </header>

        <main className="px-4 lg:px-6 py-6 space-y-6">
          {/* stats bento — moved from sidebar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label:'Total frames', value: stats.total, sub:'All layouts', icon: ImgIcon },
              { label:'Active', value: stats.active, sub:'Visible to users', icon: Eye },
              { label:'3 poses', value: stats.t3, sub:'2×6 strip', icon: Grid3x3 },
              { label:'6 poses', value: stats.t6, sub:'2×6 strip', icon: LayoutGrid },
            ].map(s=> (
              <div key={s.label} className="rounded-[20px] bg-white border border-line p-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[11px] tracking-widest uppercase text-muted">{s.label}</p>
                  <p className="mt-1 font-display text-[22px] font-medium leading-none text-ink">{s.value}</p>
                  <p className="mt-1 font-body text-xs text-muted">{s.sub}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-vanilla-100 border border-line flex items-center justify-center"><s.icon className="w-4 h-4 text-ink" /></div>
              </div>
            ))}
          </div>

          {/* mobile search */}
          <div className="md:hidden relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search frames, tags…" className="w-full rounded-2xl bg-white border border-line pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-vanilla-100" />
          </div>

          {/* editor — now as prominent card with split */}
          {showForm && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-vanilla-50/50">
                <div className="flex items-center gap-2">
                  <span className="h-7 w-7 rounded-xl bg-ink text-white flex items-center justify-center"><Upload className="w-3.5 h-3.5" /></span>
                  <h2 className="font-display text-[16px] font-medium text-ink">{editId ? 'Edit frame' : 'Upload new frame'}</h2>
                  <span className="hidden sm:inline-flex rounded-full bg-white border border-line px-2 py-1 font-mono text-[10px] tracking-widest uppercase text-muted">PNG transparan best</span>
                </div>
                <button onClick={resetForm} className="h-8 w-8 rounded-full bg-white border border-line flex items-center justify-center text-muted hover:text-ink"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-0">
                {/* left: dropzone + preview */}
                <div className="p-5 border-b lg:border-b-0 lg:border-r border-line">
                  <label className="font-mono text-[11px] tracking-widest uppercase text-muted block mb-2">Frame image</label>
                  <div onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={onDrop}
                    className={`relative cursor-pointer rounded-[20px] border-2 border-dashed flex items-center justify-center overflow-hidden ${preview ? 'border-ink/20 bg-vanilla-100' : 'border-line hover:border-vanilla-300 bg-vanilla-50 hover:bg-white'}`}
                    style={{ minHeight: '280px' }}>
                    {preview ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="preview" className="w-full h-full object-contain max-h-[320px] p-3" />
                        <div className="absolute inset-0 bg-ink/0 hover:bg-ink/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-colors">
                          <span className="rounded-full bg-white border border-line px-3 py-1.5 text-xs font-medium text-ink">Click to change</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-8">
                        <div className="mx-auto mb-3 h-11 w-11 rounded-2xl bg-white border border-line flex items-center justify-center"><Upload className="w-5 h-5 text-muted" /></div>
                        <p className="font-body text-sm font-medium text-ink">Drop file or click to browse</p>
                        <p className="font-mono text-xs text-muted mt-1">PNG · JPG · WEBP · max 8MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />
                  {file && <p className="mt-2 font-mono text-xs text-muted flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-ink" /> {file.name} ({(file.size/1024).toFixed(0)} KB)</p>}
                  <p className="mt-2 font-body text-xs text-muted">Tip: use PNG with transparency so photos fill the holes cleanly.</p>
                </div>

                {/* right: fields */}
                <div className="p-5 space-y-4">
                  <div>
                    <label className="font-mono text-[11px] tracking-widest uppercase text-muted block mb-2">Name *</label>
                    <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Sakura Blossom" className="input" />
                  </div>
                  <div>
                    <label className="font-mono text-[11px] tracking-widest uppercase text-muted block mb-2">Layout type *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['3','6'] as const).map(t => (
                        <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))} className={`rounded-full py-3 text-sm font-medium border inline-flex items-center justify-center gap-1.5 ${form.type===t ? 'bg-ink text-white border-ink' : 'bg-white text-muted border-line hover:bg-vanilla-50'}`}>
                          {t==='3' ? <Grid3x3 className="w-3.5 h-3.5"/> : <LayoutGrid className="w-3.5 h-3.5"/>} {t} poses
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="font-mono text-[11px] tracking-widest uppercase text-muted block mb-2">Description</label>
                    <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Short description" className="input" />
                  </div>
                  <div>
                    <label className="font-mono text-[11px] tracking-widest uppercase text-muted block mb-2">Tags</label>
                    <div className="flex gap-2">
                      <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key==='Enter'){ e.preventDefault(); addTag() } }} placeholder="Add tag + Enter" className="input flex-1 !py-2.5" />
                      <button onClick={addTag} className="h-[44px] w-[44px] rounded-full bg-ink text-white flex items-center justify-center hover:bg-ink/90 shrink-0"><Plus className="w-4 h-4" /></button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {form.tags.map(t => (
                        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-vanilla-100 border border-line px-2.5 py-1 text-xs text-ink">{t} <button onClick={() => setForm(p => ({ ...p, tags: p.tags.filter(x => x !== t) }))} className="ml-0.5 h-4 w-4 rounded-full bg-white border border-line flex items-center justify-center text-muted hover:text-ink">×</button></span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                    <div>
                      <label className="font-mono text-[11px] tracking-widest uppercase text-muted block mb-2">Sort order</label>
                      <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} className="input" />
                    </div>
                    <div>
                      <label className="font-mono text-[11px] tracking-widest uppercase text-muted block mb-2">Active</label>
                      <button onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))} aria-pressed={form.is_active} className="h-[44px] inline-flex items-center">
                        {form.is_active ? <ToggleRight className="w-10 h-10 text-ink" /> : <ToggleLeft className="w-10 h-10 text-muted/40" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleSubmit} disabled={uploading} className="btn-primary flex-1 justify-center py-4 disabled:opacity-50">
                      {uploading ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Uploading…</> : <><Save className="w-4 h-4" /> {editId ? 'Save changes' : 'Upload frame'}</>}
                    </button>
                    <button onClick={resetForm} className="btn-outline">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(['all','3','6'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className={`rounded-full px-4 py-2.5 text-sm font-medium border ${activeTab===t ? 'bg-ink text-white border-ink' : 'bg-white text-muted border-line hover:bg-vanilla-50'}`}>
                  {t==='all' ? `All (${frames.length})` : `${t} poses (${t==='3'?frames.filter(f=>f.type==='3').length:frames.filter(f=>f.type==='6').length})`}
                </button>
              ))}
            </div>
            <span className="font-mono text-xs text-muted">{filtered.length} shown{q ? ` · for "${q}"` : ''}</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(8)].map((_, i) => <div key={i} className="skeleton rounded-[20px] border border-line" style={{ aspectRatio:'2/3.2' }} />)}
            </div>
          ) : filtered.length===0 ? (
            <div className="card p-12 text-center">
              <ImgIcon className="w-10 h-10 text-muted/40 mx-auto mb-3" />
              <p className="font-display text-xl text-ink">No frames</p>
              <p className="font-body text-sm text-muted mt-1">{q ? `No match for "${q}"` : 'Upload your first PNG to get started.'}</p>
              <button onClick={()=>{setQ(''); setActiveTab('all')}} className="btn-outline mt-4">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map(frame => (
                <FrameCard key={frame.id} frame={frame} isEditing={editId===frame.id} delConfirm={delConfirm===frame.id} onEdit={()=>startEdit(frame)} onDelete={()=>handleDelete(frame)} onToggle={()=>handleToggle(frame)} />
              ))}
            </div>
          )}

          <p className="text-center font-mono text-[11px] tracking-widest uppercase text-muted/50">Vanilla editorial · hairline borders · quiet luxury</p>
        </main>
      </div>
    </div>
  )
}

function FrameCard({ frame, isEditing, delConfirm, onEdit, onDelete, onToggle }: { frame: Frame; isEditing:boolean; delConfirm:boolean; onEdit:()=>void; onDelete:()=>void; onToggle:()=>void }) {
  const [err, setErr] = useState(false)
  return (
    <div className={`rounded-[20px] overflow-hidden border bg-white flex flex-col ${isEditing ? 'border-ink shadow-medium' : 'border-line hover:shadow-soft'}`}>
      <div className="relative bg-vanilla-50" style={{ aspectRatio:'2/3.2' }}>
        {!err ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={frame.image_url} alt={frame.name} className="h-full w-full object-cover" onError={()=>setErr(true)} />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center p-4"><ImgIcon className="w-6 h-6 text-muted/40 mb-1" /><p className="font-mono text-[10px] tracking-widest uppercase text-muted text-center">No preview</p></div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          <span className="rounded-full bg-ink text-white px-2 py-0.5 font-mono text-[10px] font-medium">{frame.type}P</span>
          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-medium border ${frame.is_active ? 'bg-white text-ink border-line' : 'bg-vanilla-100 text-muted border-line'}`}>{frame.is_active ? '● active' : '○ off'}</span>
        </div>
        {isEditing && <span className="absolute right-2 top-2 rounded-full bg-vanilla-200 border border-vanilla-300 px-2 py-1 font-mono text-[10px] text-ink">Editing</span>}
      </div>
      <div className="p-3 flex-1">
        <p className="font-body text-[13px] font-medium leading-tight text-ink truncate">{frame.name}</p>
        {frame.description && <p className="font-body text-[11px] text-muted truncate mt-0.5">{frame.description}</p>}
        {!!frame.tags?.length && <div className="mt-2 flex gap-1 flex-wrap">{frame.tags.slice(0,3).map(t=> <span key={t} className="rounded-full bg-vanilla-100 border border-line px-2 py-0.5 font-mono text-[10px] text-ink/70">{t}</span>)}</div>}
      </div>
      <div className="px-3 pb-3 flex gap-1.5">
        <button onClick={onEdit} className="flex-1 rounded-full bg-vanilla-100 border border-line py-2 text-xs font-medium text-ink hover:bg-vanilla-200 inline-flex items-center justify-center gap-1"><Edit3 className="w-3 h-3" /> Edit</button>
        <button onClick={onToggle} className={`h-8 w-8 rounded-full border flex items-center justify-center ${frame.is_active ? 'bg-white border-line text-ink' : 'bg-vanilla-100 border-line text-muted'}`} aria-label="Toggle active">
          <span className={`h-2 w-2 rounded-full ${frame.is_active ? 'bg-ink' : 'bg-muted/40'}`} />
        </button>
        <button onClick={onDelete} className={`rounded-full px-3 py-2 text-xs font-medium border inline-flex items-center gap-1 ${delConfirm ? 'bg-red-600 text-white border-red-600' : 'bg-white border-line text-muted hover:text-red-600 hover:border-red-200'}`}>
          <Trash2 className="w-3 h-3" /> {delConfirm ? 'Sure?' : ''}
        </button>
      </div>
    </div>
  )
}
