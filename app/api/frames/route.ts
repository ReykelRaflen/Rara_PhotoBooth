import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/frames — list all frames (admin)
export async function GET() {
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

// DELETE /api/frames?id=xxx — delete frame + storage file
export async function DELETE(req: NextRequest) {
  const id          = req.nextUrl.searchParams.get('id')
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

// PATCH /api/frames — update frame metadata
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('frames')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
