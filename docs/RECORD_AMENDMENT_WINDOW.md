# Record amendment window (24 hours)

> Status: implemented 2026-09-08. Requires `supabase db push` of
> `supabase/migrations/20260908_record_amendment_window.sql`.

## The rule the doctors asked for

Clinicians can correct what they wrote — a spelling slip through to a changed
prescription — **for 24 hours after the record is saved**. After that the entry
is frozen, and the only thing anyone can still do to it is attach a **correction
note**.

Stated precisely:

| | |
| :-- | :-- |
| Who may edit | **the author only** — the doctor who signed the consultation, the scientist who filed the result, the nurse who signed the note |
| For how long | **24 hours** from the moment the content was saved |
| How many times | unlimited inside the window |
| Does editing extend the clock | **no** — the anchor never moves |
| After 24 hours | content columns frozen; **append-only correction note** available to the owning department at any time |
| Who is exempt | nobody acting as staff. An Admin fixing a locked record does it through the SQL editor / service role, which is out of band, deliberate and visible to a DBA |
| Audit | every accepted edit is diffed into `audit_logs` (`RECORD_AMENDED`) and stamped on the row (`amended_at`, `amendment_count`); every refusal is logged as `RECORD_AMENDMENT_BLOCKED` |

## Why it is a freeze + addendum, and not a longer window

A chart that can be rewritten forever is not evidence: a plaintiff's expert, an
HMO assessor or a mortality review cannot tell "written on the day" from
"quietly improved last month". A hard freeze with no way to correct it is worse —
the correction just escapes into paper notes and WhatsApp.

So the design is the one medical-records departments already run on paper:

1. **24 hours of free correction** — catches essentially every typo, dose slip
   and omitted line, because those are noticed while the clinician is still
   working on the case.
2. **Freeze** — after that the original text is permanent.
3. **Addendum** — the truth can still catch up, visibly: dated, signed,
   impossible to edit or delete, displayed beside the record.

## Where it is enforced

Three layers, deliberately redundant:

| Layer | File | Refuses with |
| :-- | :-- | :-- |
| UI (what a button looks like) | `lib/records/row-state.ts`, `components/records/*` | hides "Amend", explains the lock |
| Server actions (the friendly no) | `lib/services/record-lock.ts`, called from each `lib/services/*.service.ts` update path | `LOCKED:<reason> <sentence>` |
| Postgres (the un-bypassable no) | `supabase/migrations/20260908_record_amendment_window.sql` → `trg_amendment_window` | `raise exception '…amendment window closed…'` |

The Postgres trigger matters because the anon key ships in the browser bundle:
anyone can call PostgREST directly, and RLS policies cannot compare *when* the
previous version was written. The trigger compares OLD and NEW content columns
and rejects the write. `auth.uid() IS NULL` (service role, SQL editor,
migrations) is the privileged escape hatch.

The policy itself lives in one pure module — `lib/records/amendment-policy.ts` —
imported by both the UI and the server, so a screen can never advertise an edit
the API would refuse.

## Record types covered

Declared once in `lib/records/registry.ts`; mirrored table-for-table in the
migration's trigger config. `anchor` is the timestamp that starts the clock,
`author` is the column holding the owning staff id, `content` is what counts as
an amendment.

| Record | Table | Anchor | Author | Content (locked after 24h) |
| :-- | :-- | :-- | :-- | :-- |
| Consultation | `consultations` | `created_at` | `doctor_id` | symptoms, diagnosis, prescriptions, recommendations, ICD-10 |
| Lab result | `lab_requests` | `completed_at` → `created_at` | `completed_by` → `requested_by` | result, notes, test_type |
| Radiology report | `lab_requests` (`[RADIOLOGY]` prefix) | `completed_at` → `created_at` | `completed_by` | result, notes |
| Nursing note | `nursing_actions` | `completion_time` → `created_at` | `completed_by` → `assigned_nurse` | description, action_type |
| Prescription | `prescriptions` | `created_at` | `created_by` → `pharmacist_id` | drug_name, dosage, duration, notes |
| Dispensing record | `drug_dispensing` | `dispensed_at` → `created_at` | `dispensed_by` | drug_name, quantity, batch_number |
| Discharge note | `discharge_notes` | `created_at` | `doctor_id` | diagnosis, condition, course, discharge meds, follow-up, restrictions, diet, return criteria |
| Drug chart entry | `nurse_drug_chart` | `created_at` | `prescribed_by` | drug, generic, dose, route, frequency, notes |
| Fluid balance line | `fluid_balance` | `created_at` | `signed_by` | all volumes, fluid type, notes |

Two choices worth calling out:

- **Workflow columns are never locked.** A consultation's `status`, a lab
  request's `priority`, a prescription's `price`/`dispensed` flag, `is_active`
  on a chart line — these drive the patient journey and the billing chain.
  Freezing them would stall care for no integrity gain. The guard therefore
  checks *which columns the write touches*, not which verb was called: pressing
  "Complete" on a 3-day-old consultation still works, editing its text does not.
- **The anchor is "when the content was filed", not "when the row was created".**
  A lab request created Monday and resulted Wednesday gets its window from
  Wednesday (`completed_at`); otherwise every scientist would already be out of
  time. Filing content for the first time is never blocked at all.

## The UI

`components/records/record-amendment-controls.tsx` is the single control every
department mounts next to a record. It renders:

- `AmendmentChip` — `Amendable · 5h 12m` (green), `Locked` (red),
  `Locked · <name>'s record` (grey), plus `N edits` once a record has been amended;
- an **Amend** button, only when the caller can actually use it (role from the
  registry **and** authorship from the row);
- **Corrections** — the append-only note list and composer
  (`addendum-panel.tsx`), which stays available forever.

The amendment dialog (`amend-record-dialog.tsx`) edits only the columns the
registry declares amendable, marks what changed, and **requires a reason**
(spelling / dose / prescription / diagnosis / result / omission / wrong patient /
other) which is stored with the diff in the audit trail. It does not decide
anything: the server re-checks on save and the dialog shows the refusal inline if
the window closed while the tab was open.

Mounted in: the doctor's dashboard consultation rows, consultation history
(cards, results table and timeline), `LabSuite`, the radiology report tab, the
nurse task detail, the drug chart and fluid balance tables, the prescription
history table, and the discharge tab of the shared patient record.

## Data

`record_addenda` — append-only:

```
id, entity_type, entity_id, patient_id,
author_id, author_role, author_name, reason, content, created_at
```

RLS allows `select` and `insert` for staff (and `author_id = auth.uid()`), and
ships **no** update/delete policy, backed by `trg_record_addenda_no_update` /
`_no_delete`. `author_name` is snapshotted so the trail survives a renamed or
deleted account. `amended_at` / `amendment_count` on each governed table are
written **only** by the trigger, so a client cannot clear the counter.

Deletion is governed separately: a record may be deleted by its author inside the
window (`assertRecordDeletable`, used by `deleteConsultation`,
`deleteDrugChartEntry`, `deleteFluidEntry`) and not afterwards; Admin may still
delete.

## Applying

```bash
supabase db push        # or paste the migration into the SQL editor
```

Idempotent, and tolerant of a deployment missing any of these tables. Until it
is applied the app still enforces the window (service layer), the amendment
fields are simply absent, and `addRecordAddendum` answers with
`NOT_CONFIGURED: …apply the amendment migration` instead of a stack trace.

## Verifying

```bash
npm run check:amendments   # 66 assertions on the boundary, ownership, anchors
npx tsc --noEmit
```

The boundary cases that matter and are pinned by the script: closed at exactly
24h, a colleague locked out *inside* the window, first filing allowed on a
week-old row, `status`-only writes never counted as amendments, an amendment at
23h30 not buying a fresh 24h, and a row with no timestamp degrading to
"editable, and logged" rather than a false lock.

## Known limits (worth knowing before the first week)

- **Last write wins between two tabs.** The dialog compares what you submit
  against the row it read when the dialog opened, and the guard re-reads the row
  on save — but two devices editing the same consultation will overwrite each
  other silently. A compare-and-swap on `updated_at` is the fix if it ever
  bites; it needs a column that every deployment actually maintains.
- **Dispensing records are trigger-guarded only.** `drug_dispensing` is in the
  registry (so its rows freeze after 24h), but no screen lists dispensing rows
  with an Amend button yet — there is no per-row view to mount one in. Add it
  with `<RecordAmendmentControls type="dispensing" …/>` when such a view exists.
- **Rows with no author are claimed, not rejected.** Legacy lab results filed
  without `completed_by` are editable by anyone in the department for their
  window; the first person to edit is stamped as the owner. That is deliberate —
  refusing them would strand old data with no correction path at all.
- **The window is a policy constant, not a setting.** 24 hours lives in
  `AMENDMENT_WINDOW_HOURS` and `public.amendment_window()`. Both must change
  together; the DB wins if they disagree.

## Rollout checklist

1. `supabase db push` (the migration is idempotent; run it before telling staff
   the freeze is live, so the correction notes exist from minute one).
2. Spot-check in the app: open a consultation → the chip should read
   `Amendable · ~24h`; amend the treatment plan → the row shows `1 edit`;
   open Admin → Audit trail and confirm `RECORD_AMENDED` carries the before/after.
3. Try the refusal path on a record older than a day (or set your clock/DB time
   forward on staging): the dialog should say *Locked* and the correction note
   should still save.
4. Tell the departments the one-sentence version: **"24 hours to fix it
   yourself, a correction note forever."**

- **No per-department window lengths.** 24 hours is the hospital's rule; it is a
  constant in two files (`amendment-policy.ts`, `public.amendment_window()`), not
  a settings screen. Tuning it per department was considered and rejected: it
  turns one sentence clinicians can remember into a matrix.
- **No admin override button.** An admin-editable override is the hole every
  integrity control dies in. The service role remains available for the rare
  genuine case.
- **No edit history viewer.** The diff is in `audit_logs` (Admin → Audit trail),
  where the review tooling already lives, rather than duplicated per record.
- **Correction notes cannot be deleted by staff**, even their own. A note you can
  unpick is not a note.
