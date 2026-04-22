-- ================================================
-- Idadari Photobooth — Supabase Schema
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ================================================

-- 1. Tabel frames
create table if not exists public.frames (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  image_url    text not null,
  storage_path text not null,
  type         text not null check (type in ('3','6')),
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  tags         text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 2. Index buat performa
create index if not exists frames_is_active_idx   on public.frames (is_active);
create index if not exists frames_sort_order_idx  on public.frames (sort_order, created_at desc);

-- 3. Row Level Security (RLS) — baca publik, tulis via service role
alter table public.frames enable row level security;

-- Siapa pun bisa baca frame yang aktif
create policy "Public can read active frames"
  on public.frames for select
  using (is_active = true);

-- Service role bisa semua (untuk admin)
create policy "Service role full access"
  on public.frames for all
  using (true)
  with check (true);

-- 4. Storage bucket untuk upload PNG frame
-- PENTING: buat di Supabase Dashboard → Storage → New Bucket
-- Nama bucket: "frames"
-- Public bucket: YES (centang)

-- 5. Storage policies
insert into storage.buckets (id, name, public)
values ('frames', 'frames', true)
on conflict (id) do nothing;

create policy "Public read frames storage"
  on storage.objects for select
  using (bucket_id = 'frames');

create policy "Service role upload frames"
  on storage.objects for insert
  with check (bucket_id = 'frames');

create policy "Service role delete frames"
  on storage.objects for delete
  using (bucket_id = 'frames');

-- 6. Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger frames_updated_at
  before update on public.frames
  for each row execute function public.handle_updated_at();

-- ✅ Done! Sekarang setup .env.local dengan URL dan keys dari Supabase.
