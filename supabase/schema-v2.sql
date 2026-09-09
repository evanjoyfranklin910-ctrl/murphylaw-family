-- MURPHYLAW FAMILY RELATIONSHIP V2
-- Run this AFTER schema.sql in Supabase SQL Editor.
create table if not exists public.member_relationships (
  id uuid primary key default gen_random_uuid(),
  member_a_id uuid not null references public.members(id) on delete cascade,
  member_b_id uuid not null references public.members(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('spouse','partner','sibling')),
  status text not null default 'Active',
  start_date date,
  end_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (member_a_id <> member_b_id)
);

create index if not exists member_relationships_a_idx on public.member_relationships(member_a_id);
create index if not exists member_relationships_b_idx on public.member_relationships(member_b_id);

alter table public.member_relationships enable row level security;

drop policy if exists "public can read member relationships" on public.member_relationships;
create policy "public can read member relationships"
on public.member_relationships for select to anon, authenticated using (true);

drop policy if exists "admins can manage member relationships" on public.member_relationships;
create policy "admins can manage member relationships"
on public.member_relationships for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Optional extra profile fields. Safe to run repeatedly.
alter table public.members add column if not exists nickname text not null default '';
alter table public.members add column if not exists birth_date date;
alter table public.members add column if not exists joined_date date;
