-- ═══════════════════════════════════════════════════════════════════════════════
-- REASSERT: patients RLS policies + staff-role matcher functions
--
-- INCIDENT (2026-09-16, front desk)
--   Registering a patient failed with:
--     "You do not have permission to perform this action. Please log in with
--      an authorized account."
--   After PR #130 made the server action RETURN failures instead of throwing
--   them, the desk's screen finally named the real cause: the DATABASE refused
--   the `patients` INSERT (SQLSTATE 42501, "new row violates row-level
--   security policy for table patients"). The app-side guard had already
--   authorized the front-desk user — the database's own policy disagreed.
--
-- WHY THIS CAN HAPPEN
--   The write-path policy is `with check (public.staff_can('FrontDesk'))`,
--   which depends entirely on the staff_has_role() matcher agreeing with the
--   app. That matcher has drifted in production before: pre-20260829 it
--   lowercased AFTER stripping non-lowercase characters, so 'FrontDesk'
--   matched nothing and every role-gated write failed (see
--   20260829_fix_staff_role_matching_casing.sql — payment.service.ts still
--   points admins at it). Any deployment where one of the RLS migrations has
--   not been pushed — or where a policy was hand-edited in the SQL editor —
--   leaves the database rejecting writes the app considers authorized.
--
--   Note: nothing about an HMO row is special here. The app and these
--   migrations treat `hmo`, `hmo_name`, `policy_number` like any other
--   column; the desk simply noticed the failure on an HMO registration.
--   The policy is row-value-independent: it either passes for every
--   registration or fails for every registration.
--
-- WHAT THIS FILE DOES (idempotent — safe to run any number of times)
--   1. Recreates is_staff() / staff_has_role() / staff_can() with the FIXED
--      casing-normalizing definitions (same as 20260829), so a database that
--      never received that migration is healed too.
--   2. Drops and recreates the four `patients` policies exactly as canonical
--      (20260814_enable_rls_security.sql), un-doing any hand edits.
--   3. Prints a verification notice at the end.
--
-- APPLY WITH: supabase db push   (or run this file in the SQL editor)
--
-- AFTER APPLYING, run scripts/diagnose-registration-rls.sql to confirm a
-- front-desk INSERT passes.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Role matcher functions — FIXED definitions (lowercase FIRST, then
--       strip separators; mirrors lib/roles.ts#normalizeUserRole) ─────────────
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.staffs where id::text = auth.uid()::text
  );
$$;

create or replace function public.staff_has_role(role_group text)
returns boolean
language sql stable security definer set search_path = public
as $$
  with s as (
    select regexp_replace(lower(trim(role::text)), '[[:space:]_-]+', '', 'g') as compact
    from public.staffs where id::text = auth.uid()::text
  )
  select exists (
    select 1 from s
    where case role_group
      when 'FrontDesk'     then s.compact like any (array['%front%','%reception%'])
      when 'Doctor'        then s.compact like any (array['%doctor%','%physician%','%consultant%'])
      when 'Nurse'         then s.compact like any (array['%nurse%','%nursing%'])
      when 'LabTechnician' then s.compact like any (array['%lab%','%laboratory%'])
      when 'Pharmacist'    then s.compact like any (array['%pharm%'])
      when 'Radiologist'   then s.compact like any (array['%radio%','%imaging%'])
      when 'Admin'         then s.compact like any (array['%admin%'])
      else false
    end
  );
$$;

create or replace function public.staff_can(role_group text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.staff_has_role('Admin') or public.staff_has_role(role_group);
$$;

-- ── 2. patients policies — canonical, re-asserted over any drift ─────────────
alter table public.patients enable row level security;

drop policy if exists "patients select staff" on public.patients;
create policy "patients select staff" on public.patients
  for select to authenticated using (public.is_staff());

drop policy if exists "patients insert front desk" on public.patients;
create policy "patients insert front desk" on public.patients
  for insert to authenticated with check (public.staff_can('FrontDesk'));

drop policy if exists "patients update staff" on public.patients;
create policy "patients update staff" on public.patients
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "patients delete admin" on public.patients;
create policy "patients delete admin" on public.patients
  for delete to authenticated using (public.staff_has_role('Admin'));

-- ── 3. Table-level privileges ────────────────────────────────────────────────
-- PostgREST writes as `authenticated`; a legacy column-level or missing
-- table-level grant shows up as 42501 "permission denied for table patients"
-- even with correct policies. Re-assert the Supabase defaults.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.patients to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.staff_has_role(text) to authenticated;
grant execute on function public.staff_can(text) to authenticated;

-- ── 4. Verify ────────────────────────────────────────────────────────────────
do $$
declare
  policy_count int;
  fn_src text;
begin
  select count(*) into policy_count
    from pg_policies
   where schemaname = 'public' and tablename = 'patients';

  select pg_get_functiondef('public.staff_has_role(text)'::regprocedure) into fn_src;
  fn_src := regexp_replace(fn_src, '\s+', ' ', 'g');

  raise notice 'patients policies re-asserted (%) — canonical set is 4', policy_count;
  if fn_src like '%lower(trim(%' then
    raise notice 'staff_has_role(): casing-safe definition confirmed ✓';
  else
    raise notice 'WARNING: staff_has_role() does not look like the casing-safe definition';
  end if;
  raise notice 'Run scripts/diagnose-registration-rls.sql to test a real front-desk INSERT.';
end $$;
