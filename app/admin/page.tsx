'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Leaf, Lock } from 'lucide-react'
import AdminDashboard from '@/components/AdminDashboard'

const PASS     = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'idadari2024'
const SESS_KEY = 'idadari_admin_v2'

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [pw, setPw]             = useState('')
  const [show, setShow]         = useState(false)
  const [err, setErr]           = useState('')
  const [ready, setReady]       = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESS_KEY) === 'ok') setLoggedIn(true)
    setReady(true)
  }, [])

  const login = (e: React.FormEvent) => {
    e.preventDefault()
    if (pw === PASS) {
      sessionStorage.setItem(SESS_KEY, 'ok')
      setLoggedIn(true)
    } else {
      setErr('Wrong password!')
      setTimeout(() => setErr(''), 2800)
    }
  }

  const logout = () => { sessionStorage.removeItem(SESS_KEY); setLoggedIn(false); setPw('') }

  if (!ready) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-matcha-200 border-t-matcha-500 rounded-full animate-spin" />
    </div>
  )

  if (loggedIn) return <AdminDashboard onLogout={logout} />

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center p-5 relative overflow-hidden">
      {/* Bg blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none"
        style={{ background: `
          radial-gradient(ellipse 60% 60% at 20% 20%, rgba(197,223,177,0.4) 0%, transparent 70%),
          radial-gradient(ellipse 50% 50% at 80% 80%, rgba(242,168,184,0.25) 0%, transparent 65%)
        `}} />

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-3xl bg-matcha-500 flex items-center justify-center mx-auto mb-4 shadow-matcha">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-4xl font-light text-matcha-700 mb-1">Admin Panel</h1>
          <p className="font-body text-sm text-gray-400">Idaadarii&rsquo;s Photobooth</p>
        </div>

        <div className="card p-8">
          <form onSubmit={login} className="space-y-5">
            <div>
              <label className="font-body text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={show ? 'text' : 'password'}
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  placeholder="Enter admin password"
                  className="input pl-11 pr-11"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 text-red-500 font-body text-sm text-center py-3 rounded-2xl">
                {err}
              </div>
            )}

            <button type="submit" className="btn-primary w-full justify-center py-4 text-base">
              Sign In
            </button>
          </form>

          <p className="text-center font-mono text-xs text-gray-400 mt-5">
            default: <span className="text-matcha-600 bg-matcha-50 px-2 py-0.5 rounded">idadari2024</span>
          </p>
          <p className="text-center font-mono text-xs text-gray-400 mt-1">
            change in <span className="text-gray-500">.env.local</span>
          </p>
        </div>

        <div className="text-center mt-5">
          <a href="/" className="font-body text-sm text-matcha-500 hover:text-matcha-700 transition-colors">
            ← Back to photobooth
          </a>
        </div>
      </div>
    </main>
  )
}
