-- ─────────────────────────────────────────────────────────────────────────────
-- PAYMENT SETTLEMENT STAMPS (2026-09-23)
--
-- The payment history must show, for every settled bill, the moment it was
-- settled — taken from the database, never reconstructed in the browser.
--
-- The billing engine already writes these stamps on every settlement
-- (confirmPayment, settle-all, deposit credit, deposits):
--
--   processed_date  when money was last received toward the bill — written on
--                   EVERY settlement (full, part payment, deposit credit)
--   paid_at         when the bill became fully paid
--
-- This migration makes that guarantee a property of the DATABASE, not just of
-- today's application code:
--
--   1. Ensures both columns exist as timestamptz (older deployments may be
--      missing them; the app's fallback payloads tolerate that, but then the
--      settlement time is never recorded at all).
--   2. A BEFORE INSERT OR UPDATE trigger fills either stamp with now() the
--      moment a row reaches a settled status WITHOUT one. It only ever fills
--      NULL stamps — it never overwrites a time the application provided, so
--      the app remains the source of truth and existing data is untouched.
--
-- Rows settled before these columns existed carry no settlement time anywhere
-- in the database; nothing here invents one for them (the UI shows the
-- bill-raised time, clearly labelled, instead).
--
-- Idempotent — safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Columns ──────────────────────────────────────────────────────────────────
alter table public.payments
    add column if not exists processed_date timestamptz;

alter table public.payments
    add column if not exists paid_at timestamptz;

-- 2) Safety-net stamping ──────────────────────────────────────────────────────
create or replace function public.stamp_payment_settlement()
returns trigger
language plpgsql
volatile
set search_path = public
as $$
declare
  v_status text := lower(btrim(coalesce(new.status, '')));
begin
  -- Settled = money received (paid / partial) or the bill closed another way
  -- (waived / refunded). Legacy rows may carry the capitalized variants.
  if v_status in ('paid', 'completed', 'partial', 'waived', 'refunded') then
    if new.processed_date is null then
      new.processed_date := now();
    end if;
    if v_status in ('paid', 'completed') and new.paid_at is null then
      new.paid_at := now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payments_stamp_settlement on public.payments;
create trigger trg_payments_stamp_settlement
before insert or update of status on public.payments
for each row
execute function public.stamp_payment_settlement();
