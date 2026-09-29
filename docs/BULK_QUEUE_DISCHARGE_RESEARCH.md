# Research — Bulk "Awaiting Consultation → Discharged" Action

**Request:** the admin wants a button that converts **all and/or individual** patients in
"awaiting consultation" to "discharged".

**Question:** what is the best way to implement this in this codebase — and is there a
better alternative?

> **Status: implemented (v1).** `closeConsultationQueue` (server action),
> `useCloseConsultationQueue` (hook), `components/admin/QueueClosePanel.tsx` (admin
> dashboard panel with per-row / selected / queue-wide discharge + confirmation dialog),
> and batched realtime toasts (`hooks/use-realtime.ts`). Phase 2 items below remain
> recommendations.

**TL;DR — recommendation:**

1. **Do not ship a one-click "discharge everyone" button.** Ship a **"Close queue"** action:
   per-row **Discharge** buttons + checkbox **"Discharge selected (n)"** + a guarded
   **"Discharge all in queue (n)"** behind a confirmation dialog that shows the exact
   names/count and **requires a reason**.
2. Implement it as **one atomic server action** that only flips rows *still*
   `awaiting-consultation` (never a client-side loop of single updates), with a single
   batch **audit entry**.
3. Keep the status value `discharged` (it is wired through ~15 UI surfaces already), but
   capture a **reason taxonomy** (`left without being seen`, `queue closed`, `registered in
   error`, `referred elsewhere`, `other`) in the audit trail so analytics can tell an
   administrative queue-close apart from a real, billing-cleared discharge.
4. **Phase 2 (better alternative, recommended for later):** a distinct terminal status
   (e.g. `left-without-being-seen`) so "discharged" keeps its clinical/billing meaning and
   the clinic gains a standard LWBS/no-show KPI.

---

## 1. What "awaiting consultation" and "discharged" mean *in this app*

### The status machine

`PatientStatus` in `types/models.ts` is the single source of truth for a patient's journey:

```
registered → awaiting-consultation → under-consultation → sent-to-* / awaiting-payment → discharged
                                                                                          ↑
                                                                     (today only reached from
                                                                      awaiting-payment, or set
                                                                      explicitly in forms)
```

- `lib/patient-status-utils.ts` documents the *intended* transition rules (currently
  commented out): `AwaitingConsultation → UnderConsultation` only, and `Discharged` is
  reached from `AwaitingPayment`. A direct `awaiting-consultation → discharged` jump is
  **outside the designed state machine** — it is a queue-hygiene/administrative override,
  not a clinical transition.
- `patients.status` is **free text in Postgres** (no CHECK constraint) — the enum is
  app-level. Nothing in the DB will reject the jump; the app is the only guard.

### How patients become "discharged" today

| Path | Where | Precondition |
|---|---|---|
| Billing auto-discharge | `lib/services/payment.service.ts` → `dischargeIfBillingCleared()` / `settleAllPendingBills()` | status must be `awaiting-payment`, no outstanding bills |
| Ward discharge | `lib/services/admission.service.ts` → `dischargeFromWard()` | admission ends → patient goes to `awaiting-payment` (not `discharged`) |
| Manual status set | consultation form, `doctor/health-record` status select, `DischargeNoteForm` → `awaiting-payment` | free selection in forms |

So **everywhere in the live code, `discharged` means "visit finished and billing cleared"**.
The only automated writers of `status = 'discharged'` both check for
`awaiting-payment` first and (for bulk settlement) even skip patients who still have
outstanding bills. The requested button would be the **first** path that writes
`discharged` without touching billing at all.

### What "discharged" feeds in the UI/reporting

- `components/front-desk/DashBoardComponent.tsx` — **"Recently Discharged"** panel with
  quick re-admit/return-visit actions. Bulk-closed queue entries will surface here as if
  they had completed treatment.
- `components/patients/index.tsx` — the "Discharged" tab count (front desk / doctor /
  nurse patient lists).
- `lib/services/reporting.service.ts` — **good news:** revenue and discharge-rate reports
  key off `payments` and `patient_admissions.discharged_at`, **not** `patients.status`, so
  bulk-closing the queue will not corrupt billing/duration statistics.
- `lib/services/process-return-visit.service.ts` — return-visit history uses
  `patient_readmissions` / `discharge_notes` / `patient_admissions`, so a future return
  visit is unaffected by how the previous status ended.
- Record amendment windows (`lib/records/registry.ts`) deliberately **exclude workflow
  columns like `status`** — the bulk action will not trip the 24-hour edit freeze.

**Conclusion:** the blast radius is smaller than it looks (queues + a couple of panels),
but the *semantic* collision with "billing-cleared discharge" is real and is the main thing
the design must address.

---

## 2. Patterns already in the codebase (what to reuse)

| Concern | Existing pattern | Reuse for this feature |
|---|---|---|
| Authorization | `requireStaff([...roles])` in `lib/services/auth-guard.ts`; **Admin always passes** | `requireStaff([UserRole.Admin])` — admin-only, explicit |
| Single status change | `patient.service.ts#updatePatientStatus` + `PATIENT_STATUS_CHANGED` audit | Keep for individual moves; add a bulk sibling |
| Audit trail | `audit.service.ts#logAction(action, entityType, entityId, changes)` — actor derived from session, PHI-minimised payloads | One `QUEUE_CLOSED` batch entry with ids + reason + actor |
| Client mutation | `hooks/emr/use-patients.ts#useUpdatePatientStatus` — optimistic single-row, invalidates `patientKeys.lists()` | New `useCloseConsultationQueue` mutation (no optimistic update for bulk) |
| Query keys | `patientKeys.lists() = ["patients","list"]`; `byStatus` keys are nested under it | One `invalidateQueries({ queryKey: patientKeys.lists() })` refreshes every queue |
| UI conventions | shadcn Dialog + `sonner` toasts + the card/row styling of `QueueSuite` / admin dashboard | Confirm dialog + success toast with `closed / skipped` counts |
| Error surfacing | Server actions **return** `{ ok:false, message }` (Next.js redacts thrown messages) — see `createPatient` | Same result-type contract for the bulk action |
| Realtime | `hooks/use-realtime.ts` invalidates lists on `patients` UPDATE **and fires a toast per row** for role-relevant statuses (FrontDesk: `discharged`) | ⚠️ bulk ops will toast-storm front-desk screens — see §5 |

---

## 3. Options considered

### Option A — Client-side loop of `updatePatientStatus` ("just add a button")

The admin button iterates the list and awaits the existing single-row action per patient.

- ✅ No new backend; per-row audit for free.
- ❌ N server round-trips (a clinic queue can be 50–200 rows); **partial failure** leaves a
  half-closed queue with no rollback; N audit rows; no way to report "2 were skipped";
  races with doctors are per-row and uncoordinated.
- **Verdict: reject** for "all"; acceptable only as a stopgap for single patients (which is
  just the existing `useUpdatePatientStatus`).

### Option B — Atomic bulk server action (recommended core)

One server action that performs **one set-based UPDATE guarded by status**:

```sql
update patients set status = 'discharged', updated_at = now()
 where id = any(:ids) and status = 'awaiting-consultation'
returning id, hospital_number;
```

- ✅ Atomic per statement — the guard means a doctor who *just* started a consultation is
  never clobbered (their row no longer matches `awaiting-consultation` and simply doesn't
  transition — report it as "skipped", not an error).
- ✅ One round-trip, exact `closed`/`skipped` accounting via `RETURNING`, one audit entry.
- ✅ Matches house style: Supabase server client inside `lib/services`, no new
  infrastructure. (A Postgres RPC/function would also work but adds nothing the guarded
  UPDATE doesn't already give us; reserve RPCs for Phase 2's history trigger.)
- ❌ Still writes the overloaded `discharged` status — mitigated by the reason taxonomy.

### Option C — Distinct terminal status (e.g. `left-without-being-seen`) — the *better alternative*, phase 2

The honest model: **"left without being seen / no-show / closed" is not "discharged"**.
LWBS is a standard outpatient/ED KPI; conflating it with completed visits distorts clinical
and operational reporting *as the reporting module grows*.

- ✅ Cleanest semantics; "Recently Discharged" panel stays honest; future discharge
  analytics stay honest; the reason taxonomy of Option B becomes the status itself.
- ❌ Touches every status-map in the app (`STATUS_STYLES`, `STATUS_CHIP`, `STATUS_CONFIG`,
  `emr-ui.tsx`, `components/emr/StatusBadge.tsx`, `doctor/health-record` select,
  `patients/index.tsx` tabs, `hooks/use-realtime.ts` role routes, dashboards…), plus enum
  and any import/UI copy. Realistically a day of careful but mechanical work.
- **Verdict: right long-term direction, wrong first step** — ship B now with reasons so the
  distinction is *recorded*; migrate reasons → status later if the clinic wants the KPI.

### Option D — Scheduled "end-of-day sweep" (pg_cron) instead of a button

Auto-close stale `awaiting-consultation` rows at clinic close.

- ✅ Zero admin effort; solves the real underlying need ("don't let the queue rot").
- ❌ No cron infrastructure exists in this repo (Supabase pg_cron would be new); implicit
  behaviour surprises staff; can't express "individual"; a sweep still needs the same
  guarded action + audit underneath.
- **Verdict: nice complement, not a substitute.** The same server action can later be
  invoked by a scheduled job with `reason: "queue-closed"`.

---

## 4. Recommended design (Option B, shaped like Option C's future)

### 4.1 Server action — `closeConsultationQueue` (in `lib/services/patient.service.ts`)

```ts
export type QueueCloseReason =
    | "left-without-being-seen"   // patient never got seen and left
    | "queue-closed"              // end-of-session sweep
    | "registered-in-error"       // duplicate / bad registration
    | "referred-elsewhere"        // redirected before consult
    | "other";

export type QueueCloseResult =
    | {
          ok: true;
          closed: { id: string; hospital_number: string | null }[];
          skipped: { id: string; status: string }[]; // moved on while the dialog was open
      }
    | { ok: false; message: string };

export async function closeConsultationQueue(input: {
    patientIds?: string[];   // omit ⇒ everyone currently awaiting-consultation
    reason: QueueCloseReason;
    note?: string;           // required-ish when reason === "other"
}): Promise<QueueCloseResult> {
    const actor = await requireStaff([UserRole.Admin]);   // admin-only, explicit
    // validate reason against the taxonomy; cap patientIds at ~500; trim note
    // 1) resolve targets:  .select("id, hospital_number, status")
    //                      .eq("status", "awaiting-consultation") [.in("id", ids)]
    // 2) guarded UPDATE … .eq("status","awaiting-consultation").select("id, hospital_number")
    // 3) skipped = targets − updated (they changed status between 1 and 2)
    // 4) logAction("QUEUE_CLOSED", "patients", batchId, {
    //        from: "awaiting-consultation", to: "discharged",
    //        reason, note, count, patient_ids, actor: actor.userId })   // no names (PHI)
    // 5) return { ok: true, closed, skipped }
}
```

Design points baked in (each maps to a risk in §5):

- **Guarded transition** — the `.eq("status", "awaiting-consultation")` predicate is
  applied to the UPDATE itself, not just the pre-read. Concurrent consultation starts are
  *impossible* to clobber.
- **Result type, not thrown errors** — mirrors `createPatient`'s documented contract
  (Next.js redacts thrown Server-Action messages).
- **Reason required** — this is what preserves the LWBS-vs-discharged distinction until
  Phase 2, and what makes the audit entry meaningful.
- **One batch audit entry** with the id list (hospital numbers/ids only — follows the
  `PATIENT_RECORD_UPDATED` minimisation convention), plus the actor and reason. The admin
  audit page (`/admin/audit`) then answers "who closed the queue, when, why, and whom".
- **Individual case:** same action with `patientIds: [id]` — one code path, one audit
  story, and it already returns "skipped" honestly.

### 4.2 Client hook — `useCloseConsultationQueue` (`hooks/emr/use-patients.ts`)

```ts
export function useCloseConsultationQueue() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: PatientService.closeConsultationQueue,
        onSuccess: () => qc.invalidateQueries({ queryKey: patientKeys.lists() }),
        // NO optimistic update for bulk — the guarded server result is the truth
    });
}
```

`patientKeys.lists()` is the prefix of every `byStatus` key, so one invalidation refreshes
the admin dashboard stats, front-desk queues, and doctor queue.

### 4.3 UI — "Queue close" controls (admin)

Primary home: the **admin dashboard's "Awaiting Consultation" panel** (today it is only a
stat card linking to `/doctor/dashboard` — which, per `proxy.ts`, admins *can* open, but it
is a doctor's workspace, not an admin control surface). Two placements, in order of value:

1. **Dedicated panel on `/admin/dashboard`** (or a small `/admin/queue` page): the live
   awaiting-consultation list rendered like `QueueSuite`'s rows, each with a **Discharge**
   button; header with checkbox **Select all** → **"Discharge selected (n)"** and a
   secondary **"Close queue for today (n)"**.
2. Optionally mirror the per-row button into `components/patients/index.tsx`'s Awaiting
   tab later (front desk asked for it too, likely).

**Confirmation dialog (always shown — both for one row and for all):**

- Heading: `Discharge N patients from the consultation queue?`
- Body: name list (first ~8, then "+N more"), each with hospital number.
- **Reason select (required)** from the taxonomy + optional note.
- Explicit warning line: *"These patients were never seen by a doctor. This closes their
  visit without a consultation and does not create bills or discharge notes."*
- For the "all" variant: a second, deliberate confirm — e.g. a checkbox
  *"I understand this closes the queue for everyone listed"* — before the red button
  enables.
- On success: toast `12 discharged from queue · 2 skipped (already in consultation)`.

### 4.4 Guard rails / policy decisions to encode

| Edge case | Policy |
|---|---|
| Doctor starts consultation while dialog is open | Guarded UPDATE → row skipped, reported, never clobbered |
| Patient is `under-consultation`, `admitted`, `awaiting-payment`, … | Out of scope — action *only* touches `awaiting-consultation` |
| Unpaid registration fees | Deliberately untouched (bulk close is not a billing operation). If the clinic charges at registration, the reason taxonomy makes these rows findable; a follow-up can flag them for billing |
| Discharge notes | Never auto-created — you cannot write a clinical summary for a visit that never happened |
| Return visits later | Unaffected (`process-return-visit.service.ts` reads `patient_readmissions` / `discharge_notes` / `patient_admissions`) |
| RLS | `patients update staff` already permits staff updates; the app-layer `requireStaff([Admin])` is the real gate (house convention) |
| Audit PHI | ids / hospital numbers / reason / actor — no names, no notes beyond the free-text the admin typed |

---

## 5. Known side effects & risks (with mitigations)

1. **Realtime toast storm.** `hooks/use-realtime.ts` fires `toast.info(\`${name} → discharged\`)`
   for every `patients` UPDATE when FrontDesk staff are online. A 100-row close = 100
   toasts on every front-desk screen.
   *Mitigation (small, worth doing in the same PR):* debounce/dedupe these toasts (e.g.
   batch toasts within a 3-second window: *"8 patients → discharged"*), or suppress
   per-row toasts when `payload.old.status === payload.new.status` is not the case… i.e.
   simply group them. The query invalidation itself is fine and should stay.
2. **Semantic collision ("discharged" ≠ seen).** Mitigated by reason taxonomy now, and by
   Option C later. Until then, front desk's "Recently Discharged" panel will mix real
   discharges with queue-closes — acceptable short-term because that panel is used for
   quick return-visit registration, which works regardless.
3. **"All" is scary.** Mitigated by: count + names in the dialog, required reason, second
   confirm, and the status guard making the operation safe *even if* the list is stale.
   An optional `createdBefore` cutoff ("only sweep arrivals before 16:00") can be added
   cheaply since the action resolves targets server-side.
4. **Bulk via Server Action payload size.** 500 UUIDs ≈ 18 KB — fine. Cap the list
   server-side anyway and prefer `patientIds` omitted ("everyone currently awaiting") for
   the true "all" case so the payload is tiny and the server picks the final target set.
5. **No test runner in the repo.** Verification = `tsc --noEmit`, `npm run lint`, and a
   manual checklist (below).

---

## 6. Implementation plan (est. ~1 focused PR)

| Step | File(s) | Work |
|---|---|---|
| 1 | `lib/services/patient.service.ts` | `closeConsultationQueue` + `QueueCloseReason` types (guarded UPDATE, batch audit, result contract) |
| 2 | `hooks/emr/use-patients.ts` | `useCloseConsultationQueue` mutation |
| 3 | `components/admin/QueueClosePanel.tsx` (new) | list + per-row Discharge + select-all + "Close queue (n)" + confirm dialog |
| 4 | `components/admin/DashboardComponent.tsx` | mount the panel under the "Awaiting Consultation" stat (or link to `/admin/queue`) |
| 5 | `hooks/use-realtime.ts` | debounce/dedupe patient-status toasts |
| 6 | (optional) `supabase/migrations/…_patient_status_events.sql` | append-only `patient_status_events` (patient_id, from, to, reason, actor, batch_id) written by a trigger — future-proof audit that survives log pruning; **not required for v1** |
| 7 | manual QA | see checklist |

**Manual QA checklist**

- [ ] Single row: Discharge → confirm dialog → reason required → row leaves queue,
      appears in Discharged tab; audit entry exists.
- [ ] "Close queue (n)": confirm shows correct count/names; all rows leave; one
      `QUEUE_CLOSED` audit entry with ids + reason.
- [ ] Race test: open dialog, start a consultation in another session, confirm → patient
      reported as *skipped*, still `under-consultation`.
- [ ] Non-admin session cannot call the action (server returns FORBIDDEN).
- [ ] FrontDesk screen toasts are grouped during a bulk close.
- [ ] `tsc --noEmit` + `npm run lint` clean.

---

## 7. Phase 2 — the better alternative (recommended roadmap)

1. **Add terminal status `left-without-being-seen`** (or `visit-cancelled`) to
   `PatientStatus`; route *queue-close* reasons to it, keep `discharged` for the
   billing-cleared path. Mechanical updates to the ~15 status maps listed in §3C; the
   reason taxonomy migrates 1:1 into status values, so historical audit entries still make
   sense.
2. **`patient_status_events` history table** (trigger-written) so every transition — bulk
   or single — has an immutable, queryable trail ("show me everything that happened to
   this patient today") instead of only `audit_logs`.
3. **Optional scheduled sweep** (Supabase pg_cron or a nightly job) invoking the same
   action with `reason: "queue-closed"` for queues that were never manually closed.

---

## 8. Decision summary for the admin

| Question | Recommendation |
|---|---|
| Can we have the button? | Yes — **"Close queue"** with per-row + selected + all variants |
| One-click "discharge all"? | No — always confirm with count + names + **required reason** |
| Should it write `discharged`? | Yes for v1 (reuse existing status; zero UI churn), with reason recorded; move to a dedicated status in phase 2 |
| Who can press it? | Admin only (`requireStaff([UserRole.Admin])`); front desk can get it later if wanted |
| Does it touch billing / discharge notes? | **No** — documented as an administrative queue-close |
| Safe against live doctors? | Yes — status-guarded UPDATE; skipped rows are reported |
| Audit? | One batch entry per close: who, when, why, which ids |

This gives the admin the operational relief they want (queues stop rotting) without
falsifying the clinical/billing story a "discharged" patient is expected to carry — and
records enough intent to evolve into a proper LWBS workflow later.
