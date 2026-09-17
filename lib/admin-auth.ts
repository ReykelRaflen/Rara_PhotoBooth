import 'server-only'
import { createHmac, createHash, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const ADMIN_COOKIE = 'idadari_admin'
const TTL_SEC = 60 * 60 * 24 * 7

function sessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET
    || process.env.ADMIN_PASSWORD
    || process.env.NEXT_PUBLIC_ADMIN_PASSWORD
    || null
}

export function adminPassword(): string | null {
  return process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || null
}

function hmac(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function safeEqualStr(a: string, b: string) {
  const ah = createHash('sha256').update(a).digest()
  const bh = createHash('sha256').update(b).digest()
  return timingSafeEqual(ah, bh)
}

export function issueAdminToken() {
  const secret = sessionSecret()
  if (!secret) throw new Error('Admin session secret missing')
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC
  const payload = `v1.${exp}`
  return `${payload}.${hmac(payload, secret)}`
}

export function verifyAdminToken(token: string | undefined): boolean {
  const secret = sessionSecret()
  if (!token || !secret) return false
  const lastDot = token.lastIndexOf('.')
  if (lastDot < 0) return false
  const payload = token.slice(0, lastDot)
  const sig = token.slice(lastDot + 1)
  const expected = hmac(payload, secret)
  if (!safeEqualStr(sig, expected)) return false
  const [ver, expStr] = payload.split('.')
  if (ver !== 'v1') return false
  const exp = Number(expStr)
  return Number.isFinite(exp) && exp > Date.now() / 1000
}

export function isAdmin() {
  return verifyAdminToken(cookies().get(ADMIN_COOKIE)?.value)
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function cookieOpts() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: TTL_SEC,
  }
}

export function passwordOk(input: unknown): boolean {
  const expected = adminPassword()
  if (typeof input !== 'string' || !expected) return false
  return safeEqualStr(input, expected)
}
