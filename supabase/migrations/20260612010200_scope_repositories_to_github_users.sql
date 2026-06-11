create extension if not exists pgcrypto;

create table if not exists public.repositories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users (id) on delete cascade,
    full_name text not null,
    is_active boolean not null default true,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.repositories
add column if not exists user_id uuid references auth.users (id) on delete cascade;

do $$
begin
    if exists (
        select 1
        from public.repositories
        where user_id is null
    ) then
        raise exception
            'repositories.user_id must be backfilled before this migration can be applied';
    end if;
end
$$;

alter table public.repositories
alter column user_id set not null;

alter table public.repositories
drop constraint if exists repositories_full_name_key;

create unique index if not exists repositories_user_id_full_name_key
on public.repositories (user_id, full_name);

alter table public.repositories enable row level security;

drop policy if exists "Allow repository reads" on public.repositories;
drop policy if exists "Allow repository inserts" on public.repositories;
drop policy if exists "Allow repository updates" on public.repositories;
drop policy if exists "Users can read their repositories" on public.repositories;
drop policy if exists "Users can insert their repositories" on public.repositories;
drop policy if exists "Users can update their repositories" on public.repositories;

create policy "Users can read their repositories"
on public.repositories
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their repositories"
on public.repositories
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their repositories"
on public.repositories
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
