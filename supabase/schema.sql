-- ============================================================================
-- Power-Track — All-in-One Supabase Schema, Triggers, Storage & RLS Script
-- Run this entire script once in the Supabase SQL Editor.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

-- Profiles table linked 1-to-1 with auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null unique,
  phone text not null default '',
  role text not null default 'consumer' check (role in ('consumer', 'admin', 'worker')),
  area text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Complaints table
create table if not exists public.complaints (
  id text primary key,
  title text not null,
  description text not null,
  category text not null check (
    category in (
      'Damaged Meter',
      'Fallen Pole',
      'Broken Wire',
      'Transformer Issue',
      'Connection Issue',
      'Power Outage',
      'Other'
    )
  ),
  priority text not null default 'Normal' check (priority in ('Emergency', 'High', 'Normal')),
  status text not null default 'Submitted' check (
    status in ('Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved')
  ),
  address text not null,
  latitude double precision,
  longitude double precision,
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  worker_id uuid references public.profiles(id) on delete set null,
  images text[] not null default '{}',
  evidence_before text[] not null default '{}',
  evidence_after text[] not null default '{}',
  history jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  duplicate_of text references public.complaints(id) on delete set null,
  duplicate_dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  read boolean not null default false,
  complaint_id text references public.complaints(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Useful indexes
create index if not exists idx_complaints_consumer_id on public.complaints(consumer_id);
create index if not exists idx_complaints_worker_id on public.complaints(worker_id);
create index if not exists idx_complaints_status on public.complaints(status);
create index if not exists idx_complaints_created_at on public.complaints(created_at desc);
create index if not exists idx_notifications_user_id on public.notifications(user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------

-- Automatic updated_at timestamp
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_complaints_updated_at on public.complaints;
create trigger trg_complaints_updated_at
  before update on public.complaints
  for each row execute function public.set_updated_at();

-- Automatically create a profile row when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, role, area, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'consumer',
    new.raw_user_meta_data ->> 'area',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Security-definer helper to read current user's role without RLS recursion
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.complaints enable row level security;
alter table public.notifications enable row level security;

-- ---- PROFILES POLICIES ----

-- Helper (SECURITY DEFINER bypasses RLS, which avoids "infinite recursion" in policies)
create or replace function public.is_assigned_worker_for(p_consumer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.complaints
    where consumer_id = p_consumer and worker_id = auth.uid()
  );
$$;

drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() = 'admin'
    or role = 'worker'
    or public.is_assigned_worker_for(id)
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Non-admins can't change role / active / id. SQL-editor edits (no auth.uid()) are allowed.
create or replace function public.profiles_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and coalesce(public.current_user_role(), '') <> 'admin' then
    if new.role is distinct from old.role
       or new.active is distinct from old.active
       or new.id is distinct from old.id then
      raise exception 'Only administrators can change roles or account status.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_before_update on public.profiles;
create trigger trg_profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---- COMPLAINTS POLICIES ----

drop policy if exists "complaints_select_policy" on public.complaints;
create policy "complaints_select_policy"
  on public.complaints for select
  to authenticated
  using (
    consumer_id = auth.uid()
    or worker_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

drop policy if exists "complaints_insert_consumer" on public.complaints;
create policy "complaints_insert_consumer"
  on public.complaints for insert
  to authenticated
  with check (
    consumer_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

drop policy if exists "complaints_update_worker_or_admin" on public.complaints;
create policy "complaints_update_worker_or_admin"
  on public.complaints for update
  to authenticated
  using (
    worker_id = auth.uid()
    or public.current_user_role() = 'admin'
  )
  with check (
    worker_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

drop policy if exists "complaints_delete_admin" on public.complaints;
create policy "complaints_delete_admin"
  on public.complaints for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- ---- NOTIFICATIONS POLICIES ----

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- (Notification rows are created only by database triggers — see the
--  "NOTIFICATION / STORAGE / GUARD" section appended at the end of this file.
--  Clients can read and mark their own notifications, but cannot insert them.)

-- ----------------------------------------------------------------------------
-- 4. STORAGE BUCKET FOR COMPLAINT & EVIDENCE PHOTOS
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('complaint-media', 'complaint-media', true)
on conflict (id) do nothing;

drop policy if exists "complaint_media_public_read" on storage.objects;
create policy "complaint_media_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'complaint-media');

drop policy if exists "complaint_media_auth_upload" on storage.objects;
create policy "complaint_media_auth_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'complaint-media');

drop policy if exists "complaint_media_auth_delete" on storage.objects;
create policy "complaint_media_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'complaint-media' and owner = auth.uid());

-- ============================================================================
-- TIP: After signing up your first user, promote them to admin with:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- ============================================================================



-- ============================================================================
-- NOTIFICATION / STORAGE / GUARD section (same as supabase/migrations/002_notifications_storage.sql)
-- ============================================================================
-- ----------------------------------------------------------------------------
-- 1. NOTIFICATIONS: remove client inserts, add trigger-based creation
-- ----------------------------------------------------------------------------

drop policy if exists "notifications_insert_authenticated" on public.notifications;

create or replace function public.notify_user(
  p_user uuid, p_title text, p_message text, p_complaint text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, title, message, complaint_id)
  select p_user, p_title, p_message, p_complaint
  where p_user is not null;
$$;

create or replace function public.notify_admins(
  p_title text, p_message text, p_complaint text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, title, message, complaint_id)
  select id, p_title, p_message, p_complaint
  from public.profiles
  where role = 'admin' and active;
$$;

-- These helpers must only be callable by triggers, never by API clients.
revoke execute on function public.notify_user(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.notify_admins(text, text, text) from public, anon, authenticated;

create or replace function public.complaints_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_admins('New complaint', new.id || ': ' || new.title, new.id);
  perform public.notify_user(
    new.consumer_id, 'Complaint submitted', 'Your complaint ' || new.id || ' was received.', new.id
  );
  return new;
end;
$$;

create or replace function public.complaints_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_name text;
  v_assigned boolean := new.worker_id is distinct from old.worker_id and new.worker_id is not null;
begin
  if v_assigned then
    select name into v_worker_name from public.profiles where id = new.worker_id;
    perform public.notify_user(
      new.worker_id, 'New assignment',
      'You were assigned ' || new.id || ' (' || new.priority || ').', new.id
    );
    perform public.notify_user(
      new.consumer_id, 'Worker assigned',
      coalesce(nullif(v_worker_name, ''), 'A field worker') || ' has been assigned to ' || new.id || '.', new.id
    );
  end if;

  if new.status is distinct from old.status then
    if new.duplicate_of is not null
       and new.duplicate_dismissed and not old.duplicate_dismissed
       and new.status = 'Resolved' then
      perform public.notify_user(
        new.consumer_id, 'Merged as duplicate',
        new.id || ' was merged into ' || new.duplicate_of || '; follow that complaint for updates.', new.id
      );
    elsif not (v_assigned and new.status = 'Assigned') then
      perform public.notify_user(
        new.consumer_id, 'Status: ' || new.status, new.id || ' is now ' || new.status || '.', new.id
      );
    end if;

    if auth.uid() is not null and auth.uid() = new.worker_id then
      perform public.notify_admins('Worker update', new.id || ' → ' || new.status, new.id);
    end if;
  end if;

  if new.priority is distinct from old.priority and new.worker_id is not null then
    perform public.notify_user(
      new.worker_id, 'Priority changed', new.id || ' priority set to ' || new.priority || '.', new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_complaints_after_insert on public.complaints;
create trigger trg_complaints_after_insert
  after insert on public.complaints
  for each row execute function public.complaints_after_insert();

drop trigger if exists trg_complaints_after_update on public.complaints;
create trigger trg_complaints_after_update
  after update on public.complaints
  for each row execute function public.complaints_after_update();

-- ----------------------------------------------------------------------------
-- 2. COMPLAINT IDs generated by the database (PT-<year>-<number>)
-- ----------------------------------------------------------------------------

create sequence if not exists public.complaint_number_seq start 1001;

create or replace function public.complaints_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Always overwrite: clients can't choose (or collide on) an ID.
  new.id := 'PT-' || extract(year from now())::int || '-' || nextval('public.complaint_number_seq');
  return new;
end;
$$;

drop trigger if exists trg_complaints_before_insert on public.complaints;
create trigger trg_complaints_before_insert
  before insert on public.complaints
  for each row execute function public.complaints_before_insert();

-- ----------------------------------------------------------------------------
-- 3. GUARD: only admins may change ownership / assignment / priority / duplicates
--    (workers can still update status, progress, notes and evidence)
--    SQL-editor / service-role edits (no auth.uid()) are not restricted.
-- ----------------------------------------------------------------------------

create or replace function public.complaints_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and coalesce(public.current_user_role(), '') <> 'admin' then
    if new.consumer_id is distinct from old.consumer_id
       or new.worker_id is distinct from old.worker_id
       or new.priority is distinct from old.priority
       or new.duplicate_of is distinct from old.duplicate_of
       or new.duplicate_dismissed is distinct from old.duplicate_dismissed
       or new.id is distinct from old.id then
      raise exception 'Only administrators can change assignment, priority or duplicate review.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_complaints_before_update on public.complaints;
create trigger trg_complaints_before_update
  before update on public.complaints
  for each row execute function public.complaints_before_update();

-- ----------------------------------------------------------------------------
-- 4. STORAGE: images only, 5 MB max, uploads restricted to your own folder
--    File path format:  <user-id>/<timestamp>-<random>.<ext>
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'complaint-media', 'complaint-media', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public URLs keep working for <img> tags; dropping the SELECT policy stops
-- anyone from LISTING other people's files through the API.
drop policy if exists "complaint_media_public_read" on storage.objects;

drop policy if exists "complaint_media_auth_upload" on storage.objects;
create policy "complaint_media_auth_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'complaint-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "complaint_media_auth_delete" on storage.objects;
create policy "complaint_media_auth_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'complaint-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Dedicated bucket for profile avatars
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_auth_upload" on storage.objects;
create policy "avatars_auth_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_auth_update" on storage.objects;
create policy "avatars_auth_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_auth_delete" on storage.objects;
create policy "avatars_auth_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- 5. REALTIME: push new notifications to the browser instantly (respects RLS)
-- ----------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end;
$$;
