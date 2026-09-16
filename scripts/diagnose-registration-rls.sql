-- ═══════════════════════════════════════════════════════════════════════════════
-- DIAGNOSE: why does the database refuse a front-desk registration?
--
-- Incident class (2026-09-16): the desk's screen said
--   "You do not have permission to perform this action. Please log in with an
--    authorized account."
-- which the app (lib/utils/friendly-errors.ts) shows when the DATABASE rejects
-- the `patients` INSERT (SQLSTATE 42501 / "row-level security") — i.e. the
-- database's RLS policies or role matcher disagree with the app's own RBAC,
-- which had already authorized the user. Signing in again cannot fix it; this
-- script finds WHICH database object is the problem.
--
-- RUN AS: the Supabase SQL editor (plain SQL — no psql meta-commands), the
-- whole file at once. Edit the REPLACE-ME value in section 0 first.
-- Read-only except sections 5/6's test INSERTs, which are always ROLLED BACK —
-- nothing is stored.
--
-- Read the ✗ notes: each names a drifted object and its fix.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 0. configure — EDIT THIS ONE VALUE ────────────────────────────────────────
-- auth.users.id of the front-desk account whose registration failed.
-- Stored as a session setting so it survives the ROLLBACKs below.
select set_config('diag.desk_user_id', 'REPLACE-ME-desk-auth-user-id', false);

-- ── 1. The desk's staff row — is there one, and what does it say? ─────────────
select s.id, s.role,
       regexp_replace(lower(trim(s.role::text)), '[[:space:]_-]+', '', 'g') as role_compact
  from public.staffs s
 where s.id::text = current_setting('diag.desk_user_id');

-- ✗ 0 rows → no staffs row for that auth user: is_staff() is false for them and
--   every policy that calls it refuses. Fix: create the staffs row with
--   id = the auth user id and role 'FrontDesk'.

-- ── 2. The role matcher functions — which definitions are live? ───────────────
select
    pg_get_functiondef('public.staff_has_role(text)'::regprocedure) as staff_has_role_definition,
    pg_get_functiondef('public.staff_has_role(text)'::regprocedure) like '%lower(trim(%'
        as staff_has_role_is_casing_safe;

-- ✗ staff_has_role_is_casing_safe = false → the pre-20260829 buggy matcher is
--   live: 'FrontDesk' → 'rontesk' matches nothing, so staff_can('FrontDesk')
--   is false for every front-desk user and EVERY registration is refused.
--   Fix: apply supabase/migrations/20260829_fix_staff_role_matching_casing.sql
--   or 20260916_reassert_patients_rls_and_role_matchers.sql.

-- ── 3. The patients policies — live definitions vs canonical ──────────────────
select policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'patients'
 order by policyname;

-- Canonical set (20260814 + 20260916):
--   patients select staff          SELECT  using            = is_staff()
--   patients insert front desk     INSERT  with_check       = staff_can('FrontDesk')
--   patients update staff          UPDATE  using/with_check = is_staff()
--   patients delete admin          DELETE  using            = staff_has_role('Admin')
-- ✗ An insert policy with any other condition — anything mentioning hmo,
--   private_client, policy_number, facility_id, … — is drift; the canonical
--   policy is row-value-independent. Fix: re-run
--   20260916_reassert_patients_rls_and_role_matchers.sql.
-- ✗ No "patients insert front desk" row at all → with RLS enabled every INSERT
--   is refused. Same fix.

-- ── 4. Table + column grants ──────────────────────────────────────────────────
-- A missing table-level INSERT grant (or a column-only grant regime) also
-- surfaces as 42501 "permission denied for table patients".
-- Whole-table privileges:
select grantee, privilege_type, null::text as column_name, 'table' as grant_level
  from information_schema.role_table_grants
 where table_schema = 'public' and table_name = 'patients'
   and grantee in ('anon', 'authenticated', 'service_role')
union all
-- Column-level privileges (the dangerous regime):
select grantee, privilege_type, column_name, 'column' as grant_level
  from information_schema.column_privileges
 where table_schema = 'public' and table_name = 'patients'
   and grantee in ('anon', 'authenticated', 'service_role')
 order by grant_level desc, grantee, privilege_type, column_name;

-- ✗ Whole-table privileges show column_name = null. If you instead see
--   per-COLUMN rows for `authenticated`, any unlisted column (e.g. hmo_name)
--   kills the insert. Fix: 20260916_reassert_patients_rls_and_role_matchers.sql
--   re-grants table-level privileges.

-- ── 5. Simulate the desk's request end-to-end (HMO payload) ───────────────────
-- Runs as `authenticated` with the desk's JWT claims, exactly like PostgREST
-- does, and performs the same INSERT the app sends. ALWAYS ROLLED BACK.
begin;
  set local role authenticated;
  select set_config(
      'request.jwt.claims',
      json_build_object('sub', current_setting('diag.desk_user_id'),
                        'role', 'authenticated')::text,
      true
  );

  -- 5a. What the database's own matcher thinks of this user:
  select public.is_staff()                  as db_is_staff,
         public.staff_has_role('FrontDesk') as db_is_frontdesk,
         public.staff_can('FrontDesk')      as db_staff_can_frontdesk;

  -- 5b. The exact INSERT the registration form performs (HMO patient):
  savepoint before_insert;
  insert into public.patients (name, phone, birth_date, gender, status,
                               policy_number, hmo, hmo_name,
                               company, company_name, private_client)
  values ('RLS Diagnostic (rolled back)', '+2340000000000', current_date, 'Female', 'sent-to-nurse',
          'DIAG-0001', true, 'Hygeia HMO',
          false, null, false);
  rollback to savepoint before_insert;
rollback;
-- ✗ If 5b raises "new row violates row-level security policy for table
--   patients" while 5a shows all true → a row-dependent policy/trigger exists
--   (drift from this repo; section 3 shows it). If 5a is false → the staffs
--   row (section 1) or the matcher (section 2) is the problem.

-- ── 6. Same insert as a PRIVATE patient, for contrast ─────────────────────────
-- The canonical policy is row-value-independent: if this succeeds while 5b
-- fails, a row-dependent policy/trigger exists on the database — that is drift
-- from this repo's migrations; replace it with the canonical policies.
begin;
  set local role authenticated;
  select set_config(
      'request.jwt.claims',
      json_build_object('sub', current_setting('diag.desk_user_id'),
                        'role', 'authenticated')::text,
      true
  );
  savepoint before_insert;
  insert into public.patients (name, phone, birth_date, gender, status,
                               policy_number, hmo, hmo_name,
                               company, company_name, private_client)
  values ('RLS Diagnostic (rolled back)', '+2340000000001', current_date, 'Male', 'sent-to-nurse',
          null, false, null,
          false, null, true);
  rollback to savepoint before_insert;
rollback;
