-- MURPHYLAW ONLINE DATABASE
-- Run this whole file in Supabase SQL Editor.
-- Then create an admin user in Authentication > Users and insert that user's UUID
-- into public.admin_users.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rank text not null,
  generation integer not null default 1 check (generation > 0),
  photo_path text,
  bio text not null default '',
  status text not null default 'Active',
  origin text not null default 'France',
  relation text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_parents (
  member_id uuid not null references public.members(id) on delete cascade,
  parent_id uuid not null references public.members(id) on delete cascade,
  primary key(member_id, parent_id),
  check(member_id <> parent_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  year text not null,
  title text not null,
  body text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.members enable row level security;
alter table public.member_parents enable row level security;
alter table public.events enable row level security;
alter table public.gallery enable row level security;

drop policy if exists "admins can read own admin row" on public.admin_users;
create policy "admins can read own admin row"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "public can read members" on public.members;
create policy "public can read members"
on public.members for select
to anon, authenticated
using (true);

drop policy if exists "admins can insert members" on public.members;
create policy "admins can insert members"
on public.members for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admins can update members" on public.members;
create policy "admins can update members"
on public.members for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can delete members" on public.members;
create policy "admins can delete members"
on public.members for delete
to authenticated
using (public.is_admin());

drop policy if exists "public can read member parents" on public.member_parents;
create policy "public can read member parents"
on public.member_parents for select
to anon, authenticated
using (true);

drop policy if exists "admins can insert member parents" on public.member_parents;
create policy "admins can insert member parents"
on public.member_parents for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admins can delete member parents" on public.member_parents;
create policy "admins can delete member parents"
on public.member_parents for delete
to authenticated
using (public.is_admin());

drop policy if exists "public can read events" on public.events;
create policy "public can read events"
on public.events for select
to anon, authenticated
using (true);

drop policy if exists "admins can manage events" on public.events;
create policy "admins can manage events"
on public.events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public can read gallery" on public.gallery;
create policy "public can read gallery"
on public.gallery for select
to anon, authenticated
using (true);

drop policy if exists "admins can manage gallery" on public.gallery;
create policy "admins can manage gallery"
on public.gallery for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Storage bucket for family photos.
insert into storage.buckets (id, name, public)
values ('family-photos', 'family-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "public can view family photos" on storage.objects;
create policy "public can view family photos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'family-photos');

drop policy if exists "admins can upload family photos" on storage.objects;
create policy "admins can upload family photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'family-photos' and public.is_admin());

drop policy if exists "admins can update family photos" on storage.objects;
create policy "admins can update family photos"
on storage.objects for update
to authenticated
using (bucket_id = 'family-photos' and public.is_admin())
with check (bucket_id = 'family-photos' and public.is_admin());

drop policy if exists "admins can delete family photos" on storage.objects;
create policy "admins can delete family photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'family-photos' and public.is_admin());

-- Optional starter data:
insert into public.events (year,title,body,sort_order)
select '2026','Awal MurphyLaw','Tulis sejarah awal berdirinya keluarga di sini.',1
where not exists (select 1 from public.events);

insert into public.events (year,title,body,sort_order)
select '2026','Generasi Baru','Tulis perkembangan generasi keluarga.',2
where (select count(*) from public.events) = 1;
