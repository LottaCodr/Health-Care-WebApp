-- ─────────────────────────────────────────────────────────────────────────────
-- Lab bill → lab request link.
--
-- Lets a lab price sync find the EXACT bill its request raised — even after the
-- front desk has settled it — instead of fuzzy-matching descriptions. This is
-- what makes "settle before results" and "result after settlement" both safe:
-- a settled bill is recognized and never re-billed in full.
--
-- Text (not uuid): deployments differ on id types, and PostgREST hands ids to
-- the app as strings either way. No FK for the same reason — the app treats a
-- missing/legacy link as "fall back to description matching".
--
-- Idempotent — safe to run multiple times, and the app tolerates the column's
-- absence (inserts fall back to a payload without it; lookups retry without it).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS lab_request_id text;

CREATE INDEX IF NOT EXISTS payments_lab_request_id_idx
    ON public.payments (lab_request_id);
