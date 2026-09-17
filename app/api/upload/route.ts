import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-admin'
import { randomUUID } from 'crypto'
import { isAdmin, unauthorized } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!isAdmin()) return unauthorized()
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const name = form.get('name') as string
    const type = form.get('type') as '3' | '6'
    const description = (form.get('description') as string) ?? ''
    let tags: string[] = []
    try { tags = JSON.parse((form.get('tags') as string) ?? '[]') } catch { /* ignore */ }
    if (!Array.isArray(tags)) tags = []
    tags = tags.filter(t => typeof t === 'string')
    const sortOrder = parseInt((form.get('sort_order') as string) ?? '0') || 0

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return NextResponse.json({ error: 'Only PNG, JPG, WEBP allowed' }, { status: 400 })
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 })
    }
    if (type !== '3' && type !== '6') {
      return NextResponse.json({ error: 'type must be 3 or 6' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp'
    const storagePath = `frames/${randomUUID()}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from('frames')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage.from('frames').getPublicUrl(storagePath)
    const imageUrl = urlData.publicUrl

    const { data, error: dbError } = await supabase.from('frames').insert({
      name,
      description,
      image_url: imageUrl,
      storage_path: storagePath,
      type,
      is_active: true,
      sort_order: sortOrder,
      tags,
    }).select().single()

    if (dbError) {
      await supabase.storage.from('frames').remove([storagePath])
      throw dbError
    }

    return NextResponse.json({ frame: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Upload failed' }, { status: 500 })
  }
}
