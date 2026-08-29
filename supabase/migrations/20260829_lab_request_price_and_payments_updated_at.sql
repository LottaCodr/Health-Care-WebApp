-- ─────────────────────────────────────────────────────────────────────────────
-- Lab billing fixes
--
-- 1) `lab_requests.price` — the lab tech sets a price when completing a test
--    (updateLabRequest persists it here so the billing logic can read it back).
--    Older databases are missing this column, which made every priced result
--    submission fail with a masked "Server Components render" error.
--
-- 2) `payments.updated_at` — written by the billing engine's primary payloads;
--    the app already tolerates its absence via fallback payloads, but adding
--    the column lets the primary (fully-tracked) payloads succeed.
--
-- Idempotent — safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.lab_requests
    ADD COLUMN IF NOT EXISTS price numeric;

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS updated_at timestamptz;
