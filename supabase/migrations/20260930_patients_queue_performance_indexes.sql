-- ═══════════════════════════════════════════════════════════════════════════
-- PATIENT QUEUE PERFORMANCE INDEXES
--
-- Nurses reported that it had become slow to see patients front desk just
-- forwarded to them ("Sent to Nurse"). Two compounding causes:
--
--   1. App-side: every queue page (nurse, doctor, lab, pharmacy, radiology)
--      always downloaded the ENTIRE `patients` table and filtered/counted by
--      status in the browser, instead of asking the database for just the
--      status that mattered — fixed in the app (see
--      `getPatientStatusCounts` / `usePatientsByStatus` / the queue's
--      per-role default tab).
--
--   2. DB-side: even the server-side `status`-filtered queries
--      (`listPatientsByStatus`, now used for every queue tab) had no index
--      to lean on, so `WHERE status = ... ORDER BY created_at, id` degraded
--      into a full sequential scan + sort as the table grew — every patient
--      ever registered had to be read to find the handful currently
--      "sent-to-nurse". These indexes make that filter + ordering (and the
--      per-status counts driving the tab badges) index-only lookups instead.
-- ═══════════════════════════════════════════════════════════════════════════

-- Queue tabs: WHERE status = ? ORDER BY created_at, id  (and the
-- `count: exact, head: true` per-status badge counts).
create index if not exists idx_patients_status_created_at
    on public.patients (status, created_at, id);

-- Dashboard "New Arrivals" / registry ordering: WHERE created_at >= ?
-- ORDER BY created_at [, id].
create index if not exists idx_patients_created_at
    on public.patients (created_at, id);
