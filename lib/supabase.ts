import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role (for admin uploads)
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────
export interface Frame {
  id: string
  name: string
  description: string | null
  image_url: string       // Public URL from Supabase Storage
  storage_path: string    // Path in bucket e.g. "frames/uuid.png"
  type: '3' | '6'
  is_active: boolean
  sort_order: number
  tags: string[]
  created_at: string
  updated_at: string
}

// ────────────────────────────────────────────────
// DB helpers
// ────────────────────────────────────────────────

