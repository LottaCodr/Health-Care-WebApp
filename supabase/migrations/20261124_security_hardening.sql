-- ═══════════════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING: Remove legacy RLS bypasses, auth signup trigger escalation,
-- storage open policies, SECURITY DEFINER view bypass, and anon table grants.
--
-- Idempotent — safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Eliminate self-signup -> Admin privilege escalation on auth.users ───────
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.handle_new_users();

-- ── 2. Harden staff role helpers (must be active staff) & self-update trigger ──
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.staffs
    where id::text = auth.uid()::text
      and coalesce(is_active, true) = true
  );
$$;

create or replace function public.staff_has_role(role_group text)
returns boolean
language sql stable security definer set search_path = public
as $$
  with s as (
    select regexp_replace(lower(trim(role::text)), '[[:space:]_-]+', '', 'g') as compact
    from public.staffs
    where id::text = auth.uid()::text
      and coalesce(is_active, true) = true
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

create or replace function public.staffs_protect_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.staff_has_role('Admin') then
    if new.id::text <> auth.uid()::text then
      raise exception 'Only administrators may edit other staff members';
    end if;
    if new.role is distinct from old.role then
      raise exception 'Only administrators may change staff roles';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'Only administrators may change staff active status';
    end if;
    if new.facility_id is distinct from old.facility_id then
      raise exception 'Only administrators may change staff facility assignment';
    end if;
    if new.email is distinct from old.email then
      raise exception 'Only administrators may change staff email';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists staffs_protect_role_trigger on public.staffs;
create trigger staffs_protect_role_trigger
  before update on public.staffs
  for each row execute function public.staffs_protect_role();

-- ── 3. Fix payment_history_view to respect caller's RLS (Postgres 15+) ─────────
alter view if exists public.payment_history_view set (security_invoker = true);

-- ── 4. Revoke broad anon privileges on public schema tables/views/sequences ────
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on public.payment_history_view to authenticated;

-- ── 5. Drop all legacy permissive / redundant RLS policies ─────────────────────

-- patients
drop policy if exists "Allow read access to patients" on public.patients;
drop policy if exists "Doctor can select patients" on public.patients;
drop policy if exists "Lab tech can select patients" on public.patients;
drop policy if exists "Nurse can select patients" on public.patients;
drop policy if exists "Pharmacist can select patients" on public.patients;
drop policy if exists "Doctor can update medical fields" on public.patients;
drop policy if exists "Front desk can update patients demographics" on public.patients;
drop policy if exists "Lab tech can update lab results" on public.patients;
drop policy if exists "Nurse can update notes" on public.patients;
drop policy if exists "Pharmacist can update prescriptions" on public.patients;
drop policy if exists "radiologist_read_patients" on public.patients;

-- staffs (allow active staff to read directory for doctor/staff FK joins; block anon & portal users)
drop policy if exists "Allow insert for authenticated users" on public.staffs;
drop policy if exists "staff_authenticated_read_all" on public.staffs;
drop policy if exists "staff_admin_delete" on public.staffs;
drop policy if exists "staff_admin_insert" on public.staffs;
drop policy if exists "staff_update" on public.staffs;
drop policy if exists "Staff can view own profile" on public.staffs;
drop policy if exists "Staff can update own profile" on public.staffs;
drop policy if exists "staffs select self or admin" on public.staffs;
drop policy if exists "staffs select staff" on public.staffs;
create policy "staffs select staff" on public.staffs
  for select to authenticated using (public.is_staff());

-- appointments
drop policy if exists "appointments_authenticated_write" on public.appointments;
drop policy if exists "appointments_authenticated_read" on public.appointments;

-- audit_logs
drop policy if exists "Authenticated can insert audit logs" on public.audit_logs;
drop policy if exists "Admins can read audit logs" on public.audit_logs;

-- bulk_upload_logs
drop policy if exists "bulk_upload_logs_authenticated_write" on public.bulk_upload_logs;
drop policy if exists "bulk_upload_logs_authenticated_read" on public.bulk_upload_logs;
drop policy if exists "bulk_upload_logs select staff" on public.bulk_upload_logs;
create policy "bulk_upload_logs select staff" on public.bulk_upload_logs
  for select to authenticated using (public.is_staff());
drop policy if exists "bulk_upload_logs insert front desk" on public.bulk_upload_logs;
create policy "bulk_upload_logs insert front desk" on public.bulk_upload_logs
  for insert to authenticated with check (public.staff_can('FrontDesk'));
drop policy if exists "bulk_upload_logs delete admin" on public.bulk_upload_logs;
create policy "bulk_upload_logs delete admin" on public.bulk_upload_logs
  for delete to authenticated using (public.staff_has_role('Admin'));

-- consultations
drop policy if exists "Authenticated users can insert consultations" on public.consultations;
drop policy if exists "Authenticated users can read consultations" on public.consultations;
drop policy if exists "Authenticated users can update consultations" on public.consultations;
drop policy if exists "Doctor can delete their own consultations" on public.consultations;

-- discharge_notes
drop policy if exists "discharge_notes_authenticated_write" on public.discharge_notes;
drop policy if exists "discharge_notes_authenticated_read" on public.discharge_notes;

-- drug_administration_records
drop policy if exists "drug_admin_authenticated_write" on public.drug_administration_records;
drop policy if exists "drug_admin_authenticated_read" on public.drug_administration_records;

-- drug_inventory
drop policy if exists "Authenticated users can insert inventory" on public.drug_inventory;
drop policy if exists "Authenticated users can read inventory" on public.drug_inventory;
drop policy if exists "Authenticated users can update inventory" on public.drug_inventory;

-- fluid_balance
drop policy if exists "fluid_balance_authenticated_write" on public.fluid_balance;
drop policy if exists "fluid_balance_authenticated_read" on public.fluid_balance;

-- lab_requests
drop policy if exists "Authenticated users can insert lab requests" on public.lab_requests;
drop policy if exists "Authenticated users can read lab requests" on public.lab_requests;
drop policy if exists "Authenticated users can update lab requests" on public.lab_requests;
drop policy if exists "radiologist_select_radiology_requests" on public.lab_requests;
drop policy if exists "radiologist_update_radiology_requests" on public.lab_requests;

-- lab_test_catalog
drop policy if exists "Allow lab test delete for lab staff" on public.lab_test_catalog;
drop policy if exists "Allow lab test insert for lab staff" on public.lab_test_catalog;
drop policy if exists "Allow read lab tests" on public.lab_test_catalog;
drop policy if exists "Allow lab test update for lab staff" on public.lab_test_catalog;

-- notifications (gate broadcast & role branches with is_staff(); keep personal recipient_id for staff & portal patients)
drop policy if exists "Authenticated users can insert notifications" on public.notifications;
drop policy if exists "Users can read their own notifications" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;

drop policy if exists "notifications select own" on public.notifications;
create policy "notifications select own" on public.notifications
  for select to authenticated
  using (
    recipient_id::text = auth.uid()::text
    or (
      public.is_staff() and (
        ((recipient_id is null and role is null)
            or lower(coalesce(role, '')) in ('all', '*', 'everyone'))
        or lower(role) = lower(
             coalesce((select s.role from public.staffs s where s.id::text = auth.uid()::text limit 1), '')
           )
        or public.staff_has_role('Admin')
      )
    )
  );

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
  for update to authenticated
  using (
    recipient_id::text = auth.uid()::text
    or (
      public.is_staff() and (
        ((recipient_id is null and role is null)
            or lower(coalesce(role, '')) in ('all', '*', 'everyone'))
        or lower(role) = lower(
             coalesce((select s.role from public.staffs s where s.id::text = auth.uid()::text limit 1), '')
           )
        or public.staff_has_role('Admin')
      )
    )
  )
  with check (
    recipient_id::text = auth.uid()::text
    or (
      public.is_staff() and (
        ((recipient_id is null and role is null)
            or lower(coalesce(role, '')) in ('all', '*', 'everyone'))
        or lower(role) = lower(
             coalesce((select s.role from public.staffs s where s.id::text = auth.uid()::text limit 1), '')
           )
        or public.staff_has_role('Admin')
      )
    )
  );

-- nurse_drug_chart
drop policy if exists "drug_chart_authenticated_write" on public.nurse_drug_chart;
drop policy if exists "drug_chart_authenticated_read" on public.nurse_drug_chart;

-- nursing_actions
drop policy if exists "Authenticated users can insert nursing actions" on public.nursing_actions;
drop policy if exists "Authenticated users can read nursing actions" on public.nursing_actions;
drop policy if exists "Authenticated users can update nursing actions" on public.nursing_actions;

-- patient_admissions / patient_documents / patient_readmissions
drop policy if exists "Authenticated full access patient_admissions" on public.patient_admissions;
drop policy if exists "Authenticated full access patient_documents" on public.patient_documents;
drop policy if exists "Authenticated full access patient_readmissions" on public.patient_readmissions;

-- patient_visits
drop policy if exists "patient_visits_authenticated" on public.patient_visits;
drop policy if exists "patient_visits select staff" on public.patient_visits;
create policy "patient_visits select staff" on public.patient_visits
  for select to authenticated using (public.is_staff());
drop policy if exists "patient_visits insert staff" on public.patient_visits;
create policy "patient_visits insert staff" on public.patient_visits
  for insert to authenticated with check (public.is_staff());
drop policy if exists "patient_visits update staff" on public.patient_visits;
create policy "patient_visits update staff" on public.patient_visits
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "patient_visits delete admin" on public.patient_visits;
create policy "patient_visits delete admin" on public.patient_visits
  for delete to authenticated using (public.staff_has_role('Admin'));

-- prescriptions
drop policy if exists "Authenticated users can insert prescriptions" on public.prescriptions;
drop policy if exists "Authenticated users can read prescriptions" on public.prescriptions;
drop policy if exists "Authenticated users can update prescriptions" on public.prescriptions;

-- ── 6. Storage RLS hardening for patient-documents bucket ──────────────────────
drop policy if exists "Auth select patient-documents" on storage.objects;
drop policy if exists "Auth upload patient-documents" on storage.objects;
drop policy if exists "Auth update patient-documents" on storage.objects;
drop policy if exists "Auth delete patient-documents" on storage.objects;

drop policy if exists "storage patient-documents select staff" on storage.objects;
create policy "storage patient-documents select staff" on storage.objects
  for select to authenticated
  using (bucket_id = 'patient-documents' and public.is_staff());

drop policy if exists "storage patient-documents insert front desk" on storage.objects;
create policy "storage patient-documents insert front desk" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'patient-documents' and public.staff_can('FrontDesk'));

drop policy if exists "storage patient-documents update front desk" on storage.objects;
create policy "storage patient-documents update front desk" on storage.objects
  for update to authenticated
  using (bucket_id = 'patient-documents' and public.staff_can('FrontDesk'))
  with check (bucket_id = 'patient-documents' and public.staff_can('FrontDesk'));

drop policy if exists "storage patient-documents delete front desk" on storage.objects;
create policy "storage patient-documents delete front desk" on storage.objects
  for delete to authenticated
  using (bucket_id = 'patient-documents' and public.staff_can('FrontDesk'));

-- ── 7. Pin search_path on remaining public functions ──────────────────────────
do $$
declare
  fn_sig text;
begin
  for fn_sig in
    select p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'amendment_session_is_privileged',
        'amendment_window',
        'create_payment_for_prescription',
        'deduct_drug_inventory',
        'ivf_touch_updated_at',
        'notify_lab_request',
        'notify_patient_routed',
        'patient_routed_notify',
        'set_updated_at',
        'try_to_timestamptz',
        'update_updated_at_column'
      )
  loop
    execute format('alter function %s set search_path = public', fn_sig);
  end loop;
end $$;
