import { NextResponse } from 'next/server'
import { isAdmin, unauthorized } from '@/lib/admin-auth'

export async function GET() {
  if (!isAdmin()) return unauthorized()
  return NextResponse.json({ ok: true })
}
