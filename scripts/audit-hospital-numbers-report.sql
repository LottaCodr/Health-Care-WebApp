-- ═══════════════════════════════════════════════════════════════════════════
-- ONE-SHOT HOSPITAL NUMBER AUDIT — paste this WHOLE file into
-- Supabase → SQL Editor and Run once.
--
-- (The Supabase editor only shows the LAST statement's results, so the
-- section-by-section audit seemed to return almost nothing. This version is a
-- single statement: the entire audit comes back as one result set of
-- (section, data) rows — copy ALL of it back for analysis.)
--
-- READ-ONLY: no INSERT, no UPDATE, no DELETE, no setval. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

with base as (
  select id, name, hospital_number, created_at,
         (regexp_match(hospital_number, '([0-9]+)$'))[1]::bigint as suffix
    from public.patients
),
numbered as (
  select * from base where hospital_number ~ '^NVH'
),
bounds as (
  select min(suffix) as lo, max(suffix) as hi, count(*) as files
    from numbered
),
missing as (
  select g.n
    from bounds b
    cross join lateral generate_series(b.lo, b.hi) as g(n)
   where not exists (select 1 from numbered p where p.suffix = g.n)
),
gap_islands as (
  select min(n) as gap_start, max(n) as gap_end, count(*) as n_missing
    from (select n, n - row_number() over (order by n) as grp from missing) t
   group by grp
),
dup_suffixes as (
  select suffix, count(*) as files
    from numbered
   group by suffix
  having count(*) > 1
),
nonstandard as (
  select hospital_number, name, created_at
    from base
   where hospital_number is not null
     and btrim(hospital_number) <> ''
     and hospital_number !~ '^NVH-?[0-9]{5}$'
),
seam as (                       -- Tony's seam: every file from 2325 upward
  select suffix, name, created_at
    from numbered
   where suffix >= 2325
),
dense as (
  select suffix as current_suffix,
         row_number() over (order by suffix, created_at, id) as dense_pos
    from numbered
),
moved as (
  select * from dense where current_suffix <> dense_pos
)
select section, data
from (
  select '01_inventory' as section,
         jsonb_build_object(
           'total_patients',    (select count(*) from base),
           'with_number',       (select count(*) from numbered),
           'without_number',    (select count(*) from base
                                  where hospital_number is null
                                     or btrim(hospital_number) = ''),
           'non_standard_format', (select count(*) from nonstandard)
         ) as data
  union all
  select '02_skipped_summary',
         jsonb_build_object(
           'first_number',        (select lo from bounds),
           'last_number',         (select hi from bounds),
           'files_in_series',     (select files from bounds),
           'skipped_number_count',(select (hi - lo + 1) - files from bounds)
         )
  union all
  select '03_gap_ranges',
         coalesce(jsonb_agg(jsonb_build_object(
                    'gap',   'NVH-' || lpad(gap_start::text, 5, '0') ||
                             case when n_missing > 1
                                  then ' … NVH-' || lpad(gap_end::text, 5, '0')
                                  else '' end,
                    'count', n_missing)
                  order by gap_start), '[]'::jsonb)
    from gap_islands
  union all
  select '04_duplicate_suffixes (must be [])',
         coalesce(jsonb_agg(jsonb_build_object('suffix', suffix, 'files', files)
                  order by suffix), '[]'::jsonb)
    from dup_suffixes
  union all
  select '05_non_standard_values',
         jsonb_build_object(
           'count',  (select count(*) from nonstandard),
           'sample', coalesce((select jsonb_agg(row_to_json(t)::jsonb)
                                 from (select * from nonstandard
                                        order by created_at limit 50) t),
                              '[]'::jsonb)
         )
  union all
  select '06_seam_files_2325_up',
         coalesce(jsonb_agg(jsonb_build_object(
                    'file', 'NVH-' || lpad(suffix::text, 5, '0'),
                    'name', name,
                    'created_at', created_at)
                  order by suffix), '[]'::jsonb)
    from seam
  union all
  select '07_dense_renumber_would_move (PREVIEW)',
         jsonb_build_object(
           'would_move_count', (select count(*) from moved),
           'sample', coalesce((select jsonb_agg(jsonb_build_object(
                                 'current',  'NVH-' || lpad(current_suffix::text, 5, '0'),
                                 'becomes',  'NVH-' || lpad(dense_pos::text, 5, '0'))
                               order by current_suffix)
                                 from (select * from moved limit 50) t),
                              '[]'::jsonb)
         )
  union all
  select '08_legacy_sequence',
         jsonb_build_object(
           'last_value', (select last_value from public.seq_hospital_number_nvh),
           'is_called',  (select is_called  from public.seq_hospital_number_nvh)
         )
) audit
order by section;
