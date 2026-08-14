-- ═══════════════════════════════════════════════════════════════════════════
-- SECURITY: Row-Level Security for the Nile Valley Hospital EMR
--
-- WHY THIS EXISTS
-- The Next.js app alone cannot protect patient data: the Supabase anon key
-- is shipped inside the public JS bundle, so ANY visitor to the login page
-- can call the PostgREST API directly. Before this migration there were no
-- RLS policies at all, which meant anyone with that public key could read
-- and write every table — no login required.
--
-- These policies enforce the same role rules as the app's server layer
-- (lib/services/auth-guard.ts). The app checks stay as a friendly first
-- line of defense; RLS is the one that cannot be bypassed from a browser.
--
-- APPLY WITH: supabase db push   (or run this file in the SQL editor)
--
-- NOTE: Row Level Security also applies to Realtime subscriptions, so the
-- same policies gate the live-update channels.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Helpers ──────────────────────────────────────────────────────────────────
-- True when the JWT's auth.uid() has a staff profile row.
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.staffs where id = auth.uid());
$$;

-- Role check with the same fuzzy matching the app uses (normalizeUserRole):
-- DB role strings are messy ("Front Desk", "front_desk", "Receptionist"…).
create or replace function public.staff_has_role(role_group text)
returns boolean
language sql stable security definer set search_path = public
as $$
  with s as (
    select lower(regexp_replace(role, '[^a-z]', '', 'g')) as compact
    from public.staffs where id = auth.uid()
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

-- Admin always passes; other groups only pass for their own role.
create or replace function public.staff_can(role_group text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.staff_has_role('Admin') or public.staff_has_role(role_group);
$$;

-- ── Enable RLS on every EMR table ────────────────────────────────────────────
alter table public.patients enable row level security;
alter table public.staffs enable row level security;
alter table public.consultations enable row level security;
alter table public.prescriptions enable row level security;
alter table public.drug_dispensing enable row level security;
alter table public.lab_requests enable row level security;
alter table public.nursing_actions enable row level security;
alter table public.payments enable row level security;
alter table public.appointments enable row level security;
alter table public.patient_admissions enable row level security;
alter table public.patient_readmissions enable row level security;
alter table public.discharge_notes enable row level security;
alter table public.nurse_drug_chart enable row level security;
alter table public.fluid_balance enable row level security;
alter table public.drug_administration_records enable row level security;
alter table public.patient_documents enable row level security;
alter table public.drug_inventory enable row level security;
alter table public.lab_test_catalog enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- ── patients ─────────────────────────────────────────────────────────────────
drop policy if exists "patients select staff" on public.patients;
create policy "patients select staff" on public.patients
  for select to authenticated using (public.is_staff());

drop policy if exists "patients insert front desk" on public.patients;
create policy "patients insert front desk" on public.patients
  for insert to authenticated with check (public.staff_can('FrontDesk'));

-- Any staff member may advance the workflow status machine (matches the app).
drop policy if exists "patients update staff" on public.patients;
create policy "patients update staff" on public.patients
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "patients delete admin" on public.patients;
create policy "patients delete admin" on public.patients
  for delete to authenticated using (public.staff_has_role('Admin'));

-- ── staffs ───────────────────────────────────────────────────────────────────
drop policy if exists "staffs select self or admin" on public.staffs;
create policy "staffs select self or admin" on public.staffs
  for select to authenticated
  using (id = auth.uid() or public.staff_has_role('Admin'));

drop policy if exists "staffs insert admin" on public.staffs;
create policy "staffs insert admin" on public.staffs
  for insert to authenticated with check (public.staff_has_role('Admin'));

-- Self profile edits + admin edits. A trigger below blocks role changes by
-- non-admins even if a policy is ever loosened.
drop policy if exists "staffs update self or admin" on public.staffs;
create policy "staffs update self or admin" on public.staffs
  for update to authenticated
  using (id = auth.uid() or public.staff_has_role('Admin'))
  with check (id = auth.uid() or public.staff_has_role('Admin'));

drop policy if exists "staffs delete admin" on public.staffs;
create policy "staffs delete admin" on public.staffs
  for delete to authenticated using (public.staff_has_role('Admin'));

-- Belt-and-suspenders: no non-admin may change a role or edit another row.
create or replace function public.staffs_protect_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.staff_has_role('Admin') then
    raise exception 'Only administrators may change staff roles';
  end if;
  if new.id <> auth.uid() and not public.staff_has_role('Admin') then
    raise exception 'Only administrators may edit other staff members';
  end if;
  return new;
end;
$$;

drop trigger if exists staffs_protect_role_trigger on public.staffs;
create trigger staffs_protect_role_trigger
  before update on public.staffs
  for each row execute function public.staffs_protect_role();

-- ── consultations ────────────────────────────────────────────────────────────
drop policy if exists "consultations select staff" on public.consultations;
create policy "consultations select staff" on public.consultations
  for select to authenticated using (public.is_staff());

drop policy if exists "consultations write doctor" on public.consultations;
create policy "consultations write doctor" on public.consultations
  for insert to authenticated with check (public.staff_can('Doctor'));

drop policy if exists "consultations update doctor" on public.consultations;
create policy "consultations update doctor" on public.consultations
  for update to authenticated using (public.staff_can('Doctor')) with check (public.staff_can('Doctor'));

drop policy if exists "consultations delete doctor" on public.consultations;
create policy "consultations delete doctor" on public.consultations
  for delete to authenticated using (public.staff_can('Doctor'));

-- ── prescriptions ────────────────────────────────────────────────────────────
drop policy if exists "prescriptions select staff" on public.prescriptions;
create policy "prescriptions select staff" on public.prescriptions
  for select to authenticated using (public.is_staff());

drop policy if exists "prescriptions insert doctor" on public.prescriptions;
create policy "prescriptions insert doctor" on public.prescriptions
  for insert to authenticated with check (public.staff_can('Doctor'));

-- Pharmacists dispense (update status/dispensed) — mirroring the service layer.
drop policy if exists "prescriptions update doctor pharmacist" on public.prescriptions;
create policy "prescriptions update doctor pharmacist" on public.prescriptions
  for update to authenticated
  using (public.staff_can('Doctor') or public.staff_can('Pharmacist'))
  with check (public.staff_can('Doctor') or public.staff_can('Pharmacist'));

drop policy if exists "prescriptions delete admin" on public.prescriptions;
create policy "prescriptions delete admin" on public.prescriptions
  for delete to authenticated using (public.staff_has_role('Admin'));

-- ── drug_dispensing ──────────────────────────────────────────────────────────
drop policy if exists "drug_dispensing select staff" on public.drug_dispensing;
create policy "drug_dispensing select staff" on public.drug_dispensing
  for select to authenticated using (public.is_staff());

drop policy if exists "drug_dispensing insert pharmacist" on public.drug_dispensing;
create policy "drug_dispensing insert pharmacist" on public.drug_dispensing
  for insert to authenticated with check (public.staff_can('Pharmacist'));

drop policy if exists "drug_dispensing delete admin" on public.drug_dispensing;
create policy "drug_dispensing delete admin" on public.drug_dispensing
  for delete to authenticated using (public.staff_has_role('Admin'));

-- ── lab_requests (also carries [RADIOLOGY] rows) ─────────────────────────────
drop policy if exists "lab_requests select staff" on public.lab_requests;
create policy "lab_requests select staff" on public.lab_requests
  for select to authenticated using (public.is_staff());

drop policy if exists "lab_requests insert doctor frontdesk" on public.lab_requests;
create policy "lab_requests insert doctor frontdesk" on public.lab_requests
  for insert to authenticated
  with check (public.staff_can('Doctor') or public.staff_can('FrontDesk'));

-- Lab techs enter results; doctors correct their own requests; radiologists
-- file reports on [RADIOLOGY] rows.
drop policy if exists "lab_requests update lab doctor radio" on public.lab_requests;
create policy "lab_requests update lab doctor radio" on public.lab_requests
  for update to authenticated
  using (
    public.staff_can('LabTechnician')
    or public.staff_can('Doctor')
    or public.staff_can('Radiologist')
  )
  with check (
    public.staff_can('LabTechnician')
    or public.staff_can('Doctor')
    or public.staff_can('Radiologist')
  );

drop policy if exists "lab_requests delete admin" on public.lab_requests;
create policy "lab_requests delete admin" on public.lab_requests
  for delete to authenticated using (public.staff_has_role('Admin'));

-- ── nursing_actions ──────────────────────────────────────────────────────────
drop policy if exists "nursing_actions select staff" on public.nursing_actions;
create policy "nursing_actions select staff" on public.nursing_actions
  for select to authenticated using (public.is_staff());

drop policy if exists "nursing_actions write nurse" on public.nursing_actions;
create policy "nursing_actions write nurse" on public.nursing_actions
  for insert to authenticated with check (public.staff_can('Nurse'));

drop policy if exists "nursing_actions update nurse" on public.nursing_actions;
create policy "nursing_actions update nurse" on public.nursing_actions
  for update to authenticated using (public.staff_can('Nurse')) with check (public.staff_can('Nurse'));

drop policy if exists "nursing_actions delete admin" on public.nursing_actions;
create policy "nursing_actions delete admin" on public.nursing_actions
  for delete to authenticated using (public.staff_has_role('Admin'));

-- ── payments ─────────────────────────────────────────────────────────────────
drop policy if exists "payments select staff" on public.payments;
create policy "payments select staff" on public.payments
  for select to authenticated using (public.is_staff());

-- Bills are auto-created by doctors (lab/pharmacy) and by front desk.
drop policy if exists "payments insert billing roles" on public.payments;
create policy "payments insert billing roles" on public.payments
  for insert to authenticated
  with check (
    public.staff_can('FrontDesk')
    or public.staff_can('Doctor')
    or public.staff_can('Pharmacist')
    or public.staff_can('LabTechnician')
  );

-- Only front desk settles bills, applies deposits, corrects amounts.
drop policy if exists "payments update front desk" on public.payments;
create policy "payments update front desk" on public.payments
  for update to authenticated using (public.staff_can('FrontDesk')) with check (public.staff_can('FrontDesk'));

drop policy if exists "payments delete admin" on public.payments;
create policy "payments delete admin" on public.payments
  for delete to authenticated using (public.staff_has_role('Admin'));

-- ── appointments ─────────────────────────────────────────────────────────────
drop policy if exists "appointments select staff" on public.appointments;
create policy "appointments select staff" on public.appointments
  for select to authenticated using (public.is_staff());

drop policy if exists "appointments write front desk" on public.appointments;
create policy "appointments write front desk" on public.appointments
  for insert to authenticated with check (public.staff_can('FrontDesk'));

drop policy if exists "appointments update front desk" on public.appointments;
create policy "appointments update front desk" on public.appointments
  for update to authenticated using (public.staff_can('FrontDesk')) with check (public.staff_can('FrontDesk'));

drop policy if exists "appointments delete front desk" on public.appointments;
create policy "appointments delete front desk" on public.appointments
  for delete to authenticated using (public.staff_can('FrontDesk'));

-- ── admissions / readmissions ────────────────────────────────────────────────
drop policy if exists "patient_admissions select staff" on public.patient_admissions;
create policy "patient_admissions select staff" on public.patient_admissions
  for select to authenticated using (public.is_staff());

drop policy if exists "patient_admissions write clinical" on public.patient_admissions;
create policy "patient_admissions write clinical" on public.patient_admissions
  for insert to authenticated
  with check (
    public.staff_can('FrontDesk') or public.staff_can('Doctor') or public.staff_can('Nurse')
  );

drop policy if exists "patient_admissions update clinical" on public.patient_admissions;
create policy "patient_admissions update clinical" on public.patient_admissions
  for update to authenticated
  using (public.staff_can('FrontDesk') or public.staff_can('Doctor') or public.staff_can('Nurse'))
  with check (public.staff_can('FrontDesk') or public.staff_can('Doctor') or public.staff_can('Nurse'));

drop policy if exists "patient_admissions delete admin" on public.patient_admissions;
create policy "patient_admissions delete admin" on public.patient_admissions
  for delete to authenticated using (public.staff_has_role('Admin'));

drop policy if exists "patient_readmissions select staff" on public.patient_readmissions;
create policy "patient_readmissions select staff" on public.patient_readmissions
  for select to authenticated using (public.is_staff());

drop policy if exists "patient_readmissions insert front desk" on public.patient_readmissions;
create policy "patient_readmissions insert front desk" on public.patient_readmissions
  for insert to authenticated with check (public.staff_can('FrontDesk'));

drop policy if exists "patient_readmissions delete admin" on public.patient_readmissions;
create policy "patient_readmissions delete admin" on public.patient_readmissions
  for delete to authenticated using (public.staff_has_role('Admin'));

-- ── discharge_notes ──────────────────────────────────────────────────────────
drop policy if exists "discharge_notes select staff" on public.discharge_notes;
create policy "discharge_notes select staff" on public.discharge_notes
  for select to authenticated using (public.is_staff());

drop policy if exists "discharge_notes insert doctor" on public.discharge_notes;
create policy "discharge_notes insert doctor" on public.discharge_notes
  for insert to authenticated with check (public.staff_can('Doctor'));

drop policy if exists "discharge_notes update doctor" on public.discharge_notes;
create policy "discharge_notes update doctor" on public.discharge_notes
  for update to authenticated using (public.staff_can('Doctor')) with check (public.staff_can('Doctor'));

drop policy if exists "discharge_notes delete admin" on public.discharge_notes;
create policy "discharge_notes delete admin" on public.discharge_notes
  for delete to authenticated using (public.staff_has_role('Admin'));

-- ── nursing charts (drug chart / fluid balance / administrations) ────────────
drop policy if exists "nurse_drug_chart select staff" on public.nurse_drug_chart;
create policy "nurse_drug_chart select staff" on public.nurse_drug_chart
  for select to authenticated using (public.is_staff());

drop policy if exists "nurse_drug_chart write nurse" on public.nurse_drug_chart;
create policy "nurse_drug_chart write nurse" on public.nurse_drug_chart
  for insert to authenticated with check (public.staff_can('Nurse'));

drop policy if exists "nurse_drug_chart update nurse" on public.nurse_drug_chart;
create policy "nurse_drug_chart update nurse" on public.nurse_drug_chart
  for update to authenticated using (public.staff_can('Nurse')) with check (public.staff_can('Nurse'));

drop policy if exists "nurse_drug_chart delete nurse" on public.nurse_drug_chart;
create policy "nurse_drug_chart delete nurse" on public.nurse_drug_chart
  for delete to authenticated using (public.staff_can('Nurse'));

drop policy if exists "fluid_balance select staff" on public.fluid_balance;
create policy "fluid_balance select staff" on public.fluid_balance
  for select to authenticated using (public.is_staff());

drop policy if exists "fluid_balance write nurse" on public.fluid_balance;
create policy "fluid_balance write nurse" on public.fluid_balance
  for insert to authenticated with check (public.staff_can('Nurse'));

drop policy if exists "fluid_balance delete nurse" on public.fluid_balance;
create policy "fluid_balance delete nurse" on public.fluid_balance
  for delete to authenticated using (public.staff_can('Nurse'));

drop policy if exists "drug_administration_records select staff" on public.drug_administration_records;
create policy "drug_administration_records select staff" on public.drug_administration_records
  for select to authenticated using (public.is_staff());

drop policy if exists "drug_administration_records insert nurse" on public.drug_administration_records;
create policy "drug_administration_records insert nurse" on public.drug_administration_records
  for insert to authenticated with check (public.staff_can('Nurse'));

drop policy if exists "drug_administration_records delete admin" on public.drug_administration_records;
create policy "drug_administration_records delete admin" on public.drug_administration_records
  for delete to authenticated using (public.staff_has_role('Admin'));

-- ── patient_documents ────────────────────────────────────────────────────────
drop policy if exists "patient_documents select staff" on public.patient_documents;
create policy "patient_documents select staff" on public.patient_documents
  for select to authenticated using (public.is_staff());

drop policy if exists "patient_documents insert front desk" on public.patient_documents;
create policy "patient_documents insert front desk" on public.patient_documents
  for insert to authenticated with check (public.staff_can('FrontDesk'));

drop policy if exists "patient_documents delete front desk" on public.patient_documents;
create policy "patient_documents delete front desk" on public.patient_documents
  for delete to authenticated using (public.staff_can('FrontDesk'));

-- ── drug_inventory ───────────────────────────────────────────────────────────
drop policy if exists "drug_inventory select staff" on public.drug_inventory;
create policy "drug_inventory select staff" on public.drug_inventory
  for select to authenticated using (public.is_staff());

drop policy if exists "drug_inventory write pharmacist" on public.drug_inventory;
create policy "drug_inventory write pharmacist" on public.drug_inventory
  for insert to authenticated with check (public.staff_can('Pharmacist'));

drop policy if exists "drug_inventory update pharmacist" on public.drug_inventory;
create policy "drug_inventory update pharmacist" on public.drug_inventory
  for update to authenticated using (public.staff_can('Pharmacist')) with check (public.staff_can('Pharmacist'));

drop policy if exists "drug_inventory delete pharmacist" on public.drug_inventory;
create policy "drug_inventory delete pharmacist" on public.drug_inventory
  for delete to authenticated using (public.staff_can('Pharmacist'));

-- ── lab_test_catalog ─────────────────────────────────────────────────────────
drop policy if exists "lab_test_catalog select staff" on public.lab_test_catalog;
create policy "lab_test_catalog select staff" on public.lab_test_catalog
  for select to authenticated using (public.is_staff());

drop policy if exists "lab_test_catalog write lab" on public.lab_test_catalog;
create policy "lab_test_catalog write lab" on public.lab_test_catalog
  for insert to authenticated with check (public.staff_can('LabTechnician'));

drop policy if exists "lab_test_catalog update lab" on public.lab_test_catalog;
create policy "lab_test_catalog update lab" on public.lab_test_catalog
  for update to authenticated using (public.staff_can('LabTechnician')) with check (public.staff_can('LabTechnician'));

drop policy if exists "lab_test_catalog delete lab" on public.lab_test_catalog;
create policy "lab_test_catalog delete lab" on public.lab_test_catalog
  for delete to authenticated using (public.staff_can('LabTechnician'));

-- ── notifications ────────────────────────────────────────────────────────────
-- Staff see notifications addressed to them personally or to their role.
drop policy if exists "notifications select own" on public.notifications;
create policy "notifications select own" on public.notifications
  for select to authenticated
  using (
    recipient_id = auth.uid()
    or lower(role) = lower(
         coalesce((select s.role from public.staffs s where s.id = auth.uid() limit 1), '')
       )
    or public.staff_has_role('Admin')
  );

drop policy if exists "notifications insert staff" on public.notifications;
create policy "notifications insert staff" on public.notifications
  for insert to authenticated with check (public.is_staff());

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
  for update to authenticated
  using (
    recipient_id = auth.uid()
    or lower(role) = lower(
         coalesce((select s.role from public.staffs s where s.id = auth.uid() limit 1), '')
       )
    or public.staff_has_role('Admin')
  )
  with check (
    recipient_id = auth.uid()
    or lower(role) = lower(
         coalesce((select s.role from public.staffs s where s.id = auth.uid() limit 1), '')
       )
    or public.staff_has_role('Admin')
  );

-- ── audit_logs ───────────────────────────────────────────────────────────────
-- Any staff action may be recorded (the app's audit.service writes here),
-- but only admins may READ the trail.
drop policy if exists "audit_logs insert staff" on public.audit_logs;
create policy "audit_logs insert staff" on public.audit_logs
  for insert to authenticated with check (public.is_staff());

drop policy if exists "audit_logs select admin" on public.audit_logs;
create policy "audit_logs select admin" on public.audit_logs
  for select to authenticated using (public.staff_has_role('Admin'));

drop policy if exists "audit_logs update admin" on public.audit_logs;
create policy "audit_logs update admin" on public.audit_logs
  for update to authenticated using (public.staff_has_role('Admin'));

drop policy if exists "audit_logs delete admin" on public.audit_logs;
create policy "audit_logs delete admin" on public.audit_logs
  for delete to authenticated using (public.staff_has_role('Admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- REMINDERS (cannot be enforced from this file):
-- 1. Supabase Auth settings: DISABLE public signups, set a minimum password
--    strength, and keep the default login rate limits.
-- 2. Storage: add bucket policies on `patient-documents` so only
--    authenticated staff can read/upload/delete objects there.
-- 3. Never put the service-role key in NEXT_PUBLIC_* — it must stay
--    server-only (utils/supabase/admin.ts).
-- 4. After applying, verify: `select * from patients;` as anon should
--    return 0 rows.
-- ─────────────────────────────────────────────────────────────────────────────
