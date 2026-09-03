-- ═══════════════════════════════════════════════════════════════════════════
-- CONSULTATION-RELATED TABLES: NO REQUIRED CONTENT FIELDS
--
-- Why: the consultation form stopped hard-requiring any field — the doctor
-- can skip anything that isn't applicable and submits after a confirmation
-- prompt instead (see components/patients/consultation-form.tsx). The
-- database was still allowed to disagree: any NOT NULL column without a
-- usable default on the tables that form writes to would abort the insert
-- with a Postgres 23502 error ("A required field was left blank"), exactly
-- the failure mode the bulk patient import hit before
-- 20260901_patients_no_required_fields.sql.
--
-- Tables covered (everything the consultation form writes through):
--   consultations, lab_requests (lab + radiology rows), prescriptions,
--   patient_admissions
--
-- Rules:
--   1. Content columns (symptoms, diagnosis, notes, indications, …) may be
--      NULL — "the doctor skipped it" is a valid state, not an error.
--   2. Primary keys and foreign keys (patient_id, doctor_id, visit_id,
--      requested_by, …) stay NOT NULL. They identify whose record this is
--      and the app always sends them; orphaned rows are worse than a
--      rejected insert.
--   3. Columns that already have defaults (status, priority, …) keep
--      working exactly as before — dropping their NOT NULL only removes
--      the redundant constraint, the default still fills omitted values.
--
-- Companion to 20260901_patients_no_required_fields.sql.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
    t text;
    r record;
begin
    foreach t in array array['consultations', 'lab_requests', 'prescriptions', 'patient_admissions']
    loop
        for r in
            select a.attname
              from pg_attribute a
              join pg_class     c on c.oid = a.attrelid
              join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public'
               and c.relname = t
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
               -- Foreign-key columns identify the owner of the record
               -- (patient_id, doctor_id, …) — see rule 2 in the header.
               and not exists (
                     select 1
                       from pg_constraint k
                      where k.conrelid = c.oid
                        and k.contype = 'f'
                        and a.attnum = any (k.conkey::int[])
                   )
        loop
            begin
                execute format('alter table public.%I alter column %I drop not null', t, r.attname);
            exception when others then
                -- Never abort the migration over one column (e.g. a generated
                -- or identity column Postgres insists on keeping NOT NULL).
                raise notice '%.%: left as NOT NULL (%)', t, r.attname, sqlerrm;
            end;
        end loop;
    end loop;
end $$;
