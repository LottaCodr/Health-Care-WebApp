-- ═══════════════════════════════════════════════════════════════════════════
-- 20260831_dedupe_lab_test_catalog.sql
--
-- Removes duplicate lab tests from lab_test_catalog and stops them coming back.
--
-- WHY THIS EXISTS
-- The price for a lab request is looked up from lab_test_catalog by test NAME
-- (lib/services/lab.service.ts). When the same test appears more than once the
-- lookup is ambiguous, so requests silently bill at ₦0 and the duplicate rows
-- also clutter every test picker (doctor, quick-route, front-desk lab tab).
-- The bulk CSV importer only de-duplicated by test_code, so tests uploaded with
-- different (or blank) codes created name duplicates.
--
-- WHAT THIS DOES
--  1. Keeps the best row per test name (active > priced > has code > lowest id).
--  2. Merges the other rows' data (price/code/category/active + optional text
--     columns) into that keeper row before deleting the rest.
--  3. Adds a unique index on the normalized test name so duplicates cannot be
--     inserted again (bulk imports that try will get a duplicate-key error and
--     fall back to the per-row path, where they are reported as "duplicate").
--
-- "Same test" is defined as an equal test name ignoring case and internal
-- whitespace differences ("Full Blood Count" == "  full   blood count  ").
-- Near-duplicates with genuinely different spellings are intentionally left
-- for manual review (see the commented query at the bottom).
--
-- SAFE + IDEMPOTENT: safe to run any number of times. Keep it as a migration
-- file and apply with `supabase db push`, or paste into the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Backfill the keeper row with the best values from its duplicates ────────
with normalized as (
    select id,
           lower(btrim(regexp_replace(test_name, '\s+', ' ', 'g'))) as norm_name
    from public.lab_test_catalog
),
ranked as (
    select n.id,
           n.norm_name,
           row_number() over (
               partition by n.norm_name
               order by
                   t.is_active desc nulls last,
                   (coalesce(t.price, 0) > 0) desc,
                   (nullif(btrim(t.test_code), '') is not null) desc,
                   t.id::text asc
           ) as rn
    from normalized n
    join public.lab_test_catalog t on t.id = n.id
),
best as (
    select r.norm_name,
           (array_agg(t.id order by r.rn))[1] as keeper_id,
           (array_agg(t.price order by r.rn)
               filter (where t.price is not null and t.price <> 0))[1] as best_price,
           (array_agg(t.test_code order by r.rn)
               filter (where nullif(btrim(t.test_code), '') is not null))[1] as best_code,
           (array_agg(t.category order by r.rn)
               filter (where nullif(btrim(t.category), '') is not null))[1] as best_category,
           bool_or(coalesce(t.is_active, false)) as any_active
    from ranked r
    join public.lab_test_catalog t on t.id = r.id
    group by r.norm_name
    having count(*) > 1
)
update public.lab_test_catalog k
set price     = coalesce(nullif(k.price, 0), b.best_price, k.price),
    test_code = coalesce(nullif(btrim(k.test_code), ''), b.best_code, k.test_code),
    category  = coalesce(nullif(btrim(k.category), ''), b.best_category, k.category),
    is_active = (coalesce(k.is_active, false) or coalesce(b.any_active, false))
from best b
where k.id = b.keeper_id;

-- 2. Merge optional text columns that exist on this deployment ───────────────
--    (guarded via information_schema so old schemas without these columns are fine)
do $$
declare
    col text;
    cols text[] := array[
        'description', 'sample_type', 'turnaround_time', 'normal_range',
        'instructions', 'unit', 'icd10_code', 'loinc_code', 'snomed_code'
    ];
begin
    foreach col in array cols loop
        if exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = 'lab_test_catalog'
              and column_name = col
        ) then
            execute format($f$
                with normalized as (
                    select id,
                           lower(btrim(regexp_replace(test_name, '\s+', ' ', 'g'))) as norm_name
                    from public.lab_test_catalog
                ),
                ranked as (
                    select n.id,
                           n.norm_name,
                           row_number() over (
                               partition by n.norm_name
                               order by
                                   t.is_active desc nulls last,
                                   (coalesce(t.price, 0) > 0) desc,
                                   (nullif(btrim(t.test_code), '') is not null) desc,
                                   t.id::text asc
                           ) as rn
                    from normalized n
                    join public.lab_test_catalog t on t.id = n.id
                ),
                best as (
                    select r.norm_name,
                           (array_agg(t.id order by r.rn))[1] as keeper_id,
                           (array_agg(t.%1$I order by r.rn)
                               filter (where nullif(btrim(t.%1$I), '') is not null))[1] as best_val
                    from ranked r
                    join public.lab_test_catalog t on t.id = r.id
                    group by r.norm_name
                    having count(*) > 1
                )
                update public.lab_test_catalog k
                set %1$I = coalesce(nullif(btrim(k.%1$I), ''), b.best_val, k.%1$I)
                from best b
                where k.id = b.keeper_id
            $f$, col);
        end if;
    end loop;
end $$;

-- 3. Delete the duplicate rows (everything except the keeper per name) ───────
with normalized as (
    select id,
           lower(btrim(regexp_replace(test_name, '\s+', ' ', 'g'))) as norm_name
    from public.lab_test_catalog
),
ranked as (
    select n.id,
           row_number() over (
               partition by n.norm_name
               order by
                   t.is_active desc nulls last,
                   (coalesce(t.price, 0) > 0) desc,
                   (nullif(btrim(t.test_code), '') is not null) desc,
                   t.id::text asc
           ) as rn
    from normalized n
    join public.lab_test_catalog t on t.id = n.id
)
delete from public.lab_test_catalog t
using ranked r
where r.rn > 1
  and t.id = r.id;

-- 4. Prevent future duplicates ────────────────────────────────────────────────
create unique index if not exists lab_test_catalog_test_name_unique_idx
    on public.lab_test_catalog (
        lower(btrim(regexp_replace(test_name, '\s+', ' ', 'g')))
    );

analyze public.lab_test_catalog;

-- ─── (Optional) Review near-duplicates that share a name but differ in ways ──
--     the normalisation above does not catch (e.g. "MP" vs "Malaria Parasite").
--     Un-comment and run to list them; reconcile those by hand if needed.
--
-- select test_name, count(*) as n
-- from public.lab_test_catalog
-- group by lower(btrim(test_name))
-- having count(*) > 1
-- order by n desc;
