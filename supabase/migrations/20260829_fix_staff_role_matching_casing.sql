-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: staff_has_role() broke on ANY role string containing capital letters,
-- silently blocking every role-gated write (bill edits, settlements, lab
-- price→bill sync, …).
--
-- ROOT CAUSE
--   lower(regexp_replace(role, '[^a-z]', '', 'g'))
-- The regex runs BEFORE lower(), so uppercase letters are stripped as
-- "non-lowercase" characters and can never be matched afterwards:
--
--   'FrontDesk'     → 'rontesk'   → NOT LIKE '%front%'
--   'LabTechnician' → 'abech'     → NOT LIKE '%lab%'
--   'Doctor'        → 'octor'     → NOT LIKE '%doctor%'
--   'Nurse'         → 'urse'      → NOT LIKE '%nurse%'
--   'Admin'         → 'dmin'      → NOT LIKE '%admin%'
--   'Front Desk'    → 'rontesk'   → NOT LIKE '%front%'   (its own doc example!)
--   'Receptionist'  → 'eceptionist' → NOT LIKE '%reception%'
--
-- Only roles already stored fully in lowercase ('front desk', 'labtech'…)
-- ever matched. With the canonical camelCase values this app writes
-- (UserRole in types/models.ts → staffs.role), RLS policies such as
-- "payments update front desk" evaluated to false for the very staff who
-- should pass — PostgREST updated ZERO rows without raising an error, so the
-- front desk saw "Payment confirmed" / "Bill updated" toasts while the data
-- (and therefore the UI) never changed.
--
-- THE FIX — normalize exactly like the app does
-- (lib/roles.ts#normalizeUserRole): lowercase FIRST, then strip spaces,
-- underscores and hyphens (digits and other letters are kept):
--
--   'FrontDesk'     → 'frontdesk'     ✓ %front%
--   'Front Desk'    → 'frontdesk'     ✓
--   'front_desk'    → 'frontdesk'     ✓
--   'Receptionist'  → 'receptionist'  ✓ %reception%
--   'LabTechnician' → 'labtechnician' ✓ %lab%
--
-- APPLY WITH: supabase db push   (or run this file in the SQL editor)
-- Idempotent: safe to run any number of times.
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.staff_has_role(role_group text)
returns boolean
language sql stable security definer set search_path = public
as $$
  with s as (
    -- lowercase FIRST, then strip separators — mirrors normalizeUserRole()
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

-- staff_can() delegates to staff_has_role(); recreate it too so a database
-- where only this file runs still ends up with a consistent pair.
create or replace function public.staff_can(role_group text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.staff_has_role('Admin') or public.staff_has_role(role_group);
$$;

-- ── Verify after applying (SQL editor) ────────────────────────────────────────
-- Replace the email with a front-desk account. Expected: role_compact shows the
-- cleaned-up string and billing_can_update = t.
--
--   select s.role,
--          regexp_replace(lower(trim(s.role)), '[[:space:]_-]+', '', 'g') as role_compact,
--          public.staff_can('FrontDesk') as billing_can_update
--   from public.staffs s
--   where s.email = 'frontdesk@yourhospital.com';
