create extension if not exists pgcrypto;

create table if not exists public.repositories (
    id uuid primary key default gen_random_uuid(),
    full_name text not null unique,
    is_active boolean not null default true,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.repositories enable row level security;

create policy "Allow repository reads"
on public.repositories
for select
to anon, authenticated
using (true);

create policy "Allow repository inserts"
on public.repositories
for insert
to anon, authenticated
with check (true);

create policy "Allow repository updates"
on public.repositories
for update
to anon, authenticated
using (true)
with check (true);
