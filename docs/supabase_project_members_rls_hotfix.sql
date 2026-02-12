-- Hotfix: remove recursive RLS policies on project_members
-- Run this in Supabase SQL Editor.

drop policy if exists members_member_select on public.project_members;
drop policy if exists members_owner_manage on public.project_members;
drop policy if exists members_owner_bootstrap_insert on public.project_members;
drop policy if exists members_owner_insert on public.project_members;
drop policy if exists members_owner_update on public.project_members;
drop policy if exists members_owner_delete on public.project_members;

create policy members_member_select on public.project_members
for select using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.projects p
    where p.id = project_members.project_id
      and p.owner_user_id = auth.uid()
  )
);

create policy members_owner_insert on public.project_members
for insert with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_members.project_id
      and p.owner_user_id = auth.uid()
  )
);

create policy members_owner_update on public.project_members
for update using (
  exists (
    select 1
    from public.projects p
    where p.id = project_members.project_id
      and p.owner_user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_members.project_id
      and p.owner_user_id = auth.uid()
  )
);

create policy members_owner_delete on public.project_members
for delete using (
  exists (
    select 1
    from public.projects p
    where p.id = project_members.project_id
      and p.owner_user_id = auth.uid()
  )
);
