-- ═══════════════════════════════════════════════════════════════════════════
-- PATIENT HOSPITAL NUMBERS
--
-- Every patient gets a hospital number:
--   • NVHE-000001  — patients created in the EMR (front-desk registration)
--   • NVH-000001   — patients imported via bulk upload
--
-- Numbers are generated server-side from two dedicated Postgres sequences
-- (race-free), while bulk uploads may also carry an explicit number copied
-- from the paper records (e.g. NVH-004217). `advance_hospital_number_seq`
-- bumps the counter past those explicit values so auto-generated numbers
-- never collide with them.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Column + uniqueness ──────────────────────────────────────────────────────
alter table public.patients add column if not exists hospital_number text;

create unique index if not exists idx_patients_hospital_number
    on public.patients (hospital_number)
    where hospital_number is not null;-

-- 2. One sequence per prefix ──────────────────────────────────────────────────
create sequence if not exists public.seq_hospital_number_nvhe start with 1;
create sequence if not exists public.seq_hospital_number_nvh  start with 1;

-- 3. Allocate the next number for a prefix ────────────────────────────────────
create or replace function public.next_hospital_number(p_prefix text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_seq bigint;
begin
  if upper(p_prefix) = 'NVHE' then
    v_seq := nextval('public.seq_hospital_number_nvhe');
  else
    v_seq := nextval('public.seq_hospital_number_nvh');
  end if;
  return upper(p_prefix) || '-' || lpad(v_seq::text, 6, '0');
end;
$$;

-- 4. Push a prefix's counter past an explicit number (from a bulk-upload CSV)
--    so auto-generated numbers never reuse a paper-record number. Idempotent:
--    the counter only ever moves forward.
create or replace function public.advance_hospital_number_seq(p_prefix text, p_number text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_seq_name text;
  v_n bigint;
  v_max bigint;
begin
  if p_number is null or trim(p_number) = '' then
    return;
  end if;

  v_n := (regexp_match(upper(p_number), '([0-9]+)$'))[1]::bigint;
  if v_n is null then
    return;
  end if;

  if upper(p_prefix) = 'NVHE' then
    v_seq_name := 'seq_hospital_number_nvhe';
  else
    v_seq_name := 'seq_hospital_number_nvh';
  end if;

  -- Highest suffix already used anywhere for this prefix — never roll back.
  execute format(
    'select coalesce(max((regexp_match(hospital_number, ''([0-9]+)$''))[1]::bigint), 0)
       from public.patients
      where hospital_number ilike %L',
    upper(p_prefix) || '-%'
  ) into v_max;

  execute format('select setval(%L, greatest(%s, %s), true)', v_seq_name, v_n, v_max);
end;
$$;

-- Only authenticated staff may use the generators (the server client always
-- calls these as the signed-in staff member).
revoke execute on function public.next_hospital_number(text) from public;
revoke execute on function public.advance_hospital_number_seq(text, text) from public;
grant execute on function public.next_hospital_number(text) to authenticated;
grant execute on function public.advance_hospital_number_seq(text, text) to authenticated;

-- 5. Backfill existing patients (idempotent — only touches rows still missing
--    a number). Existing rows can't carry a creation-source flag, so we use
--    the field the two creation paths fill differently: EMR registrations
--    always capture an email, bulk imports do not.
do $$
declare
  r record;
begin
  for r in
    select id,
           case when coalesce(email, '') = '' then 'NVH' else 'NVHE' end as prefix
      from public.patients
     where hospital_number is null
     order by created_at asc nulls last, id asc
  loop
    update public.patients
       set hospital_number = public.next_hospital_number(r.prefix)
     where id = r.id;
  end loop;
end;
$$;
