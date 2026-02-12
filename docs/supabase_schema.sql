-- 撮影絵コンテアプリ: Supabase(Postgres) MVP schema
-- 前提: auth.users を利用

create extension if not exists pgcrypto;

-- enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type member_role as enum ('owner', 'editor', 'viewer');
  end if;
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type project_status as enum ('準備中', '撮影中', '現像中', '納品済み');
  end if;
  if not exists (select 1 from pg_type where typname = 'shot_status') then
    create type shot_status as enum ('構想', '未撮影', '撮影済', '現像済', '共有済');
  end if;
  if not exists (select 1 from pg_type where typname = 'asset_kind') then
    create type asset_kind as enum ('reference', 'edit', 'diagram_preview', 'export');
  end if;
  if not exists (select 1 from pg_type where typname = 'deliverable_kind') then
    create type deliverable_kind as enum ('pdf', 'jpeg', 'zip', 'other');
  end if;
end $$;

-- users profile
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  google_sub text unique not null,
  email text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  status project_status not null default '準備中',
  shoot_date date,
  location text,
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  drive_folder_id text not null,
  drive_folder_name text not null,
  drive_folder_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_owner on public.projects(owner_user_id);
create index if not exists idx_projects_date on public.projects(shoot_date);

-- project members
create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role member_role not null default 'viewer',
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists idx_project_members_user on public.project_members(user_id);

-- scenes
create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scenes_project_order on public.scenes(project_id, sort_order, created_at);

-- shots
create table if not exists public.shots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  status shot_status not null default '構想',
  composition_memo text,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shots_scene_order on public.shots(scene_id, sort_order, created_at);
create index if not exists idx_shots_project_status on public.shots(project_id, status);

-- shot assets
create table if not exists public.shot_assets (
  id uuid primary key default gen_random_uuid(),
  shot_id uuid not null references public.shots(id) on delete cascade,
  kind asset_kind not null,
  drive_file_id text not null,
  drive_file_name text not null,
  drive_web_view_link text,
  mime_type text not null,
  width integer,
  height integer,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (shot_id, drive_file_id)
);

create index if not exists idx_shot_assets_shot_kind on public.shot_assets(shot_id, kind, created_at desc);

-- lighting diagrams (1 shot = 1 current diagram)
create table if not exists public.lighting_diagrams (
  id uuid primary key default gen_random_uuid(),
  shot_id uuid not null unique references public.shots(id) on delete cascade,
  diagram_json jsonb not null,
  preview_asset_id uuid references public.shot_assets(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lighting_diagrams_shot on public.lighting_diagrams(shot_id);
create index if not exists idx_lighting_diagrams_json on public.lighting_diagrams using gin (diagram_json);

-- comments: project-level or shot-level
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  shot_id uuid references public.shots(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_target_check check (
    (project_id is not null and shot_id is null) or
    (project_id is null and shot_id is not null)
  )
);

create index if not exists idx_comments_project_time on public.comments(project_id, created_at);
create index if not exists idx_comments_shot_time on public.comments(shot_id, created_at);

-- deliverables
create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  shot_id uuid references public.shots(id) on delete set null,
  kind deliverable_kind not null default 'pdf',
  drive_file_id text not null,
  drive_file_name text not null,
  drive_web_view_link text,
  mime_type text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, drive_file_id)
);

create index if not exists idx_deliverables_project_time on public.deliverables(project_id, created_at desc);

-- updated_at helper
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_projects_touch on public.projects;
create trigger trg_projects_touch before update on public.projects
for each row execute function public.touch_updated_at();

drop trigger if exists trg_scenes_touch on public.scenes;
create trigger trg_scenes_touch before update on public.scenes
for each row execute function public.touch_updated_at();

drop trigger if exists trg_shots_touch on public.shots;
create trigger trg_shots_touch before update on public.shots
for each row execute function public.touch_updated_at();

drop trigger if exists trg_lighting_diagrams_touch on public.lighting_diagrams;
create trigger trg_lighting_diagrams_touch before update on public.lighting_diagrams
for each row execute function public.touch_updated_at();

drop trigger if exists trg_comments_touch on public.comments;
create trigger trg_comments_touch before update on public.comments
for each row execute function public.touch_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.scenes enable row level security;
alter table public.shots enable row level security;
alter table public.shot_assets enable row level security;
alter table public.lighting_diagrams enable row level security;
alter table public.comments enable row level security;
alter table public.deliverables enable row level security;

-- helpers for policy checks
create or replace function public.is_project_member(_project_id uuid, _user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = _project_id
      and pm.user_id = _user_id
  );
$$;

-- profiles policy
drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_authenticated_select on public.profiles;
create policy profiles_authenticated_select on public.profiles
for select using (auth.uid() is not null);

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
for insert with check (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update using (id = auth.uid());

-- projects policy
drop policy if exists projects_member_select on public.projects;
create policy projects_member_select on public.projects
for select using (
  owner_user_id = auth.uid() or public.is_project_member(id, auth.uid())
);

drop policy if exists projects_owner_insert on public.projects;
create policy projects_owner_insert on public.projects
for insert with check (owner_user_id = auth.uid());

drop policy if exists projects_editor_update on public.projects;
create policy projects_editor_update on public.projects
for update using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'editor')
  )
);

-- project members policy
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
    select 1 from public.projects p
    where p.id = project_members.project_id
      and p.owner_user_id = auth.uid()
  )
);

create policy members_owner_insert on public.project_members
for insert with check (
  exists (
    select 1 from public.projects p
    where p.id = project_members.project_id
      and p.owner_user_id = auth.uid()
  )
);

create policy members_owner_update on public.project_members
for update using (
  exists (
    select 1 from public.projects p
    where p.id = project_members.project_id
      and p.owner_user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.projects p
    where p.id = project_members.project_id
      and p.owner_user_id = auth.uid()
  )
);

create policy members_owner_delete on public.project_members
for delete using (
  exists (
    select 1 from public.projects p
    where p.id = project_members.project_id
      and p.owner_user_id = auth.uid()
  )
);

-- scenes policy
drop policy if exists scenes_member_select on public.scenes;
create policy scenes_member_select on public.scenes
for select using (public.is_project_member(project_id, auth.uid()));

drop policy if exists scenes_editor_write on public.scenes;
create policy scenes_editor_write on public.scenes
for all using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = scenes.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'editor')
  )
);

-- shots policy
drop policy if exists shots_member_select on public.shots;
create policy shots_member_select on public.shots
for select using (public.is_project_member(project_id, auth.uid()));

drop policy if exists shots_editor_write on public.shots;
create policy shots_editor_write on public.shots
for all using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = shots.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'editor')
  )
);

-- shot_assets policy
drop policy if exists assets_member_select on public.shot_assets;
create policy assets_member_select on public.shot_assets
for select using (
  exists (
    select 1 from public.shots s
    where s.id = shot_assets.shot_id
      and public.is_project_member(s.project_id, auth.uid())
  )
);

drop policy if exists assets_editor_write on public.shot_assets;
create policy assets_editor_write on public.shot_assets
for all using (
  exists (
    select 1 from public.shots s
    join public.project_members pm on pm.project_id = s.project_id
    where s.id = shot_assets.shot_id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'editor')
  )
);

-- lighting_diagrams policy
drop policy if exists lighting_member_select on public.lighting_diagrams;
create policy lighting_member_select on public.lighting_diagrams
for select using (
  exists (
    select 1
    from public.shots s
    where s.id = lighting_diagrams.shot_id
      and public.is_project_member(s.project_id, auth.uid())
  )
);

drop policy if exists lighting_editor_write on public.lighting_diagrams;
create policy lighting_editor_write on public.lighting_diagrams
for all using (
  exists (
    select 1
    from public.shots s
    join public.project_members pm on pm.project_id = s.project_id
    where s.id = lighting_diagrams.shot_id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'editor')
  )
);

-- comments policy
drop policy if exists comments_member_select on public.comments;
create policy comments_member_select on public.comments
for select using (
  (
    project_id is not null and public.is_project_member(project_id, auth.uid())
  ) or (
    shot_id is not null and exists (
      select 1 from public.shots s
      where s.id = comments.shot_id
        and public.is_project_member(s.project_id, auth.uid())
    )
  )
);

drop policy if exists comments_member_insert on public.comments;
create policy comments_member_insert on public.comments
for insert with check (
  user_id = auth.uid() and (
    (project_id is not null and public.is_project_member(project_id, auth.uid()))
    or
    (shot_id is not null and exists (
      select 1 from public.shots s
      where s.id = comments.shot_id
        and public.is_project_member(s.project_id, auth.uid())
    ))
  )
);

-- deliverables policy
drop policy if exists deliverables_member_select on public.deliverables;
create policy deliverables_member_select on public.deliverables
for select using (public.is_project_member(project_id, auth.uid()));

drop policy if exists deliverables_editor_insert on public.deliverables;
create policy deliverables_editor_insert on public.deliverables
for insert with check (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = deliverables.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'editor')
  )
);
