-- ═══════════════════════════════════════════════════════════════════════════
-- HOSPITAL NUMBER AUDIT — READ-ONLY (run in Supabase → SQL Editor)
-- 2026-09-18 · requested by medical records (Tony)
--
-- Answers, with zero changes to any data:
--   1. Are there SKIPPED numbers in the NVH-XXXXX series, and exactly which?
--   2. Who owns the files at the paper/EMR seam (around 2330–2380)?
--   3. Are there duplicates, non-standard formats, or patients with no number?
--   4. PREVIEW ONLY: what an order-preserving dense renumber would change —
--      so "adjust the hospital numbers" can be decided with the blast radius
--      in view, before anything is written.
--
-- Run the WHOLE file in one go (section 0's setting is session-local).
-- Nothing here writes: no INSERT, no UPDATE, no DELETE, no setval.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 0 · Setting — where the seam listing starts (Tony's concern: ~2330) ─────
create temp table if not exists hn_audit_settings(seam_from bigint not null);
delete from hn_audit_settings;
insert into hn_audit_settings values (2325);

-- ─── 1 · Inventory ───────────────────────────────────────────────────────────
select count(*)                                                          as total_patients,
       count(*) filter (where hospital_number is not null
                         and btrim(hospital_number) <> '')               as with_number,
       count(*) filter (where hospital_number is null
                         or btrim(hospital_number) = '')                 as without_number,
       count(*) filter (where hospital_number ~ '^NVH-?[0-9]{5}$')       as canonical_format,
       count(*) filter (where hospital_number is not null
                         and btrim(hospital_number) <> ''
                         and hospital_number !~ '^NVH-?[0-9]{5}$')       as non_standard_format
  from public.patients;

-- Non-standard values (legacy NVHE-, unhyphenated, temp, anything else).
select hospital_number, name, created_at
  from public.patients
 where hospital_number is not null
   and btrim(hospital_number) <> ''
   and hospital_number !~ '^NVH-?[0-9]{5}$'
 order by created_at;

-- Duplicate check — must return ZERO rows (the partial unique index enforces
-- one row per exact value; this also catches same-suffix-different-string).
select (regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint as suffix, count(*)
  from public.patients
 where hospital_number ~ '^NVH'
 group by 1
having count(*) > 1
 order by 1;

-- ─── 2 · THE GAP REPORT — every skipped number in the series ────────────────
-- 2a. Summary: how many numbers are missing between the first and last file.
with bounds as (
  select min((regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint) as lo,
         max((regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint) as hi,
         count(*) as files
    from public.patients
   where hospital_number ~ '^NVH'
)
select lo as first_number,
       hi as last_number,
       files,
       (hi - lo + 1) - files as skipped_number_count
  from bounds;

-- 2b. The skipped numbers, compressed into ranges (e.g. 864–1022, 2330–2334).
with bounds as (
  select min((regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint) as lo,
         max((regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint) as hi
    from public.patients
   where hospital_number ~ '^NVH'
),
present as (
  select (regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint as n
    from public.patients
   where hospital_number ~ '^NVH'
),
missing as (
  select g.n
    from bounds b
   cross join lateral generate_series(b.lo, b.hi) as g(n)
   where not exists (select 1 from present p where p.n = g.n)
),
islands as (
  select n, n - row_number() over (order by n) as grp
    from missing
)
select min(n) as gap_start,
       max(n) as gap_end,
       count(*) as count,
       'NVH-' || lpad(min(n)::text, 5, '0') ||
         case when count(*) > 1 then ' … NVH-' || lpad(max(n)::text, 5, '0') else '' end as gap
  from islands
 group by grp
 order by min(n);

-- ─── 3 · THE SEAM — who owns every file from 2325 upward ─────────────────────
-- This is Tony's question: 2335 (a real patient — keep), 2380 ("Ramalan" —
-- kept too, no deletions), and whether 2330–2334 are free.
select 'NVH-' || lpad((regexp_match(hospital_number, '([0-9]+)$'))[1], 5, '0') as file,
       name,
       created_at
  from public.patients
 where hospital_number ~ '^NVH'
   and (regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint
       >= (select seam_from from hn_audit_settings)
 order by (regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint;

-- ─── 4 · Distribution per hundred (spot import blocks vs stray files) ────────
select (((regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint - 1) / 100)::bigint as hundred_block,
       count(*) as files
  from public.patients
 where hospital_number ~ '^NVH'
 group by 1
 order by 1 desc
 limit 30;

-- ─── 5 · DENSE-RENUMBER PREVIEW — no changes are made ────────────────────────
-- What each file would become under an order-preserving dense renumber
-- (dense rank over current numbers, same file order). Returned ONLY for rows
-- that would move. Review carefully: paper-linked files should probably NOT
-- move — the decision of WHICH files may be renumbered comes after this audit.
with numbered as (
  select id,
         hospital_number as current,
         (regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint as suffix,
         row_number() over (order by (regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint,
                                     created_at, id) as dense_pos
    from public.patients
   where hospital_number ~ '^NVH'
)
select suffix as current_suffix,
       current,
       'NVH-' || lpad(dense_pos::text, 5, '0') as would_become
  from numbered
 where suffix <> dense_pos
 order by suffix;

-- ─── 6 · Legacy sequence — for the record only ───────────────────────────────
-- After 20260918_hospital_number_gapless_assignment.sql the sequence is unused
-- (numbering follows the table). This just documents where it stopped.
select last_value, is_called
  from public.seq_hospital_number_nvh;
