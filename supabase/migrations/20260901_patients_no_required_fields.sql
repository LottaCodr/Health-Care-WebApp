-- ═══════════════════════════════════════════════════════════════════════════
-- PATIENTS: NO REQUIRED FIELDS
--
-- Supersedes 20260901_patient_required_fields_and_defaults.sql, which kept
-- `name`, `birth_date`, `gender` and `phone` as NOT NULL.
--
-- Why: a bulk CSV import that leaves any of those blank aborted the row with
-- "A required field was left blank. Please check all mandatory fields." (a
-- Postgres 23502 error), which is exactly what front-desk staff hit when
-- registering patients from paper registers with gaps in them.
--
-- Rules now:
--   1. NO patient column is required. Every one of them may be left blank.
--   2. A blank text value is stored as NULL, never as an empty string.
--   3. `id` keeps its primary key (and therefore its NOT NULL + default), and
--      `hospital_number`/`status` keep their defaults so imported rows remain
--      findable. Neither is ever required *from the file*.
--
-- The server-side import (lib/actions/bulk-upload.ts) and the bulk-upload
-- dialog both stopped requiring fields for the same reason, and the manual
-- registration form keeps its own friendlier validation — relaxing the schema
-- does not weaken it, it just stops the database from rejecting rows.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Drop NOT NULL from every column except the primary key ──────────────────
-- Driven by the catalog rather than a hand-written column list, so columns
-- added later (or legacy ones this file has never seen) are covered too.
do $$
declare
    r record;
begin
    for r in
        select a.attname
          from pg_attribute a
          join pg_class     c on c.oid = a.attrelid
          join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relname = 'patients'
           and a.attnum > 0
           and not a.attisdropped
           and a.attnotnull
           -- Primary key columns are implicitly NOT NULL; leave them alone.
           and not exists (
                 select 1
                   from pg_index i
                  where i.indrelid = c.oid
                    and i.indisprimary
                    and a.attnum = any (i.indkey::int[])
               )
    loop
        begin
            execute format('alter table public.patients alter column %I drop not null', r.attname);
        exception when others then
            -- Never abort the migration over one column (e.g. a generated or
            -- identity column Postgres insists on keeping NOT NULL).
            raise notice 'patients.%: left as NOT NULL (%)', r.attname, sqlerrm;
        end;
    end loop;
end $$;

-- 2. Treat a blank cell as "not provided" on every write ─────────────────────
-- Extends the existing cleaning trigger: the four formerly-required columns
-- are now normalised too, so an empty name/phone/gender can never be stored
-- as '' (which would look like a real value in searches, and would collide on
-- any unique index the moment two blank rows are imported).
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
    if new.medical_history is not null and trim(new.medical_history) = '' then new.medical_history := null; end if;
    if new.emergency_contact_name is not null and trim(new.emergency_contact_name) = '' then new.emergency_contact_name := null; end if;
    if new.emergency_contact_number is not null and trim(new.emergency_contact_number) = '' then new.emergency_contact_number := null; end if;
    if new.emergency_contact_relationship is not null and trim(new.emergency_contact_relationship) = '' then new.emergency_contact_relationship := null; end if;
    if new.emergency_contact_email is not null and trim(new.emergency_contact_email) = '' then new.emergency_contact_email := null; end if;
    if new.emergency_contact_address is not null and trim(new.emergency_contact_address) = '' then new.emergency_contact_address := null; end if;
    if new.current_medication is not null and trim(new.current_medication) = '' then new.current_medication := null; end if;
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

-- 3. Undo the placeholders the earlier migration wrote to satisfy NOT NULL ──
-- They were invented values, not patient data: '0000000000' phones block the
-- real number from being registered later and read as junk on the ward.
update public.patients set phone = null where phone = '0000000000';
update public.patients set name  = null where name = 'Unknown Patient';

-- 4. Keep the row findable without requiring anything from the file ──────────
alter table public.patients alter column status set default 'registered';
