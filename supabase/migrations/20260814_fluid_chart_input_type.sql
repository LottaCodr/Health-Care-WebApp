-- ═══════════════════════════════════════════════════════════════════════════
-- FLUID BALANCE CHART — input fluid description
--
-- Adds a free-text column so nurses can record WHAT fluid was given in the
-- intake section (e.g. "0.9% Normal Saline", "D5W", "Ringer's Lactate",
-- "water", "formula") rather than only the volume in mL.
--
-- Apply with: supabase db push
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.fluid_balance
    add column if not exists input_fluid_type text;

comment on column public.fluid_balance.input_fluid_type is
    'Free-text description of the intake fluid/solution (e.g. 0.9% Normal Saline, D5W, water, NG formula). Recorded by the nurse alongside the volume.';
