-- ═══════════════════════════════════════════════════════════════════════════
-- PATIENT PAEDIATRIC FIELDS
--
-- The front-desk registration form (RegistrationSuite) collects three
-- paediatric details when the patient is under 13: class / school year,
-- parent / guardian, and referral source. Until now those inputs had no
-- home in the schema — the form submitted them as `child_class`,
-- `parent_info` and `referral_info`, none of which are columns of
-- `patients`, so PostgREST rejected the ENTIRE insert with
-- PGRST204 ("Could not find the '…' column of 'patients' in the schema
-- cache"). The thrown error is redacted by Next.js in production, so the
-- front desk only ever saw:
--   "Registration Failed — An error occurred in the Server Components
--    render. The specific message is omitted in production builds …"
--
-- This migration gives the paediatric inputs real columns. All three are
-- optional free-text; blank values are normalised to NULL by the shared
-- patients_clean_empty_strings trigger (extended below, same pattern as
-- 20260901_patients_no_required_fields.sql).
--
-- Apply with: supabase db push
-- Idempotent: safe to run any number of times.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Columns ──────────────────────────────────────────────────────────────────
alter table public.patients add column if not exists child_class   text;
alter table public.patients add column if not exists parent_info   text;
alter table public.patients add column if not exists referral_info text;

-- 2. Blank means NULL, same rule as every other patient text column ──────────
--    (function recreated in full so this file stays self-contained; the three
--    paediatric lines are the only additions.)
create or replace function public.patients_clean_empty_strings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Formerly-required columns: blank means NULL, not ''.
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

    -- Paediatric fields (this migration).
    if new.child_class is not null and trim(new.child_class) = '' then new.child_class := null; end if;
    if new.parent_info is not null and trim(new.parent_info) = '' then new.parent_info := null; end if;
    if new.referral_info is not null and trim(new.referral_info) = '' then new.referral_info := null; end if;

    return new;
end;
$$;

-- 3. (Re)attach the trigger — no-op where 20260901 already created it,
--    self-contained for databases that never ran it.
drop trigger if exists trg_patients_clean_empty_strings on public.patients;
create trigger trg_patients_clean_empty_strings
before insert or update on public.patients
for each row
execute function public.patients_clean_empty_strings();
