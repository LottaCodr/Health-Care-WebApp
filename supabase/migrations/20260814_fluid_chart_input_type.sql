-- ═══════════════════════════════════════════════════════════════════════════
-- FLUID BALANCE CHART — input fluid description
--
-- Adds a free-text column so nurses can record WHAT fluid was given in the
-- intake section (e.g. "0.9% Normal Saline", "D5W", "Ringer's Lactate",
-- "water", "formula") rather than only the volume in mL.
--
-- Apply with: supabase db push
-- ═══════════════════════════════════════════════════════════════════════════

-- `fluid_balance` predates this repo's migration history on some deployments,
-- so create it defensively if missing. The columns mirror what the nurse
-- charts service writes/reads (lib/services/nurse-charts.service.ts).
create table if not exists public.fluid_balance (
    id               uuid primary key default gen_random_uuid(),
    patient_id       uuid not null references public.patients(id) on delete cascade,
    record_date      date not null,
    record_time      time not null,
    -- Intake
    oral_ml          integer not null default 0,
    iv_ml            integer not null default 0,
    ng_ml            integer not null default 0,
    other_input_ml   integer not null default 0,
    other_input_type text,
    input_fluid_type text,
    -- Output
    urine_ml         integer not null default 0,
    aspirate_ml      integer not null default 0,
    vomit_ml         integer not null default 0,
    bowel_ml         integer not null default 0,
    drain_ml         integer not null default 0,
    other_output_ml  integer not null default 0,
    signed_by        text,
    notes            text,
    created_at       timestamptz not null default now()
);

create index if not exists idx_fluid_balance_patient_date
    on public.fluid_balance(patient_id, record_date desc, record_time desc);

alter table public.fluid_balance
    add column if not exists input_fluid_type text;

comment on column public.fluid_balance.input_fluid_type is
    'Free-text description of the intake fluid/solution (e.g. 0.9% Normal Saline, D5W, water, NG formula). Recorded by the nurse alongside the volume.';

