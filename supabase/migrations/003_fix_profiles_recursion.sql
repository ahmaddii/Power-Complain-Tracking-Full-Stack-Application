-- ============================================================================
-- Power-Track — Migration 003: fix "infinite recursion detected in policy
-- for relation profiles"
--
-- Cause: RLS policies on `profiles` queried `profiles` (and `complaints`)
-- directly. Postgres refuses a policy that re-enters its own table.
-- Fix:   policies call SECURITY DEFINER helpers (which bypass RLS), and the
--        "can't change your own role/active" rule moves into a trigger.
-- Safe to run more than once. Run in the Supabase SQL Editor.
-- ============================================================================

-- Helper: is the current user the assigned worker on any complaint by this consumer?
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

-- SELECT: no direct table references inside the policy any more
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

-- UPDATE (own row): simple check, no subqueries on `profiles`
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Non-admins can't change role / active / id (replaces the old subquery check).
-- SQL-editor edits (no auth.uid()) are not restricted, so you can promote admins there.
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

