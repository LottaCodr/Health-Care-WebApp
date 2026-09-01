-- ═══════════════════════════════════════════════════════════════════════════
-- PATIENT REQUIRED FIELDS & NULLABLE DEFAULTS
--
-- Rules:
--   1. Only `name`, `birth_date`, `gender`, and `phone` are REQUIRED (NOT NULL).
--   2. All other patient columns are OPTIONAL (NULLABLE).
--   3. Any empty string inserted or updated on optional fields automatically
--      converts to NULL via trigger.
--   4. Sensible defaults are provided for status and insurance flags.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Ensure existing rows satisfy required constraints before setting NOT NULL ──
update public.patients
   set name = 'Unknown Patient'
 where name is null or trim(name) = '';

update public.patients
   set gender = 'Male'
 where gender is null or trim(gender) = '';

update public.patients
   set phone = '0000000000'
 where phone is null or trim(phone) = '';

update public.patients
   set birth_date = current_date
 where birth_date is null;

-- 2. Set NOT NULL on the 4 strictly required columns ─────────────────────────
alter table public.patients alter column name set not null;
alter table public.patients alter column birth_date set not null;
alter table public.patients alter column gender set not null;
alter table public.patients alter column phone set not null;

-- 3. Drop NOT NULL on all optional columns so blank fields never block inserts ─
alter table public.patients alter column email drop not null;
alter table public.patients alter column address drop not null;
alter table public.patients alter column occupation drop not null;
alter table public.patients alter column religion drop not null;
alter table public.patients alter column blood_group drop not null;
alter table public.patients alter column geno_type drop not null;
alter table public.patients alter column allergies drop not null;

alter table public.patients alter column emergency_contact_name drop not null;
alter table public.patients alter column emergency_contact_number drop not null;
alter table public.patients alter column emergency_contact_relationship drop not null;
alter table public.patients alter column emergency_contact_email drop not null;
alter table public.patients alter column emergency_contact_address drop not null;

alter table public.patients alter column long_term_medication drop not null;
alter table public.patients alter column significant_medication_history drop not null;
alter table public.patients alter column covid_vaccination_options drop not null;
alter table public.patients alter column hmo drop not null;
alter table public.patients alter column hmo_name drop not null;
alter table public.patients alter column policy_number drop not null;
alter table public.patients alter column company drop not null;
alter table public.patients alter column company_name drop not null;
alter table public.patients alter column private_client drop not null;
alter table public.patients alter column notes drop not null;
alter table public.patients alter column facility_id drop not null;
alter table public.patients alter column portal_user_id drop not null;
alter table public.patients alter column portal_enabled drop not null;
alter table public.patients alter column hospital_number drop not null;

-- 4. Clean up existing empty strings in optional columns to NULL ─────────────
update public.patients set email = null where email = '' or trim(email) = '';
update public.patients set address = null where address = '' or trim(address) = '';
update public.patients set occupation = null where occupation = '' or trim(occupation) = '';
update public.patients set religion = null where religion = '' or trim(religion) = '';
update public.patients set blood_group = null where blood_group = '' or trim(blood_group) = '';
update public.patients set geno_type = null where geno_type = '' or trim(geno_type) = '';
update public.patients set allergies = null where allergies = '' or trim(allergies) = '';

update public.patients set emergency_contact_name = null where emergency_contact_name = '' or trim(emergency_contact_name) = '';
update public.patients set emergency_contact_number = null where emergency_contact_number = '' or trim(emergency_contact_number) = '';
update public.patients set emergency_contact_relationship = null where emergency_contact_relationship = '' or trim(emergency_contact_relationship) = '';
update public.patients set emergency_contact_email = null where emergency_contact_email = '' or trim(emergency_contact_email) = '';
update public.patients set emergency_contact_address = null where emergency_contact_address = '' or trim(emergency_contact_address) = '';

update public.patients set long_term_medication = null where long_term_medication = '' or trim(long_term_medication) = '';
update public.patients set significant_medication_history = null where significant_medication_history = '' or trim(significant_medication_history) = '';
update public.patients set covid_vaccination_options = null where covid_vaccination_options = '' or trim(covid_vaccination_options) = '';
update public.patients set hmo_name = null where hmo_name = '' or trim(hmo_name) = '';
update public.patients set policy_number = null where policy_number = '' or trim(policy_number) = '';
update public.patients set company_name = null where company_name = '' or trim(company_name) = '';
update public.patients set notes = null where notes = '' or trim(notes) = '';

-- 5. Trigger: automatically convert empty string columns to NULL on write ─────
create or replace function public.patients_clean_empty_strings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is not null then new.name := trim(new.name); end if;
  if new.phone is not null then new.phone := trim(new.phone); end if;
  if new.gender is not null then new.gender := trim(new.gender); end if;

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
  return new;
end;
$$;

drop trigger if exists trg_patients_clean_empty_strings on public.patients;
create trigger trg_patients_clean_empty_strings
before insert or update on public.patients
for each row
execute function public.patients_clean_empty_strings();

-- 6. Set column defaults ─────────────────────────────────────────────────────
alter table public.patients alter column status set default 'registered';
alter table public.patients alter column hmo set default false;
alter table public.patients alter column company set default false;
alter table public.patients alter column private_client set default true;
alter table public.patients alter column portal_enabled set default false;
