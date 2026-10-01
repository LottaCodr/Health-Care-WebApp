-- ═══════════════════════════════════════════════════════════════════════════
-- RADIOLOGY SCAN CATALOG + PREPAID CARE PACKAGES (2026-10-01)
--
-- WHY
--   Radiology had no order entry of its own. Requests could only be created
--   by the Quick Route panel, which offered whatever rows in `lab_test_catalog`
--   happened to contain the word "scan" — usually none — so the radiology
--   doctor could not find anywhere to request a scan, and nothing was ever
--   billed for one. Meanwhile antenatal patients are registered on a PREPAID
--   package whose price already includes their scans, so charging them per
--   scan double-bills a service the hospital has already been paid for.
--
-- WHAT THIS ADDS
--   1. `radiology_scan_catalog` — the scans the unit actually performs, with
--      their prices. Seeded with the two current services (Pelvic Scan and
--      Transvaginal Scan, ₦23,000 each). Admin can reprice or add rows
--      without a deploy; `lib/utils/radiology-catalog.ts` holds the same two
--      as an in-code fallback so the UI still works on an unmigrated DB.
--
--   2. `care_packages` + `care_package_items` — a prepaid bundle (the antenatal
--      package) and the entitlements it carries. An item row with
--      `item_name IS NULL` means "ANY item of that kind", and
--      `included_quantity IS NULL` means "unlimited while the enrolment is
--      active". This is the standard entitlement model used by clinic billing
--      systems: the patient buys the package once, and the services consumed
--      from it are recorded at zero charge with a package marker.
--
--   3. `patient_package_enrolments` — one row per patient per package purchase
--      (status / validity window / amount prepaid at the desk).
--
--   4. `package_usage` — append-only ledger of what was consumed from an
--      enrolment, carrying `value_kobo` (what the service WOULD have cost).
--      Package-covered services deliberately do NOT get a row in `payments`:
--      that is what keeps them out of the patient's bill and out of the
--      outstanding total, while this ledger keeps the value visible for
--      reporting. Deleting rows here is not permitted (Admin only).
--
--   5. `lab_requests.billing_status` + `lab_requests.package_enrolment_id` —
--      how each radiology order was settled:
--        'billed'        → a pending `payments` row was raised for it
--        'covered'       → paid for by a care package; NO bill was raised
--        'not_billable'  → free/complimentary by decision (reserved)
--      These are WORKFLOW columns, so they are intentionally absent from the
--      `trg_amendment_window` content lists in
--      20260908_record_amendment_window.sql — locking them would stall the
--      billing chain for no integrity gain (same reasoning as price/status).
--
-- APPLY WITH: supabase db push   (or run this file in the SQL editor)
-- Idempotent — safe to run multiple times. Seed rows never overwrite an
-- existing catalog row, so an Admin's price edit survives a re-run.
--
-- DEPENDS ON 20260814_enable_rls_security.sql for the `is_staff()`,
-- `staff_has_role()` and `staff_can()` helpers used by the policies below
-- (the same dependency 20260814_emr_modules_schema.sql has). Apply that one
-- first if the database predates it.
--
-- `patients.id` is uuid here, matching the newest table-creating migrations
-- (20260914_ivf_specialist_clinic.sql). `lab_request_id` is text with no FK,
-- matching 20260923_payments_lab_request_id.sql, because lab_requests id types
-- differ between deployments.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Radiology scan catalog ───────────────────────────────────────────────
create table if not exists public.radiology_scan_catalog (
    id            uuid primary key default gen_random_uuid(),
    code          text not null unique,
    scan_name     text not null,
    short_name    text,
    description   text,
    modality      text,
    -- NGN, matching lab_test_catalog.price / lab_requests.price (numeric).
    price         numeric not null default 0,
    -- Comma-separated alternate spellings, so "TVS", "trans vaginal scan" and
    -- "transvaginal ultrasound" all resolve to the same priced service.
    aliases       text,
    sort_order    int not null default 100,
    is_active     boolean not null default true,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists radiology_scan_catalog_active_idx
    on public.radiology_scan_catalog (is_active, sort_order);

insert into public.radiology_scan_catalog
    (code, scan_name, short_name, description, modality, price, aliases, sort_order)
values
    ('PELVIC', 'Pelvic Scan', 'Pelvic',
     'Transabdominal pelvic ultrasound — uterus, ovaries, adnexa and pelvic collection.',
     'Ultrasound', 23000,
     'pelvic ultrasound,pelvis scan,abdominal pelvic scan,pelvic uss,pelvic scan (transabdominal)',
     10),
    ('TVS', 'Transvaginal Scan (TVS)', 'TVS',
     'Transvaginal ultrasound — early pregnancy, viability, endometrium and adnexa.',
     'Ultrasound', 23000,
     'transvaginal scan,trans vaginal scan,tvs,transvaginal ultrasound,vaginal scan,tv scan',
     20)
on conflict (code) do nothing;

-- ── 2. Care packages (prepaid bundles) ──────────────────────────────────────
create table if not exists public.care_packages (
    id            uuid primary key default gen_random_uuid(),
    code          text not null unique,
    name          text not null,
    description   text,
    department    text,
    -- Package price in NGN. NULL = the amount is entered at the desk when the
    -- patient is enrolled (the antenatal package is priced per patient).
    price         numeric,
    -- How long an enrolment stays active, in days. NULL = no expiry.
    validity_days int,
    is_active     boolean not null default true,
    sort_order    int not null default 100,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create table if not exists public.care_package_items (
    id                uuid primary key default gen_random_uuid(),
    package_id        uuid not null references public.care_packages(id) on delete cascade,
    item_kind         text not null default 'radiology_scan'
                      check (item_kind in ('radiology_scan','lab_test','pharmacy','consultation','procedure','other')),
    -- NULL = ANY item of this kind is covered (e.g. any ultrasound scan).
    item_name         text,
    -- NULL = unlimited while the enrolment is active.
    included_quantity int check (included_quantity is null or included_quantity > 0),
    -- Optional per-item value, for reporting what the package is worth.
    price_included    numeric,
    notes             text,
    created_at        timestamptz not null default now()
);

create index if not exists care_package_items_package_idx
    on public.care_package_items (package_id);

-- The antenatal package. Price is left NULL on purpose: the desk records what
-- each patient actually prepaid. Three scans are included — the WHO minimum is
-- one ultrasound before 24 weeks, and private antenatal packages conventionally
-- cover dating/viability, anomaly and growth scans. Edit included_quantity
-- here (or in the Admin UI) to change the allowance; no deploy needed.
insert into public.care_packages (code, name, description, department, price, validity_days, sort_order)
values (
    'ANTENATAL',
    'Antenatal Care Package',
    'Prepaid antenatal care. Ultrasound scans requested during the enrolment are covered by the package and are NOT billed again at the front desk.',
    'Obstetrics',
    null,
    365,
    10
)
on conflict (code) do nothing;

insert into public.care_package_items (package_id, item_kind, item_name, included_quantity, price_included, notes)
select p.id, 'radiology_scan', null, 3, null,
       'Any ultrasound scan (Pelvic Scan or TVS) while the enrolment is active.'
from public.care_packages p
where p.code = 'ANTENATAL'
  and not exists (
      select 1 from public.care_package_items i
      where i.package_id = p.id and i.item_kind = 'radiology_scan'
  );

-- ── 3. Enrolments ───────────────────────────────────────────────────────────
create table if not exists public.patient_package_enrolments (
    id            uuid primary key default gen_random_uuid(),
    patient_id    uuid not null references public.patients(id) on delete cascade,
    package_id    uuid not null references public.care_packages(id) on delete restrict,
    enrolled_by   text,
    enrolled_at   timestamptz not null default now(),
    starts_on     date not null default current_date,
    -- NULL = the package does not expire.
    expires_on    date,
    status        text not null default 'active'
                  check (status in ('active','completed','cancelled')),
    -- What the patient prepaid for the package, in NGN.
    amount_paid   numeric,
    receipt_no    text,
    notes         text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists package_enrolments_patient_idx
    on public.patient_package_enrolments (patient_id, status);
create index if not exists package_enrolments_package_idx
    on public.patient_package_enrolments (package_id);

-- ── 4. Usage ledger (append-only) ───────────────────────────────────────────
create table if not exists public.package_usage (
    id              uuid primary key default gen_random_uuid(),
    enrolment_id    uuid not null references public.patient_package_enrolments(id) on delete cascade,
    patient_id      uuid not null references public.patients(id) on delete cascade,
    item_kind       text not null default 'radiology_scan',
    item_name       text not null,
    quantity        int not null default 1,
    -- What the service would have cost if it had been billed — the figure
    -- reporting needs, since no `payments` row exists for covered services.
    value_kobo      bigint not null default 0,
    -- Text (not uuid) with no FK, mirroring payments.lab_request_id: id types
    -- differ between deployments and PostgREST hands ids over as strings.
    lab_request_id  text,
    recorded_by     text,
    notes           text,
    created_at      timestamptz not null default now()
);

create index if not exists package_usage_enrolment_idx
    on public.package_usage (enrolment_id, item_kind);
create index if not exists package_usage_patient_idx
    on public.package_usage (patient_id);

-- ── 5. How a radiology order was settled ────────────────────────────────────
alter table public.lab_requests
    add column if not exists billing_status text not null default 'billed';

alter table public.lab_requests
    add column if not exists package_enrolment_id text;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'lab_requests_billing_status_chk'
          and conrelid = 'public.lab_requests'::regclass
    ) then
        alter table public.lab_requests
            add constraint lab_requests_billing_status_chk
            check (billing_status in ('billed','covered','not_billable'));
    end if;
end
$$;

create index if not exists lab_requests_package_enrolment_idx
    on public.lab_requests (package_enrolment_id)
    where package_enrolment_id is not null;

create index if not exists lab_requests_radiology_billing_idx
    on public.lab_requests (status, billing_status)
    where test_type like '[RADIOLOGY]%';

-- ── Row-Level Security ──────────────────────────────────────────────────────
-- Same conventions as 20260814_emr_modules_schema.sql: staff read, the owning
-- department writes, Admin deletes. `staff_can()` already lets Admin through.

alter table public.radiology_scan_catalog enable row level security;
drop policy if exists "radiology catalog select staff" on public.radiology_scan_catalog;
create policy "radiology catalog select staff" on public.radiology_scan_catalog
  for select to authenticated using (public.is_staff());
drop policy if exists "radiology catalog write admin" on public.radiology_scan_catalog;
create policy "radiology catalog write admin" on public.radiology_scan_catalog
  for insert to authenticated with check (public.staff_can('Radiologist') or public.staff_has_role('Admin'));
drop policy if exists "radiology catalog update admin" on public.radiology_scan_catalog;
create policy "radiology catalog update admin" on public.radiology_scan_catalog
  for update to authenticated
  using (public.staff_can('Radiologist') or public.staff_has_role('Admin'))
  with check (public.staff_can('Radiologist') or public.staff_has_role('Admin'));
drop policy if exists "radiology catalog delete admin" on public.radiology_scan_catalog;
create policy "radiology catalog delete admin" on public.radiology_scan_catalog
  for delete to authenticated using (public.staff_has_role('Admin'));

alter table public.care_packages enable row level security;
drop policy if exists "care packages select staff" on public.care_packages;
create policy "care packages select staff" on public.care_packages
  for select to authenticated using (public.is_staff());
drop policy if exists "care packages write admin" on public.care_packages;
create policy "care packages write admin" on public.care_packages
  for insert to authenticated with check (public.staff_has_role('Admin'));
drop policy if exists "care packages update admin" on public.care_packages;
create policy "care packages update admin" on public.care_packages
  for update to authenticated
  using (public.staff_has_role('Admin')) with check (public.staff_has_role('Admin'));
drop policy if exists "care packages delete admin" on public.care_packages;
create policy "care packages delete admin" on public.care_packages
  for delete to authenticated using (public.staff_has_role('Admin'));

alter table public.care_package_items enable row level security;
drop policy if exists "care package items select staff" on public.care_package_items;
create policy "care package items select staff" on public.care_package_items
  for select to authenticated using (public.is_staff());
drop policy if exists "care package items write admin" on public.care_package_items;
create policy "care package items write admin" on public.care_package_items
  for insert to authenticated with check (public.staff_has_role('Admin'));
drop policy if exists "care package items update admin" on public.care_package_items;
create policy "care package items update admin" on public.care_package_items
  for update to authenticated
  using (public.staff_has_role('Admin')) with check (public.staff_has_role('Admin'));
drop policy if exists "care package items delete admin" on public.care_package_items;
create policy "care package items delete admin" on public.care_package_items
  for delete to authenticated using (public.staff_has_role('Admin'));

-- Enrolments: the front desk sells packages; doctors need to see them so they
-- know a scan will not be billed.
alter table public.patient_package_enrolments enable row level security;
drop policy if exists "package enrolments select staff" on public.patient_package_enrolments;
create policy "package enrolments select staff" on public.patient_package_enrolments
  for select to authenticated using (public.is_staff());
drop policy if exists "package enrolments insert frontdesk" on public.patient_package_enrolments;
create policy "package enrolments insert frontdesk" on public.patient_package_enrolments
  for insert to authenticated with check (public.staff_can('FrontDesk'));
drop policy if exists "package enrolments update frontdesk" on public.patient_package_enrolments;
create policy "package enrolments update frontdesk" on public.patient_package_enrolments
  for update to authenticated
  using (public.staff_can('FrontDesk')) with check (public.staff_can('FrontDesk'));
drop policy if exists "package enrolments delete admin" on public.patient_package_enrolments;
create policy "package enrolments delete admin" on public.patient_package_enrolments
  for delete to authenticated using (public.staff_has_role('Admin'));

-- Usage: appended by whoever creates the covered order (doctor, front desk or
-- radiologist). No update policy at all — a consumed allowance is a fact.
alter table public.package_usage enable row level security;
drop policy if exists "package usage select staff" on public.package_usage;
create policy "package usage select staff" on public.package_usage
  for select to authenticated using (public.is_staff());
drop policy if exists "package usage insert clinical" on public.package_usage;
create policy "package usage insert clinical" on public.package_usage
  for insert to authenticated
  with check (public.staff_can('Doctor') or public.staff_can('FrontDesk') or public.staff_can('Radiologist'));
drop policy if exists "package usage delete admin" on public.package_usage;
create policy "package usage delete admin" on public.package_usage
  for delete to authenticated using (public.staff_has_role('Admin'));

-- ── Realtime ────────────────────────────────────────────────────────────────
-- `alter publication … add table` is not idempotent on its own, so guard it.
do $$
begin
    if to_regclass('pg_publication') is not null
       and exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        if not exists (
            select 1 from pg_publication_tables
            where pubname = 'supabase_realtime' and tablename = 'patient_package_enrolments'
        ) then
            alter publication supabase_realtime add table public.patient_package_enrolments;
        end if;
        if not exists (
            select 1 from pg_publication_tables
            where pubname = 'supabase_realtime' and tablename = 'package_usage'
        ) then
            alter publication supabase_realtime add table public.package_usage;
        end if;
    end if;
exception when others then
    -- Realtime is a convenience, never a blocker for the schema itself.
    raise notice 'realtime publication not updated: %', sqlerrm;
end
$$;

-- ── Notes for the app layer ─────────────────────────────────────────────────
-- • lib/services/radiology.service.ts resolves the scan against
--   radiology_scan_catalog, checks coverage with
--   lib/services/care-packages.service.ts, and only then raises a bill.
-- • The service inserts with candidate payloads (with → without the new
--   lab_requests columns), so an unmigrated database still creates the request
--   instead of failing with PGRST204.
-- • Verified by: npm run check:radiology (scripts/check-radiology-billing.cjs).
