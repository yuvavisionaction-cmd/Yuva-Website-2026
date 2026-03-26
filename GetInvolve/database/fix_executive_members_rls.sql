-- =========================================================
-- Fix Executive Members save/upload RLS (table + storage)
-- Bucket: executive_team
-- =========================================================

-- ---------- 0) Safety: required extensions/schema assumptions ----------
-- (No-op if already present)
create extension if not exists pgcrypto;

-- ---------- 1) EXECUTIVE MEMBERS TABLE RLS ----------
alter table public.executive_members enable row level security;

-- Drop ALL existing policies on executive_members to avoid conflicts
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'executive_members'
  loop
    execute format('drop policy if exists %I on public.executive_members;', p.policyname);
  end loop;
end $$;

-- Read policy: authenticated admins can read
create policy executive_members_select_auth
on public.executive_members
for select
to authenticated
using (true);

-- Insert policy: only super_admin (matched by JWT email in admin_users)
create policy executive_members_insert_super_admin
on public.executive_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users au
    where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and lower(au.role) = 'super_admin'
  )
);

-- Update policy: only super_admin
create policy executive_members_update_super_admin
on public.executive_members
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and lower(au.role) = 'super_admin'
  )
)
with check (
  exists (
    select 1
    from public.admin_users au
    where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and lower(au.role) = 'super_admin'
  )
);

-- Delete policy: only super_admin
create policy executive_members_delete_super_admin
on public.executive_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and lower(au.role) = 'super_admin'
  )
);

-- ---------- 2) STORAGE BUCKET RLS (storage.objects) ----------
-- Ensure bucket exists (safe if already exists)
insert into storage.buckets (id, name, public)
values ('executive_team', 'executive_team', true)
on conflict (id) do nothing;

-- Drop all existing policies for this bucket to remove wrong-role configs
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
  loop
    -- Drop only policies that mention executive_team in their definition/name
    if p.policyname ilike '%executive%' then
      execute format('drop policy if exists %I on storage.objects;', p.policyname);
    end if;
  end loop;
end $$;

-- Also explicitly drop common old names (safe no-op if absent)
drop policy if exists "Executive team images are publicly accessible" on storage.objects;
drop policy if exists "Super admins can upload executive team images" on storage.objects;
drop policy if exists "Super admins can update executive team images" on storage.objects;
drop policy if exists "Super admins can delete executive team images" on storage.objects;
drop policy if exists "exec_team_public_read" on storage.objects;
drop policy if exists "exec_team_auth_insert_super_admin" on storage.objects;
drop policy if exists "exec_team_auth_update_super_admin" on storage.objects;
drop policy if exists "exec_team_auth_delete_super_admin" on storage.objects;

-- Public read for bucket files
create policy exec_team_public_read
on storage.objects
for select
to public
using (bucket_id = 'executive_team');

-- Insert: authenticated + super_admin check
create policy exec_team_auth_insert_super_admin
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'executive_team'
  and exists (
    select 1
    from public.admin_users au
    where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and lower(au.role) = 'super_admin'
  )
);

-- Update: authenticated + super_admin check
create policy exec_team_auth_update_super_admin
on storage.objects
for update
to authenticated
using (
  bucket_id = 'executive_team'
  and exists (
    select 1
    from public.admin_users au
    where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and lower(au.role) = 'super_admin'
  )
)
with check (
  bucket_id = 'executive_team'
  and exists (
    select 1
    from public.admin_users au
    where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and lower(au.role) = 'super_admin'
  )
);

-- Delete: authenticated + super_admin check
create policy exec_team_auth_delete_super_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'executive_team'
  and exists (
    select 1
    from public.admin_users au
    where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and lower(au.role) = 'super_admin'
  )
);

-- ---------- 3) VERIFY CURRENT POLICIES ----------
-- Table policies
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'executive_members'
order by policyname;

-- Storage policies for bucket
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    policyname ilike '%exec%'
    or policyname ilike '%executive%'
  )
order by policyname;

-- ---------- 4) VERIFY YOUR LOGIN EMAIL MAPS TO SUPER_ADMIN ----------
-- Replace with your actual admin login email
-- select id, email, role
-- from public.admin_users
-- where lower(email) = lower('your_admin_email@example.com');

-- ---------- 5) CREATE PUBLIC VIEW FOR "WHO IS WHO" PAGE ----------
-- This view allows the public page to safely query the executive members 
-- without needing 'authenticated' role permissions on the exact table.
create or replace view public.vw_executive_members as
select 
  id, 
  member_name, 
  designation, 
  role, 
  photo_url, 
  contact_email, 
  description, 
  display_order
from public.executive_members;

-- Grant select permission to anon/public on the view
grant select on public.vw_executive_members to anon, authenticated;
