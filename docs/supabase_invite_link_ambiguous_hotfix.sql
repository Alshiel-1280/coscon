-- Hotfix for "column reference \"project_id\" is ambiguous"
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.accept_project_invite_link(_token text)
returns table (
  project_id uuid,
  project_title text,
  already_member boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_token_hash text;
  v_project_id uuid;
  v_project_title text;
  v_already_member boolean;
begin
  if v_user_id is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if _token is null or char_length(trim(_token)) = 0 then
    raise exception 'Invalid invite token' using errcode = '22023';
  end if;

  v_token_hash := encode(extensions.digest(_token, 'sha256'::text), 'hex');

  select pil.project_id, p.title
    into v_project_id, v_project_title
  from public.project_invite_links pil
  join public.projects p on p.id = pil.project_id
  where pil.token_hash = v_token_hash
    and pil.is_active = true
  limit 1;

  if v_project_id is null then
    raise exception 'Invite link is invalid or inactive' using errcode = 'P0002';
  end if;

  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = v_project_id
      and pm.user_id = v_user_id
  )
  into v_already_member;

  insert into public.project_members (project_id, user_id, role, added_by)
  values (v_project_id, v_user_id, 'editor', null)
  on conflict (project_id, user_id) do update
  set role = case
    when public.project_members.role = 'owner' then 'owner'
    else 'editor'
  end;

  if not v_already_member then
    update public.project_invite_links
    set
      joined_count = joined_count + 1,
      last_joined_at = now()
    where public.project_invite_links.project_id = v_project_id;
  end if;

  return query
  select v_project_id, v_project_title, v_already_member;
end;
$$;

revoke all on function public.accept_project_invite_link(text) from public;
grant execute on function public.accept_project_invite_link(text) to authenticated;

create or replace function public.preview_project_invite_link(_token text)
returns table (
  project_id uuid,
  project_title text
)
language sql
security definer
set search_path = public
as $$
  select pil.project_id, p.title as project_title
  from public.project_invite_links pil
  join public.projects p on p.id = pil.project_id
  where pil.token_hash = encode(extensions.digest(_token, 'sha256'::text), 'hex')
    and pil.is_active = true
  limit 1;
$$;

revoke all on function public.preview_project_invite_link(text) from public;
grant execute on function public.preview_project_invite_link(text) to anon, authenticated;
