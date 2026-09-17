import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-admin'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json()
    if (!image || !image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
    }

    const base64Data = image.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    const supabase = createServiceClient()
    const path = `shared/${randomUUID()}.jpg`

    const { error } = await supabase.storage
      .from('frames')
      .upload(path, buffer, { contentType: 'image/jpeg' })

    if (error) throw error

    const { data } = supabase.storage.from('frames').getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
