'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Lock, Sparkles, ArrowRight } from 'lucide-react'
import AdminDashboard from '@/components/AdminDashboard'

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [pw, setPw]             = useState('')
  const [show, setShow]         = useState(false)
  const [err, setErr]           = useState('')
  const [ready, setReady]       = useState(false)

  useEffect(() => {
    // Check if browser has cookie by making a test request
    fetch('/api/frames').then(r => {
      if (r.ok) setLoggedIn(true)
      setReady(true)
    }).catch(() => setReady(true))
  }, [])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      })
      if (r.ok) {
        setLoggedIn(true)
      } else {
        setErr('Wrong password')
        setTimeout(() => setErr(''), 2800)
      }
    } catch {
      setErr('Login failed')
    }
  }

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setLoggedIn(false)
    setPw('')
  }

  if (!ready) return (
    <div className="min-h-screen bg-vanilla-50 flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-vanilla-200 border-t-ink animate-spin" />
    </div>
  )
  if (loggedIn) return <AdminDashboard onLogout={logout} />

  return (
    <main className="min-h-screen bg-vanilla-50 grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* left: brand editorial */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-vanilla-100 border-r border-line relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: 'radial-gradient(ellipse 70% 50% at 20% 20%, rgba(255,240,204,0.9) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(232,184,106,0.12) 0%, transparent 60%)' }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-line px-3 py-1.5 shadow-soft">
            <span className="h-2 w-2 rounded-full bg-ink" />
            <span className="font-mono text-[11px] tracking-widest uppercase text-muted">Admin · vanilla editorial</span>
          </div>
          <h1 className="mt-8 font-display text-[44px] font-light leading-[0.9] tracking-[-0.02em] text-ink">
            Manage
            <span className="block italic text-vanilla-800">your frames.</span>
          </h1>
          <p className="mt-4 max-w-[420px] font-body text-[15px] leading-7 text-muted">
            Upload PNG transparan, edit metadata, toggle active, atur urutan. Semua
            perubahan langsung tersinkronisasi ke cloud.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-[420px]">
            {[
              ['PNG','Transparan best'],
              ['8MB','Max file'],
              ['Live','Cloud Sync'],
            ].map(([a,b])=> (
              <div key={a} className="rounded-2xl bg-white border border-line p-3">
                <p className="font-display text-sm font-medium text-ink">{a}</p>
                <p className="font-mono text-[11px] text-muted">{b}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center justify-between font-mono text-xs text-muted">
          <span>© {new Date().getFullYear()} idaadarii</span>
          <a href="/" className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-3 py-1.5 text-xs font-medium hover:bg-ink/90">Back to site <ArrowRight className="w-3 h-3"/></a>
        </div>
      </div>

      {/* right: form */}
      <div className="flex items-center justify-center p-6 lg:p-10 bg-vanilla-50 relative">
        <div className="pointer-events-none absolute inset-0 lg:hidden" aria-hidden style={{ background: 'radial-gradient(ellipse 70% 50% at 20% 20%, rgba(255,240,204,0.6) 0%, transparent 60%)' }} />
        <div className="w-full max-w-[420px] relative">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-xl bg-ink flex items-center justify-center"><span className="font-display text-sm font-semibold text-white">i.</span></div>
            <span className="font-display text-lg font-semibold tracking-tight text-ink">idaadarii.</span>
            <span className="rounded-full bg-white border border-line px-2 py-1 font-mono text-[10px] tracking-widest uppercase text-muted">Admin</span>
          </div>

          <div className="card p-7 sm:p-8">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-vanilla-600" />
              <p className="font-mono text-[11px] tracking-widest uppercase text-muted">Sign in</p>
            </div>
            <h2 className="font-display text-[22px] font-medium tracking-tight text-ink">Admin panel</h2>
            <p className="mt-1 font-body text-sm text-muted">Enter password to manage vanilla frames.</p>

            <form onSubmit={login} className="mt-6 space-y-4">
              <div>
                <label className="font-mono text-[11px] tracking-widest uppercase text-muted block mb-2">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
                  <input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter admin password" className="input pl-11 pr-11" autoFocus />
                  <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide' : 'Show'} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-vanilla-100 border border-line flex items-center justify-center text-muted hover:text-ink">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {err && <div className="rounded-2xl bg-red-50 border border-red-200 text-red-600 font-body text-sm text-center py-3 px-4">{err}</div>}
              <button type="submit" className="btn-primary w-full justify-center py-4 text-[15px]">Sign in →</button>
            </form>

            <div className="mt-5 rounded-2xl bg-vanilla-50 border border-line px-4 py-3 flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-widest uppercase text-muted">Secured</span>
              <span className="font-mono text-[10px] uppercase font-medium text-ink bg-white border border-line px-2.5 py-1 rounded-full">Server-side Auth</span>
            </div>
            <p className="mt-2 text-center font-mono text-[11px] text-muted">Change via ADMIN_PASSWORD in .env.local</p>
            <a href="/" className="mt-4 block text-center font-body text-sm text-muted hover:text-ink">← Back to photobooth</a>
          </div>
        </div>
      </div>
    </main>
  )
}
