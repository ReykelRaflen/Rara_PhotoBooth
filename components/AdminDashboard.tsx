'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Trash2, Edit3, Save, X, LogOut, Image as ImgIcon,
  ToggleLeft, ToggleRight, Upload, AlertCircle, CheckCircle,
  Grid3x3, LayoutGrid, ExternalLink, Eye, Leaf, GripVertical,
  RefreshCw,
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

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
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  // Drag & drop
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFileChange(f)
  }, [])

  const handleSubmit = async () => {
    if (!form.name.trim()) { notify('Name is required', false); return }
    if (!file && !editId) { notify('Please upload a PNG file', false); return }

    setUploading(true)
    try {
      if (editId) {
        // Update metadata only (or re-upload if new file)
        if (file) {
          // New file: upload first, then delete old
          const fd = new FormData()
          fd.append('file', file)
          fd.append('name', form.name.trim())
          fd.append('description', form.description.trim())
          fd.append('type', form.type)
          fd.append('tags', JSON.stringify(form.tags))
          fd.append('sort_order', String(form.sort_order))

          const r = await fetch('/api/upload', { method: 'POST', body: fd })
          const d = await r.json()
          if (!r.ok) throw new Error(d.error)

          // Delete old frame
          const oldFrame = frames.find(f => f.id === editId)
          if (oldFrame) {
            await fetch(`/api/frames?id=${editId}&path=${encodeURIComponent(oldFrame.storage_path)}`, { method: 'DELETE' })
          }
        } else {
          // Metadata only
          const r = await fetch('/api/frames', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: editId,
              name: form.name.trim(),
              description: form.description.trim(),
              type: form.type,
              is_active: form.is_active,
              sort_order: form.sort_order,
              tags: form.tags,
            }),
          })
          if (!r.ok) throw new Error('Update failed')
        }
        notify('Frame updated! ✓')
      } else {
        const fd = new FormData()
        fd.append('file', file!)
        fd.append('name', form.name.trim())
        fd.append('description', form.description.trim())
        fd.append('type', form.type)
        fd.append('tags', JSON.stringify(form.tags))
        fd.append('sort_order', String(form.sort_order))

        const r = await fetch('/api/upload', { method: 'POST', body: fd })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        notify(`"${form.name}" uploaded! 🎉`)
      }

      resetForm()
      await load()
    } catch (e: any) {
      notify(e.message || 'Error occurred', false)
    }
    setUploading(false)
  }

  const handleDelete = async (frame: Frame) => {
    if (delConfirm !== frame.id) { setDel(frame.id); setTimeout(() => setDel(null), 3000); return }
    try {
      const r = await fetch(`/api/frames?id=${frame.id}&path=${encodeURIComponent(frame.storage_path)}`, { method: 'DELETE' })
      if (!r.ok) throw new Error()
      notify('Frame deleted')
      setDel(null)
      await load()
    } catch { notify('Delete failed', false) }
  }

  const handleToggle = async (frame: Frame) => {
    try {
      await fetch('/api/frames', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: frame.id, is_active: !frame.is_active }),
      })
      await load()
    } catch { notify('Update failed', false) }
  }

  const startEdit = (frame: Frame) => {
    setEditId(frame.id)
    setForm({
      name: frame.name,
      description: frame.description ?? '',
      type: frame.type,
      is_active: frame.is_active,
      sort_order: frame.sort_order,
      tags: frame.tags ?? [],
    })
    setFile(null)
    setPreview(frame.image_url)
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false); setEditId(null)
    setForm({ ...EMPTY }); setFile(null); setPreview(null); setTagInput('')
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) {
      setForm(p => ({ ...p, tags: [...p.tags, t] }))
      setTagInput('')
    }
  }

  const filtered = frames.filter(f => activeTab === 'all' || f.type === activeTab)

  const stats = {
    total:  frames.length,
    active: frames.filter(f => f.is_active).length,
    t3:     frames.filter(f => f.type === '3').length,
    t6:     frames.filter(f => f.type === '6').length,
  }

  return (
    <div className="min-h-screen bg-matcha-950 text-white flex font-body">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-strong font-body text-sm font-medium animate-slide-left
          ${toast.ok ? 'bg-matcha-500' : 'bg-rose-500'} text-white`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className="w-60 min-h-screen flex flex-col"
        style={{ background: 'linear-gradient(180deg, #12200b 0%, #1a2f12 100%)' }}>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-matcha-400/20 flex items-center justify-center">
              <Leaf className="w-4.5 h-4.5 text-matcha-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">idadari.</p>
              <p className="text-xs text-matcha-500">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <a href="/" target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-matcha-400 hover:text-white hover:bg-white/10 transition-all group">
            <Eye className="w-4 h-4" />
            View Site
            <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-white/10 text-white">
            <ImgIcon className="w-4 h-4" />
            Manage Frames
          </button>
        </nav>

        {/* Stats */}
        <div className="p-4 m-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <p className="text-[10px] text-matcha-500 uppercase tracking-widest font-medium mb-3">Stats</p>
          {[
            ['Total',   stats.total],
            ['Active',  stats.active],
            ['3-Photo', stats.t3],
            ['6-Photo', stats.t6],
          ].map(([l, v]) => (
            <div key={l as string} className="flex justify-between items-center">
              <span className="text-xs text-matcha-600">{l}</span>
              <span className="text-sm font-semibold text-white">{v}</span>
            </div>
          ))}
        </div>

        <button onClick={onLogout}
          className="m-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-matcha-500 hover:text-white hover:bg-white/10 transition-all">
          <LogOut className="w-4 h-4" /> Log out
        </button>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto bg-matcha-950/50">
        <div className="p-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-display font-medium text-white">Frame Library</h1>
              <p className="text-sm text-matcha-500 mt-0.5">Upload & manage photobooth frames</p>
            </div>
            <div className="flex gap-2">
              <button onClick={load} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-matcha-400 hover:text-white transition-all">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY }); setFile(null); setPreview(null) }}
                className="btn-primary text-sm py-2.5"
              >
                <Plus className="w-4 h-4" /> Add Frame
              </button>
            </div>
          </div>

          {/* Upload / Edit Form */}
          {showForm && (
            <div className="mb-8 rounded-3xl bg-white/5 border border-white/10 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl text-white">
                  {editId ? '✏️ Edit Frame' : '⬆️ Upload New Frame'}
                </h2>
                <button onClick={resetForm} className="text-matcha-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Drop zone */}
                <div className="md:row-span-3">
                  <label className="text-xs text-matcha-400 uppercase tracking-widest font-medium block mb-2">
                    Frame Image (PNG recommended)
                  </label>
                  <div
                    ref={dropRef}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={onDrop}
                    className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden
                      ${preview ? 'border-matcha-500 bg-matcha-900/50' : 'border-white/20 hover:border-matcha-500/60 bg-white/5 hover:bg-white/10'}`}
                    style={{ minHeight: '240px' }}
                  >
                    {preview ? (
                      <>
                        <img src={preview} alt="preview" className="w-full h-full object-contain max-h-64" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <p className="text-white text-sm font-body">Click to change</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-8">
                        <Upload className="w-8 h-8 text-matcha-500 mx-auto mb-3" />
                        <p className="text-sm text-white font-medium mb-1">Drop file here or click to browse</p>
                        <p className="text-xs text-matcha-500">PNG, JPG, WEBP · max 8MB</p>
                        <p className="text-xs text-matcha-600 mt-2 italic">
                          PNG with transparency works best for frame overlays
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                  {file && (
                    <p className="text-xs text-matcha-400 mt-2 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-matcha-400" />
                      {file.name} ({(file.size / 1024).toFixed(0)} KB)
                    </p>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs text-matcha-400 uppercase tracking-widest font-medium block mb-2">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Sakura Blossom"
                    className="w-full px-4 py-3 rounded-2xl bg-white/8 border border-white/15 text-white placeholder-matcha-600
                               focus:outline-none focus:border-matcha-400 text-sm transition-colors"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="text-xs text-matcha-400 uppercase tracking-widest font-medium block mb-2">Layout Type *</label>
                  <div className="flex gap-2">
                    {(['3','6'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setForm(p => ({ ...p, type: t }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all
                          ${form.type === t
                            ? 'bg-matcha-500 text-white'
                            : 'bg-white/8 border border-white/15 text-matcha-400 hover:bg-white/15'}`}
                      >
                        {t === '3' ? <Grid3x3 className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                        {t} Photos
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs text-matcha-400 uppercase tracking-widest font-medium block mb-2">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Short description"
                    className="w-full px-4 py-3 rounded-2xl bg-white/8 border border-white/15 text-white placeholder-matcha-600
                               focus:outline-none focus:border-matcha-400 text-sm transition-colors"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="text-xs text-matcha-400 uppercase tracking-widest font-medium block mb-2">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                      placeholder="Add tag + Enter"
                      className="flex-1 px-3 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white placeholder-matcha-600
                                 focus:outline-none focus:border-matcha-400 text-sm transition-colors"
                    />
                    <button onClick={addTag} className="px-3 rounded-xl bg-matcha-600 hover:bg-matcha-500 text-white transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {form.tags.map(t => (
                      <span key={t} className="flex items-center gap-1 bg-matcha-800/60 text-matcha-300 text-xs px-2.5 py-1 rounded-full">
                        {t}
                        <button onClick={() => setForm(p => ({ ...p, tags: p.tags.filter(x => x !== t) }))} className="hover:text-white ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Sort + Active */}
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <label className="text-xs text-matcha-400 uppercase tracking-widest font-medium block mb-2">Sort Order</label>
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 rounded-2xl bg-white/8 border border-white/15 text-white focus:outline-none focus:border-matcha-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-matcha-400 uppercase tracking-widest font-medium block mb-2">Active</label>
                    <button onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}>
                      {form.is_active
                        ? <ToggleRight className="w-10 h-10 text-matcha-400" />
                        : <ToggleLeft  className="w-10 h-10 text-matcha-700" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <div className="md:col-span-2 flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={uploading}
                    className={`btn-primary flex-1 justify-center py-4 text-base ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {uploading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading…</>
                      : <><Save className="w-4 h-4" /> {editId ? 'Save Changes' : 'Upload Frame'}</>
                    }
                  </button>
                  <button onClick={resetForm} className="px-6 py-4 rounded-full border border-white/15 text-matcha-400 hover:text-white hover:border-white/30 font-body transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 mb-5">
            {(['all','3','6'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-2 rounded-full text-sm font-body font-medium transition-all
                  ${activeTab === t ? 'bg-matcha-500 text-white' : 'bg-white/8 text-matcha-400 hover:bg-white/15'}`}
              >
                {t === 'all' ? `All (${stats.total})` : `${t} Photos (${t === '3' ? stats.t3 : stats.t6})`}
              </button>
            ))}
          </div>

          {/* Frame grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton rounded-2xl" style={{ aspectRatio: '2/5' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <ImgIcon className="w-12 h-12 text-matcha-700 mx-auto mb-4" />
              <p className="font-display text-2xl text-matcha-500 mb-2">No frames yet</p>
              <p className="font-body text-sm text-matcha-700">Click &ldquo;Add Frame&rdquo; to upload your first PNG</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map(frame => (
                <FrameCard
                  key={frame.id}
                  frame={frame}
                  isEditing={editId === frame.id}
                  delConfirm={delConfirm === frame.id}
                  onEdit={() => startEdit(frame)}
                  onDelete={() => handleDelete(frame)}
                  onToggle={() => handleToggle(frame)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ── Frame card ──
function FrameCard({ frame, isEditing, delConfirm, onEdit, onDelete, onToggle }: {
  frame: Frame; isEditing: boolean; delConfirm: boolean
  onEdit: () => void; onDelete: () => void; onToggle: () => void
}) {
  const [err, setErr] = useState(false)
  return (
    <div className={`rounded-2xl overflow-hidden border transition-all duration-200 group
      ${isEditing ? 'border-matcha-400 ring-2 ring-matcha-400/30' : 'border-white/10 hover:border-white/20'}`}
      style={{ background: 'rgba(255,255,255,0.04)' }}>
      {/* Image */}
      <div className="relative bg-matcha-900/50" style={{ aspectRatio: '2/5' }}>
        {!err ? (
          <img src={frame.image_url} alt={frame.name} className="w-full h-full object-cover" onError={() => setErr(true)} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <ImgIcon className="w-6 h-6 text-matcha-700 mb-1" />
            <p className="text-[10px] text-matcha-700 text-center px-2">Preview unavailable</p>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className="text-[10px] font-body font-bold bg-matcha-500 text-white px-2 py-0.5 rounded-full">
            {frame.type}P
          </span>
          <span className={`text-[10px] font-body font-bold px-2 py-0.5 rounded-full
            ${frame.is_active ? 'bg-green-500/90 text-white' : 'bg-gray-600/90 text-gray-300'}`}>
            {frame.is_active ? '●' : '○'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-body font-semibold text-white truncate">{frame.name}</p>
        {frame.description && <p className="text-[10px] text-matcha-500 truncate mt-0.5">{frame.description}</p>}
      </div>

      {/* Actions */}
      <div className="px-2.5 pb-2.5 flex gap-1.5">
        <button onClick={onEdit} title="Edit"
          className="flex-1 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 text-matcha-400 hover:text-white transition-all text-xs flex items-center justify-center gap-1">
          <Edit3 className="w-3 h-3" /> Edit
        </button>
        <button onClick={onToggle} title="Toggle active"
          className="p-1.5 rounded-xl bg-white/8 hover:bg-white/15 text-matcha-400 hover:text-white transition-all">
          {frame.is_active ? <ToggleRight className="w-4 h-4 text-matcha-400" /> : <ToggleLeft className="w-4 h-4" />}
        </button>
        <button onClick={onDelete} title={delConfirm ? 'Confirm delete' : 'Delete'}
          className={`p-1.5 rounded-xl transition-all
            ${delConfirm ? 'bg-red-500 text-white animate-pulse-soft' : 'bg-white/8 hover:bg-red-900/40 text-matcha-500 hover:text-red-400'}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
