-- ==============================================================================
-- Vizor Supabase Schema: Emergency SOS Contacts
-- Run this in your Supabase Project's SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create table for Emergency SOS Contacts
create table if not exists public.sos_contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phone text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row-Level Security (RLS)
alter table public.sos_contacts enable row level security;

-- 3. RLS Policies (Users can only view, insert, update, delete their own contacts)
drop policy if exists "Users can view own contacts" on public.sos_contacts;
create policy "Users can view own contacts"
  on public.sos_contacts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own contacts" on public.sos_contacts;
create policy "Users can insert own contacts"
  on public.sos_contacts
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own contacts" on public.sos_contacts;
create policy "Users can update own contacts"
  on public.sos_contacts
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own contacts" on public.sos_contacts;
create policy "Users can delete own contacts"
  on public.sos_contacts
  for delete
  using (auth.uid() = user_id);

-- 4. Index for fast user_id lookups
create index if not exists idx_sos_contacts_user_id on public.sos_contacts (user_id);
