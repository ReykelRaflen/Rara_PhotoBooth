-- ================================================
-- P0: tutup write anon ke frames + storage
-- Jalankan di Supabase SQL Editor (project yang sudah live)
-- Idempotent: drop dulu, create ulang.
-- ================================================

alter table public.frames enable row level security;

drop policy if exists "Public can read active frames" on public.frames;
drop policy if exists "Service role full access" on public.frames;

create policy "Public can read active frames"
  on public.frames for select
  to anon, authenticated
  using (is_active = true);

create policy "Service role full access"
  on public.frames for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Public read frames storage" on storage.objects;
drop policy if exists "Service role upload frames" on storage.objects;
drop policy if exists "Service role delete frames" on storage.objects;

create policy "Public read frames storage"
  on storage.objects for select
  using (bucket_id = 'frames');

create policy "Service role upload frames"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'frames');

create policy "Service role delete frames"
  on storage.objects for delete
  to service_role
  using (bucket_id = 'frames');
