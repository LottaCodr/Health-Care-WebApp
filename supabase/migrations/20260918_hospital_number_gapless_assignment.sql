-- ═══════════════════════════════════════════════════════════════════════════
-- GAPLESS HOSPITAL NUMBER ASSIGNMENT (2026-09-18)
--
-- The rule going forward — requested by medical records:
--
--   A hospital number only exists when a patient row exists.
--   A failed registration must NEVER consume a number, and the NVH-XXXXX
--   series must never skip.
--
-- How the series used to skip: the app DRAWN a number from a Postgres
-- sequence (rpc next_hospital_number) and only then tried to INSERT the
-- patient. nextval() is never rolled back, so every failed attempt — an RLS
-- refusal, a schema-drift PGRST204, a lost connection, even a validation
-- error — permanently burned one number. Those burns are the gaps found in
-- the files (e.g. NVH-02335 exists while paper records end at 2334).
--
-- New design
--   • Numbers are assigned BY THE DATABASE, inside the same statement that
--     inserts the patient: trg_patients_assign_hospital_number fills
--     hospital_number when the insert leaves it NULL/blank. If the insert
--     fails for ANY reason, nothing was ever assigned — nothing can skip.
--   • The next number is derived from the table itself (highest NVH suffix
--     in use + 1), under a transaction-scoped advisory lock so concurrent
--     registrations serialize instead of racing on the same value.
--     There is no counter to wind back, ever.
--   • Explicit values (paper-file numbers carried by bulk imports) pass
--     through untouched and automatically steer future max+1 assignment.
--   • Gapless-ness holds as long as patient rows are never DELETED — which
--     matches DATA_RETENTION_POLICY.md (archive: discharge + inactive).
--     Deleting the highest-numbered file would reuse its number; do not do it.
--
-- Compatibility during the deploy window
--   • next_hospital_number / next_hospital_numbers are kept for older app
--     builds, re-implemented as table-driven PEEKS (they reserve nothing, so
--     a failed insert burns nothing). Two racing peeks can propose the same
--     value; the partial unique index on hospital_number rejects the second
--     insert loudly — never a silent duplicate, never a gap. App code no
--     longer calls them; drop them once nothing references them.
--   • advance_hospital_number_seq(text,text) is retired to a no-op: with
--     table-derived numbering there is nothing left to advance; explicit
--     import numbers are reflected in the table automatically.
--   • The legacy sequence public.seq_hospital_number_nvh is left in place
--     (harmless, unused) so a rollback of this migration is trivial.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Assign the next number inside the INSERT ────────────────────────────────
create or replace function public.assign_hospital_number()
returns trigger
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_next bigint;
begin
  -- Explicit values pass through: bulk imports copy hospital numbers from the
  -- paper records, and those steer the series via max()+1 below.
  if new.hospital_number is not null and btrim(new.hospital_number) <> '' then
    return new;
  end if;

  -- Serialize assignment for the rest of this transaction. Concurrent inserts
  -- queue here; a transaction that later fails releases the lock and has
  -- consumed NOTHING (the number was never recorded anywhere).
  perform pg_advisory_xact_lock(hashtext('patients.hospital_number.assign'));

  select coalesce(max((regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint), 0) + 1
    into v_next
    from public.patients
   where hospital_number ~ '^NVH';

  new.hospital_number := 'NVH-' || lpad(v_next::text, 5, '0');
  return new;
end;
$$;

drop trigger if exists trg_patients_assign_hospital_number on public.patients;
create trigger trg_patients_assign_hospital_number
before insert on public.patients
for each row execute function public.assign_hospital_number();

-- 2. Compatibility peeks (older app builds still call these; reserve nothing) ─
create or replace function public.next_hospital_number(p_prefix text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_next bigint;
begin
  perform pg_advisory_xact_lock(hashtext('patients.hospital_number.assign'));
  select coalesce(max((regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint), 0) + 1
    into v_next
    from public.patients
   where hospital_number ~ '^NVH';
  return 'NVH-' || lpad(v_next::text, 5, '0');
end;
$$;

create or replace function public.next_hospital_numbers(p_count integer)
returns setof text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_max bigint;
begin
  perform pg_advisory_xact_lock(hashtext('patients.hospital_number.assign'));
  select coalesce(max((regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint), 0)
    into v_max
    from public.patients
   where hospital_number ~ '^NVH';
  return query
  select 'NVH-' || lpad((v_max + g.i)::text, 5, '0')
    from generate_series(1, greatest(1, p_count)) as g(i);
end;
$$;

-- 3. Retired: numbering follows the table, so there is no sequence to advance.
create or replace function public.advance_hospital_number_seq(p_prefix text, p_number text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  -- no-op (see header): explicit import numbers live in the table itself.
  return;
end;
$$;

-- Only authenticated staff may use the compatibility peeks (the server client
-- always calls these as the signed-in staff member).
revoke execute on function public.next_hospital_number(text) from public;
revoke execute on function public.next_hospital_numbers(integer) from public;
revoke execute on function public.advance_hospital_number_seq(text, text) from public;
grant execute on function public.next_hospital_number(text) to authenticated;
grant execute on function public.next_hospital_numbers(integer) to authenticated;
grant execute on function public.advance_hospital_number_seq(text, text) to authenticated;
