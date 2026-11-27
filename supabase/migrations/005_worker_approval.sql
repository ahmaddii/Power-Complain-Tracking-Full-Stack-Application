-- ============================================================================
-- Power-Track — Migration 005: Field Worker Self-Signup + Admin Approval
-- Safe to run more than once. Run in the Supabase SQL Editor.
-- ============================================================================

-- 1. Security-definer helper to check if the signed-in user is active (approved)
create or replace function public.current_user_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select active from public.profiles where id = auth.uid()), false);
$$;

-- 2. Update handle_new_user() so signups can request 'worker' (starts inactive / pending approval)
--    Admins can NEVER be self-registered via signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested text := lower(coalesce(new.raw_user_meta_data ->> 'requested_role', 'consumer'));
  v_role text := case when v_requested = 'worker' then 'worker' else 'consumer' end;
  v_active boolean := case when v_role = 'worker' then false else true end;
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, name, email, phone, role, area, active)
  values (
    new.id,
    v_name,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    v_role,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'area', '')), ''),
    v_active
  )
  on conflict (id) do nothing;

  if v_role = 'worker' then
    insert into public.notifications (user_id, title, message, complaint_id)
    select id, 'Worker approval needed', v_name || ' requested a Field Worker account.', null
    from public.profiles
    where role = 'admin' and active;
  end if;

  return new;
end;
$$;

-- 3. Ensure unapproved/inactive workers cannot read or update complaints
drop policy if exists "complaints_select_policy" on public.complaints;
create policy "complaints_select_policy"
  on public.complaints for select
  to authenticated
  using (
    consumer_id = auth.uid()
    or (worker_id = auth.uid() and public.current_user_active())
    or (public.current_user_role() = 'admin' and public.current_user_active())
  );

drop policy if exists "complaints_update_worker_or_admin" on public.complaints;
create policy "complaints_update_worker_or_admin"
  on public.complaints for update
  to authenticated
  using (
    (worker_id = auth.uid() and public.current_user_active())
    or (public.current_user_role() = 'admin' and public.current_user_active())
  )
  with check (
    (worker_id = auth.uid() and public.current_user_active())
    or (public.current_user_role() = 'admin' and public.current_user_active())
  );

