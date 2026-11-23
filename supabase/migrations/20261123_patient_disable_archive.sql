-- ═══════════════════════════════════════════════════════════════════════════
-- PATIENT RECORD DISABLE / ARCHIVE (2026-11-23)
--
-- WHY THIS EXISTS
-- Duplicate patient entries happen (e.g. a front-desk shift registers a
-- patient, duty changes, and the next shift registers the same patient again).
--
-- Deleting the row outright is dangerous when:
--   1. The duplicate already accumulated consultations, labs, bills, or IVF
--      records (hard delete destroys or is blocked by clinical history).
--   2. Deleting the highest-numbered NVH-XXXXX row allows that hospital number
--      to be reused by trg_patients_assign_hospital_number, and deleting an
--      older row creates a gap in the series (see DATA_RETENTION_POLICY.md and
--      20260918_hospital_number_gapless_assignment.sql).
--
-- This migration adds soft-disable / archive columns on `public.patients` so
-- administrators can disable duplicate/mistaken records (removing them from
-- all active queues, searches, and counts while keeping the hospital number
-- series intact and preserving an audit trail), restore them if disabled by
-- mistake, or permanently delete a zero-history duplicate when appropriate.
--
-- AUTHORIZATION
--   • Disable / Restore / Delete is ADMIN-ONLY — enforced both in the app
--     service layer (`requireStaff([UserRole.Admin])`) and at the database
--     layer via `trg_patients_protect_disable_admin` + the existing
--     `"patients delete admin"` RLS policy.
--
-- APPLY WITH: supabase db push   (or run in the Supabase SQL editor)
-- Idempotent: safe to run any number of times.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Archive / disable columns on public.patients ──────────────────────────
alter table public.patients add column if not exists is_active boolean not null default true;
alter table public.patients add column if not exists disabled_at timestamptz;
alter table public.patients add column if not exists disabled_by text;
alter table public.patients add column if not exists disabled_reason text;
alter table public.patients add column if not exists duplicate_of_patient_id uuid references public.patients(id) on delete set null;

-- Backfill any existing nulls (defensive)
update public.patients set is_active = true where is_active is null;

-- ── 2. Clean empty strings on disabled_reason too ────────────────────────────
create or replace function public.patients_clean_empty_strings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.name  is null or trim(new.name)  = '' then new.name  := null; else new.name  := trim(new.name);  end if;
    if new.phone is null or trim(new.phone) = '' then new.phone := null; else new.phone := trim(new.phone); end if;
    if new.gender is null or trim(new.gender) = '' then new.gender := null; else new.gender := trim(new.gender); end if;

    if new.email is not null and trim(new.email) = '' then new.email := null; end if;
    if new.address is not null and trim(new.address) = '' then new.address := null; end if;
    if new.occupation is not null and trim(new.occupation) = '' then new.occupation := null; end if;
    if new.religion is not null and trim(new.religion) = '' then new.religion := null; end if;
    if new.blood_group is not null and trim(new.blood_group) = '' then new.blood_group := null; end if;
    if new.geno_type is not null and trim(new.geno_type) = '' then new.geno_type := null; end if;
    if new.allergies is not null and trim(new.allergies) = '' then new.allergies := null; end if;

    if new.emergency_contact_name is not null and trim(new.emergency_contact_name) = '' then new.emergency_contact_name := null; end if;
    if new.emergency_contact_number is not null and trim(new.emergency_contact_number) = '' then new.emergency_contact_number := null; end if;
    if new.emergency_contact_relationship is not null and trim(new.emergency_contact_relationship) = '' then new.emergency_contact_relationship := null; end if;
    if new.emergency_contact_email is not null and trim(new.emergency_contact_email) = '' then new.emergency_contact_email := null; end if;
    if new.emergency_contact_address is not null and trim(new.emergency_contact_address) = '' then new.emergency_contact_address := null; end if;

    if new.long_term_medication is not null and trim(new.long_term_medication) = '' then new.long_term_medication := null; end if;
    if new.significant_medication_history is not null and trim(new.significant_medication_history) = '' then new.significant_medication_history := null; end if;
    if new.covid_vaccination_options is not null and trim(new.covid_vaccination_options) = '' then new.covid_vaccination_options := null; end if;
    if new.hmo_name is not null and trim(new.hmo_name) = '' then new.hmo_name := null; end if;
    if new.policy_number is not null and trim(new.policy_number) = '' then new.policy_number := null; end if;
    if new.company_name is not null and trim(new.company_name) = '' then new.company_name := null; end if;
    if new.notes is not null and trim(new.notes) = '' then new.notes := null; end if;
    if new.hospital_number is not null and trim(new.hospital_number) = '' then new.hospital_number := null; end if;

    if new.child_class is not null and trim(new.child_class) = '' then new.child_class := null; end if;
    if new.parent_info is not null and trim(new.parent_info) = '' then new.parent_info := null; end if;
    if new.referral_info is not null and trim(new.referral_info) = '' then new.referral_info := null; end if;

    if new.disabled_by is not null and trim(new.disabled_by) = '' then new.disabled_by := null; end if;
    if new.disabled_reason is not null and trim(new.disabled_reason) = '' then new.disabled_reason := null; end if;

    return new;
end;
$$;

drop trigger if exists trg_patients_clean_empty_strings on public.patients;
create trigger trg_patients_clean_empty_strings
before insert or update on public.patients
for each row
execute function public.patients_clean_empty_strings();

-- ── 3. Admin-only protection for disable / restore columns ───────────────────
-- Any staff member may update `patients.status` as part of clinical routing,
-- so RLS UPDATE on `patients` allows `is_staff()`. This trigger guarantees
-- that only an Administrator (or privileged SQL/service-role session where
-- auth.uid() is null) may disable or restore a patient record.
create or replace function public.patients_protect_disable_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if (
        new.is_active is distinct from old.is_active
        or new.disabled_at is distinct from old.disabled_at
        or new.disabled_by is distinct from old.disabled_by
        or new.disabled_reason is distinct from old.disabled_reason
        or new.duplicate_of_patient_id is distinct from old.duplicate_of_patient_id
    ) then
        if auth.uid() is not null and not public.staff_has_role('Admin') then
            raise exception 'Only administrators may disable or restore patient records.';
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_patients_protect_disable_admin on public.patients;
create trigger trg_patients_protect_disable_admin
before update on public.patients
for each row
execute function public.patients_protect_disable_admin();

-- Re-assert Admin-only DELETE policy
drop policy if exists "patients delete admin" on public.patients;
create policy "patients delete admin" on public.patients
  for delete to authenticated using (public.staff_has_role('Admin'));

-- ── 4. Performance indexes for active vs disabled queries ────────────────────
create index if not exists idx_patients_is_active
    on public.patients (is_active, disabled_at desc);

create index if not exists idx_patients_active_status_created_at
    on public.patients (status, created_at, id)
    where is_active = true;

create index if not exists idx_patients_active_created_at
    on public.patients (created_at, id)
    where is_active = true;
