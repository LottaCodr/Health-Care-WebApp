-- ─────────────────────────────────────────────────────────────────────────────
-- Billing workflow extensions (full / partial / deposit payments, discounts,
-- auto-identified payer, deposit credit accounting).
--
-- Idempotent — safe to run multiple times. The application tolerates the
-- absence of these columns (it falls back to a compatible payload), but the
-- features below are only fully tracked once this migration has been applied.
-- ─────────────────────────────────────────────────────────────────────────────

-- 0) Bill category — required by billing filters / deposit credit
--    ('consultation' | 'lab' | 'radiology' | 'pharmacy' | 'procedure' |
--     'admission' | 'deposit' | 'other'). Older payments tables never had
--     this column; the index below will fail with 42703 unless we add it first.
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS category text DEFAULT 'other';

-- 1) Payment type: 'full' | 'partial' | 'deposit'
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS payment_type text;

-- 2) Discounts (stored in kobo; percent / flat kept for audit)
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS discount_kobo bigint DEFAULT 0;
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS discount_percent numeric(5, 2);
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS discount_amount_kobo bigint DEFAULT 0;

-- 3) Payer auto-identified from registration: 'private' | 'hmo' | 'company'
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS payer text;
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS payer_reference text;   -- HMO name / company name
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS payer_code text;        -- authorization / claim / corporate code

-- 4) Deposit accounting: how much of a deposit row has been applied to bills
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS applied_kobo bigint DEFAULT 0;

-- Indexes for common billing queries
CREATE INDEX IF NOT EXISTS payments_patient_id_idx ON public.payments (patient_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status);
CREATE INDEX IF NOT EXISTS payments_category_idx ON public.payments (category);
CREATE INDEX IF NOT EXISTS payments_payment_type_idx ON public.payments (payment_type);
