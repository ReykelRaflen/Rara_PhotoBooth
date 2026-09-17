import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-admin'
import { isAdmin, unauthorized } from '@/lib/admin-auth'

export async function GET() {
  if (!isAdmin()) return unauthorized()
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('frames')
      .select('*')
      .order('sort_order')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ frames: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin()) return unauthorized()
  const id = req.nextUrl.searchParams.get('id')
  const storagePath = req.nextUrl.searchParams.get('path')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const supabase = createServiceClient()
    if (storagePath) {
      await supabase.storage.from('frames').remove([storagePath])
    }
    const { error } = await supabase.from('frames').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin()) return unauthorized()
  try {
    const body = await req.json()
    const { id, name, description, type, is_active, sort_order, tags } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof name === 'string') updates.name = name
    if (description !== undefined) updates.description = description
    if (type === '3' || type === '6') updates.type = type
    if (typeof is_active === 'boolean') updates.is_active = is_active
    if (typeof sort_order === 'number' && Number.isFinite(sort_order)) updates.sort_order = sort_order
    if (Array.isArray(tags)) updates.tags = tags.filter((t: unknown) => typeof t === 'string')

    const supabase = createServiceClient()
    const { error } = await supabase.from('frames').update(updates).eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
