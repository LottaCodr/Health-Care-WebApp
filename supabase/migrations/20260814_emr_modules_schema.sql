-- ═══════════════════════════════════════════════════════════════════════════
-- EMR COMPLETENESS MODULES — schema for the modules that were missing
-- (allergies, immunizations, surgery/OT, referrals, specimens, ward board,
-- drug batches & expiry, med reconciliation, consent, death/birth certs,
-- facilities, coding standards, patient portal, MAR e-signature)
--
-- Apply with: supabase db push
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Structured allergies ─────────────────────────────────────────────────
create table if not exists public.patient_allergies (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    allergen text not null,
    category text not null default 'drug' check (category in ('drug','food','environmental','other')),
    reaction text,
    severity text not null default 'moderate' check (severity in ('mild','moderate','severe','life-threatening')),
    status text not null default 'active' check (status in ('active','resolved')),
    onset_date date,
    recorded_by uuid references public.staffs(id) on delete set null,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ── 2. Immunizations ────────────────────────────────────────────────────────
create table if not exists public.immunizations (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    vaccine text not null,
    dose_number int not null default 1,
    administered_date date not null default current_date,
    administered_by uuid references public.staffs(id) on delete set null,
    site text,
    route text,
    lot_number text,
    manufacturer text,
    next_due_date date,
    notes text,
    created_at timestamptz not null default now()
);

-- ── 3. Surgery / OT module (scheduling + op note + anaesthesia) ─────────────
create table if not exists public.surgeries (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    surgeon_id uuid references public.staffs(id) on delete set null,
    anaesthetist_id uuid references public.staffs(id) on delete set null,
    procedure_name text not null,
    urgency text not null default 'elective' check (urgency in ('elective','urgent','emergency')),
    status text not null default 'scheduled' check (status in ('scheduled','in-progress','completed','cancelled')),
    theatre text,
    scheduled_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    pre_op_diagnosis text,
    post_op_diagnosis text,
    anaesthesia_type text,
    findings text,
    procedure_details text,
    complications text,
    blood_loss_ml int,
    disposition text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ── 4. Referrals & external e-prescribing ───────────────────────────────────
create table if not exists public.referrals (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    referred_by uuid references public.staffs(id) on delete set null,
    referred_to_facility text not null,
    referred_to_department text,
    referred_to_doctor text,
    reason text not null,
    clinical_summary text,
    urgency text not null default 'routine' check (urgency in ('routine','urgent','emergency')),
    status text not null default 'pending' check (status in ('pending','sent','accepted','declined','completed')),
    sent_at timestamptz,
    response_notes text,
    created_at timestamptz not null default now()
);

-- ── 5. Lab specimen tracking ────────────────────────────────────────────────
create table if not exists public.lab_specimens (
    id uuid primary key default gen_random_uuid(),
    lab_request_id uuid references public.lab_requests(id) on delete set null,
    patient_id uuid not null references public.patients(id) on delete cascade,
    specimen_type text not null,
    container text,
    barcode text not null,
    collection_at timestamptz,
    collected_by uuid references public.staffs(id) on delete set null,
    received_at timestamptz,
    received_by uuid references public.staffs(id) on delete set null,
    status text not null default 'collected' check (status in ('collected','received','processing','completed','rejected')),
    rejection_reason text,
    notes text,
    created_at timestamptz not null default now()
);

-- ── 6. Wards (bed board) ────────────────────────────────────────────────────
create table if not exists public.wards (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    department text,
    total_beds int not null default 10,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

-- ── 7. Drug batches & expiry tracking ───────────────────────────────────────
create table if not exists public.drug_batches (
    id uuid primary key default gen_random_uuid(),
    drug_id uuid not null references public.drug_inventory(id) on delete cascade,
    batch_number text not null,
    manufacturer text,
    expiry_date date not null,
    quantity int not null default 0,
    received_at timestamptz not null default now(),
    received_by uuid references public.staffs(id) on delete set null,
    notes text,
    created_at timestamptz not null default now()
);
alter table public.drug_inventory add column if not exists manufacturer text;

-- ── 8. Medication reconciliation ────────────────────────────────────────────
create table if not exists public.med_reconciliations (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    admission_id uuid references public.patient_admissions(id) on delete set null,
    encounter_type text not null default 'admission' check (encounter_type in ('admission','discharge','transfer')),
    medications jsonb not null default '[]'::jsonb,
    changes_summary text,
    performed_by uuid references public.staffs(id) on delete set null,
    performed_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

-- ── 9. Consent management ───────────────────────────────────────────────────
create table if not exists public.consents (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    consent_type text not null check (consent_type in ('treatment','procedure','data_privacy','research','photography')),
    version int not null default 1,
    status text not null default 'signed' check (status in ('signed','declined','withdrawn')),
    signed_by_patient boolean not null default true,
    witness_id uuid references public.staffs(id) on delete set null,
    signed_at timestamptz,
    expires_at timestamptz,
    document_id uuid references public.patient_documents(id) on delete set null,
    notes text,
    created_at timestamptz not null default now()
);

-- ── 10. Death & birth certificates / mortality reporting ────────────────────
create table if not exists public.death_certificates (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references public.patients(id) on delete cascade,
    certifying_doctor uuid references public.staffs(id) on delete set null,
    date_of_death date not null,
    time_of_death time,
    place_of_death text,
    immediate_cause text,
    icd10_immediate text,
    antecedent_cause text,
    icd10_antecedent text,
    other_conditions text,
    manner_of_death text not null default 'natural' check (manner_of_death in ('natural','accident','suicide','homicide','undetermined')),
    issued_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create table if not exists public.birth_certificates (
    id uuid primary key default gen_random_uuid(),
    child_name text not null,
    sex text check (sex in ('male','female')),
    date_of_birth date not null default current_date,
    time_of_birth time,
    place_of_birth text,
    weight_kg numeric(5,2),
    mother_patient_id uuid references public.patients(id) on delete set null,
    father_name text,
    attending_staff uuid references public.staffs(id) on delete set null,
    created_at timestamptz not null default now()
);

-- ── 11. Multi-facility support ──────────────────────────────────────────────
create table if not exists public.facilities (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    code text not null unique,
    address text,
    city text,
    state text,
    phone text,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);
alter table public.patients add column if not exists facility_id uuid references public.facilities(id) on delete set null;
alter table public.staffs add column if not exists facility_id uuid references public.facilities(id) on delete set null;
alter table public.payments add column if not exists facility_id uuid references public.facilities(id) on delete set null;
alter table public.appointments add column if not exists facility_id uuid references public.facilities(id) on delete set null;
alter table public.patient_admissions add column if not exists facility_id uuid references public.facilities(id) on delete set null;

-- ── 12. Coding standards (ICD-10 / SNOMED / LOINC) ──────────────────────────
alter table public.lab_test_catalog add column if not exists icd10_code text;
alter table public.lab_test_catalog add column if not exists loinc_code text;
alter table public.lab_test_catalog add column if not exists snomed_code text;
alter table public.consultations add column if not exists icd10_codes text[] not null default '{}';

-- ── 13. Patient portal ──────────────────────────────────────────────────────
alter table public.patients add column if not exists portal_user_id uuid unique;
alter table public.patients add column if not exists portal_enabled boolean not null default false;

-- ── 14. MAR e-signature / witness ───────────────────────────────────────────
alter table public.drug_administration_records add column if not exists witnessed_by uuid references public.staffs(id) on delete set null;
alter table public.drug_administration_records add column if not exists witnessed_at timestamptz;
alter table public.drug_administration_records add column if not exists signed_at timestamptz;

-- ── 15. Dispensing batch tracking ───────────────────────────────────────────
-- `drug_dispensing` predates this repo's migration history on most
-- deployments (it was created directly in the original database), so it is
-- created here defensively if missing. The columns match what the pharmacy
-- service writes/reads (see lib/services/pharmacy.service.ts and
-- lib/services/reporting.service.ts).
create table if not exists public.drug_dispensing (
    id              uuid primary key default gen_random_uuid(),
    prescription_id uuid references public.prescriptions(id) on delete set null,
    patient_id      uuid not null references public.patients(id) on delete cascade,
    dispensed_by    uuid references public.staffs(id) on delete set null,
    dispensed_at    timestamptz not null default now(),
    drug_name       text,
    quantity        integer not null default 1,
    batch_number    text,
    created_at      timestamptz not null default now()
);

create index if not exists idx_drug_dispensing_patient on public.drug_dispensing(patient_id, dispensed_at desc);

-- For deployments where the table already existed without batch tracking.
alter table public.drug_dispensing add column if not exists batch_number text;

-- ── 15b. Fluid balance chart (defensive) ────────────────────────────────────
-- Also referenced by 20260814_enable_rls_security.sql and the fluid-chart
-- migration below; create it here if the legacy database predates it.
create table if not exists public.fluid_balance (
    id               uuid primary key default gen_random_uuid(),
    patient_id       uuid not null references public.patients(id) on delete cascade,
    record_date      date not null,
    record_time      time not null,
    -- Intake
    oral_ml          integer not null default 0,
    iv_ml            integer not null default 0,
    ng_ml            integer not null default 0,
    other_input_ml   integer not null default 0,
    other_input_type text,
    -- Output
    urine_ml         integer not null default 0,
    aspirate_ml      integer not null default 0,
    vomit_ml         integer not null default 0,
    bowel_ml         integer not null default 0,
    drain_ml         integer not null default 0,
    other_output_ml  integer not null default 0,
    signed_by        text,
    notes            text,
    created_at       timestamptz not null default now()
);

create index if not exists idx_fluid_balance_patient_date
    on public.fluid_balance(patient_id, record_date desc, record_time desc);

-- ── 16. Audit index for patient-scoped review ───────────────────────────────
-- `audit_logs` also predates the repo's migration history on some
-- deployments — create it defensively if missing. Columns mirror the audit
-- service (lib/services/audit.service.ts) and the admin audit trail UI.
create table if not exists public.audit_logs (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid,
    action      text not null,
    entity_type text,
    entity_id   text,
    changes     jsonb not null default '{}'::jsonb,
    timestamp   timestamptz not null default now(),
    created_at  timestamptz not null default now()
);

create index if not exists idx_audit_logs_timestamp on public.audit_logs(timestamp desc);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY for the new tables (staff rules mirror lib/services,
-- plus patient-portal self-read where applicable)
-- ═══════════════════════════════════════════════════════════════════════════

-- helpers
-- These three are also defined in 20260814_enable_rls_security.sql, but the
-- policies below need them even when that file has not run yet (and on
-- databases where they were never created out-of-band). `create or replace`
-- keeps both copies idempotent. Cast IDs to text because the legacy schema
-- stores staffs.id as text while auth.uid() returns uuid; this also works when
-- staffs.id is uuid in a newer deployment.
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
    select lower(regexp_replace(role, '[^a-z]', '', 'g')) as compact
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

create or replace function public.patient_self_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.patients where portal_user_id = auth.uid() and portal_enabled limit 1;
$$;

create or replace function public.is_patient_self(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select pid is not null and exists (
    select 1 from public.patients p
    where p.id = pid and p.portal_user_id = auth.uid() and p.portal_enabled
  );
$$;

-- patient_allergies
alter table public.patient_allergies enable row level security;
drop policy if exists "allergies select" on public.patient_allergies;
create policy "allergies select" on public.patient_allergies for select to authenticated
  using (public.is_staff() or public.is_patient_self(patient_id));
drop policy if exists "allergies insert clinical" on public.patient_allergies;
create policy "allergies insert clinical" on public.patient_allergies for insert to authenticated
  with check (public.staff_can('Doctor') or public.staff_can('Nurse') or public.staff_can('FrontDesk'));
drop policy if exists "allergies update clinical" on public.patient_allergies;
create policy "allergies update clinical" on public.patient_allergies for update to authenticated
  using (public.staff_can('Doctor') or public.staff_can('Nurse')) with check (public.staff_can('Doctor') or public.staff_can('Nurse'));
drop policy if exists "allergies delete admin" on public.patient_allergies;
create policy "allergies delete admin" on public.patient_allergies for delete to authenticated using (public.staff_has_role('Admin'));

-- immunizations
alter table public.immunizations enable row level security;
drop policy if exists "immunizations select" on public.immunizations;
create policy "immunizations select" on public.immunizations for select to authenticated
  using (public.is_staff() or public.is_patient_self(patient_id));
drop policy if exists "immunizations insert clinical" on public.immunizations;
create policy "immunizations insert clinical" on public.immunizations for insert to authenticated
  with check (public.staff_can('Doctor') or public.staff_can('Nurse'));
drop policy if exists "immunizations update clinical" on public.immunizations;
create policy "immunizations update clinical" on public.immunizations for update to authenticated
  using (public.staff_can('Doctor') or public.staff_can('Nurse')) with check (public.staff_can('Doctor') or public.staff_can('Nurse'));
drop policy if exists "immunizations delete admin" on public.immunizations;
create policy "immunizations delete admin" on public.immunizations for delete to authenticated using (public.staff_has_role('Admin'));

-- surgeries
alter table public.surgeries enable row level security;
drop policy if exists "surgeries select" on public.surgeries;
create policy "surgeries select" on public.surgeries for select to authenticated
  using (public.is_staff() or public.is_patient_self(patient_id));
drop policy if exists "surgeries insert doctor" on public.surgeries;
create policy "surgeries insert doctor" on public.surgeries for insert to authenticated with check (public.staff_can('Doctor'));
drop policy if exists "surgeries update clinical" on public.surgeries;
create policy "surgeries update clinical" on public.surgeries for update to authenticated
  using (public.staff_can('Doctor') or public.staff_can('Nurse')) with check (public.staff_can('Doctor') or public.staff_can('Nurse'));
drop policy if exists "surgeries delete admin" on public.surgeries;
create policy "surgeries delete admin" on public.surgeries for delete to authenticated using (public.staff_has_role('Admin'));

-- referrals
alter table public.referrals enable row level security;
drop policy if exists "referrals select" on public.referrals;
create policy "referrals select" on public.referrals for select to authenticated
  using (public.is_staff() or public.is_patient_self(patient_id));
drop policy if exists "referrals insert doctor" on public.referrals;
create policy "referrals insert doctor" on public.referrals for insert to authenticated with check (public.staff_can('Doctor'));
drop policy if exists "referrals update doctor" on public.referrals;
create policy "referrals update doctor" on public.referrals for update to authenticated
  using (public.staff_can('Doctor') or public.staff_can('FrontDesk')) with check (public.staff_can('Doctor') or public.staff_can('FrontDesk'));
drop policy if exists "referrals delete admin" on public.referrals;
create policy "referrals delete admin" on public.referrals for delete to authenticated using (public.staff_has_role('Admin'));

-- lab_specimens
alter table public.lab_specimens enable row level security;
drop policy if exists "specimens select staff" on public.lab_specimens;
create policy "specimens select staff" on public.lab_specimens for select to authenticated using (public.is_staff());
drop policy if exists "specimens insert lab" on public.lab_specimens;
create policy "specimens insert lab" on public.lab_specimens for insert to authenticated with check (public.staff_can('LabTechnician'));
drop policy if exists "specimens update lab" on public.lab_specimens;
create policy "specimens update lab" on public.lab_specimens for update to authenticated
  using (public.staff_can('LabTechnician')) with check (public.staff_can('LabTechnician'));
drop policy if exists "specimens delete admin" on public.lab_specimens;
create policy "specimens delete admin" on public.lab_specimens for delete to authenticated using (public.staff_has_role('Admin'));

-- wards
alter table public.wards enable row level security;
drop policy if exists "wards select staff" on public.wards;
create policy "wards select staff" on public.wards for select to authenticated using (public.is_staff());
drop policy if exists "wards write clinical" on public.wards;
create policy "wards write clinical" on public.wards for insert to authenticated with check (public.staff_can('Nurse') or public.staff_can('Admin'));
drop policy if exists "wards update clinical" on public.wards;
create policy "wards update clinical" on public.wards for update to authenticated
  using (public.staff_can('Nurse') or public.staff_can('Admin')) with check (public.staff_can('Nurse') or public.staff_can('Admin'));

-- drug_batches
alter table public.drug_batches enable row level security;
drop policy if exists "batches select staff" on public.drug_batches;
create policy "batches select staff" on public.drug_batches for select to authenticated using (public.is_staff());
drop policy if exists "batches write pharmacist" on public.drug_batches;
create policy "batches write pharmacist" on public.drug_batches for insert to authenticated with check (public.staff_can('Pharmacist'));
drop policy if exists "batches update pharmacist" on public.drug_batches;
create policy "batches update pharmacist" on public.drug_batches for update to authenticated
  using (public.staff_can('Pharmacist')) with check (public.staff_can('Pharmacist'));
drop policy if exists "batches delete pharmacist" on public.drug_batches;
create policy "batches delete pharmacist" on public.drug_batches for delete to authenticated using (public.staff_can('Pharmacist'));

-- med_reconciliations
alter table public.med_reconciliations enable row level security;
drop policy if exists "reconciliations select" on public.med_reconciliations;
create policy "reconciliations select" on public.med_reconciliations for select to authenticated
  using (public.is_staff() or public.is_patient_self(patient_id));
drop policy if exists "reconciliations insert clinical" on public.med_reconciliations;
create policy "reconciliations insert clinical" on public.med_reconciliations for insert to authenticated
  with check (public.staff_can('Doctor') or public.staff_can('Nurse') or public.staff_can('Pharmacist'));
drop policy if exists "reconciliations update clinical" on public.med_reconciliations;
create policy "reconciliations update clinical" on public.med_reconciliations for update to authenticated
  using (public.staff_can('Doctor') or public.staff_can('Nurse') or public.staff_can('Pharmacist'))
  with check (public.staff_can('Doctor') or public.staff_can('Nurse') or public.staff_can('Pharmacist'));

-- consents
alter table public.consents enable row level security;
drop policy if exists "consents select" on public.consents;
create policy "consents select" on public.consents for select to authenticated
  using (public.is_staff() or public.is_patient_self(patient_id));
drop policy if exists "consents insert frontdesk" on public.consents;
create policy "consents insert frontdesk" on public.consents for insert to authenticated with check (public.staff_can('FrontDesk'));
drop policy if exists "consents update frontdesk" on public.consents;
create policy "consents update frontdesk" on public.consents for update to authenticated
  using (public.staff_can('FrontDesk')) with check (public.staff_can('FrontDesk'));

-- death/birth certificates
alter table public.death_certificates enable row level security;
drop policy if exists "death_certs select staff" on public.death_certificates;
create policy "death_certs select staff" on public.death_certificates for select to authenticated using (public.is_staff());
drop policy if exists "death_certs insert doctor" on public.death_certificates;
create policy "death_certs insert doctor" on public.death_certificates for insert to authenticated with check (public.staff_can('Doctor'));
drop policy if exists "death_certs delete admin" on public.death_certificates;
create policy "death_certs delete admin" on public.death_certificates for delete to authenticated using (public.staff_has_role('Admin'));

alter table public.birth_certificates enable row level security;
drop policy if exists "birth_certs select staff" on public.birth_certificates;
create policy "birth_certs select staff" on public.birth_certificates for select to authenticated using (public.is_staff());
drop policy if exists "birth_certs insert clinical" on public.birth_certificates;
create policy "birth_certs insert clinical" on public.birth_certificates for insert to authenticated
  with check (public.staff_can('Doctor') or public.staff_can('Nurse') or public.staff_can('FrontDesk'));
drop policy if exists "birth_certs delete admin" on public.birth_certificates;
create policy "birth_certs delete admin" on public.birth_certificates for delete to authenticated using (public.staff_has_role('Admin'));

-- facilities
alter table public.facilities enable row level security;
drop policy if exists "facilities select staff" on public.facilities;
create policy "facilities select staff" on public.facilities for select to authenticated using (public.is_staff());
drop policy if exists "facilities write admin" on public.facilities;
create policy "facilities write admin" on public.facilities for insert to authenticated with check (public.staff_has_role('Admin'));
drop policy if exists "facilities update admin" on public.facilities;
create policy "facilities update admin" on public.facilities for update to authenticated
  using (public.staff_has_role('Admin')) with check (public.staff_has_role('Admin'));

-- ── Patient portal self-read on existing tables ──────────────────────────────
drop policy if exists "patients select self portal" on public.patients;
create policy "patients select self portal" on public.patients for select to authenticated
  using (id = patient_self_id());
drop policy if exists "consultations select self portal" on public.consultations;
create policy "consultations select self portal" on public.consultations for select to authenticated
  using (public.is_patient_self(patient_id));
drop policy if exists "prescriptions select self portal" on public.prescriptions;
create policy "prescriptions select self portal" on public.prescriptions for select to authenticated
  using (public.is_patient_self(patient_id));
drop policy if exists "lab_requests select self portal" on public.lab_requests;
create policy "lab_requests select self portal" on public.lab_requests for select to authenticated
  using (public.is_patient_self(visit_id));
drop policy if exists "payments select self portal" on public.payments;
create policy "payments select self portal" on public.payments for select to authenticated
  using (public.is_patient_self(patient_id));
drop policy if exists "appointments select self portal" on public.appointments;
create policy "appointments select self portal" on public.appointments for select to authenticated
  using (public.is_patient_self(patient_id));
drop policy if exists "patient_admissions select self portal" on public.patient_admissions;
create policy "patient_admissions select self portal" on public.patient_admissions for select to authenticated
  using (public.is_patient_self(patient_id));
drop policy if exists "discharge_notes select self portal" on public.discharge_notes;
create policy "discharge_notes select self portal" on public.discharge_notes for select to authenticated
  using (public.is_patient_self(patient_id));
drop policy if exists "nursing_actions select self portal" on public.nursing_actions;
create policy "nursing_actions select self portal" on public.nursing_actions for select to authenticated
  using (public.is_patient_self(patient_id));
drop policy if exists "patient_documents select self portal" on public.patient_documents;
create policy "patient_documents select self portal" on public.patient_documents for select to authenticated
  using (public.is_patient_self(patient_id));
drop policy if exists "drug_administration_records select self portal" on public.drug_administration_records;
create policy "drug_administration_records select self portal" on public.drug_administration_records for select to authenticated
  using (public.is_patient_self(patient_id));

-- ── REMINDER ─────────────────────────────────────────────────────────────────
-- Realtime: the portal policies above automatically restrict Realtime
-- subscriptions for patients to their own rows.
