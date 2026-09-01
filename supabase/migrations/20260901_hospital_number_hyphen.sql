-- ═══════════════════════════════════════════════════════════════════════════
-- PATIENT HOSPITAL NUMBER — HYPHENATED PREFIX
--
-- The canonical hospital number is now:
--   NVH-00001   (NVH- + five zero-padded digits)
--
-- All patients still share one numeric series regardless of how they were
-- registered (front-desk EMR or bulk CSV import) — only the display format
-- changes. The shared sequence is purely numeric, so it carries over
-- unchanged and the next number continues from where the series left off.
--
-- Stored values are rewritten one-to-one (the numeric suffix is preserved):
--   NVH00001 → NVH-00001
--
-- Legacy inputs (NVHE-000001, NVH000001, …) remain accepted on read/import
-- and are normalized to the canonical form.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Generate hyphenated numbers from the same shared sequence ───────────────
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
  v_seq := nextval('public.seq_hospital_number_nvh');
  return 'NVH-' || lpad(v_seq::text, 5, '0');
end;
$$;

-- 1b. Batch allocation for bulk imports — one RPC allocates N numbers instead
--     of one RPC per row (a 5,000-patient CSV would otherwise need 5,000 round
--     trips). Sequence draws stay race-free for concurrent imports.
create or replace function public.next_hospital_numbers(p_count integer)
returns setof text
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  return query
  select 'NVH-' || lpad(nextval('public.seq_hospital_number_nvh')::text, 5, '0')
    from generate_series(1, greatest(1, p_count));
end;
$$;

-- 2.advance_hospital_number_seq is unchanged — its regexes already tolerate
--    the hyphen ('([0-9]+)$' suffix match, '~ ''^NVH''' series filter) — but it
--    is recreated here so this migration stays self-contained.
create or replace function public.advance_hospital_number_seq(p_prefix text, p_number text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_n   bigint;
  v_max bigint;
begin
  if p_number is null or trim(p_number) = '' then
    return;
  end if;

  -- Accept legacy/unhyphenated forms: NVHE-000001, NVH000001, NVH-00001, …
  v_n := (regexp_match(upper(p_number), '([0-9]+)$'))[1]::bigint;
  if v_n is null or v_n < 1 then
    return;
  end if;

  -- Highest suffix already in use anywhere in the shared NVH series.
  select coalesce(max((regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint), 0)
    into v_max
    from public.patients
   where hospital_number is not null
     and hospital_number ~ '^NVH';

  execute format(
    'select setval(%L, greatest(%s, %s), true)',
    'public.seq_hospital_number_nvh',
    v_n,
    v_max
  );
end;
$$;

revoke execute on function public.next_hospital_number(text) from public;
revoke execute on function public.next_hospital_numbers(integer) from public;
revoke execute on function public.advance_hospital_number_seq(text, text) from public;
grant execute on function public.next_hospital_number(text) to authenticated;
grant execute on function public.next_hospital_numbers(integer) to authenticated;
grant execute on function public.advance_hospital_number_seq(text, text) to authenticated;

-- 3. Rewrite existing values: NVH00001 → NVH-00001 ───────────────────────────
--    One-to-one rewrite (numeric suffix preserved), so the unique index cannot
--    collide and paper-record numbers keep their digits.
update public.patients
   set hospital_number = 'NVH-' || substring(hospital_number from 4)
 where hospital_number ~ '^NVH[0-9]+$';

-- The e-less legacy prefix, if any rows still carry it (i.e. the previous
-- format migration has not yet run), is normalized the same way: keep the
-- trailing digits, share the NVH- series. Temp values from an interrupted
-- renumbering are deliberately left untouched.
update public.patients
   set hospital_number = 'NVH-' || lpad((regexp_match(hospital_number, '([0-9]+)$'))[1], 5, '0')
 where hospital_number ~* '^NVHE-\d+$'
   and not exists (
     select 1
       from public.patients p2
      where p2.hospital_number =
            'NVH-' || lpad((regexp_match(public.patients.hospital_number, '([0-9]+)$'))[1], 5, '0')
   );
