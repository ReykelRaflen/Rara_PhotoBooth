import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminPassword, cookieOpts, issueAdminToken, passwordOk, ADMIN_COOKIE } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  try {
    if (!adminPassword()) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 500 })
    }
    const body = await req.json()
    if (!passwordOk(body?.password)) {
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
    }
    cookies().set(ADMIN_COOKIE, issueAdminToken(), cookieOpts())
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
